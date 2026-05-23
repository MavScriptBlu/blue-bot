/** @format */

const mongoose = require("mongoose");

const channelSchema = new mongoose.Schema(
	{
		// Twitch broadcaster user_id — the primary identity
		broadcasterId: { type: String, required: true, unique: true, index: true },

		// Twitch login (lowercase, e.g., "mavscriptblu") — for shoutouts + display
		twitchLogin: { type: String, required: true, lowercase: true },

		// Display name (e.g., "MavScriptBlu")
		streamerName: { type: String, required: true },

		// Personality routing — which custom commands module to load
		// "blu" | "nobody" | "lucky" | null (only global commands)
		customCommandsModule: { type: String, default: null },

		// Vibe flag for global command tone (Warzone-themed responses vs general)
		isWarzoneStreamer: { type: Boolean, default: false },

		// Channel meta — used by !discord, !socials, !so, etc.
		socialsLink: { type: String, default: "[No links set]" },
		discordLink: { type: String, default: "[No Discord set]" },

		// Subscription tier (for future Patreon SaaS gating)
		tier: { type: String, enum: ["basic", "custom", "premium"], default: "basic" },

		// Whether to actively subscribe to events for this channel
		active: { type: Boolean, default: true, index: true },

		// Admin notes — free text for the bot owner
		notes: { type: String, default: "" },
	},
	{
		timestamps: true,
		collection: "channels",
	},
);

module.exports = mongoose.model("Channel", channelSchema);
