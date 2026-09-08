const jobService = require("../services/jobService");
const userService = require("../services/userService");
const notificationService = require("../services/notification.service"); // Firestore-based (Phase 3g done)

const formatJob = (job, posterUser) => {
  if (!job) return null;
  const j = { ...job };
  j._id = j.id;
  delete j.id;
  if (posterUser) {
    j.postedBy = {
      _id: posterUser.id,
      name: `${posterUser.firstname || ""} ${posterUser.lastname || ""}`.trim(),
      profilePhoto: posterUser.profilePhoto || "",
    };
  }
  if (j.createdAt?.toDate) j.createdAt = j.createdAt.toDate().toISOString();
  if (j.updatedAt?.toDate) j.updatedAt = j.updatedAt.toDate().toISOString();
  return j;
};

exports.listJobs = async (req, res) => {
  const { search, type, location } = req.query;
  let jobs = await jobService.listForUser(req.user.role, req.user.userId);

  // Firestore has no server-side full-text/regex search — filtering in JS.
  // Fine at this collection's size; revisit (Algolia etc.) if it grows a lot.
  if (search?.trim()) {
    const q = search.trim().toLowerCase();
    jobs = jobs.filter((j) =>
      j.title?.toLowerCase().includes(q) || j.company?.toLowerCase().includes(q) || j.description?.toLowerCase().includes(q)
    );
  }
  if (type && type !== "all") jobs = jobs.filter((j) => j.type === type);
  if (location && location !== "all") jobs = jobs.filter((j) => j.location?.toLowerCase().includes(location.toLowerCase()));

  const posters = await Promise.all(jobs.map((j) => userService.findById(j.postedBy)));
  res.json({ success: true, jobs: jobs.map((j, i) => formatJob(j, posters[i])) });
};

exports.createJob = async (req, res) => {
  const { title, company, location, description, requirements, type } = req.body;
  const status = req.user.role === "admin" ? "approved" : "pending";

  const job = await jobService.createJob({
    title: title.trim(), company: company.trim(), location: location?.trim() || "",
    description: description.trim(), requirements: Array.isArray(requirements) ? requirements : [],
    type: type || "full-time", postedBy: req.user.userId, status,
  });
  const poster = await userService.findById(req.user.userId);
  res.status(201).json({ success: true, job: formatJob(job, poster) });
};

exports.updateJob = async (req, res) => {
  const job = await jobService.findById(req.params.id);
  if (!job) return res.status(404).json({ success: false, message: "Job not found" });

  const owner = job.postedBy === req.user.userId;
  if (!owner && req.user.role !== "admin") return res.status(403).json({ success: false, message: "Not allowed" });

  const { title, company, location, description, requirements, type } = req.body;
  const patch = {};
  if (title !== undefined) patch.title = title.trim();
  if (company !== undefined) patch.company = company.trim();
  if (location !== undefined) patch.location = location.trim();
  if (description !== undefined) patch.description = description.trim();
  if (Array.isArray(requirements)) patch.requirements = requirements;
  if (type !== undefined) patch.type = type;
  if (req.user.role !== "admin") patch.status = "pending"; // non-admin edits need re-approval

  await jobService.updateJob(req.params.id, patch);
  const updated = await jobService.findById(req.params.id);
  const poster = await userService.findById(updated.postedBy);
  res.json({ success: true, job: formatJob(updated, poster) });
};

exports.deleteJob = async (req, res) => {
  const job = await jobService.findById(req.params.id);
  if (!job) return res.status(404).json({ success: false, message: "Job not found" });

  const owner = job.postedBy === req.user.userId;
  if (!owner && req.user.role !== "admin") return res.status(403).json({ success: false, message: "Not allowed" });

  await jobService.deleteJob(req.params.id);
  res.json({ success: true, message: "Job deleted" });
};

exports.applyJob = async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ success: false, message: "Only students can apply" });

  const job = await jobService.findById(req.params.id);
  if (!job || job.status !== "approved") return res.status(404).json({ success: false, message: "Job not found or not open" });
  if ((job.applicants || []).includes(req.user.userId)) return res.json({ success: true, message: "Already applied" });

  await jobService.addApplicant(req.params.id, req.user.userId);

  // Wrapped so a failure here never blocks the actual application.
  try {
    const student = await userService.findById(req.user.userId);
    const jobPoster = await userService.findById(job.postedBy);
    if (jobPoster?.role === "alumni") {
      await notificationService.notifyJobApplication(job, student, jobPoster);
      const io = req.app.get("io");
      if (io) {
        const unreadCount = await notificationService.getUnreadCount(jobPoster.id);
        io.to(`user:${jobPoster.id}`).emit("notification:new", {
          type: "job_application", title: `New Application for ${job.title}`,
          message: `${student.firstname} applied for ${job.title}`, unreadCount,
        });
      }
    }
  } catch (err) {
    console.warn("[applyJob] notification step failed :", err.message);
  }

  res.json({ success: true, message: "Application submitted" });
};

exports.approveJob = async (req, res) => {
  const job = await jobService.findById(req.params.id);
  if (!job) return res.status(404).json({ success: false, message: "Job not found" });

  await jobService.updateJob(req.params.id, { status: "approved" });
  const updated = await jobService.findById(req.params.id);
  const poster = await userService.findById(updated.postedBy);

  try {
    if (poster) {
      await notificationService.createNotification({
        userId: poster.id, type: "job_approved", title: "Your Job Posting is Approved!",
        message: `Your job "${updated.title}" has been approved and is now visible to students.`,
        data: { jobId: updated.id, jobTitle: updated.title }, actionUrl: `/jobs/${updated.id}`,
        sendEmail: true, emailRecipient: poster.email,
      });
      const io = req.app.get("io");
      if (io) io.to(`user:${poster.id}`).emit("notification:new", { type: "job_approved", title: "Job Approved!", message: `Your job "${updated.title}" is now live.` });
    }
  } catch (err) {
    console.warn("[approveJob] notification step failed :", err.message);
  }

  res.json({ success: true, job: formatJob(updated, poster) });
};

exports.getJobStats = async (req, res) => {
  const totalAvailable = await jobService.countByStatus("approved");
  const appliedCount = await jobService.countAppliedByUser(req.user.userId);
  const remaining = totalAvailable - appliedCount;
  res.json({ success: true, stats: { totalAvailable, applied: appliedCount, remaining: remaining < 0 ? 0 : remaining } });
};

exports.getJobFilters = async (req, res) => {
  const jobs = await jobService.listApproved();
  res.json({
    success: true,
    filters: {
      types: [...new Set(jobs.map((j) => j.type).filter(Boolean))],
      locations: [...new Set(jobs.map((j) => j.location).filter(Boolean))],
    },
  });
};