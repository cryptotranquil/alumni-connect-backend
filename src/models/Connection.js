

const connectionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    alumniId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "completed"],
      default: "pending",
    },

    // NEW FIELDS FOR MENTORSHIP MATCHING
    mentorshipRequest: {
      skills: [String],
      interests: [String],
      careerGoals: {
        type: String,
        maxlength: 1000,
      },
      preferredIndustry: String,
      message: {
        type: String,
        maxlength: 1000,
      },
    },

    // Matching algorithm scores
    matchScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    matchDetails: {
      departmentMatch: { type: Boolean, default: false },
      skillMatches: [String],
      interestMatches: [String],
      industryMatch: { type: Boolean, default: false },
    },

    // Mentorship progress
    startedAt: Date,
    completedAt: Date,
    feedback: {
      studentRating: {
        type: Number,
        min: 1,
        max: 5,
      },
      studentReview: String,
      alumniRating: {
        type: Number,
        min: 1,
        max: 5,
      },
      alumniReview: String,
    },
  },
  { timestamps: true },
);

connectionSchema.index({ studentId: 1, alumniId: 1 }, { unique: true });
connectionSchema.index({ studentId: 1, status: 1 });
connectionSchema.index({ alumniId: 1, status: 1 });

module.exports = mongoose.model("Connection", connectionSchema);
