/** @format */

const express = require("express");
const path = require("path");
const fs = require("fs");
const state = require("./state");
const { ts } = require("./utils");
const { BROADCASTER_SCOPES, saveBroadcasterToken, validateAndIdentify, listAuthorizedBroadcasters } = require("./broadcasterAuth");
const { listAllChannels, addChannel, updateChannel, removeChannel, loadChannelsFromDB } = require("./channels");
const { listIgnoredBots, addIgnoredBot, removeIgnoredBot } = require("./ignoredBots");
const { addClient, removeClient, broadcast } = require("./eventBus");
const { lookupTwitchUser } = require("./api");

// All scopes the bot needs. Listed once here so it's easy to maintain.
const REQUIRED_SCOPES = [
	"chat:read",
	"chat:edit",
	"user:bot",
	"user:write:chat",
	"user:read:chat",
	"channel:bot",
	"channel:moderate",
	"moderator:manage:banned_users",
	"moderator:read:followers", // for channel.follow alerts
	"channel:read:subscriptions", // for channel.subscribe alerts
];

function startServer() {
	const app = express();
	app.use(express.json());

	// Serve the music overlay (Now Playing card + YouTube player)
	app.use("/overlay", express.static(path.join(__dirname, "..", "public")));

	// Serve the alerts overlay (welcome/follow/sub/raid banners) at a cleaner path
	app.use("/alerts", express.static(path.join(__dirname, "..", "public", "alerts")));

	// --- API ENDPOINTS (per-channel via ?channel=<broadcasterId>) ---

	// Helper to get the channel ID from the URL query string
	function requireChannel(req, res) {
		const channel = req.query.channel;
		if (!channel) {
			res.status(400).json({ error: "Missing ?channel=<broadcasterId> query param" });
			return null;
		}
		return channel;
	}

	app.get("/api/queue/current", async (req, res) => {
		const channel = requireChannel(req, res);
		if (!channel) return;
		const current = await state.getCurrentSong(channel);
		const queueLength = await state.getQueueLength(channel);
		res.json({
			current,
			queueLength,
			backupPlaylist: state.backupPlaylist,
		});
	});

	app.get("/api/queue", async (req, res) => {
		const channel = requireChannel(req, res);
		if (!channel) return;
		const queue = await state.getQueueForChannel(channel);
		res.json({ queue, length: queue.length });
	});

	app.post("/api/queue/advance", async (req, res) => {
		const channel = requireChannel(req, res);
		if (!channel) return;
		const skipped = await state.popNextSong(channel);
		const next = await state.getCurrentSong(channel);
		console.log(`${ts()} ⏭️ [overlay] Auto-advanced past "${skipped ? skipped.title : "(empty)"}" on channel ${channel}`);
		res.json({ skipped, next });
	});

	app.get("/api/health", async (req, res) => {
		res.json({ status: "ok" });
	});

	// --- SERVER-SENT EVENTS (real-time push to overlays for alerts) ---
	app.get("/api/events", (req, res) => {
		const channel = req.query.channel;
		if (!channel) return res.status(400).end("Missing ?channel=<broadcasterId>");

		res.setHeader("Content-Type", "text/event-stream");
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("Connection", "keep-alive");
		res.setHeader("X-Accel-Buffering", "no");
		res.flushHeaders();

		// Send an initial ping so the overlay knows the connection is alive
		res.write(`event: connected\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);

		addClient(channel, res);

		// Heartbeat every 15s to keep proxies happy
		const heartbeat = setInterval(() => {
			try {
				res.write(": heartbeat\n\n");
			} catch (e) {
				clearInterval(heartbeat);
			}
		}, 15000);

		req.on("close", () => {
			clearInterval(heartbeat);
			removeClient(channel, res);
		});
	});

	// Lets the OBS overlay page report events back to the bot terminal
	app.post("/api/log", (req, res) => {
		const msg = (req.body && req.body.msg) || "(empty)";
		console.log(`${ts()} 🎬 [overlay] ${msg}`);
		res.json({ ok: true });
	});

	// --- ADMIN API (bearer-token gated) ---
	// Set ADMIN_API_KEY in .env to enable. Curl example:
	//   curl -H "Authorization: Bearer YOUR_KEY" http://localhost:3000/admin/channels

	function requireAdmin(req, res, next) {
		const expected = process.env.ADMIN_API_KEY;
		if (!expected) {
			return res.status(503).json({ error: "ADMIN_API_KEY not configured in .env — admin routes disabled." });
		}
		const auth = req.headers.authorization || "";
		const provided = auth.replace(/^Bearer\s+/i, "").trim();
		if (provided !== expected) {
			return res.status(401).json({ error: "Invalid admin credentials" });
		}
		next();
	}

	// List all channels (active + inactive)
	app.get("/admin/channels", requireAdmin, async (req, res) => {
		const channels = await listAllChannels();
		res.json({ count: channels.length, channels });
	});

	// Add a new channel
	app.post("/admin/channels", requireAdmin, async (req, res) => {
		try {
			const { broadcasterId, twitchLogin, streamerName } = req.body || {};
			if (!broadcasterId || !twitchLogin || !streamerName) {
				return res.status(400).json({ error: "broadcasterId, twitchLogin, and streamerName are required" });
			}
			const doc = await addChannel(req.body);
			res.json({ ok: true, channel: doc, note: "Restart the bot to subscribe to events for this channel." });
		} catch (err) {
			if (err.code === 11000) {
				return res.status(409).json({ error: `Channel ${req.body.broadcasterId} already exists. Use PATCH to update.` });
			}
			res.status(500).json({ error: err.message });
		}
	});

	// Update a channel
	app.patch("/admin/channels/:broadcasterId", requireAdmin, async (req, res) => {
		const doc = await updateChannel(req.params.broadcasterId, req.body);
		if (!doc) return res.status(404).json({ error: "Channel not found" });
		res.json({ ok: true, channel: doc });
	});

	// Delete a channel
	app.delete("/admin/channels/:broadcasterId", requireAdmin, async (req, res) => {
		const removed = await removeChannel(req.params.broadcasterId);
		if (!removed) return res.status(404).json({ error: "Channel not found" });
		res.json({ ok: true, note: "Restart the bot to unsubscribe from EventSub for this channel." });
	});

	// Force-reload channel cache from DB (no bot restart needed for cache changes,
	// though new channels still need a restart to trigger EventSub subscriptions)
	app.post("/admin/channels/reload", requireAdmin, async (req, res) => {
		const docs = await loadChannelsFromDB();
		res.json({ ok: true, count: docs.length });
	});

	// Pause a channel — bot stops responding to ALL events from it (chat, follows, subs, raids, personality)
	app.post("/admin/channels/:broadcasterId/pause", requireAdmin, async (req, res) => {
		const doc = await updateChannel(req.params.broadcasterId, { active: false });
		if (!doc) return res.status(404).json({ error: "Channel not found" });
		res.json({ ok: true, channel: doc, note: "Channel paused — bot will ignore events from it until resumed." });
	});

	// Resume a paused channel — bot starts responding again immediately (no restart needed)
	app.post("/admin/channels/:broadcasterId/resume", requireAdmin, async (req, res) => {
		const doc = await updateChannel(req.params.broadcasterId, { active: true });
		if (!doc) return res.status(404).json({ error: "Channel not found" });
		res.json({ ok: true, channel: doc, note: "Channel resumed — bot is live again." });
	});

	// --- IGNORED BOTS MANAGEMENT ---
	// Bot accounts the bot completely ignores (no commands, no auto-SO, no welcome banner).
	// Lives in MongoDB so you can update without code edits.

	app.get("/admin/bots", requireAdmin, async (req, res) => {
		const bots = await listIgnoredBots();
		res.json({ count: bots.length, bots });
	});

	app.post("/admin/bots", requireAdmin, async (req, res) => {
		const { username, note } = req.body || {};
		if (!username) return res.status(400).json({ error: "username is required" });
		const doc = await addIgnoredBot(username, note || "");
		res.json({ ok: true, bot: doc });
	});

	app.delete("/admin/bots/:username", requireAdmin, async (req, res) => {
		const removed = await removeIgnoredBot(req.params.username);
		if (!removed) return res.status(404).json({ error: "Bot not found in ignore list" });
		res.json({ ok: true, note: `${req.params.username} removed from ignore list.` });
	});

	// --- TEST ALERT — fires a fake event through SSE so you can preview banners in OBS ---
	// POST /admin/test-alert/<channelId>/<type>
	// Optional body: { username, displayName, tier, isGift, viewers }
	app.post("/admin/test-alert/:broadcasterId/:type", requireAdmin, async (req, res) => {
		const { broadcasterId, type } = req.params;
		const validTypes = ["follow", "subscribe", "raid"];
		if (!validTypes.includes(type)) {
			return res.status(400).json({ error: `Type must be one of: ${validTypes.join(", ")}` });
		}

		const body = req.body || {};
		const username = (body.username || "testuser").toLowerCase();
		const displayName = body.displayName || body.username || "TestUser";

		// Try to fetch a real avatar if the username is a real Twitch user.
		// Fall back to placeholder initials if lookup fails or user doesn't exist.
		let avatarUrl = null;
		try {
			const user = await lookupTwitchUser(username);
			if (user) avatarUrl = user.profile_image_url;
		} catch (e) {
			/* ignore — placeholder will be used */
		}

		const payload = {
			username,
			displayName,
			avatarUrl,
			tier: body.tier || "Tier 1",
			isGift: body.isGift || false,
			viewers: body.viewers || 42,
			link: `https://twitch.tv/${username}`,
		};

		broadcast(broadcasterId, type, payload);
		console.log(`${ts()} 🧪 [test-alert] Fired '${type}' for channel ${broadcasterId}`);
		res.json({ ok: true, type, broadcasterId, payload, note: "Check your OBS overlay — banner should appear within ~100ms." });
	});

	// --- OAUTH HELPER ROUTES ---
	// Visit /auth/start in your browser, log in to Twitch, and your .env gets fresh tokens
	// with all the scopes the bot needs (including follower + sub reads for alerts).

	app.get("/auth/start", (req, res) => {
		const clientId = process.env.CLIENT_ID;
		const redirectUri = `${process.env.PUBLIC_URL || `http://localhost:${process.env.OVERLAY_PORT || 3000}`}/auth/callback`;
		const scope = REQUIRED_SCOPES.join(" ");
		const url = new URL("https://id.twitch.tv/oauth2/authorize");
		url.searchParams.set("client_id", clientId);
		url.searchParams.set("redirect_uri", redirectUri);
		url.searchParams.set("response_type", "code");
		url.searchParams.set("scope", scope);
		url.searchParams.set("force_verify", "true"); // forces re-consent so new scopes are granted
		console.log(`${ts()} 🔐 [auth] Redirecting to Twitch authorize page...`);
		res.redirect(url.toString());
	});

	// --- BROADCASTER AUTH FLOW (multi-tenant) ---
	// Streamers (Blu, Nobody, Lucky, etc.) visit /auth/broadcaster-start to grant their channel scopes
	// to the bot (sub reads, follower reads, etc.). Their tokens are stored per-channel.

	app.get("/auth/broadcaster-start", (req, res) => {
		const clientId = process.env.CLIENT_ID;
		const redirectUri = `${process.env.PUBLIC_URL || `http://localhost:${process.env.OVERLAY_PORT || 3000}`}/auth/broadcaster-callback`;
		const url = new URL("https://id.twitch.tv/oauth2/authorize");
		url.searchParams.set("client_id", clientId);
		url.searchParams.set("redirect_uri", redirectUri);
		url.searchParams.set("response_type", "code");
		url.searchParams.set("scope", BROADCASTER_SCOPES.join(" "));
		url.searchParams.set("force_verify", "true");
		console.log(`${ts()} 🔐 [broadcaster-auth] Redirecting to Twitch authorize (broadcaster scopes)...`);
		res.redirect(url.toString());
	});

	app.get("/auth/broadcaster-callback", async (req, res) => {
		const code = req.query.code;
		if (!code) return res.status(400).send("❌ Missing code. Restart at /auth/broadcaster-start.");
		try {
			const tokenRes = await fetch("https://id.twitch.tv/oauth2/token", {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: new URLSearchParams({
					client_id: process.env.CLIENT_ID,
					client_secret: process.env.CLIENT_SECRET,
					code,
					grant_type: "authorization_code",
					redirect_uri: `${process.env.PUBLIC_URL || `http://localhost:${process.env.OVERLAY_PORT || 3000}`}/auth/broadcaster-callback`,
				}),
			});
			const data = await tokenRes.json();
			if (!data.access_token) {
				console.error(`${ts()} ❌ [broadcaster-auth] Token exchange failed:`, data);
				return res.status(500).send(`<pre>Token exchange failed: ${JSON.stringify(data, null, 2)}</pre>`);
			}

			// Identify which broadcaster just authorized so we know whose tokens to save
			const identity = await validateAndIdentify(data.access_token);
			if (!identity || !identity.user_id) {
				return res.status(500).send("❌ Could not identify broadcaster from token.");
			}

			await saveBroadcasterToken(identity.user_id, identity.login, data.access_token, data.refresh_token, data.scope);

			// Open a dedicated WebSocket for this broadcaster so sub events flow live (no bot restart needed)
			try {
				const { addBroadcasterConnection } = require("./websocket");
				await addBroadcasterConnection(identity.user_id);
			} catch (err) {
				console.error(`${ts()} ⚠️ Couldn't auto-open broadcaster WS (will pick up on next restart):`, err.message);
			}

			res.send(`
				<html><body style="font-family:sans-serif;background:#1a1a2e;color:#fff;padding:40px;text-align:center;">
					<h1 style="color:#4cc9f0;">✅ ${identity.login}, you're locked in!</h1>
					<p>The bot now has these scopes for your channel:</p>
					<code style="background:#000;padding:8px 12px;border-radius:6px;display:inline-block;margin:10px 0;">${(data.scope || []).join(", ") || "(none)"}</code>
					<p style="margin-top:30px;color:#ffd166;">⚠️ The bot owner needs to restart their terminal to activate sub alerts for your channel.</p>
					<p style="margin-top:30px;font-size:13px;color:#888;">You can close this tab.</p>
				</body></html>
			`);
		} catch (err) {
			console.error(`${ts()} ❌ [broadcaster-auth] callback crashed:`, err);
			res.status(500).send("Callback crashed: " + err.message);
		}
	});

	// Status endpoint — see which broadcasters have authorized
	app.get("/auth/broadcaster-status", async (req, res) => {
		const list = await listAuthorizedBroadcasters();
		const rows = list
			.map((b) => `<tr><td>${b.login}</td><td>${b.broadcasterId}</td><td>${b.scope.join(", ")}</td><td>${new Date(b.savedAt).toLocaleString()}</td></tr>`)
			.join("");
		res.send(`
			<html><body style="font-family:sans-serif;background:#1a1a2e;color:#fff;padding:40px;">
				<h1 style="color:#4cc9f0;">🔐 Authorized Broadcasters</h1>
				<p>${list.length} channel(s) have granted broadcaster scopes.</p>
				<table style="width:100%;border-collapse:collapse;margin-top:20px;">
					<thead><tr style="background:#16213e;"><th style="padding:10px;text-align:left;">Login</th><th style="padding:10px;text-align:left;">ID</th><th style="padding:10px;text-align:left;">Scopes</th><th style="padding:10px;text-align:left;">Authorized At</th></tr></thead>
					<tbody>${rows || '<tr><td colspan="4" style="padding:20px;text-align:center;color:#888;">No broadcasters authorized yet.</td></tr>'}</tbody>
				</table>
				<p style="margin-top:30px;font-size:13px;color:#888;">Share <code>http://localhost:3000/auth/broadcaster-start</code> with streamers who want sub alerts in their channel.</p>
			</body></html>
		`);
	});

	app.get("/auth/callback", async (req, res) => {
		const code = req.query.code;
		if (!code) {
			return res.status(400).send("❌ Missing authorization code. Visit /auth/start to retry.");
		}
		try {
			const tokenRes = await fetch("https://id.twitch.tv/oauth2/token", {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: new URLSearchParams({
					client_id: process.env.CLIENT_ID,
					client_secret: process.env.CLIENT_SECRET,
					code,
					grant_type: "authorization_code",
					redirect_uri: `${process.env.PUBLIC_URL || `http://localhost:${process.env.OVERLAY_PORT || 3000}`}/auth/callback`,
				}),
			});
			const data = await tokenRes.json();
			if (!data.access_token) {
				console.error(`${ts()} ❌ [auth] Token exchange failed:`, data);
				return res.status(500).send(`<pre>Token exchange failed: ${JSON.stringify(data, null, 2)}</pre>`);
			}

			// Update process.env in memory
			process.env.OAUTH_TOKEN = data.access_token;
			process.env.REFRESH_TOKEN = data.refresh_token;

			// Persist to .env file (same pattern as auth.js refreshAccessToken)
			try {
				const envLines = fs.readFileSync(".env", "utf8").split("\n");
				const updated = envLines.map((line) => {
					if (line.startsWith("OAUTH_TOKEN=")) return `OAUTH_TOKEN=${data.access_token}`;
					if (line.startsWith("REFRESH_TOKEN=")) return `REFRESH_TOKEN=${data.refresh_token}`;
					return line;
				});
				fs.writeFileSync(".env", updated.join("\n"));
			} catch (err) {
				console.error(`${ts()} ⚠️ [auth] Couldn't write .env (token still works in memory):`, err.message);
			}

			console.log(`${ts()} ✅ [auth] Successfully refreshed tokens with new scopes!`);
			console.log(`${ts()} 🔄 [auth] Restart the bot to apply new subscriptions.`);

			res.send(`
				<html><body style="font-family:sans-serif;background:#1a1a2e;color:#fff;padding:40px;text-align:center;">
					<h1 style="color:#4cc9f0;">✅ Tokens Refreshed!</h1>
					<p>Scopes granted: <code style="background:#000;padding:8px 12px;border-radius:6px;">${data.scope.join(" ")}</code></p>
					<p style="margin-top:30px;color:#ffd166;">⚠️ Restart your bot terminal to activate the new subscriptions.</p>
					<p style="margin-top:30px;font-size:13px;color:#888;">You can close this tab.</p>
				</body></html>
			`);
		} catch (err) {
			console.error(`${ts()} ❌ [auth] callback error:`, err);
			res.status(500).send("Auth callback crashed: " + err.message);
		}
	});

	// Railway/Render/Fly automatically set PORT. OVERLAY_PORT is for local dev override.
	const port = process.env.PORT || process.env.OVERLAY_PORT || 3000;
	app.listen(port, () => {
		const publicUrl = process.env.PUBLIC_URL || `http://localhost:${port}`;
		console.log(`${ts()} 🌐 Server running on port ${port}`);
		console.log(`${ts()} 🎵 Music overlay:  ${publicUrl}/overlay/?channel=<broadcasterId>`);
		console.log(`${ts()} 🚨 Alerts overlay: ${publicUrl}/alerts/?channel=<broadcasterId>`);
		console.log(`${ts()} 🎬 Add BOTH as separate Browser Sources in OBS`);
	});
}

module.exports = { startServer };
