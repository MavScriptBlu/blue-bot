/** @format */

// ---------------------------------------------------------
// BLUE-BOT: The EventSub Brain (Pure Version)
// Author: MavScript.blu
// Purpose: Modern Twitch WebSocket & Helix API Bot
// ---------------------------------------------------------

// 1. IMPORT TOOLS (All unified to use 'require')
require("dotenv").config();
const WebSocket = require("ws");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs"); // <-- We added this to let the bot edit the .env file!

// Load from "The Safe"
const OAUTH_TOKEN = process.env.OAUTH_TOKEN.replace("oauth:", "");
const CLIENT_ID = process.env.CLIENT_ID;
const BOT_USER_ID = process.env.BOT_USER_ID;
const CHAT_CHANNEL_USER_ID = process.env.CHAT_CHANNEL_USER_ID;

// --- AUTO-REFRESHER ENGINE ---
async function refreshAccessToken() {
	console.log("🔄 Token expired! Attempting to auto-refresh...");

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
		console.error(
			"❌ Auto-refresh failed. Your refresh token might be dead too.",
		);
		console.error(data);
		process.exit(1);
	}

	console.log("✅ Successfully generated a brand new Access Token!");

	// Update the bot's live memory
	process.env.OAUTH_TOKEN = data.access_token;
	process.env.REFRESH_TOKEN = data.refresh_token;

	// Open "The Safe", rewrite the codes, and lock it back up!
	try {
		let envFile = fs.readFileSync(".env", "utf8");
		envFile = envFile.replace(
			/OAUTH_TOKEN=.*/g,
			`OAUTH_TOKEN=${data.access_token}`,
		);
		envFile = envFile.replace(
			/REFRESH_TOKEN=.*/g,
			`REFRESH_TOKEN=${data.refresh_token}`,
		);
		fs.writeFileSync(".env", envFile);
		console.log("💾 Saved new tokens directly to your .env file!");
	} catch (err) {
		console.error("❌ Could not save to .env file:", err);
	}
}

const EVENTSUB_WEBSOCKET_URL = "wss://eventsub.wss.twitch.tv/ws";
let websocketSessionID;
let hitCount = 0;
let headpatCount = 0;
const activeChatters = new Set();

// AI Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// --- STARTUP SEQUENCE ---
(async () => {
	await validateToken();
	startWebSocketClient();
})();

// --- MAVSCRIPT_BOT PERSONALITY ENGINE ---
const botThoughts = [
	"👽 *chews aggressively on a C# textbook* Needs more salt.",
	"💙 Meega remind you: Drink water! Or I steal your coffee!",
	"Error 404: 🌺 Aloha not found. Rebooting with extra chaos...",
	"I fixed your code! ...I deleted all the semicolons. You're welcome! 😈",
	"*skitters across the chat overlay* Hehehe! 🐾",
	"Aloha! 🌺 Did you save your project recently? If not... I might press Alt+F4 for fun.",
	"Meega nala kweesta! 👽 Also, posture check! Sit up straight before your spine turns into a pretzel!",
	"*sniffs the chat* Smells like good vibes and compiler errors in here. ☕",
	"Ohana means family. Family means nobody gets left behind... except the bugs. We smash those. 🪲🔨",
	"*tries to sneak a 3D-printed benchy onto the desk* 🚤",
	"Beep boop... wait, I'm not a regular robot. I'm a twitch bot! ✨",
];

function triggerBotPersonality() {
	// 1. Pick a random chaotic thought
	const randomMsg = botThoughts[Math.floor(Math.random() * botThoughts.length)];

	// 2. Drop it in chat!
	sendChatMessage(randomMsg);
	console.log(`🤖 Bot Personality Triggered: ${randomMsg}`);

	// 3. Roll the dice for the next interruption (Between 30 and 45 minutes)
	// 30 mins = 1800000 milliseconds | 45 mins = 2700000 milliseconds
	// to test change to 10000 | 15000
	const minDelay = 1800000;
	const maxDelay = 2700000;
	const nextInterval =
		Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

	console.log(
		`⏱️ Next bot thought queued in ${Math.round(nextInterval / 60000)} minutes.`,
	);

	// 4. Start the timer again
	setTimeout(triggerBotPersonality, nextInterval);
}

// --- 1. VALIDATE TOKEN ---
async function validateToken() {
	const cleanToken = process.env.OAUTH_TOKEN.replace(
		/^(oauth:|Bearer |OAuth )/i,
		"",
	)
		.replace(/['"]/g, "")
		.trim();

	let response = await fetch("https://id.twitch.tv/oauth2/validate", {
		headers: { Authorization: "OAuth " + cleanToken },
	});

	if (response.status !== 200) {
		console.log("⚠️ Token invalid. Triggering Auto-Refresher...");
		await refreshAccessToken();
		return; // Stops here because the refresher handled it!
	}

	triggerBotPersonality(); // Wakes up the bot's brain!
	console.log("✅ Token Validated.");
}

// --- 2. WEBSOCKET CONNECTION ---
function startWebSocketClient() {
	let ws = new WebSocket(EVENTSUB_WEBSOCKET_URL);

	ws.on("open", () => console.log("🔌 Connected to Twitch EventSub"));
	ws.on("error", console.error);

	ws.on("message", (data) => {
		handleWebSocketMessage(JSON.parse(data.toString()));
	});
}

// Don't forget this goes at the very top of your bot.js file!
// const activeChatters = new Set();

async function handleWebSocketMessage(data) {
	const messageType = data.metadata.message_type;

	// First connection - get session ID and subscribe to chat!
	if (messageType === "session_welcome") {
		websocketSessionID = data.payload.session.id;
		subscribeToChat();
	}

	// A chat message came in!
	if (
		messageType === "notification" &&
		data.metadata.subscription_type === "channel.chat.message"
	) {
		const event = data.payload.event;
		const username = event.chatter_user_login;
		const displayName = event.chatter_user_name;

		// --- FIRST TIME CHATTER AUTO-SO ---
		// Prevents the bot from shouting out itself and other bots!
		// Add any other bots that visit your channel to this list!
		const knownBots = [
			"mavscriptblu", // You
			"mavscript_bot", // Your bot
			"nightbot",
			"streamelements",
			"streamlabs",
			"soundalerts",
			"commanderroot",
			"fossabot",
			"elbierro",
			"wizebot",
			"streamstickers",
			"pokemoncommunitygame",
		];

		const isBot = knownBots.includes(username.toLowerCase());

		if (!isBot) {
			// If they are not in our memory bank yet...
			if (!activeChatters.has(username)) {
				activeChatters.add(username); // Add them to memory

				console.log(
					`✨ First time chatter detected: ${displayName}! Triggering Auto-SO.`,
				);

				try {
					// 1. Get their Twitch ID
					const userRes = await fetch(
						`https://api.twitch.tv/helix/users?login=${username}`,
						{
							headers: {
								Authorization:
									"Bearer " + process.env.OAUTH_TOKEN.replace("oauth:", ""),
								"Client-Id": process.env.CLIENT_ID,
							},
						},
					);
					const userData = await userRes.json();

					if (userData.data && userData.data.length > 0) {
						const targetId = userData.data[0].id;

						// 2. Get their last played game
						const channelRes = await fetch(
							`https://api.twitch.tv/helix/channels?broadcaster_id=${targetId}`,
							{
								headers: {
									Authorization:
										"Bearer " + process.env.OAUTH_TOKEN.replace("oauth:", ""),
									"Client-Id": process.env.CLIENT_ID,
								},
							},
						);
						const channelData = await channelRes.json();
						const gameName =
							channelData.data &&
							channelData.data.length > 0 &&
							channelData.data[0].game_name
								? channelData.data[0].game_name
								: "something mysterious";

						// 3. Send the Shoutout!
						sendChatMessage(
							`Welcome to the stream, @${displayName}! 💙 Everyone go check them out—they were last seen playing ${gameName}. twitch.tv/${username}`,
						);
					}
				} catch (error) {
					console.error("❌ Failed Auto-SO:", error);
				}
			}
		}
		// --- END AUTO-SO ---

		// Pass the message along to your custom commands
		handleCommands(
			event.chatter_user_login,
			event.chatter_user_name,
			event.message.text,
		);
	}
}

// --- 3. SUBSCRIBE TO CHAT ---
async function subscribeToChat() {
	let response = await fetch(
		"https://api.twitch.tv/helix/eventsub/subscriptions",
		{
			method: "POST",
			headers: {
				Authorization: "Bearer " + OAUTH_TOKEN,
				"Client-Id": CLIENT_ID,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				type: "channel.chat.message",
				version: "1",
				condition: {
					broadcaster_user_id: CHAT_CHANNEL_USER_ID,
					user_id: BOT_USER_ID,
				},
				transport: {
					method: "websocket",
					session_id: websocketSessionID,
				},
			}),
		},
	);

	if (response.status === 202) {
		console.log("✅ Successfully subscribed to chat messages!");
	} else {
		console.error("❌ Failed to subscribe to chat:", await response.json());
	}
}

// --- 4. SEND MESSAGES ---
async function sendChatMessage(messageText) {
	await fetch("https://api.twitch.tv/helix/chat/messages", {
		method: "POST",
		headers: {
			Authorization: "Bearer " + OAUTH_TOKEN,
			"Client-Id": CLIENT_ID,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			broadcaster_id: CHAT_CHANNEL_USER_ID,
			sender_id: BOT_USER_ID,
			message: messageText,
		}),
	});
}

// --- 5. LOGIC & COMMANDS ---
async function handleCommands(username, displayName, message) {
	// Ignore bot's own messages
	if (username.toLowerCase() === "bluebot_mav") return;

	// Command parsing
	if (!message.startsWith("!")) return;
	const args = message.slice(1).trim().split(" ");
	const command = args.shift().toLowerCase();

	console.log(`💬 Command Received [${displayName}]: !${command}`);

	// Basic Commands
	if (command === "hello") {
		sendChatMessage(`Hello there, @${displayName}! 💙 Welcome to the stream!`);
	}

	if (command === "lurk") {
		sendChatMessage(
			`@${displayName} is lurking in the shadows... thanks for the view!`,
		);
	}

	if (command === "bluebot") {
		sendChatMessage(
			`I am Blue-Bot, built by MavScriptBlu to help run this ship! 🚀`,
		);
	}

	if (command === "discord") {
		sendChatMessage(
			`Join the MavScript community on Discord! https://discord.gg/jqvCPG6vYY`,
		);
	}

	// AI Command
	if (command === "ask") {
		const prompt = args.join(" ");
		if (!prompt) {
			sendChatMessage("Ask me something! e.g., !ask What is a router?");
			return;
		}

		try {
			sendChatMessage("Thinking... 🧠");
			const result = await model.generateContent(prompt);
			const responseText = result.response.text().replace(/\n/g, " ");
			sendChatMessage(`@${displayName} ${responseText.slice(0, 400)}`);
		} catch (err) {
			console.error("AI Error:", err);
			sendChatMessage("My brain is freezing up! 🥶");
		}
	}

	// ---------------------------------------------------------
	// CUSTOM MAVSCRIPT COMMANDS (The Complete Master List)
	// ---------------------------------------------------------

	const user = `@${displayName}`;
	const targetUser = args[0] ? args[0] : user; // If they tag someone, use that name. If not, use their own name.
	const passTarget = args[0] ? args[0] : "the chat"; // Specifically for the !pass command

	// --- 1. BASIC TEXT & LINKS ---
	if (command === "socials") {
		sendChatMessage(
			`Catch me across the web! Check out the links here: [Insert Link]`,
		);
	}

	if (command === "grabtap") {
		sendChatMessage(
			`Playing games from my GrabTap page helps support the stream! Check it out: [Insert Link]`,
		);
	}

	if (command === "bugreport") {
		sendChatMessage(
			`[BUG REPORT] ${user} reports that the streamer is malfunctioning again. 🤖`,
		);
	}

	if (command === "coffee") {
		sendChatMessage(`${user} hands Blu a fresh cup of coffee ☕ Thanks!`);
	}

	if (command === "hydrate") {
		sendChatMessage(
			`${user} is reminding Blu to hydrate! Brain cells need water to code. 💧`,
		);
	}

	if (command === "hype") {
		sendChatMessage(
			`CAN I GET SOME HYPE IN THE CHAT?! ${user} is ready to go! 🔥`,
		);
	}

	if (command === "maddz") {
		sendChatMessage(`I powdered my cockatiel for the rib cage slaughter! 🐦💀`);
	}

	// --- 2. INTERACTION COMMANDS ---
	if (command === "ban") {
		sendChatMessage(
			`${user} is pretend banning ${targetUser}. It's not real, but you better watch out! 🔨`,
		);
	}

	if (command === "bonk") {
		sendChatMessage(
			`${user} sent ${targetUser} to Horny Jail! Straight to horny jail. *BONK* 🐕`,
		);
	}

	if (command === "comfort") {
		sendChatMessage(`${user} sends a warm, digital hug to ${targetUser}. 💙`);
	}

	if (command === "fuck") {
		sendChatMessage(
			`${user} fucked ${targetUser}! This user has been thoroughly fucked.`,
		);
	}

	if (command === "hug") {
		sendChatMessage(
			`${user} Hugged ${targetUser}! This user has been hugged. 🤗`,
		);
	}

	if (command === "stab") {
		sendChatMessage(
			`${user} Stabbed ${targetUser}! This user has been stabbed. 🔪`,
		);
	}

	if (command === "so") {
		try {
			// Get the name they typed and strip the @ symbol
			const targetName = args[0] ? args[0].replace("@", "") : null;
			if (!targetName)
				return sendChatMessage(`You need to tag someone to shout them out!`);

			// 1. Ask Twitch for that user's specific ID
			const userRes = await fetch(
				`https://api.twitch.tv/helix/users?login=${targetName}`,
				{
					headers: {
						Authorization:
							"Bearer " + process.env.OAUTH_TOKEN.replace("oauth:", ""),
						"Client-Id": process.env.CLIENT_ID,
					},
				},
			);
			const userData = await userRes.json();

			if (!userData.data || userData.data.length === 0)
				return sendChatMessage(`Couldn't find a user named ${targetName}!`);
			const targetId = userData.data[0].id;

			// 2. Use their ID to ask Twitch what game they last played
			const channelRes = await fetch(
				`https://api.twitch.tv/helix/channels?broadcaster_id=${targetId}`,
				{
					headers: {
						Authorization:
							"Bearer " + process.env.OAUTH_TOKEN.replace("oauth:", ""),
						"Client-Id": process.env.CLIENT_ID,
					},
				},
			);
			const channelData = await channelRes.json();
			const gameName =
				channelData.data &&
				channelData.data.length > 0 &&
				channelData.data[0].game_name
					? channelData.data[0].game_name
					: "something mysterious";

			sendChatMessage(
				`Shoutout for @${targetName}! They were last seen playing ${gameName}. Drop them a follow at twitch.tv/${targetName} 💙`,
			);
		} catch (error) {
			console.error("❌ Failed to fetch SO data:", error);
		}
	}

	if (command === "fmk") {
		try {
			// 1. Ask Twitch for the list of people currently in your chat
			const response = await fetch(
				`https://api.twitch.tv/helix/chat/chatters?broadcaster_id=${process.env.CHAT_CHANNEL_USER_ID}&moderator_id=${process.env.BOT_USER_ID}`,
				{
					headers: {
						Authorization:
							"Bearer " + process.env.OAUTH_TOKEN.replace("oauth:", ""),
						"Client-Id": process.env.CLIENT_ID,
					},
				},
			);

			const data = await response.json();

			// 2. Extract just the usernames
			let chatters = [];
			if (data.data && data.data.length > 0) {
				chatters = data.data.map((viewer) => viewer.user_name);
			}

			// 3. Shuffle the list randomly
			const shuffled = chatters.sort(() => 0.5 - Math.random());

			// 4. Assign the targets (with funny fallbacks just in case chat is totally empty while you are testing offline)
			const target1 = shuffled[0] || "a plush bunny";
			const target2 = shuffled[1] || "the Ghost in the corner";
			const target3 = shuffled[2] || "a 5-axis CNC machine";

			sendChatMessage(
				`${targetUser} fucked ${target1}, married ${target2}, and killed ${target3}! 😈`,
			);
		} catch (error) {
			console.error("❌ Failed to fetch chatters for !fmk:", error);
		}
	}

	// --- 3. COUNTERS ---
	if (command === "headpat" || command === "pat" || command === "headpats") {
		headpatCount++;
		sendChatMessage(
			`${user} gave headpats! Total: ${headpatCount} headpats! 🐾`,
		);
	}

	if (command === "hit") {
		const action = args[0];
		if (action === "add") {
			hitCount++;
			sendChatMessage(`hits today 🍃💨: ${hitCount}`);
		} else if (action === "sub" && hitCount > 0) {
			hitCount--;
			sendChatMessage(`hits today 🍃💨: ${hitCount}`);
		} else {
			sendChatMessage(`Current hits: ${hitCount} 🍃💨`);
		}
	}

	// --- 4. RANDOMIZERS & GAMES ---
	if (command === "420") {
		sendChatMessage(`SMOKE WEED ERRYDAY! <3 Puff, puff pass! 🍃`);
	}

	if (command === "chaoslevel") {
		sendChatMessage(
			`Current Chaos Level: ${Math.floor(Math.random() * 100) + 1}%. 🌪️`,
		);
	}

	if (command === "d20") {
		sendChatMessage(
			`${user} has thrown a D20 & Rolled a ${Math.floor(Math.random() * 20) + 1}! 🎲`,
		);
	}

	if (command === "dick") {
		sendChatMessage(
			`${targetUser} has a ${Math.floor(Math.random() * 30) + 1} inch Dick!`,
		);
	}

	if (command === "hoes") {
		sendChatMessage(
			`${targetUser} has ${Math.floor(Math.random() * 70)} hoes. They keepin busy.`,
		);
	}

	if (command === "vibecheck" || command === "vibe" || command === "vibin") {
		const vibeScore = Math.floor(Math.random() * 100) + 1;
		let message = "Getting sweaty in here! 💦";
		if (vibeScore > 80) message = "The vibes are immaculate. 🚀";
		else if (vibeScore > 40) message = "We chillin. 🍃";
		sendChatMessage(`${targetUser}, vibe score is ${vibeScore}% - ${message}`);
	}

	if (command === "brat") {
		const bratScore = Math.floor(Math.random() * 100) + 1;
		let message = "Perfect Angel. ✨";
		if (bratScore > 80) message = "Total Brat Energy. 😈";
		else if (bratScore > 40) message = "Being a little difficult... 😇";
		sendChatMessage(`${targetUser} is ${bratScore}% Brat today! ${message}`);
	}

	if (command === "downboy") {
		const downScore = Math.floor(Math.random() * 100) + 1;
		let message = "Stayin' pure. 🙏";
		if (downScore > 80) message = "Seek help immediately. 💀";
		else if (downScore > 40) message = "Checking the socials daily. 👀";
		sendChatMessage(`${targetUser} is ${downScore}% down bad! ${message}`);
	}

	// --- 5. ARRAYS (Pick a random item from a list) ---
	if (command === "blu") {
		const bluQuotes = [
			"[MavScriptBlu] has entered the chat! Status: Coding in C# & looking vibrant. 💻✨",
			"The Blue Wave is here! Blu has arrived to bring the vibes and the chaos. 🌊💙",
			"Ohana means family! Blu is here for mischief and big vibes. 🐾🌺",
			"[SYSTEM STARTUP] User: Blu // Hair: Neon Blue // Intent: Vibe. 🚀",
			"The legend MavScriptBlu is in the building! Hide your code! 💙💻",
			"The blue-haired prince has arrived! 🌊✨",
		];
		sendChatMessage(bluQuotes[Math.floor(Math.random() * bluQuotes.length)]);
	}

	if (command === "stitch") {
		const stitchQuotes = [
			"Ohana means family. Family means nobody gets left behind or forgotten. 🌺",
			"Stitch is ready for chaos! 🐾",
			"Meega nala kweesta! 👽",
			"Also cute and fluffy! 💙",
		];
		sendChatMessage(
			`${user} ${stitchQuotes[Math.floor(Math.random() * stitchQuotes.length)]}`,
		);
	}

	if (command === "pass") {
		const items = [
			"the virtual blunt 🍃",
			"the tactical snack 🥨",
			"the stim shot 💉",
			"the victory bowl 🥣",
		];
		sendChatMessage(
			`${user} passed ${items[Math.floor(Math.random() * items.length)]} to ${passTarget}! Puff puff pass! 💨`,
		);
	}

	if (command === "whatdoing") {
		const activities = [
			"3D modeling",
			"learning C#",
			"drinking coffee",
			"engineering bots",
			"playing on the Quest 3S",
		];
		sendChatMessage(
			`Right now, Blue is ${activities[Math.floor(Math.random() * activities.length)]}! 💻`,
		);
	}

	if (command === "syntax") {
		const syntaxStatus = [
			"Perfectly clean. ✨",
			"A complete mess. 🗑️",
			"Needs more semicolons. ;",
			"Stitch wrote this part. 🐾",
		];
		sendChatMessage(
			`Current code status: ${syntaxStatus[Math.floor(Math.random() * syntaxStatus.length)]}`,
		);
	}

	if (command === "lighter") {
		const lighterQuotes = [
			"Check your pockets!",
			"Check the couch!",
			"It's gone forever.",
			"Someone totally pocketed it.",
		];
		sendChatMessage(
			`${user} lost her lighter! ${lighterQuotes[Math.floor(Math.random() * lighterQuotes.length)]}`,
		);
	}

	if (command === "lurk") {
		const lurkQuotes = [
			"is going undercover to investigate the shadows...",
			"has deployed the tactical blanket.",
			"is hiding behind the houseplants!",
		];
		sendChatMessage(
			`${user} ${lurkQuotes[Math.floor(Math.random() * lurkQuotes.length)]} Thanks for the view! 💙`,
		);
	}
}
