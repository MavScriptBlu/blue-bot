/** @format */

const mongoose = require("mongoose");

const ignoredBotSchema = new mongoose.Schema(
	{
		// Lowercase Twitch login (e.g., "nightbot")
		username: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
		// Free-text reason / note for the admin (e.g., "global mod bot", "auto-shoutout bot")
		note: { type: String, default: "" },
	},
	{
		timestamps: true,
		collection: "ignoredBots",
	},
);

module.exports = mongoose.model("IgnoredBot", ignoredBotSchema);
