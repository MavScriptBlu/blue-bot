/** @format */

// ---------------------------------------------------------
// BLUE-BOT: The EventSub Brain
// Author: MavScript.blu
// Purpose: Modern Twitch WebSocket & Helix API Bot
// ---------------------------------------------------------

require("dotenv").config();
const { connectDB } = require("./src/db");
const { validateToken, startTokenWatchdog } = require("./src/auth");
const { startWebSocketClient } = require("./src/websocket");
const { triggerBotPersonality } = require("./src/personality");
const { loadActiveTimers } = require("./src/aiTools");
const { startServer } = require("./src/server");
const { migrateLegacyJsonIfNeeded } = require("./src/broadcasterAuth");
const { loadChannelsFromDB, seedChannelsFromEnvIfEmpty } = require("./src/channels");
const { loadIgnoredBots, seedIgnoredBotsIfEmpty } = require("./src/ignoredBots");

(async () => {
	// 1. Connect to MongoDB — bot exits if this fails
	await connectDB();

	// 2. One-time migrations: legacy broadcaster tokens + seed channels + seed ignored bot list
	await migrateLegacyJsonIfNeeded();
	await seedChannelsFromEnvIfEmpty();
	await seedIgnoredBotsIfEmpty();

	// 3. Load active channels + ignored bots from DB into in-memory caches
	await loadChannelsFromDB();
	await loadIgnoredBots();

	// 4. Validate token at startup (refreshes if expired)
	await validateToken();

	// 5. Re-arm any persisted reminder timers (from MongoDB)
	await loadActiveTimers();

	// 6. Open WebSocket connection (has its own keepalive watchdog)
	startWebSocketClient();

	// 7. Start proactive token refresh loop (every 30 min)
	startTokenWatchdog();

	// 8. Boot the OBS overlay server (Express on port 3000)
	startServer();

	// 9. Kick off the personality loop ONCE (no longer triggered by auth)
	triggerBotPersonality();

	console.log(
		"🤖 Blue-Bot fully online with self-healing defenses engaged. 💙",
	);
})();
