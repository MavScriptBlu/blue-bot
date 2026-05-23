/** @format */

// Per-channel state lives in MongoDB. This module exposes simple async helpers
// that the command/server layers use without needing to know about Mongo.

const SongQueueEntry = require("./models/SongQueueEntry");
const { ts } = require("./utils");

// Hardcoded limits + fallback playlist (shared across channels for now)
const MAX_QUEUE_SIZE = 50;
const BACKUP_PLAYLIST = [
	"MavScript Retro Theme - Chiptune Mix",
	"Stitch Intergalactic Surf Rock",
	"C# Semicolon Blues - LoFi Edit",
];

// --- IN-MEMORY SHARED COUNTERS (still global — these aren't per-channel by design) ---
const counters = {
	hitCount: 0,
	headpatCount: 0,
};

// --- SONG QUEUE OPS (per-channel, Mongo-backed) ---

async function addSong(broadcasterId, songData) {
	const count = await SongQueueEntry.countDocuments({ broadcasterId });
	if (count >= MAX_QUEUE_SIZE) {
		return { ok: false, reason: "queue_full", position: count };
	}
	const doc = await SongQueueEntry.create({ broadcasterId, ...songData });
	return { ok: true, doc, position: count + 1 };
}

async function getQueueForChannel(broadcasterId, limit = MAX_QUEUE_SIZE) {
	return await SongQueueEntry.find({ broadcasterId }).sort({ timestamp: 1 }).limit(limit).lean();
}

async function getCurrentSong(broadcasterId) {
	return await SongQueueEntry.findOne({ broadcasterId }).sort({ timestamp: 1 }).lean();
}

async function getQueueLength(broadcasterId) {
	return await SongQueueEntry.countDocuments({ broadcasterId });
}

async function popNextSong(broadcasterId) {
	const next = await SongQueueEntry.findOne({ broadcasterId }).sort({ timestamp: 1 });
	if (!next) return null;
	await next.deleteOne();
	return next.toObject();
}

async function clearQueueForChannel(broadcasterId) {
	const result = await SongQueueEntry.deleteMany({ broadcasterId });
	return result.deletedCount;
}

module.exports = {
	// Counters (sync, in-memory — could be moved to Mongo later if needed)
	get hitCount() { return counters.hitCount; },
	set hitCount(v) { counters.hitCount = v; },
	get headpatCount() { return counters.headpatCount; },
	set headpatCount(v) { counters.headpatCount = v; },

	// Constants
	MAX_QUEUE_SIZE,
	backupPlaylist: BACKUP_PLAYLIST,

	// Queue ops
	addSong,
	getQueueForChannel,
	getCurrentSong,
	getQueueLength,
	popNextSong,
	clearQueueForChannel,
};
