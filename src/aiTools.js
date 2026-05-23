/** @format */

const fs = require("fs");
const path = require("path");
const Timer = require("./models/Timer");
const { sendChatMessage } = require("./api");
const { isChannelActive } = require("./channels");
const { ts } = require("./utils");

// Map<timerId (Mongo _id as string), NodeJS.Timeout> — live setInterval references
const activeIntervals = new Map();

// Internal: actually arm a setInterval and track its reference by Mongo _id
function armTimer(record) {
	const ms = record.minutes * 60 * 1000;
	const idStr = record._id.toString();
	console.log(`⏰ [timer] Armed ${idStr.slice(0, 8)} | every ${record.minutes}min | "${record.message.slice(0, 40)}" | channel ${record.broadcasterId}`);
	const handle = setInterval(() => {
		// Don't fire timers for paused channels
		if (!isChannelActive(record.broadcasterId)) {
			console.log(`⏸️ [timer] SKIP ${idStr.slice(0, 8)} — channel ${record.broadcasterId} is paused`);
			return;
		}
		console.log(`📢 [timer] FIRE ${idStr.slice(0, 8)} | "${record.message.slice(0, 40)}"`);
		sendChatMessage(record.broadcasterId, `📢 ${record.message}`);
	}, ms);
	activeIntervals.set(idStr, handle);
}

// --- LEGACY JSON MIGRATION ---
async function migrateLegacyTimersIfNeeded() {
	const legacyPath = path.join(__dirname, "..", "data", "timers.json");
	if (!fs.existsSync(legacyPath)) return;

	try {
		const raw = fs.readFileSync(legacyPath, "utf8");
		const legacy = JSON.parse(raw);
		if (!Array.isArray(legacy) || legacy.length === 0) return;

		console.log(`${ts()} 🔄 Migrating ${legacy.length} legacy timer(s) to MongoDB...`);
		for (const t of legacy) {
			if (!t.broadcasterId || !t.minutes || !t.message) continue;
			await Timer.create({
				broadcasterId: t.broadcasterId,
				minutes: t.minutes,
				message: t.message,
				createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
			});
		}
		fs.renameSync(legacyPath, legacyPath + ".migrated");
		console.log(`${ts()} ✅ Timer migration complete. Old file renamed to timers.json.migrated`);
	} catch (err) {
		console.error(`${ts()} ⚠️ Legacy timer migration failed (non-fatal):`, err.message);
	}
}

// --- PUBLIC API ---

async function loadActiveTimers() {
	await migrateLegacyTimersIfNeeded();
	const records = await Timer.find({}).lean();
	for (const record of records) {
		armTimer(record);
	}
	if (records.length > 0) {
		console.log(`🔄 Reloaded ${records.length} timer(s) from MongoDB.`);
	} else {
		console.log("⏰ No persisted timers to reload.");
	}
}

async function setFlexTimer(broadcasterId, minutes, message) {
	if (!minutes || minutes <= 0) return { status: "error", reason: "Invalid interval" };

	const doc = await Timer.create({ broadcasterId, minutes, message, createdAt: new Date() });
	armTimer(doc);

	sendChatMessage(broadcasterId, `⏰ Timer locked in! I'll remind chat about "${message}" every ${minutes} minute(s).`);

	return { status: "success", intervalMinutes: minutes, id: doc._id.toString() };
}

async function clearTimersForChannel(broadcasterId) {
	const targets = await Timer.find({ broadcasterId }).lean();
	for (const t of targets) {
		const idStr = t._id.toString();
		const handle = activeIntervals.get(idStr);
		if (handle) {
			clearInterval(handle);
			activeIntervals.delete(idStr);
		}
	}
	await Timer.deleteMany({ broadcasterId });
	return targets.length;
}

async function getTimersForChannel(broadcasterId) {
	return await Timer.find({ broadcasterId }).lean();
}

// --- TOOL SCHEMA (what Gemini sees) ---
const reminderToolDefinition = {
	name: "setFlexTimer",
	description:
		"REQUIRED for any recurring reminder, timer, or scheduled chat message. Use this whenever the user says any of: 'remind', 'reminder', 'timer', 'set a timer', 'every X minutes', 'schedule', 'recurring', 'repeat every'. The tool arms a setInterval that posts the message to chat every N minutes. ALWAYS invoke this tool — never just reply in text claiming a reminder was set.",
	parameters: {
		type: "OBJECT",
		properties: {
			minutes: {
				type: "NUMBER",
				description: "How often the reminder should fire, in minutes. Parse from user input like '2 minutes', 'every 5 min', 'half-hourly' (=30).",
			},
			message: {
				type: "STRING",
				description: "The reminder message to broadcast to chat each interval. Make it short and chat-friendly (e.g., 'Hydrate! 💧', 'Don't forget to follow!').",
			},
		},
		required: ["minutes", "message"],
	},
};

module.exports = {
	setFlexTimer,
	loadActiveTimers,
	clearTimersForChannel,
	getTimersForChannel,
	aiToolsList: [reminderToolDefinition],
};
