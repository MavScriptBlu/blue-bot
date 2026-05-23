/** @format */

// ---------------------------------------------------------
// MAVSCRIPT-BOT: Lucky13 Command Module
// Author: MavScript.blu
// Purpose: Fortnite & Subnautica Themed Exclusives
// ---------------------------------------------------------

const { sendChatMessage } = require("../api");

function handleLuckyCommands(command, { broadcasterId, user, targetUser }) {
	// --- FORTNITE THEMED ---

	if (command === "drop") {
		const spots = [
			"the sweatiest POI on the map! 😰🔥 Get ready for immediate combat.",
			"a quiet, unnamed landmark. 🪵 Safe looting vibes.",
			"the middle of nowhere. Hope you like running from the storm! 🏃‍♂️⚡",
			"right on top of a Loot Llama! 🦙✨ Maximum luck achieved!",
		];
		sendChatMessage(broadcasterId, `${user} says Lucky should drop at ${spots[Math.floor(Math.random() * spots.length)]}`);
		return true;
	}

	if (command === "rng") {
		const score = Math.floor(Math.random() * 101);
		let tier = "Common Gray ⚪ (Oof...)";
		if (score > 90) tier = "MYTHIC GOLD 🟡🏆! The stars have aligned!";
		else if (score > 70) tier = "Legendary Orange 🟠! Pure high-roller energy.";
		else if (score > 40) tier = "Rare Blue 🔵. We can work with this.";
		sendChatMessage(broadcasterId, `🎒 Chest Loot RNG: ${targetUser}'s luck tier is ${tier} [Luck Rating: ${score}%]`);
		return true;
	}

	// --- SUBNAUTICA THEMED ---

	if (command === "sonar" || command === "scan") {
		const dangers = [
			"Detecting multiple leviathan-class organisms in the region. Are you certain whatever you're doing is worth it? 😨🦈",
			"Oxygen levels stable. Just found a fat stack of Copper Ore! 💎",
			"Your Seamoth just took hit-and-run damage from a Crashfish. 💥🐟",
			"Warning: Entering ecological dead zone. Turn back now! 🌊💀",
		];
		sendChatMessage(broadcasterId, `📡 SONAR REPORT: ${dangers[Math.floor(Math.random() * dangers.length)]}`);
		return true;
	}

	if (command === "reaper") {
		const score = Math.floor(Math.random() * 101);
		let fate = "You successfully juked it on your Seaglide! 🌊💨";
		if (score > 75) fate = "CRITICAL DAMAGE! A Reaper Leviathan just crushed your Seamoth like a soda can! 🤬🦈";
		else if (score > 40) fate = "It roared in the dark distance... you escaped, but your posture just turned into a pretzel. 😰";
		sendChatMessage(broadcasterId, `🦈 ${targetUser} encountered a Reaper Leviathan! Fate: ${fate}`);
		return true;
	}

	// --- LUCK CHECK ---

	if (command === "lucky") {
		const score = Math.floor(Math.random() * 101);
		let msg = "Unlucky 13 energy... watch out for black cats. 🐈‍⬛🪓";
		if (score > 80) msg = "The streak is blinding! Full high-roller status. 🎰🍀";
		else if (score > 40) msg = "Standard luck protocols online. 🍃";
		sendChatMessage(broadcasterId, `🍀 LUCK CHECK: ${targetUser} is ${score}% lucky today! ${msg}`);
		return true;
	}

	return false;
}

module.exports = { handleLuckyCommands };
