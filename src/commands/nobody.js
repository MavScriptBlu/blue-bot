/** @format */

const { sendChatMessage } = require("../api");
const state = require("../state");

function handleNobodyCommands(command, { broadcasterId, user, targetUser, ctx }) {
	if (command === "brick") {
		const b = Math.floor(Math.random() * 101);
		const m = b > 80 ? "Fully bricked. 🧱🔥" : b > 40 ? "Feeling some type of way... 👀" : "Soft as a pillow. ☁️";
		sendChatMessage(broadcasterId, `${user} is ${b}% bricked up right now! ${m}`);
		return true;
	}

	if (command === "ass") {
		const picks = ["if I dont know I guess", "uncultured swine", "even a broken clock is right twice a day"];
		sendChatMessage(broadcasterId, picks[Math.floor(Math.random() * picks.length)]);
		return true;
	}

	if (command === "bowl") {
		sendChatMessage(broadcasterId, `@${ctx.streamerName} about to spark a bowl. Let's get blazed 🔥💨!`);
		return true;
	}

	if (command === "cheers") {
		sendChatMessage(broadcasterId, "🔥Raise your glass! Raise you spirits! Let's get high!💨");
		return true;
	}

	if (command === "crazy") {
		const picks = ["im not crazy ur crazy", "ill show u crazy bruh", "hahahahhaha maybe a lil crazy"];
		sendChatMessage(broadcasterId, picks[Math.floor(Math.random() * picks.length)]);
		return true;
	}

	if (command === "death") {
		const reasons = [
			"The lag is real! 🌐",
			"That guy is definitely hacking. 🤖",
			"I was too busy lighting up. 🍃💨",
			"He's literally one shot! How?! 🔫",
			"My controller disconnected, I swear! 🎮",
		];
		sendChatMessage(broadcasterId, reasons[Math.floor(Math.random() * reasons.length)]);
		return true;
	}

	if (command === "fuck") {
		sendChatMessage(broadcasterId, `${user} thoroughly fucked ${targetUser}!`);
		return true;
	}

	if (command === "funny") {
		const picks = ["cool coool coool coool", "gotta riskit for the biscuit", "hold this sweetie"];
		sendChatMessage(broadcasterId, picks[Math.floor(Math.random() * picks.length)]);
		return true;
	}

	if (command === "games") {
		const picks = ["Warzone", "Zombies", "Multiplayer"];
		sendChatMessage(broadcasterId, picks[Math.floor(Math.random() * picks.length)]);
		return true;
	}

	if (command === "gotit") {
		const picks = ["10-4 rubber ducky", "please sir dry my wets", "banana bread at work duuuu hell ya"];
		sendChatMessage(broadcasterId, picks[Math.floor(Math.random() * picks.length)]);
		return true;
	}

	if (command === "gulag") {
		const results = [
			"is winning that 1v1 with a rock! 🪨",
			"is coming back to the lobby. EZ. ✈️",
			"got punched out. Back to the main menu... 💀",
			"is waiting for a jailbreak! ⛓️",
		];
		sendChatMessage(broadcasterId, `@${ctx.streamerName} ${results[Math.floor(Math.random() * results.length)]}`);
		return true;
	}

	if (command === "high") {
		const f = Math.floor(Math.random() * 120);
		const m = f > 100 ? "Manual breathing engaged. 😶‍🌫️" : f > 60 ? "In the clouds. ☁️" : "Barely buzzed. 🍃";
		sendChatMessage(broadcasterId, `${user} is ${f}% faded! ${m}`);
		return true;
	}

	if (command === "hug") {
		sendChatMessage(broadcasterId, `${user} Hugged ${targetUser}! This user has been hugged! 🤗`);
		return true;
	}

	if (command === "key") {
		sendChatMessage(broadcasterId, "ANOTHER ONE! Major key alert! 🔑🔑");
		return true;
	}

	if (command === "lag") {
		const m = [
			"He's not gone, he's just playing in 0.5 FPS mode. 🐢",
			"The internet saw his gameplay and decided to give him a timeout. 😂",
			"Don't panic! He's just rebooting the potato. 🥔✨",
		];
		sendChatMessage(broadcasterId, m[Math.floor(Math.random() * m.length)]);
		return true;
	}

	if (command === "loadout") {
		sendChatMessage(broadcasterId, "smg: Vel46 | ar: Peacekeeper | sniper: LR7.62");
		return true;
	}

	if (command === "meta") {
		const guns = ["STG44", "Static-HV", "Superi 46", "Kar98k", "SVA 545"];
		sendChatMessage(
			broadcasterId,
			`The current meta is ${guns[Math.floor(Math.random() * guns.length)]}... or just use whatever @${ctx.streamerName} is using and hope for the best! 🔫`,
		);
		return true;
	}

	if (command === "quotes") {
		const m = ["Don't risk it for the biscuit", "Gotter Otter 🌊💙", "Whatever's Clever"];
		sendChatMessage(broadcasterId, m[Math.floor(Math.random() * m.length)]);
		return true;
	}

	if (command === "rage") {
		sendChatMessage(broadcasterId, `@${ctx.streamerName} has crashed out ${state.hitCount} times today. Someone pass the 🍃 to calm him down!`);
		return true;
	}

	if (command === "rip") {
		sendChatMessage(broadcasterId, `@${ctx.streamerName} took a rip out of his bong cheers 🔥💨🔥`);
		return true;
	}

	if (command === "shit") {
		sendChatMessage(broadcasterId, "This shit itches my brain and I like it. 🫠😏🧠🧠🧠🧠🧠🤯🤯🤯💣💣💣🤫🤫🤫🤫");
		return true;
	}

	if (command === "smell") {
		const picks = [
			"you smell different when ur awake",
			"you smell so good I need a new belt",
			"you smell like you got a pretty mouth",
		];
		sendChatMessage(broadcasterId, picks[Math.floor(Math.random() * picks.length)]);
		return true;
	}

	if (command === "smokin") {
		const picks = ["smokin aces", "battabing batta boom", "smoke em boys"];
		sendChatMessage(broadcasterId, picks[Math.floor(Math.random() * picks.length)]);
		return true;
	}

	if (command === "stab") {
		sendChatMessage(broadcasterId, `${user} Stabbed ${targetUser}! This user has been stabbed! 🔪`);
		return true;
	}

	if (command === "sweat") {
		const s = Math.floor(Math.random() * 101);
		const m = s > 80 ? "Full CDL skin mode. 😰" : s > 40 ? "Just a casual sweat. 💧" : "Chillin in a bot lobby. 😎";
		sendChatMessage(broadcasterId, `${user} is ${s}% sweaty right now! ${m}`);
		return true;
	}

	if (command === "torch") {
		sendChatMessage(broadcasterId, `${targetUser} is torching up...! 🕯️🔥`);
		return true;
	}

	if (command === "weed") {
		const picks = [
			"take a hit from the bong",
			"blunt blazin",
			"you ever look at the back of a twenty dollar bill... on weed?",
		];
		sendChatMessage(broadcasterId, picks[Math.floor(Math.random() * picks.length)]);
		return true;
	}

	if (command === "w") {
		const responses = [
			"Another Dub for the stash! 🏆🍃",
			"MrNobodyisback just smoked the whole lobby. Literally. 💨😵‍💫",
			"EZ Dub. Time for a victory bowl! 🥣✨",
			"They really let a guy this faded win? GG! 😂🥦",
			"Target down, vibes up. That's a Warzone Win! 🎮🔥",
		];
		sendChatMessage(broadcasterId, responses[Math.floor(Math.random() * responses.length)]);
		return true;
	}

	if (command === "done") {
		const m = [
			"BANNED. (Not really, but imagine) 🚫",
			"Straight to horny jail. ⛓️",
			"Someone get this man a cold shower. 🚿",
			"You're actually done. Log off. 😂",
			"Go sit in the corner and think about what you said. 🧱",
		];
		sendChatMessage(broadcasterId, `@${ctx.streamerName} ${m[Math.floor(Math.random() * m.length)]}`);
		return true;
	}

	if (command === "sus") {
		const s = Math.floor(Math.random() * 101);
		const m = s > 80 ? "Caught in 4K. 📸" : s > 40 ? "That's a bit suspicious... 👀" : "Totally innocent. 😇";
		sendChatMessage(broadcasterId, `${user} is ${s}% SUS right now! ${m}`);
		return true;
	}

	return false;
}

module.exports = { handleNobodyCommands };
