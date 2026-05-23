/** @format */

const fs = require("fs");

async function refreshAccessToken() {
	console.log("🔄 Token expired! Attempting to auto-refresh...");

	try {
		const response = await fetch("https://id.twitch.tv/oauth2/token", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				grant_type: "refresh_token",
				refresh_token: process.env.REFRESH_TOKEN,
				client_id: process.env.CLIENT_ID,
				client_secret: process.env.CLIENT_SECRET,
			}),
		});

		const data = await response.json();

		if (response.status !== 200) {
			console.error("❌ Auto-refresh failed. Your refresh token might be dead too.");
			console.error(data);
			process.exit(1);
		}

		console.log("✅ Successfully generated a brand new Access Token!");

		process.env.OAUTH_TOKEN = data.access_token;
		if (data.refresh_token) {
			process.env.REFRESH_TOKEN = data.refresh_token;
		}

		// Best-effort persist to .env file (works locally; skipped silently on Railway/cloud).
		// In-memory process.env is already updated above — that's what matters at runtime.
		try {
			if (fs.existsSync(".env")) {
				let envLines = fs.readFileSync(".env", "utf8").split("\n");
				envLines = envLines.map((line) => {
					if (line.startsWith("OAUTH_TOKEN=")) return `OAUTH_TOKEN=${data.access_token}`;
					if (line.startsWith("REFRESH_TOKEN=") && data.refresh_token) return `REFRESH_TOKEN=${data.refresh_token}`;
					return line;
				});
				fs.writeFileSync(".env", envLines.join("\n"));
				console.log("💾 Saved new tokens directly to your .env file!");
			} else {
				console.log("☁️ No local .env file detected — tokens persisted in memory (normal for cloud deploys).");
			}
		} catch (err) {
			console.warn("⚠️ Couldn't persist .env (running in cloud is fine):", err.message);
		}
	} catch (err) {
		console.error("❌ Refresher crashed completely:", err);
		process.exit(1);
	}
}

async function validateToken() {
	console.log("🔍 Checking vault token status...");
	const cleanToken = process.env.OAUTH_TOKEN.replace(/^(oauth:|Bearer |OAuth )/i, "")
		.replace(/['"]/g, "")
		.trim();

	try {
		const response = await fetch("https://id.twitch.tv/oauth2/validate", {
			headers: { Authorization: "OAuth " + cleanToken },
		});

		if (response.status !== 200) {
			console.log("⚠️ Token invalid. Triggering Auto-Refresher...");
			await refreshAccessToken();
			return;
		}

		console.log("✅ Vault Token Validated Successfully.");
	} catch (err) {
		console.error("❌ Validate endpoint unreachable:", err.message);
		// Network issue — try refresh anyway
		await refreshAccessToken();
	}
}

// Background watchdog — fires every 30 min, well before the ~4hr Twitch expiry
function startTokenWatchdog() {
	const THIRTY_MIN = 30 * 60 * 1000;
	setInterval(async () => {
		console.log("⏰ Watchdog tick: proactive token validation...");
		try {
			await validateToken();
		} catch (err) {
			console.error("❌ Watchdog validation failed:", err.message);
		}
	}, THIRTY_MIN);
	console.log("🐶 Token watchdog armed — checking every 30 minutes.");
}

module.exports = { refreshAccessToken, validateToken, startTokenWatchdog };
