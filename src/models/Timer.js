/** @format */

const mongoose = require("mongoose");

const timerSchema = new mongoose.Schema(
	{
		broadcasterId: { type: String, required: true, index: true },
		minutes: { type: Number, required: true, min: 1 },
		message: { type: String, required: true },
		createdAt: { type: Date, default: Date.now },
	},
	{
		collection: "timers",
	},
);

module.exports = mongoose.model("Timer", timerSchema);
