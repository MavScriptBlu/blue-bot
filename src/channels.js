/** @format */

// In-memory cache of active channels + helpers.
// On startup, loadChannelsFromDB() pulls all `active: true` channels from MongoDB
// and exposes them via synchronous getters for use everywhere else in the codebase.
// If the channels collection is empty, seedChannelsFromEnv() migrates the old .env config.

const Channel = require("./models/Channel");
const { ts } = require("./utils");

// In-memory cache: { broadcasterId: channelDoc }
let channelCache = {};

async function loadChannelsFromDB() {
	const docs = await Channel.find({ active: true }).lean();
	channelCache = {};
	for (const doc of docs) {
		channelCache[doc.broadcasterId] = doc;
	}
	console.log(`${ts()} 📦 Loaded ${docs.length} active channel(s) from MongoDB.`);
	return docs;
}

// One-time seed: if the channels collection is empty AND the user still has
// CHAT_CHANNEL_USER_ID in .env, populate the DB from those values + the old STREAMER_CONFIGS
async function seedChannelsFromEnvIfEmpty() {
	const count = await Channel.countDocuments({});
	if (count > 0) return;

	console.log(`${ts()} 🌱 No channels in DB — seeding from .env...`);

	const channelIds = (process.env.CHAT_CHANNEL_USER_ID || "").split(",").map((s) => s.trim()).filter(Boolean);
	if (channelIds.length === 0) {
		console.log(`${ts()} ⚠️ No CHAT_CHANNEL_USER_ID to seed from. Add channels via POST /admin/channels.`);
		return;
	}

	// Map known IDs to legacy configs (preserve the personality routing)
	const legacyMap = {
		[process.env.MY_TWITCH_ID]: {
			streamerName: "MavScriptBlu",
			twitchLogin: "mavscriptblu",
			isWarzoneStreamer: false,
			customCommandsModule: "blu",
			socialsLink: "https://beacons.ai/mavscriptblu",
			discordLink: "https://discord.gg/jqvCPG6vYY",
			tier: "premium",
		},
		[process.env.NOBODY_TWITCH_ID]: {
			streamerName: "MrNobodyisback",
			twitchLogin: "mrnobodyisback",
			isWarzoneStreamer: true,
			customCommandsModule: "nobody",
			socialsLink: "https://twitch.tv/mrnobodyisback",
			discordLink: "https://discord.gg/73FY8ETj62",
			tier: "custom",
		},
		[process.env.LUCKY_TWITCH_ID]: {
			streamerName: "Lucky",
			twitchLogin: "lucky",
			isWarzoneStreamer: false,
			customCommandsModule: "lucky",
			socialsLink: "https://twitch.tv/lucky",
			discordLink: "[Insert Lucky's Discord Link]",
			tier: "custom",
		},
	};

	for (const id of channelIds) {
		const legacy = legacyMap[id];
		if (!legacy) {
			// Unknown ID — create a minimal default channel
			await Channel.create({
				broadcasterId: id,
				streamerName: `Channel_${id}`,
				twitchLogin: `channel_${id}`,
				active: true,
			});
			continue;
		}
		await Channel.create({ broadcasterId: id, ...legacy });
	}
	console.log(`${ts()} ✅ Seeded ${channelIds.length} channel(s) into MongoDB.`);
}

// --- SYNCHRONOUS READERS (from cache) ---

function getActiveChannelIds() {
	return Object.keys(channelCache);
}

// True if the channel exists in the active cache (i.e. active: true in DB)
function isChannelActive(broadcasterId) {
	return Object.prototype.hasOwnProperty.call(channelCache, broadcasterId);
}

function getChannelConfig(broadcasterId) {
	return channelCache[broadcasterId] || null;
}

function getAllChannels() {
	return Object.values(channelCache);
}

// --- ADMIN HELPERS (for /admin/channels routes) ---

async function addChannel(data) {
	const doc = await Channel.create(data);
	channelCache[doc.broadcasterId] = doc.toObject();
	console.log(`${ts()} ➕ Added channel: ${doc.streamerName} (${doc.broadcasterId})`);
	return doc;
}

async function updateChannel(broadcasterId, updates) {
	const doc = await Channel.findOneAndUpdate({ broadcasterId }, updates, { returnDocument: "after" }).lean();
	if (!doc) return null;
	if (doc.active) channelCache[broadcasterId] = doc;
	else delete channelCache[broadcasterId];
	console.log(`${ts()} ✏️ Updated channel: ${doc.streamerName} (${broadcasterId})`);
	return doc;
}

async function removeChannel(broadcasterId) {
	const result = await Channel.deleteOne({ broadcasterId });
	delete channelCache[broadcasterId];
	console.log(`${ts()} 🗑️ Removed channel: ${broadcasterId}`);
	return result.deletedCount > 0;
}

async function listAllChannels() {
	return await Channel.find({}).lean();
}

module.exports = {
	loadChannelsFromDB,
	seedChannelsFromEnvIfEmpty,
	getActiveChannelIds,
	getChannelConfig,
	getAllChannels,
	isChannelActive,
	addChannel,
	updateChannel,
	removeChannel,
	listAllChannels,
};
