/** @format */

const mongoose = require("mongoose");

const songQueueEntrySchema = new mongoose.Schema(
	{
		broadcasterId: { type: String, required: true, index: true },
		requestedBy: { type: String, required: true },
		title: { type: String, required: true },
		originalQuery: { type: String, default: "" },
		videoId: { type: String, default: null }, // null = text-only, overlay auto-skips
		// `timestamp` controls queue order (FIFO by insertion time)
		timestamp: { type: Number, default: () => Date.now(), index: true },
	},
	{
		timestamps: true,
		collection: "songQueueEntries",
	},
);

// Compound index for fast per-channel sorted lookups
songQueueEntrySchema.index({ broadcasterId: 1, timestamp: 1 });

module.exports = mongoose.model("SongQueueEntry", songQueueEntrySchema);
