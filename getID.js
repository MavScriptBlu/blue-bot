/** @format */

// ---------------------------------------------------------
// THE ID HUNTER
// Run this to fetch numeric IDs directly from Twitch
// ---------------------------------------------------------
require("dotenv").config();

// 👉 CHANGE THIS to the Twitch username you want to look up!
const usernameToHunt = "mavscriptblu";

async function fetchId() {
	const token = process.env.OAUTH_TOKEN.replace("oauth:", "");
	const clientId = process.env.CLIENT_ID;

	console.log(`🔍 Hunting for ID of: ${usernameToHunt}...`);

	const response = await fetch(
		`https://api.twitch.tv/helix/users?login=${usernameToHunt}`,
		{
			headers: {
				"Client-Id": clientId,
				Authorization: "Bearer " + token,
			},
		},
	);

	const data = await response.json();

	if (data.data && data.data.length > 0) {
		console.log(`✅ FOUND IT!`);
		console.log(`🎯 The numeric ID is: ${data.data[0].id}`);
		console.log(`\nCopy that number into your .env file!`);
	} else {
		console.log(
			`❌ Could not find that user. Did you spell the username right?`,
		);
		console.log(data);
	}
}

fetchId();
