/** @format */

// Per-broadcaster OAuth token management — MongoDB-backed.
// Stores tokens that broadcasters grant for channel-specific scopes
// (channel:read:subscriptions, channel:read:redemptions, etc.)

const fs = require("fs");
const path = require("path");
const BroadcasterToken = require("./models/BroadcasterToken");
const { ts } = require("./utils");

// Scopes broadcasters grant their channel for elevated event subscriptions
const BROADCASTER_SCOPES = [
	"channel:read:subscriptions",
	"moderator:read:followers",
];

// One-time migration helper: if there's an old data/broadcaster_tokens.json from before
// the Mongo migration, slurp it into the DB then rename the file to .migrated
async function migrateLegacyJsonIfNeeded() {
	const legacyPath = path.join(__dirname, "..", "data", "broadcaster_tokens.json");
	if (!fs.existsSync(legacyPath)) return;

	try {
		const raw = fs.readFileSync(legacyPath, "utf8");
		const legacy = JSON.parse(raw);
		const entries = Object.entries(legacy || {});
		if (entries.length === 0) return;

		console.log(`${ts()} 🔄 [broadcasterAuth] Migrating ${entries.length} legacy broadcaster token(s) to MongoDB...`);
		for (const [broadcasterId, t] of entries) {
			await BroadcasterToken.findOneAndUpdate(
				{ broadcasterId },
				{
					broadcasterId,
					login: t.login || "unknown",
					accessToken: t.access_token,
					refreshToken: t.refresh_token,
					scope: t.scope || [],
					lastRefreshedAt: t.savedAt ? new Date(t.savedAt) : new Date(),
				},
				{ upsert: true, returnDocument: "after" },
			);
		}
		fs.renameSync(legacyPath, legacyPath + ".migrated");
		console.log(`${ts()} ✅ [broadcasterAuth] Migration complete. Old file renamed to broadcaster_tokens.json.migrated`);
	} catch (err) {
		console.error(`${ts()} ⚠️ [broadcasterAuth] Legacy migration failed (non-fatal):`, err.message);
	}
}

// Look up the user_id + login that a new access token belongs to via Twitch's validate endpoint.
async function validateAndIdentify(accessToken) {
	const res = await fetch("https://id.twitch.tv/oauth2/validate", {
		headers: { Authorization: "OAuth " + accessToken },
	});
	if (!res.ok) return null;
	return await res.json(); // { user_id, login, scopes, ... }
}

// Save (or update) a broadcaster's tokens after the OAuth callback exchange
async function saveBroadcasterToken(broadcasterId, login, accessToken, refreshToken, scopeArr) {
	const doc = await BroadcasterToken.findOneAndUpdate(
		{ broadcasterId },
		{
			broadcasterId,
			login,
			accessToken,
			refreshToken,
			scope: scopeArr || [],
			lastRefreshedAt: new Date(),
		},
		{ upsert: true, returnDocument: "after" },
	);
	console.log(`${ts()} 🔐 [broadcasterAuth] Saved tokens for ${login} (id=${broadcasterId})`);
	return doc;
}

// Get the current access token for a broadcaster
async function getBroadcasterToken(broadcasterId) {
	const doc = await BroadcasterToken.findOne({ broadcasterId }).lean();
	return doc ? doc.accessToken : null;
}

// Refresh tokens for a specific broadcaster using their stored refresh_token
async function refreshBroadcasterToken(broadcasterId) {
	const doc = await BroadcasterToken.findOne({ broadcasterId });
	if (!doc) return null;

	console.log(`${ts()} 🔄 [broadcasterAuth] Refreshing tokens for ${doc.login}...`);
	try {
		const res = await fetch("https://id.twitch.tv/oauth2/token", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				grant_type: "refresh_token",
				refresh_token: doc.refreshToken,
				client_id: process.env.CLIENT_ID,
				client_secret: process.env.CLIENT_SECRET,
			}),
		});
		const data = await res.json();
		if (!data.access_token) {
			console.error(`${ts()} ❌ [broadcasterAuth] Refresh failed for ${doc.login}:`, data);
			return null;
		}
		doc.accessToken = data.access_token;
		if (data.refresh_token) doc.refreshToken = data.refresh_token;
		doc.lastRefreshedAt = new Date();
		await doc.save();
		console.log(`${ts()} ✅ [broadcasterAuth] Refreshed tokens for ${doc.login}`);
		return doc.accessToken;
	} catch (err) {
		console.error(`${ts()} ❌ [broadcasterAuth] Refresh crashed:`, err.message);
		return null;
	}
}

// List all broadcasters with stored tokens (for admin views)
async function listAuthorizedBroadcasters() {
	const docs = await BroadcasterToken.find({}).lean();
	return docs.map((d) => ({
		broadcasterId: d.broadcasterId,
		login: d.login,
		scope: d.scope,
		savedAt: d.lastRefreshedAt || d.createdAt,
	}));
}

module.exports = {
	BROADCASTER_SCOPES,
	migrateLegacyJsonIfNeeded,
	saveBroadcasterToken,
	getBroadcasterToken,
	refreshBroadcasterToken,
	listAuthorizedBroadcasters,
	validateAndIdentify,
};
