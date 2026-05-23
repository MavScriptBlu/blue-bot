/** @format */

const CLIENT_ID = process.env.CLIENT_ID;
const BOT_USER_ID = process.env.BOT_USER_ID;

async function sendChatMessage(broadcasterId, message, isRetry = false) {
	try {
		const response = await fetch("https://api.twitch.tv/helix/chat/messages", {
			method: "POST",
			headers: {
				Authorization: "Bearer " + process.env.OAUTH_TOKEN,
				"Client-Id": CLIENT_ID,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				broadcaster_id: broadcasterId,
				sender_id: BOT_USER_ID,
				message: message,
			}),
		});

		if (response.status === 401 && !isRetry) {
			console.log("⚠️ sendChatMessage hit 401 Unauthorized! Refreshing token and retrying...");
			await require("./auth").refreshAccessToken();
			return await sendChatMessage(broadcasterId, message, true);
		}

		if (!response.ok) {
			const errorBody = await response.text();
			console.error(`❌ sendChatMessage failed [${response.status}]: ${errorBody}`);
		}
	} catch (error) {
		console.error("❌ Failed to send chat message:", error);
	}
}

async function banUser(broadcasterId, username, reason = "Spam detected", isRetry = false) {
	try {
		// 1. Resolve username to user_id
		const userRes = await fetch(`https://api.twitch.tv/helix/users?login=${username}`, {
			headers: {
				Authorization: "Bearer " + process.env.OAUTH_TOKEN,
				"Client-Id": CLIENT_ID,
			},
		});

		if (userRes.status === 401 && !isRetry) {
			console.log("⚠️ banUser hit 401 on user lookup! Refreshing token...");
			await require("./auth").refreshAccessToken();
			return await banUser(broadcasterId, username, reason, true);
		}

		const userData = await userRes.json();
		if (!userData.data || userData.data.length === 0) {
			console.warn(`❌ Ban failed: User ${username} not found`);
			return false;
		}

		const userId = userData.data[0].id;

		// 2. Execute the ban (note: Twitch requires moderator_id query param)
		const banRes = await fetch(
			`https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${broadcasterId}&moderator_id=${BOT_USER_ID}`,
			{
				method: "POST",
				headers: {
					Authorization: "Bearer " + process.env.OAUTH_TOKEN,
					"Client-Id": CLIENT_ID,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					data: {
						user_id: userId,
						reason: reason,
					},
				}),
			},
		);

		if (banRes.status === 401 && !isRetry) {
			console.log("⚠️ banUser hit 401 on ban call! Refreshing token...");
			await require("./auth").refreshAccessToken();
			return await banUser(broadcasterId, username, reason, true);
		}

		if (banRes.status === 200) {
			console.log(`🚨 Auto-banned ${username} for: ${reason}`);
			return true;
		} else {
			const errorBody = await banRes.text();
			console.error(`❌ Ban API returned status ${banRes.status}: ${errorBody}`);
			return false;
		}
	} catch (error) {
		console.error(`❌ Ban execution error:`, error);
		return false;
	}
}

async function twitchHelixCall(url) {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 5000);

	try {
		const response = await fetch(url, {
			headers: {
				Authorization: "Bearer " + process.env.OAUTH_TOKEN,
				"Client-Id": CLIENT_ID,
			},
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (response.status === 401) {
			console.log("⚠️ Helix API flagged a 401 Unauthorized! Refreshing tokens...");
			// Lazy require breaks the api → auth → personality → api circle
			await require("./auth").refreshAccessToken();
			return await twitchHelixCall(url);
		}

		return await response.json();
	} catch (err) {
		clearTimeout(timeoutId);
		if (err.name === "AbortError") {
			console.error(`⏳ Helix API call timed out on: ${url}`);
		} else {
			console.error("❌ Helix API call failure:", err.message);
		}
		return null;
	}
}

// Lookup a Twitch user by login (lowercase username) and return profile info — used by overlays for avatars
async function lookupTwitchUser(username) {
	try {
		const res = await fetch(`https://api.twitch.tv/helix/users?login=${username}`, {
			headers: {
				Authorization: "Bearer " + process.env.OAUTH_TOKEN,
				"Client-Id": CLIENT_ID,
			},
		});
		const data = await res.json();
		if (!data.data || data.data.length === 0) return null;
		return data.data[0]; // { id, login, display_name, profile_image_url, ... }
	} catch (err) {
		console.error("❌ lookupTwitchUser failed:", err.message);
		return null;
	}
}

module.exports = { sendChatMessage, twitchHelixCall, banUser, lookupTwitchUser };
