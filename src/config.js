/** @format */

// Channel configs now live in MongoDB (see src/channels.js + src/models/Channel.js).
// This file keeps the constants that aren't channel-specific.

const EVENTSUB_WEBSOCKET_URL = "wss://eventsub.wss.twitch.tv/ws";

// Fallback context used when a chat message arrives from a channel that isn't in the DB
// (shouldn't happen in normal operation, but defensive programming)
const DEFAULT_CTX = {
	streamerName: "the Streamer",
	isWarzoneStreamer: false,
	socialsLink: "[No links set]",
	discordLink: "[No Discord set]",
	customCommandsModule: null,
};

module.exports = { EVENTSUB_WEBSOCKET_URL, DEFAULT_CTX };
