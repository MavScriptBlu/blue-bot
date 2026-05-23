/** @format */

const { sendChatMessage } = require("../api");
const state = require("../state");

function handleBluCommands(command, { broadcasterId, user, targetUser }) {
	if (command === "bugreport") {
		sendChatMessage(broadcasterId, `[BUG REPORT] ${user} reports that the streamer is malfunctioning again. 🤖`);
		return true;
	}

	if (command === "hype") {
		sendChatMessage(broadcasterId, `CAN I GET SOME HYPE IN THE CHAT?! ${user} is ready to go! 🔥`);
		return true;
	}

	if (command === "maddz") {
		sendChatMessage(broadcasterId, `I powdered my cockatiel for the rib cage slaughter! 🐦💀`);
		return true;
	}

	if (command === "ban") {
		sendChatMessage(broadcasterId, `${user} is pretend banning ${targetUser}. It's not real, but you better watch out! 🔨`);
		return true;
	}

	if (command === "bonk") {
		sendChatMessage(broadcasterId, `${user} sent ${targetUser} to Horny Jail! Straight to horny jail. *BONK* 🐕`);
		return true;
	}

	if (command === "comfort") {
		sendChatMessage(broadcasterId, `${user} sends a warm, digital hug to ${targetUser}. 💙`);
		return true;
	}

	if (command === "fuck") {
		sendChatMessage(broadcasterId, `${user} thoroughly fucked ${targetUser}!`);
		return true;
	}

	if (command === "hug") {
		sendChatMessage(broadcasterId, `${user} Hugged ${targetUser}! This user has been hugged. 🤗`);
		return true;
	}

	if (command === "stab") {
		sendChatMessage(broadcasterId, `${user} Stabbed ${targetUser}! This user has been stabbed. 🔪`);
		return true;
	}

	if (command === "headpat" || command === "pat" || command === "headpats") {
		sendChatMessage(broadcasterId, `${user} gave headpats! Total: ${state.headpatCount} headpats! 🐾`);
		return true;
	}

	if (command === "chaoslevel") {
		sendChatMessage(broadcasterId, `Current Chaos Level: ${Math.floor(Math.random() * 100) + 1}%. 🌪️`);
		return true;
	}

	if (command === "d20") {
		sendChatMessage(broadcasterId, `${user} has thrown a D20 & Rolled a ${Math.floor(Math.random() * 20) + 1}! 🎲`);
		return true;
	}

	if (command === "stitch") {
		const stitchQuotes = [
			"Ohana means family. Family means nobody gets left behind or forgotten. 🌺",
			"Stitch is ready for chaos! 🐾",
			"Meega nala kweesta! 👽",
			"Also cute and fluffy! 💙",
		];
		sendChatMessage(broadcasterId, `${user} ${stitchQuotes[Math.floor(Math.random() * stitchQuotes.length)]}`);
		return true;
	}

	if (command === "whatdoing") {
		const activities = ["3D modeling", "learning C#", "drinking coffee", "engineering bots", "playing on the Quest 3S"];
		sendChatMessage(broadcasterId, `Right now, Blue is ${activities[Math.floor(Math.random() * activities.length)]}! 💻`);
		return true;
	}

	if (command === "syntax") {
		const syntaxStatus = ["Perfectly clean. ✨", "A complete mess. 🗑️", "Needs more semicolons. ;", "Stitch wrote this part. 🐾"];
		sendChatMessage(broadcasterId, `Current code status: ${syntaxStatus[Math.floor(Math.random() * syntaxStatus.length)]}`);
		return true;
	}

	return false;
}

module.exports = { handleBluCommands };
