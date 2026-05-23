/** @format */

const mongoose = require("mongoose");

const broadcasterTokenSchema = new mongoose.Schema(
	{
		// Twitch broadcaster user_id (primary key)
		broadcasterId: { type: String, required: true, unique: true, index: true },

		// Twitch login (e.g., "mavscriptblu") — for display + debugging
		login: { type: String, required: true },

		// OAuth tokens
		accessToken: { type: String, required: true },
		refreshToken: { type: String, required: true },

		// Scopes granted (array of strings)
		scope: { type: [String], default: [] },

		// Last time tokens were refreshed (for monitoring / debugging)
		lastRefreshedAt: { type: Date, default: Date.now },
	},
	{
		timestamps: true, // auto-adds createdAt + updatedAt
		collection: "broadcasterTokens",
	},
);

module.exports = mongoose.model("BroadcasterToken", broadcasterTokenSchema);
