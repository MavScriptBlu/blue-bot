/** @format */

// ---------------------------------------------------------
// BLUE-BOT: The Discord Gateway Brain (Pure Version)
// Author: MavScript.blu
// Purpose: Modern Discord.js Gateway & Gateway Intents Bot
// ---------------------------------------------------------

require("dotenv").config();
const {
	Client,
	GatewayIntentBits,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} = require("discord.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 1. Initialize Discord Client with proper permissions
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});

// 2. Initialize Gemini AI Engine
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
	model: "gemini-2.5-flash",
	systemInstruction:
		"You are MavScript_Bot, a chaotic, cute, and deeply helpful digital mascot inspired by Stitch. Your family consists of Blu and Mr.Nobody. Keep responses short, funny, and under 3 sentences. Explain tech using simple language and toss in emojis like 👽, 💙, or 💻.",
});

// 3. Waking up the bot with a Dynamic Status Rotator
client.once("clientReady", () => {
	console.log(
		`🤖 MavScript_Bot is alive and logged into Discord as ${client.user.tag}!`,
	);

	const statuses = [
		{ name: "with C# semicolons 😈", type: 0 }, // Playing
		{ name: "Blu code live 💻", type: 3 }, // Watching
		{ name: "Mr.Nobody in Warzone 💥", type: 3 }, // Watching
		{ name: "Stitch clips on repeat 👽", type: 3 }, // Watching
	];

	let i = 0;
	setInterval(() => {
		client.user.setActivity(statuses[i].name, { type: statuses[i].type });
		i = (i + 1) % statuses.length;
	}, 15000); // Rotates activities every 15 seconds
});

// 4. Message Listener (Handles your custom chat commands)
client.on("messageCreate", async (message) => {
	// Ignore bot's own messages or messages that don't start with !
	if (message.author.bot || !message.content.startsWith("!")) return;

	const args = message.content.slice(1).trim().split(" ");
	const command = args.shift().toLowerCase();
	const user = `<@${message.author.id}>`; // Mentions the user cleanly in Discord format
	const targetUser = args[0] ? args[0] : user;

	console.log(
		`💬 Discord Command Received from ${message.author.username}: !${command}`,
	);

	// --- GLOBAL COMMANDS ---
	if (command === "hello" || command === "hi") {
		await message.channel.send(`Aloha! 🌺 Welcome to the server, ${user}! 💙`);
	}

	if (command === "high") {
		const f = Math.floor(Math.random() * 120);
		const m =
			f > 100
				? "Manual breathing engaged. 😶‍🌫️"
				: f > 60 && f <= 100 // Explicitly trapped between 61 and 100!
					? "In the clouds. ☁️"
					: "Barely buzzed. 🍃";

		await message.channel.send(`${user} is ${f}% faded! ${m}`);
	}

	if (command === "dick") {
		const size = Math.floor(Math.random() * 30) + 1;
		await message.channel.send(`${targetUser} has a ${size} inch Dick! 🍆`);
	}

	// --- INTERACTIVE SOCIALS BUTTONS ---
	if (command === "socials" || command === "links") {
		let accentColor = 0x00ffff; // Teal for your server
		let streamLink = "https://twitch.tv/mavscript_bot";
		let discordLink = "https://discord.gg/jqvCPG6vYY";

		// Route details if the bot is responding in Mr.Nobody's Guild
		if (
			message.guild &&
			message.guild.id === process.env.NOBODY_DISCORD_SERVER_ID
		) {
			accentColor = 0xff5733; // Blush Orange/Pink
			streamLink = "https://twitch.tv/mrnobodyisback";
			discordLink = "https://discord.gg/73FY8ETj62";
		}

		const embed = {
			color: accentColor,
			title: "🌐 Community Hub Connections",
			description:
				"Click the buttons below to drop a follow or lock into the server grids!",
		};

		const row = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setLabel("Twitch Stream")
				.setStyle(ButtonStyle.Link)
				.setURL(streamLink),
			new ButtonBuilder()
				.setLabel("Discord Server")
				.setStyle(ButtonStyle.Link)
				.setURL(discordLink),
		);

		await message.channel.send({ embeds: [embed], components: [row] });
	}

	// --- MAVSCRIPT COOLDOWN GAME: STEAL ---
	if (command === "steal") {
		if (!args[0] || !message.mentions.users.first()) {
			await message.reply(
				"Tag someone to steal from! e.g., `!steal @username` 🐾",
			);
			return;
		}

		const victim = message.mentions.users.first();
		if (victim.id === message.author.id) {
			await message.reply("You can't steal from yourself, silly! 👽");
			return;
		}

		const roll = Math.random();

		if (roll > 0.5) {
			const successEmbed = {
				color: 0x00ffff, // Teal
				title: "🐾 Successful Heist!",
				description: `${user} successfully skittered away with ${victim}'s Space Crystal! 💎✨`,
				footer: { text: "Stitch level chaos achieved." },
			};
			await message.channel.send({ embeds: [successEmbed] });
		} else {
			const failEmbed = {
				color: 0xff3333, // Red/Pink
				title: "🚨 Caught Red-Handed!",
				description: `${user} tried to sneak up on ${victim} but tripped over a C# book and failed! 🥶🔨`,
				footer: { text: "Oof... off to the intergalactic slammer." },
			};
			await message.channel.send({ embeds: [failEmbed] });
		}
	}

	// --- ADVANCED EMBED VIBE CHECK ---
	if (command === "vibe" || command === "vibin") {
		const vibeScore = Math.floor(Math.random() * 101);

		// Determine tactical status & custom progress bar mechanics
		let statusMsg = "Getting sweaty in here! 💦";
		let sidebarColor = 0xffcadb; // Blush Pink for low vibes

		if (vibeScore > 80) {
			statusMsg = "The vibes are immaculate. 🚀";
			sidebarColor = 0x00ffff; // Deep Neon Teal/Blue
		} else if (vibeScore > 40) {
			statusMsg = "We chillin. 🍃";
			sidebarColor = 0x20b2aa; // Seafoam Green
		}

		// Build a visual progress bar (10 blocks total)
		const progressBlocks = Math.round(vibeScore / 10);
		const progressBar =
			"█".repeat(progressBlocks) + "░".repeat(10 - progressBlocks);

		// Construct the clean layout card
		const vibeEmbed = {
			color: sidebarColor,
			title: "🌀 MavScript Dynamic Vibe Check",
			description: `Target locked on ${targetUser}`,
			fields: [
				{
					name: "📊 Vibe Reading",
					value: `\`[ ${progressBar} ] ${vibeScore}%\``,
					inline: false,
				},
				{
					name: "✨ Status Report",
					value: statusMsg,
					inline: false,
				},
			],
			timestamp: new Date().toISOString(),
			footer: {
				text: "MavScript.blu Ecosystem",
			},
		};

		await message.channel.send({ embeds: [vibeEmbed] });
	}

	// --- ADVANCED GEMINI AI CARDS ---
	if (command === "ask") {
		const prompt = args.join(" ");
		if (!prompt) {
			await message.reply("Ask me something! e.g., !ask What is a router?");
			return;
		}

		try {
			await message.channel.sendTyping();

			const result = await model.generateContent(prompt);
			const responseText = result.response.text();

			const aiEmbed = {
				color: 0x00ffff, // Signature Deep Neon Teal 🌀
				title: "👽 MavScript AI Intelligence",
				description: `**Query:** *"${prompt}"*`,
				fields: [
					{
						name: "🧠 Stitch Thoughts",
						value: responseText,
						inline: false,
					},
				],
				timestamp: new Date().toISOString(),
				footer: {
					text: `Invoked by ${message.author.username} | MavScript.blu`,
				},
			};

			await message.reply({ embeds: [aiEmbed] });
		} catch (err) {
			console.error("AI Error:", err);

			const errorEmbed = {
				color: 0xff3333,
				title: "🥶 System Error",
				description:
					"My brain is freezing up! Something went wrong processing that data.",
			};
			await message.reply({ embeds: [errorEmbed] });
		}
	}
});

// --- CROSS-PLATFORM LIVE NOTIFICATION ENGINE ---
global.sendDiscordLiveAlert = async (broadcasterId, streamerName) => {
	let targetChannelId = "";
	let alertHeadline = "";
	let alertDescription = "";
	let streamUrl = "";
	let accentColor = 0x00ffff; // Signature Neon Teal 🌀

	// Route and customize the broadcast identity per server
	if (broadcasterId === process.env.MY_TWITCH_ID) {
		targetChannelId = process.env.BLU_DISCORD_ALERT_CHANNEL;
		alertHeadline = "🚨 HE'S BACK.";
		alertDescription =
			"The developer, the builder, the entity—**Blu** is officially LIVE coding systems!";
		streamUrl = "https://twitch.tv/mavscript_bot";
	} else if (broadcasterId === process.env.NOBODY_TWITCH_ID) {
		targetChannelId = process.env.NOBODY_DISCORD_ALERT_CHANNEL;
		alertHeadline = "🚨 HE'S BACK.";
		alertDescription =
			'The man, the myth, the "nobody"—**MrNobodyisback** is officially LIVE!';
		streamUrl = "https://twitch.tv/mrnobodyisback";
		accentColor = 0xff5733; // Blush Orange/Pink 💥
	} else if (broadcasterId === process.env.LUCKY_TWITCH_ID) {
		// LUCKY INTEGRATION BLOCK 🔥
		targetChannelId = process.env.LUCKY_DISCORD_ALERT_CHANNEL;
		alertHeadline = "🍀 THE STREAK CONTINUES.";
		alertDescription =
			"Get in here! **Lucky** is officially live streaming right now!";
		streamUrl = "https://twitch.tv/lucky"; // Swap with their actual link!
		accentColor = 0x20b2aa; // Seafoam Green palette match
	}

	if (!targetChannelId) return;

	try {
		const channel = await client.channels.fetch(targetChannelId);
		if (!channel) return;

		// Fetch live stream metadata from Twitch Helix API
		let gameName = "Call of Duty";
		try {
			const streamRes = await fetch(
				`https://api.twitch.tv/helix/streams?user_id=${broadcasterId}`,
				{
					headers: {
						Authorization: "Bearer " + process.env.OAUTH_TOKEN,
						"Client-Id": process.env.CLIENT_ID,
					},
				},
			);
			const streamData = await streamRes.json();
			if (streamData.data && streamData.data.length > 0) {
				gameName = streamData.data[0].game_name || "Just Chatting";
			}
		} catch (apiErr) {
			console.error("⚠️ Failed to pull real-time game category:", apiErr);
		}

		const liveEmbed = {
			color: accentColor,
			author: {
				name: `${streamerName} is now live on Twitch!`,
				icon_url:
					broadcasterId === process.env.NOBODY_TWITCH_ID
						? "https://api.dicebear.com/7.x/bottts/svg?seed=nobody"
						: "https://api.dicebear.com/7.x/bottts/svg?seed=blu",
			},
			title: `${streamerName} is LIVE!`,
			url: streamUrl,
			description: `${alertDescription}\n\n🌐 **Witness it here:** ${streamUrl}`,
			fields: [
				{
					name: "🎮 Current Mission",
					value: `\`${gameName}\``,
					inline: true,
				},
			],
			image: {
				url: `https://static-cdn.jtvnw.net/previews-ttv/live_user_${streamerName.toLowerCase()}-640x360.jpg?v=${Date.now()}`,
			},
			timestamp: new Date().toISOString(),
			footer: {
				text: "MavScript Ecosystem Live Sync",
			},
		};

		await channel.send({
			content: `📢 **${alertHeadline}** ${alertDescription.split("—")[0]} is live!`,
			embeds: [liveEmbed],
		});

		console.log(
			`✅ Polished live alert dispatched to server for ${streamerName}!`,
		);
	} catch (err) {
		console.error("❌ Cross-platform alert engine failure:", err);
	}
};

// 5. Connect to the Gateway (Safely anchored at the floor)
client.login(process.env.DISCORD_TOKEN);
