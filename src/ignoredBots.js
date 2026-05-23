/** @format */

// MongoDB-backed list of bot usernames the bot should ignore (no commands, no auto-SO, no welcome).
// Cached in memory for fast O(1) per-message lookups; refreshed when admin routes mutate.

const IgnoredBot = require("./models/IgnoredBot");
const { ts } = require("./utils");

// In-memory Set<string> of lowercased usernames
let cache = new Set();

// Initial bot list to seed when the collection is empty (preserves the old hardcoded list)
const DEFAULT_IGNORED_BOTS = [
	{ username: "mavscript_bot", note: "Our own bot — never react to ourselves" },
	{ username: "bluebot_mav", note: "Legacy bot username" },
	{ username: "nightbot", note: "Popular Twitch chatbot" },
	{ username: "streamelements", note: "Stream Elements bot" },
	{ username: "streamlabs", note: "Streamlabs bot" },
	{ username: "soundalerts", note: "Sound Alerts bot" },
	{ username: "commanderroot", note: "View/lurk tracking bot" },
	{ username: "fossabot", note: "Fossabot chatbot" },
	{ username: "elbierro", note: "Lurker bot" },
	{ username: "wizebot", note: "Wizebot chatbot" },
	{ username: "streamstickers", note: "Stream Stickers bot" },
	{ username: "pokemoncommunitygame", note: "Pokemon Community Game bot" },
];

async function loadIgnoredBots() {
	const docs = await IgnoredBot.find({}).lean();
	cache = new Set(docs.map((d) => d.username));
	console.log(`${ts()} 🤖 Loaded ${cache.size} ignored bot(s) from MongoDB.`);
}

async function seedIgnoredBotsIfEmpty() {
	const count = await IgnoredBot.countDocuments({});
	if (count > 0) return;
	console.log(`${ts()} 🌱 Seeding default ignored-bot list into MongoDB...`);
	await IgnoredBot.insertMany(DEFAULT_IGNORED_BOTS);
	console.log(`${ts()} ✅ Seeded ${DEFAULT_IGNORED_BOTS.length} bot(s).`);
}

// --- SYNC READER (used by message handler, called every chat message — must be fast) ---
function isIgnoredBot(username) {
	if (!username) return false;
	return cache.has(username.toLowerCase());
}

// --- ADMIN HELPERS ---

async function addIgnoredBot(username, note = "") {
	const doc = await IgnoredBot.findOneAndUpdate(
		{ username: username.toLowerCase() },
		{ username: username.toLowerCase(), note },
		{ upsert: true, returnDocument: "after" },
	);
	cache.add(doc.username);
	console.log(`${ts()} ➕ Added ignored bot: ${doc.username}`);
	return doc;
}

async function removeIgnoredBot(username) {
	const result = await IgnoredBot.deleteOne({ username: username.toLowerCase() });
	cache.delete(username.toLowerCase());
	console.log(`${ts()} 🗑️ Removed ignored bot: ${username}`);
	return result.deletedCount > 0;
}

async function listIgnoredBots() {
	return await IgnoredBot.find({}).sort({ username: 1 }).lean();
}

module.exports = {
	loadIgnoredBots,
	seedIgnoredBotsIfEmpty,
	isIgnoredBot,
	addIgnoredBot,
	removeIgnoredBot,
	listIgnoredBots,
};
