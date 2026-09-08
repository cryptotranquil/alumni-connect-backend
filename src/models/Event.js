

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    eventDate: { type: Date, required: true },
    location: { type: String, default: "" },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    imageUrl: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Event", eventSchema);
