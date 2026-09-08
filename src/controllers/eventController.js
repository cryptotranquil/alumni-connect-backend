const eventService = require("../services/eventService");
const userService = require("../services/userService");
const notificationService = require("../services/notification.service"); // Firestore-based (Phase 3g done)

const formatEvent = (event, organizerUser, participantCount) => {
  if (!event) return null;
  const ev = { ...event };
  ev._id = ev.id;
  delete ev.id;
  if (organizerUser) ev.organizer = { _id: organizerUser.id, name: `${organizerUser.firstname || ""} ${organizerUser.lastname || ""}`.trim() };
  ev.eventDate = ev.startDate; // preserve the old single-date field name the frontend expects
  if (ev.startDate?.toDate) ev.startDate = ev.startDate.toDate().toISOString();
  if (ev.endDate?.toDate) ev.endDate = ev.endDate.toDate().toISOString();
  if (ev.eventDate?.toDate) ev.eventDate = ev.eventDate.toDate().toISOString();
  if (ev.createdAt?.toDate) ev.createdAt = ev.createdAt.toDate().toISOString();
  if (ev.updatedAt?.toDate) ev.updatedAt = ev.updatedAt.toDate().toISOString();
  if (participantCount !== undefined) ev.participantCount = participantCount;
  return ev;
};

exports.listEvents = async (req, res) => {
  const events = await eventService.listAll();
  const organizers = await Promise.all(
    events.map((e) => (e.createdBy ? userService.findById(e.createdBy) : null))
  );
  res.json({ success: true, events: events.map((e, i) => formatEvent(e, organizers[i])) });
};

exports.createEvent = async (req, res) => {
  const { title, description, eventDate, location, imageUrl } = req.body;

  const event = await eventService.createEvent({
    title: title.trim(), description: description?.trim() || "", startDate: new Date(eventDate),
    endDate: null, eventType: "in-person", location: location?.trim() || "", onlineMeetingUrl: null,
    imageUrl: imageUrl || "", createdBy: req.user.userId,
  });

  try {
    if (req.user.role !== "admin") {
      const allUsers = await userService.listUsers();
      const admins = allUsers.filter((u) => u.role === "admin");
      for (const admin of admins) {
        await notificationService.createNotification({
          userId: admin.id, type: "event_rsvp", title: "New Event Created",
          message: `A new event was created: "${title}"`,
          data: { eventId: event.id, eventTitle: title, createdBy: req.user.userId },
          actionUrl: `/admin/events`, sendEmail: true, emailRecipient: admin.email,
        });
      }
    }
  } catch (err) { console.warn("[createEvent] admin notification step failed :", err.message); }

  const organizer = await userService.findById(req.user.userId);
  res.status(201).json({ success: true, event: formatEvent(event, organizer) });
};

exports.joinEvent = async (req, res) => {
  const event = await eventService.findById(req.params.id);
  if (!event) return res.status(404).json({ success: false, message: "Event not found" });

  const existing = await eventService.findRegistration(req.params.id, req.user.userId);
  if (existing) return res.json({ success: true, message: "Already registered" });

  await eventService.register(req.params.id, req.user.userId);

  try {
    const user = await userService.findById(req.user.userId);
    const organizer = await userService.findById(event.createdBy);
    if (organizer && organizer.id !== req.user.userId) {
      await notificationService.createNotification({
        userId: organizer.id, type: "event_rsvp", title: `New RSVP: ${event.title}`,
        message: `${user.firstname} has registered for your event "${event.title}"`,
        data: { eventId: event.id, eventTitle: event.title, participantId: user.id, participantName: `${user.firstname} ${user.lastname}`.trim() },
        actionUrl: `/events/${event.id}/participants`, sendEmail: true, emailRecipient: organizer.email,
      });
      const io = req.app.get("io");
      if (io) io.to(`user:${organizer.id}`).emit("notification:new", { type: "event_rsvp", title: "New Event Registration", message: `${user.firstname} joined ${event.title}` });
    }
  } catch (err) { console.warn("[joinEvent] notification step failed :", err.message); }

  res.json({ success: true, message: "Joined event" });
};

exports.deleteEvent = async (req, res) => {
  await eventService.deleteEvent(req.params.id);
  res.json({ success: true, message: "Event deleted" });
};

exports.getParticipants = async (req, res) => {
  const event = await eventService.findById(req.params.id);
  if (!event) return res.status(404).json({ success: false, message: "Event not found" });

  const registrations = await eventService.listRegistrationsForEvent(req.params.id);
  const users = await Promise.all(registrations.map((r) => userService.getFullUser(r.userId)));
  const participants = users.filter(Boolean).map((u) => ({
    _id: u.id, name: `${u.firstname || ""} ${u.lastname || ""}`.trim(), email: u.email, role: u.role,
    phone: u.phone || "", profilePhoto: u.profilePhoto || "", graduationYear: u.graduationYear || "",
    university: u.university || "", company: u.company || "", position: u.jobTitle || u.position || "",
  }));

  res.json({
    eventId: event.id, title: event.title,
    eventDate: event.startDate?.toDate ? event.startDate.toDate().toISOString() : event.startDate,
    location: event.location || "", total: participants.length, participants,
  });
};

exports.sendEventReminders = async (req, res) => {
  const cronSecret = req.headers["x-cron-secret"];
  if (cronSecret !== process.env.CRON_SECRET && req.user?.role !== "admin") {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const upcomingEvents = await eventService.listUpcoming(tomorrow, dayAfter);
    console.log(`[EventReminders] Found ${upcomingEvents.length} events for tomorrow`);

    let remindersSent = 0;
    for (const event of upcomingEvents) {
      const registrations = await eventService.listRegistrationsForEvent(event.id);
      const participants = await Promise.all(registrations.map((r) => userService.findById(r.userId)));
      for (const participant of participants.filter(Boolean)) {
        try { await notificationService.notifyEventReminder(participant, event); remindersSent++; }
        catch (err) { console.warn(`[EventReminders] notification failed for ${participant.id} :`, err.message); }
      }
    }

    res.json({ success: true, message: `Reminders sent for ${upcomingEvents.length} events (${remindersSent} total notifications)` });
  } catch (error) {
    console.error("Send event reminders error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};