/** @format */

const { sendChatMessage } = require("./api");
const { getActiveChannelIds } = require("./channels");

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
	// Allow disabling entirely via .env (PERSONALITY_ENABLED=false)
	if (process.env.PERSONALITY_ENABLED === "false") {
		console.log("🤖 Bot personality is DISABLED (PERSONALITY_ENABLED=false). Skipping.");
		return;
	}

	const randomMsg = botThoughts[Math.floor(Math.random() * botThoughts.length)];

	getActiveChannelIds().forEach((channelId) => {
		sendChatMessage(channelId, randomMsg);
	});
	console.log(`🤖 Bot Personality Triggered across streams: ${randomMsg}`);

	// Interval bounds (in minutes) configurable via .env, defaulting to 30-45 min
	const minMinutes = parseInt(process.env.PERSONALITY_MIN_MINUTES || "30", 10);
	const maxMinutes = parseInt(process.env.PERSONALITY_MAX_MINUTES || "45", 10);
	const minDelay = minMinutes * 60 * 1000;
	const maxDelay = maxMinutes * 60 * 1000;
	const nextInterval = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

	console.log(`⏱️ Next bot thought queued in ${Math.round(nextInterval / 60000)} minutes (range: ${minMinutes}-${maxMinutes} min).`);
	setTimeout(triggerBotPersonality, nextInterval);
}

module.exports = { triggerBotPersonality };
