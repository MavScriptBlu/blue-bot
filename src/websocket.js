/** @format */

// MULTI-CONNECTION TWITCH EVENTSUB CLIENT
// ----------------------------------------
// Twitch limits each WebSocket transport to subscriptions from ONE user's token.
// So we maintain a separate WS connection per token identity:
//   - "bot" connection → uses BOT's OAuth token (chat, follow-as-mod, raid, stream events)
//   - "<broadcasterId>" connection → uses that broadcaster's OAuth token (subs, future scopes)
//
// All connections share the same notification handler — events flow through the
// same dispatch regardless of which connection received them.

const WebSocket = require("ws");
const { validateToken } = require("./auth");
const { sendChatMessage, banUser } = require("./api");
const { handleCommands } = require("./commands");
const { EVENTSUB_WEBSOCKET_URL } = require("./config");
const { getActiveChannelIds, isChannelActive } = require("./channels");
const { isIgnoredBot } = require("./ignoredBots");
const { ts } = require("./utils");
const { handleFollow, handleSubscribe, handleRaid } = require("./alerts");
const { getBroadcasterToken, refreshBroadcasterToken, listAuthorizedBroadcasters } = require("./broadcasterAuth");
const { broadcast } = require("./eventBus");

const CLIENT_ID = process.env.CLIENT_ID;
const BOT_USER_ID = process.env.BOT_USER_ID;

// Subscription types that must use a broadcaster's own token (not the bot's)
const BROADCASTER_AUTH_TYPES = new Set([
	"channel.subscribe",
	"channel.subscription.gift",
	"channel.subscription.message",
]);

const ZOMBIE_THRESHOLD_MS = 30 * 1000;
const WATCHDOG_INTERVAL_MS = 10 * 1000;

// Map<identity, ConnectionState>
// ConnectionState: { identity, ws, sessionId, lastMessageTime, getToken, broadcasterId, isReconnecting }
const connections = new Map();

const activeChatters = new Set();

const PROMO_KEYWORDS = [
	"buy followers",
	"cheap views",
	"become famous",
	"bigfollows",
	"buy twitch followers",
	"twitch views cheap",
	"followers for sale",
	"buy views",
	"instant followers",
	"grow your channel fast",
	"guaranteed followers",
	"promote your stream",
	"get followers now",
	"buy stream viewers",
	"cheap subscribers",
	"follow bot",
	"viewer bot",
];

// ============================================================
// CONNECTION LIFECYCLE
// ============================================================

function startWebSocketClient() {
	console.log("🔌 Starting WebSocket clients...");
	// Open the bot's connection first
	openBotConnection();

	// After the bot connection settles, open broadcaster connections.
	// The delay lets the bot WS subscribe everything before broadcaster WS chatter starts.
	setTimeout(async () => {
		const broadcasters = await listAuthorizedBroadcasters();
		if (broadcasters.length === 0) {
			console.log(`${ts()} 🔐 No authorized broadcasters yet. Subs-only features will be inactive until /auth/broadcaster-start is used.`);
			return;
		}
		for (const b of broadcasters) {
			openBroadcasterConnection(b.broadcasterId);
		}
	}, 3000);

	// Global keepalive watchdog covering all connections
	startGlobalWatchdog();
}

function openBotConnection() {
	openConnection({
		identity: "bot",
		getToken: () => process.env.OAUTH_TOKEN, // dynamic so token refresh propagates
		onSessionReady: subscribeBotEvents,
	});
}

async function openBroadcasterConnection(broadcasterId) {
	const token = await getBroadcasterToken(broadcasterId);
	if (!token) {
		console.warn(`${ts()} ⚠️ No stored token for broadcaster ${broadcasterId} — skipping WS connection.`);
		return;
	}
	openConnection({
		identity: broadcasterId,
		getToken: () => getBroadcasterToken(broadcasterId), // re-read on each subscribe attempt
		onSessionReady: (sessionId) => subscribeBroadcasterEvents(broadcasterId, sessionId),
		broadcasterId,
	});
}

function openConnection({ identity, getToken, onSessionReady, broadcasterId }) {
	// Tear down any existing connection for this identity
	const existing = connections.get(identity);
	if (existing && existing.ws) {
		try {
			existing.ws.removeAllListeners();
			existing.ws.terminate();
		} catch (e) {
			/* ignore */
		}
	}

	console.log(`${ts()} 🔌 Opening WS for identity=${identity}...`);
	const ws = new WebSocket(EVENTSUB_WEBSOCKET_URL);
	const state = {
		identity,
		broadcasterId: broadcasterId || null,
		ws,
		sessionId: null,
		lastMessageTime: Date.now(),
		getToken,
		onSessionReady,
		isReconnecting: false,
	};
	connections.set(identity, state);

	ws.on("open", () => {
		console.log(`${ts()} 🚀 WS connected [identity=${identity}]`);
		state.lastMessageTime = Date.now();
	});

	ws.on("error", (err) => {
		console.error(`${ts()} ⚠️ WS error [${identity}]:`, err.message);
	});

	ws.on("close", async (code, reason) => {
		console.log(`${ts()} 🔌 WS closed [${identity}] code=${code} reason=${reason || "(none)"}`);
		if (state.isReconnecting) return; // avoid double-reconnect
		state.isReconnecting = true;
		setTimeout(async () => {
			console.log(`${ts()} 🔄 Reconnecting WS [${identity}]...`);
			if (identity === "bot") {
				await validateToken();
				openBotConnection();
			} else {
				await openBroadcasterConnection(broadcasterId);
			}
		}, 5000);
	});

	ws.on("message", (data) => {
		state.lastMessageTime = Date.now();
		handleWebSocketMessage(JSON.parse(data.toString()), state);
	});
}

let globalWatchdog = null;
function startGlobalWatchdog() {
	if (globalWatchdog) clearInterval(globalWatchdog);
	globalWatchdog = setInterval(() => {
		const now = Date.now();
		for (const [identity, state] of connections.entries()) {
			const silenceMs = now - state.lastMessageTime;
			if (silenceMs > ZOMBIE_THRESHOLD_MS && !state.isReconnecting) {
				console.log(`${ts()} 💀 ZOMBIE [${identity}] (${Math.floor(silenceMs / 1000)}s silence) — terminating to force reconnect`);
				try {
					state.ws.terminate();
				} catch (e) {
					/* close handler will restart */
				}
			}
		}
	}, WATCHDOG_INTERVAL_MS);
}

// ============================================================
// MESSAGE DISPATCH
// ============================================================

async function handleWebSocketMessage(data, state) {
	const messageType = data.metadata.message_type;

	if (messageType === "session_welcome") {
		state.sessionId = data.payload.session.id;
		console.log(`${ts()} ✅ Session ready [${state.identity}] id=${state.sessionId.slice(0, 12)}...`);
		await state.onSessionReady(state.sessionId);
		return;
	}

	if (messageType === "session_keepalive") {
		return; // lastMessageTime already updated in ws.on("message")
	}

	if (messageType === "session_reconnect") {
		console.log(`${ts()} 🔄 Twitch requested reconnect [${state.identity}]`);
		try {
			state.ws.terminate();
		} catch (e) {
			/* close handler will restart */
		}
		return;
	}

	if (messageType !== "notification") return;
	const subType = data.metadata.subscription_type;
	const event = data.payload.event;

	// Identify which channel this notification is for and skip it if paused
	const eventChannelId =
		event.broadcaster_user_id ||
		event.to_broadcaster_user_id ||
		event.from_broadcaster_user_id ||
		null;
	if (eventChannelId && !isChannelActive(eventChannelId)) {
		// Channel is paused — silently ignore everything for it
		return;
	}

	if (subType === "stream.online") {
		console.log(`${ts()} 🚨 STREAM ONLINE: ${event.broadcaster_user_name} just went live!`);
		if (global.sendDiscordLiveAlert) {
			global.sendDiscordLiveAlert(event.broadcaster_user_id, event.broadcaster_user_name);
		}
		return;
	}

	if (subType === "stream.offline") {
		console.log(`${ts()} 🌙 STREAM OFFLINE: ${event.broadcaster_user_name}. Clearing reminder timers + active-chatter list...`);
		const { clearTimersForChannel } = require("./aiTools");
		const cleared = clearTimersForChannel(event.broadcaster_user_id);
		if (cleared > 0) console.log(`${ts()} 🧹 Cleared ${cleared} active timer(s).`);
		activeChatters.clear();
		return;
	}

	if (subType === "channel.follow") {
		handleFollow(event);
		return;
	}

	if (subType === "channel.subscribe") {
		handleSubscribe(event);
		return;
	}

	if (subType === "channel.raid") {
		handleRaid(event);
		return;
	}

	if (subType === "channel.chat.message") {
		await handleChatMessage(event);
		return;
	}
}

async function handleChatMessage(event) {
	const currentChannel = event.broadcaster_user_id;
	const username = event.chatter_user_login;
	const displayName = event.chatter_user_name;
	const messageText = event.message.text;

	// --- SPAM DETECTION & AUTO-BAN ---
	const messageLower = messageText.toLowerCase();
	const isSpam = PROMO_KEYWORDS.some((kw) => messageLower.includes(kw));
	if (isSpam) {
		console.log(`🚨 SPAM DETECTED: ${displayName} (${username}) → auto-banning`);
		const ok = await banUser(currentChannel, username, "Auto-ban: Promotional spam detected");
		if (ok) sendChatMessage(currentChannel, `🛡️ @${displayName} has been auto-banned for promotional spam. Keeping chat clean! 💙`);
		return;
	}

	// --- IGNORED-BOT GUARD ---
	// If this message came from a known bot account, completely skip processing
	// (no auto-SO, no commands, no welcome banner)
	if (isIgnoredBot(username)) {
		return;
	}

	// --- FIRST-TIME CHATTER ---
	if (!activeChatters.has(username)) {
		activeChatters.add(username);
		console.log(`✨ First time chatter detected: ${displayName}! Triggering Auto-SO.`);
		await autoShoutout(currentChannel, username, displayName);
	}

	const isBroadcaster = event.chatter_user_id === event.broadcaster_user_id;
	const MOD_BADGE_SETS = new Set(["moderator", "lead_moderator", "broadcaster", "staff", "admin", "global_mod"]);
	const isMod = isBroadcaster || (event.badges || []).some((b) => MOD_BADGE_SETS.has(b.set_id));

	handleCommands(currentChannel, username, displayName, messageText, { isMod, isBroadcaster });
}

async function autoShoutout(channelId, username, displayName) {
	const link = `https://twitch.tv/${username.toLowerCase()}`;
	let gameName = null;
	let avatarUrl = null;

	try {
		const userRes = await fetch(`https://api.twitch.tv/helix/users?login=${username}`, {
			headers: { Authorization: "Bearer " + process.env.OAUTH_TOKEN, "Client-Id": CLIENT_ID },
		});
		const userData = await userRes.json();
		if (userData.data && userData.data.length > 0) {
			const user = userData.data[0];
			avatarUrl = user.profile_image_url;
			const channelRes = await fetch(`https://api.twitch.tv/helix/channels?broadcaster_id=${user.id}`, {
				headers: { Authorization: "Bearer " + process.env.OAUTH_TOKEN, "Client-Id": CLIENT_ID },
			});
			const channelData = await channelRes.json();
			if (channelData.data && channelData.data.length > 0 && channelData.data[0].game_name) {
				gameName = channelData.data[0].game_name;
			}
		}
	} catch (error) {
		console.error(`${ts()} ⚠️ Auto-SO lookup failed (sending welcome anyway):`, error.message);
	}

	// Send chat message only (no overlay banner for first-time chatters — too noisy)
	const message = gameName
		? `Welcome to the stream, @${displayName}! 💙 They were last seen playing ${gameName}. Go check them out → ${link}`
		: `Welcome to the stream, @${displayName}! 💙 Go drop a follow and show them love → ${link}`;
	sendChatMessage(channelId, message);
}

// ============================================================
// SUBSCRIPTION HELPERS
// ============================================================

// Subscribed when the BOT's WS session is ready — all bot-token events for all channels
async function subscribeBotEvents(sessionId) {
	const channelIds = getActiveChannelIds();
	console.log(`📡 Subscribing bot-token events for ${channelIds.length} channels...`);
	for (const channelId of channelIds) {
		await makeSubscription("channel.chat.message", "1", channelId, "bot", sessionId);
		await makeSubscription("stream.online", "1", channelId, "bot", sessionId);
		await makeSubscription("stream.offline", "1", channelId, "bot", sessionId);
		await makeSubscription("channel.follow", "2", channelId, "bot", sessionId);
		await makeSubscription("channel.raid", "1", channelId, "bot", sessionId);
	}
}

// Subscribed when a BROADCASTER's WS session is ready — only their broadcaster-token events
async function subscribeBroadcasterEvents(broadcasterId, sessionId) {
	console.log(`📡 Subscribing broadcaster-token events for ${broadcasterId}...`);
	await makeSubscription("channel.subscribe", "1", broadcasterId, broadcasterId, sessionId);
}

function buildCondition(type, channelId) {
	switch (type) {
		case "stream.online":
		case "stream.offline":
		case "channel.subscribe":
			return { broadcaster_user_id: channelId };
		case "channel.follow":
			return { broadcaster_user_id: channelId, moderator_user_id: BOT_USER_ID };
		case "channel.raid":
			return { to_broadcaster_user_id: channelId };
		case "channel.chat.message":
		default:
			return { broadcaster_user_id: channelId, user_id: BOT_USER_ID };
	}
}

async function makeSubscription(type, version, channelId, identity, sessionId, isRetry = false) {
	const conn = connections.get(identity);
	if (!conn) {
		console.warn(`⚠️ No WS connection for identity ${identity} — can't subscribe ${type}`);
		return;
	}

	const token = await conn.getToken();
	if (!token) {
		console.warn(`⚠️ No token for identity ${identity} — skipping ${type}`);
		return;
	}

	try {
		const response = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
			method: "POST",
			headers: {
				Authorization: "Bearer " + token,
				"Client-Id": CLIENT_ID,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				type,
				version,
				condition: buildCondition(type, channelId),
				transport: { method: "websocket", session_id: sessionId },
			}),
		});

		if (response.status === 202) {
			const tag = identity === "bot" ? "" : ` (broadcaster ${identity})`;
			console.log(`✅ Subscribed to ${type} for ID: ${channelId}${tag}`);
			return;
		}

		// 401 retry: refresh the right token, then try once more
		if (response.status === 401 && !isRetry) {
			console.log(`${ts()} 🔄 401 on ${type} for ${identity} — refreshing token & retrying...`);
			if (identity === "bot") {
				await require("./auth").refreshAccessToken();
			} else {
				await refreshBroadcasterToken(identity);
			}
			return await makeSubscription(type, version, channelId, identity, sessionId, true);
		}

		const body = await response.text();
		console.warn(`⚠️ Subscription FAILED for ${type} (status ${response.status}): ${body.slice(0, 200)}`);
	} catch (error) {
		console.error(`❌ Subscription error for ${type}:`, error);
	}
}

// ============================================================
// PUBLIC API
// ============================================================

// Called by /auth/broadcaster-callback in server.js when a new broadcaster authorizes,
// so we can open a fresh WS for them without restarting the bot.
async function addBroadcasterConnection(broadcasterId) {
	console.log(`${ts()} ➕ Opening WS for newly authorized broadcaster ${broadcasterId}...`);
	await openBroadcasterConnection(broadcasterId);
}

module.exports = { startWebSocketClient, addBroadcasterConnection };
