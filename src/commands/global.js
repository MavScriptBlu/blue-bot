/** @format */

const { sendChatMessage } = require("../api");
const { model } = require("../ai");
const { setFlexTimer, clearTimersForChannel, getTimersForChannel } = require("../aiTools");
const state = require("../state");

async function handleGlobalCommands(command, { broadcasterId, user, targetUser, passTarget, args, ctx, displayName, isMod }) {
	if (command === "commands" || command === "help") {
		const subCategory = args[0] ? args[0].toLowerCase() : null;

		if (!subCategory) {
			sendChatMessage(broadcasterId, `@${displayName} 📋 Use these to browse: !commands core | !commands fun | !commands games`);
			return true;
		}

		if (subCategory === "core") {
			sendChatMessage(broadcasterId, `🌐 Core: !blu, !mrnobody, !hello, !lurk, !discord, !socials, !coffee, !hydrate, !ask, !bluebot, !so, !sr, !queue, !skip, !listtimers`);
			return true;
		}

		if (subCategory === "fun") {
			sendChatMessage(broadcasterId, `🌀 Fun: !vibe, !brat, !downboy, !dick, !hoes, !420, !pass, !lighter, !fmk, !hit, !bin`);
			return true;
		}

		if (subCategory === "games") {
			if (ctx.isWarzoneStreamer) {
				sendChatMessage(broadcasterId, `🎮 Warzone: !brick, !ass, !bowl, !cheers, !crazy, !death, !funny, !games, !gotit, !gulag, !key, !lag, !loadout, !meta, !quotes, !rage, !rip, !smell, !smokin, !sweat, !torch, !weed, !w, !done, !sus`);
			} else if (broadcasterId === process.env.MY_TWITCH_ID) {
				sendChatMessage(broadcasterId, `💻 Chaos: !bugreport, !hype, !maddz, !ban, !bonk, !comfort, !fuck, !hug, !stab, !headpat, !chaoslevel, !d20, !stitch, !whatdoing, !syntax`);
			} else if (broadcasterId === process.env.LUCKY_TWITCH_ID) {
				sendChatMessage(broadcasterId, `🍀 Lucky's Games: !drop, !rng, !sonar, !scan, !reaper, !lucky`);
			} else {
				sendChatMessage(broadcasterId, `🎮 No channel-specific commands set up yet!`);
			}
			return true;
		}

		// Unknown subcategory fallback
		sendChatMessage(broadcasterId, `@${displayName} Unknown category! Try: !commands core | !commands fun | !commands games`);
		return true;
	}

	if (command === "blu") {
		sendChatMessage(
			broadcasterId,
			`Blu is the brilliant mind behind MavScript.blu! 🌀 She's a tech systems engineer, software builder, and our code family captain. Check out her projects here: https://beacons.ai/mavscriptblu 💻💙`,
		);
		return true;
	}

	if (command === "mrnobody" || command === "nobody") {
		sendChatMessage(
			broadcasterId,
			`Shoutout to MrNobodyisback! 👑 The man, the myth, the absolute sweat of the lobby. Go drop a follow → https://twitch.tv/mrnobodyisback 🔥💨`,
		);
		return true;
	}

	if (command === "hello" || command === "hi") {
		if (ctx.isWarzoneStreamer) {
			const picks = [
				"Welcome to the stream!",
				"Great to see you here!",
				"Hope you're having an awesome day!",
				"Grab a seat and enjoy the vibes!",
				`Eyyy ${user}! The party just got 10% more chaotic.`,
				"Hidey-ho! Ready to get weird?",
				"Yo! Pull up a chair and spark one up with us. 💨",
				"Glad you could make it. We were just talking about you (only good things, I swear). 😇",
				"Welcome in! Sending nothing but high vibes your way. 🔥",
			];
			sendChatMessage(broadcasterId, picks[Math.floor(Math.random() * picks.length)]);
		} else {
			sendChatMessage(broadcasterId, `Hello there, @${displayName}! 💙 Welcome to the stream!`);
		}
		return true;
	}

	if (command === "lurk") {
		if (ctx.isWarzoneStreamer) {
			const picks = [
				"is going undercover to investigate the vibes",
				"is running a background simulation. Still here, just recalibrating! 🤖🔬",
				"says: You cant see me... he cant see me. Nobody can see me",
				"is refilling their coffee ☕",
				"is checking their schedule 💤",
			];
			sendChatMessage(broadcasterId, `${user} ${picks[Math.floor(Math.random() * picks.length)]}. See you soon! ✨`);
		} else {
			const picks = [
				"is going undercover to investigate the shadows...",
				"has deployed the tactical blanket.",
				"is hiding behind the houseplants!",
			];
			sendChatMessage(broadcasterId, `${user} ${picks[Math.floor(Math.random() * picks.length)]} Thanks for the view! 💙`);
		}
		return true;
	}

	if (command === "discord") {
		sendChatMessage(broadcasterId, `Join ${ctx.streamerName}'s community on Discord! ${ctx.discordLink}`);
		return true;
	}

	if (command === "socials") {
		sendChatMessage(broadcasterId, `Catch ${ctx.streamerName} across the web! Check out the links here: ${ctx.socialsLink}`);
		return true;
	}

	if (command === "coffee") {
		sendChatMessage(broadcasterId, `${user} hands ${ctx.streamerName} a fresh cup of coffee ☕ Thanks!`);
		return true;
	}

	if (command === "hydrate") {
		sendChatMessage(broadcasterId, `${user} is reminding ${ctx.streamerName} to hydrate! Brain cells need water. 💧`);
		return true;
	}

	if (command === "dick") {
		const size = Math.floor(Math.random() * 30) + 1;
		if (ctx.isWarzoneStreamer) {
			sendChatMessage(broadcasterId, `${targetUser} has a ${size} inch Dick! Make sure you duck when they swing that thing or not up to you!!`);
		} else {
			sendChatMessage(broadcasterId, `${targetUser} has a ${size} inch Dick!`);
		}
		return true;
	}

	if (command === "hoes") {
		const hoesCount = Math.floor(Math.random() * 70);
		if (ctx.isWarzoneStreamer) {
			sendChatMessage(broadcasterId, `${targetUser} has ${hoesCount} hoes. They keepin that pimp hand 🖐️strong!!`);
		} else {
			sendChatMessage(broadcasterId, `${targetUser} has ${hoesCount} hoes. They keepin busy.`);
		}
		return true;
	}

	if (command === "vibecheck" || command === "vibe" || command === "vibin") {
		const vibeScore = Math.floor(Math.random() * 101);
		let statusMsg = "Getting sweaty in here! 💦";
		if (vibeScore > 80) statusMsg = "The vibes are immaculate. 🚀";
		else if (vibeScore > 40) statusMsg = "We chillin. 🍃";

		if (ctx.isWarzoneStreamer) {
			sendChatMessage(broadcasterId, `Current Vibe: ${vibeScore}% - ${statusMsg}`);
		} else {
			sendChatMessage(broadcasterId, `${targetUser}, vibe score is ${vibeScore}% - ${statusMsg}`);
		}
		return true;
	}

	if (command === "brat") {
		const bratScore = Math.floor(Math.random() * 101);
		let statusMsg = "Perfect Angel. ✨";
		if (bratScore > 80) statusMsg = "Total Brat Energy. 😈";
		else if (bratScore > 40) statusMsg = "Being a little difficult... 😇";

		if (ctx.isWarzoneStreamer) {
			sendChatMessage(broadcasterId, `Blu is ${bratScore}% Brat today! ${statusMsg}`);
		} else {
			sendChatMessage(broadcasterId, `${targetUser} is ${bratScore}% Brat today! ${statusMsg}`);
		}
		return true;
	}

	if (command === "downboy") {
		const downScore = Math.floor(Math.random() * 101);
		let statusMsg = "Stayin' pure. 🙏";
		if (downScore > 80) statusMsg = "Seek help immediately. 💀";
		else if (downScore > 40) statusMsg = "Checking the socials daily. 👀";
		sendChatMessage(broadcasterId, `${targetUser} is ${downScore}% down bad! ${statusMsg}`);
		return true;
	}

	if (command === "420") {
		if (ctx.isWarzoneStreamer) {
			sendChatMessage(broadcasterId, "SMOKE WEED ERRYDAY! <3 Puff, puff pass baybee💨!");
		} else {
			sendChatMessage(broadcasterId, `SMOKE WEED ERRYDAY! <3 Puff, puff pass! 🍃`);
		}
		return true;
	}

	if (command === "pass" || command === "doob") {
		const items = ["the virtual blunt 🍃", "the tactical snack 🥨", "the stim shot 💉", "the victory bowl 🥣"];
		sendChatMessage(broadcasterId, `${user} passed ${items[Math.floor(Math.random() * items.length)]} to ${passTarget}! Puff puff pass! 💨`);
		return true;
	}

	if (command === "lighter") {
		const picks = [
			"Check your pocket... the other one",
			"It's in your hand isn't it",
			"Have you tried the couch cushions?",
			"The void claims another one",
			"Lighter said: ✌️ I'm out",
			"Plot twist: it was in your hand the whole time",
			"Chat, place your bets on where it is!",
			"Breaking news: Local streamer loses lighter AGAIN",
		];
		if (ctx.isWarzoneStreamer) {
			sendChatMessage(broadcasterId, `@MavScriptBlu lost her lighter! ${picks[Math.floor(Math.random() * picks.length)]}`);
		} else {
			const lighterQuotes = ["Check your pockets!", "Check the couch!", "It's gone forever.", "Someone totally pocketed it."];
			sendChatMessage(broadcasterId, `${user} lost her lighter! ${lighterQuotes[Math.floor(Math.random() * lighterQuotes.length)]}`);
		}
		return true;
	}

	if (command === "bluebot") {
		sendChatMessage(broadcasterId, `I am Blue-Bot, built by MavScriptBlu to help run this ship! 🚀`);
		return true;
	}

	if (command === "ask") {
		const prompt = args.join(" ");
		if (!prompt) {
			sendChatMessage(broadcasterId, "Ask me something! e.g., !ask What is a router?");
			return true;
		}
		try {
			sendChatMessage(broadcasterId, "Thinking... 🧠");
			const result = await model.generateContent(prompt);
			const response = result.response;

			// Check if Gemini wants to call a tool instead of replying with text
			const calls = response.functionCalls(); // NOTE: method, not property
			console.log(`🧠 [ask] "${prompt.slice(0, 60)}" → ${calls ? calls.length : 0} tool call(s)`);
			if (calls && calls.length > 0) {
				const call = calls[0];
				console.log(`🛠️ [ask] tool=${call.name} args=${JSON.stringify(call.args)}`);
				if (call.name === "setFlexTimer") {
					const { minutes, message } = call.args;
					await setFlexTimer(broadcasterId, minutes, message);
					sendChatMessage(broadcasterId, `@${displayName} Got it! I'll remind chat every ${minutes} min(s): "${message}" 👽💙`);
					return true;
				}
			}

			// No tool call — plain text response
			const responseText = response.text().replace(/\n/g, " ");
			sendChatMessage(broadcasterId, `@${displayName} ${responseText.slice(0, 400)}`);
		} catch (err) {
			console.error("AI Error:", err);
			sendChatMessage(broadcasterId, "My brain is freezing up! 🥶");
		}
		return true;
	}

	if (command === "hit") {
		const action = args[0];
		if (action === "add") {
			state.hitCount++;
			sendChatMessage(broadcasterId, `hits today 🍃💨: ${state.hitCount}`);
		} else if (action === "sub" && state.hitCount > 0) {
			state.hitCount--;
			sendChatMessage(broadcasterId, `hits today 🍃💨: ${state.hitCount}`);
		} else {
			sendChatMessage(broadcasterId, `Current hits: ${state.hitCount} 🍃💨`);
		}
		return true;
	}

	if (command === "fmk") {
		try {
			const response = await fetch(
				`https://api.twitch.tv/helix/chat/chatters?broadcaster_id=${broadcasterId}&moderator_id=${process.env.BOT_USER_ID}`,
				{
					headers: {
						Authorization: "Bearer " + process.env.OAUTH_TOKEN,
						"Client-Id": process.env.CLIENT_ID,
					},
				},
			);
			const data = await response.json();
			const chatters = data.data && data.data.length > 0 ? data.data.map((v) => v.user_name) : [];
			const shuffled = chatters.sort(() => 0.5 - Math.random());
			const target1 = shuffled[0] || "a plush bunny";
			const target2 = shuffled[1] || "the Ghost in the corner";
			const target3 = shuffled[2] || "a 5-axis CNC machine";
			sendChatMessage(broadcasterId, `${targetUser} fucked ${target1}, married ${target2}, and killed ${target3}! 😈`);
		} catch (error) {
			console.error("❌ Failed to fetch chatters for !fmk:", error);
		}
		return true;
	}

	// --- INTEGRATED SONG REQUEST LAYER (per-channel via MongoDB) ---
	if (command === "sr" || command === "songrequest") {
		const songInput = args.join(" ");
		if (!songInput) {
			sendChatMessage(broadcasterId, `@${displayName}, drop a song title or YouTube link! e.g., !sr one winged airplane ryan caraveo`);
			return true;
		}

		// Step 1: Try to extract a YouTube video ID directly from a pasted URL.
		const ytRegex = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/;
		const urlMatch = songInput.match(ytRegex);
		let videoId = urlMatch ? urlMatch[1] : null;
		let resolvedTitle = songInput;
		let resolvedVia = null;

		// Step 2: No URL? Search YouTube by title.
		if (!videoId) {
			const { searchYouTube } = require("../youtube");
			const result = await searchYouTube(songInput);
			if (result) {
				videoId = result.videoId;
				resolvedTitle = result.title;
				resolvedVia = result.channel;
			}
		}

		const result = await state.addSong(broadcasterId, {
			requestedBy: displayName,
			title: resolvedTitle,
			originalQuery: songInput,
			videoId,
		});

		if (!result.ok && result.reason === "queue_full") {
			sendChatMessage(broadcasterId, `🚫 Queue is full! Max ${state.MAX_QUEUE_SIZE} songs. Wait for some to play through, ${user}! 🎵`);
			return true;
		}

		if (videoId) {
			const channelTag = resolvedVia ? ` by ${resolvedVia}` : "";
			sendChatMessage(
				broadcasterId,
				`🎵 Added: "${resolvedTitle.slice(0, 70)}"${channelTag} (requested by @${displayName}) | #${result.position}/${state.MAX_QUEUE_SIZE} 🎬`,
			);
		} else {
			sendChatMessage(
				broadcasterId,
				`🎵 Added text-only entry: "${songInput.slice(0, 80)}" (couldn't find a playable match) | #${result.position}/${state.MAX_QUEUE_SIZE} 📝`,
			);
		}
		return true;
	}

	if (command === "queue" || command === "current") {
		const queue = await state.getQueueForChannel(broadcasterId);
		if (queue.length === 0) {
			const fallback = state.backupPlaylist[Math.floor(Math.random() * state.backupPlaylist.length)];
			sendChatMessage(broadcasterId, `📻 The queue is empty! Currently playing backup stream: [${fallback}]`);
			return true;
		}

		const nextSongs = queue.slice(0, 3).map((s, idx) => `#${idx + 1}: ${s.title}`).join(" | ");
		sendChatMessage(broadcasterId, `📋 Up Next: ${nextSongs.slice(0, 400)} (${queue.length}/${state.MAX_QUEUE_SIZE} total)`);
		return true;
	}

	if (command === "skip") {
		const skipped = await state.popNextSong(broadcasterId);
		if (!skipped) {
			sendChatMessage(broadcasterId, `📻 Queue is already empty, ${user}!`);
			return true;
		}
		sendChatMessage(broadcasterId, `⏭️ Skipped: "${skipped.title}" (requested by @${skipped.requestedBy}). Moving down the pipeline grid...`);
		return true;
	}

	// --- THEMED COMMUNITY INTERACTION ---
	if (command === "bin" || command === "trash") {
		if (!args[0]) {
			sendChatMessage(broadcasterId, `@${displayName}, tag a silly goose to drop in the trash! 🗑️`);
			return true;
		}

		const trashQuotes = [
			"Lid opened. Target successfully dropped into the recycling bin. 🗑️♻️",
			"CRITICAL COOLDOWN: That take was so radioactive it had to be sealed in a lead-lined dumpster. ☢️🔥",
			"Skitters away with target to build a spaceship out of junk parts! 👽🚀",
			"Purging bad vibes. Compacting chassis now... Done! 🔨🤖",
			"Compressed into a neat little cube. Recycling Day approved! ♻️📦",
			"Sent to the shadow realm via curbside pickup. 🌑🚛",
			"Ejected into low orbit. Re-entry scheduled for never. 🛰️💫",
		];

		const action = trashQuotes[Math.floor(Math.random() * trashQuotes.length)];
		sendChatMessage(broadcasterId, `🗑️ [TRASH VIGILANTE] ${user} just tossed ${targetUser} into the bin! Result: ${action}`);
		return true;
	}

	// --- REMINDER TIMER MANAGEMENT (per-channel via MongoDB) ---
	if (command === "listtimers" || command === "timers") {
		const list = await getTimersForChannel(broadcasterId);
		if (list.length === 0) {
			sendChatMessage(broadcasterId, `📭 No active timers, ${user}.`);
			return true;
		}
		const summary = list
			.slice(0, 5)
			.map((t, i) => `#${i + 1}: every ${t.minutes}min - "${t.message.slice(0, 40)}"`)
			.join(" | ");
		sendChatMessage(broadcasterId, `⏰ Active timers (${list.length}): ${summary.slice(0, 400)}`);
		return true;
	}

	if (command === "cleartimers") {
		if (!isMod) {
			sendChatMessage(broadcasterId, `@${displayName} only mods/broadcaster can clear timers. 🛡️`);
			return true;
		}
		const count = await clearTimersForChannel(broadcasterId);
		sendChatMessage(
			broadcasterId,
			count > 0 ? `🧹 Cleared ${count} active timer(s). Slate wiped!` : `📭 No active timers to clear, ${user}.`,
		);
		return true;
	}

	if (command === "so") {
		try {
			const targetName = args[0] ? args[0].replace("@", "") : null;
			if (!targetName) {
				sendChatMessage(broadcasterId, `You need to tag someone to shout them out!`);
				return true;
			}
			const userRes = await fetch(`https://api.twitch.tv/helix/users?login=${targetName}`, {
				headers: {
					Authorization: "Bearer " + process.env.OAUTH_TOKEN,
					"Client-Id": process.env.CLIENT_ID,
				},
			});
			const userData = await userRes.json();
			if (!userData.data || userData.data.length === 0) {
				sendChatMessage(broadcasterId, `Couldn't find a user named ${targetName}!`);
				return true;
			}
			const targetId = userData.data[0].id;
			const channelRes = await fetch(`https://api.twitch.tv/helix/channels?broadcaster_id=${targetId}`, {
				headers: {
					Authorization: "Bearer " + process.env.OAUTH_TOKEN,
					"Client-Id": process.env.CLIENT_ID,
				},
			});
			const channelData = await channelRes.json();
			const gameName =
				channelData.data && channelData.data.length > 0 && channelData.data[0].game_name
					? channelData.data[0].game_name
					: "something mysterious";
			sendChatMessage(
				broadcasterId,
				`Shoutout for @${targetName}! They were last seen playing ${gameName}. Drop them a follow → https://twitch.tv/${targetName.toLowerCase()} 💙`,
			);
		} catch (error) {
			console.error("❌ Failed to fetch SO data:", error);
		}
		return true;
	}

	return false;
}

module.exports = { handleGlobalCommands };
