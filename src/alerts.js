/** @format */

const { sendChatMessage, lookupTwitchUser } = require("./api");
const { DEFAULT_CTX } = require("./config");
const { getChannelConfig } = require("./channels");
const { broadcast } = require("./eventBus");
const { ts } = require("./utils");

function pick(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}

// --- FOLLOW ALERT ---
async function handleFollow(event) {
	const channelId = event.broadcaster_user_id;
	const follower = event.user_name;
	const followerLogin = (event.user_login || follower).toLowerCase();
	const ctx = getChannelConfig(channelId) || DEFAULT_CTX;
	console.log(`${ts()} 💚 [follow] ${follower} → ${event.broadcaster_user_name}`);

	const link = `https://twitch.tv/${followerLogin}`;

	if (ctx.isWarzoneStreamer) {
		const picks = [
			`🪖 Eyyy welcome to the squad, @${follower}! Drop in and get loud. 💨`,
			`🎯 @${follower} just locked into ${ctx.streamerName}'s loadout! Don't forget your loadout drop. 💀`,
			`💥 New operator deployed: @${follower}! Squad up, we're vibin'. 🔥`,
		];
		sendChatMessage(channelId, pick(picks));
	} else {
		const picks = [
			`💙 Welcome to the family, @${follower}! Stitch sends a virtual headpat. 👽`,
			`🌀 @${follower} just joined the chaos crew! Glad to have you. 💻`,
			`✨ A new ohana member spotted: @${follower}! 💙 You're home now.`,
		];
		sendChatMessage(channelId, pick(picks));
	}

	// Look up avatar for the overlay
	const user = await lookupTwitchUser(followerLogin);
	broadcast(channelId, "follow", {
		username: followerLogin,
		displayName: follower,
		avatarUrl: user ? user.profile_image_url : null,
		link,
	});
}

// --- SUBSCRIBE ALERT ---
async function handleSubscribe(event) {
	const channelId = event.broadcaster_user_id;
	const sub = event.user_name;
	const subLogin = (event.user_login || sub).toLowerCase();
	const tierMap = { "1000": "Tier 1", "2000": "Tier 2", "3000": "Tier 3" };
	const tier = tierMap[event.tier] || event.tier;
	const isGift = event.is_gift;
	const ctx = getChannelConfig(channelId) || DEFAULT_CTX;
	console.log(`${ts()} 💜 [sub] ${sub} → ${event.broadcaster_user_name} (${tier}, gift=${isGift})`);

	const link = `https://twitch.tv/${subLogin}`;

	if (isGift) {
		sendChatMessage(channelId, `🎁 BIG ENERGY — @${sub} got gifted a ${tier} sub! Pay it forward, fam! 💜`);
	} else if (ctx.isWarzoneStreamer) {
		const picks = [
			`💥 @${sub} just locked in a ${tier} sub! Welcome to the elite squad! 🪖🔥`,
			`💜 ${tier} sub from @${sub}! Loadout upgraded. Tactical hug incoming. 🤝`,
			`🚨 ALERT: @${sub} subbed at ${tier}! Send some serious respect in chat! 💪`,
		];
		sendChatMessage(channelId, pick(picks));
	} else {
		const picks = [
			`💜 @${sub} just subbed at ${tier}! Welcome to ohana, you legend! 👽💙`,
			`✨ ${tier} sub alert from @${sub}! Stitch is doing a victory dance. 🚀💜`,
			`🌀 SUB DROP: @${sub} (${tier}) — we love you forever now. 💙`,
		];
		sendChatMessage(channelId, pick(picks));
	}

	const user = await lookupTwitchUser(subLogin);
	broadcast(channelId, "subscribe", {
		username: subLogin,
		displayName: sub,
		tier,
		isGift,
		avatarUrl: user ? user.profile_image_url : null,
		link,
	});
}

// --- RAID ALERT ---
async function handleRaid(event) {
	const channelId = event.to_broadcaster_user_id;
	const raider = event.from_broadcaster_user_name;
	const raiderLogin = (event.from_broadcaster_user_login || raider).toLowerCase();
	const viewers = event.viewers;
	const ctx = getChannelConfig(channelId) || DEFAULT_CTX;
	console.log(`${ts()} 🚨 [raid] ${raider} → ${event.to_broadcaster_user_name} with ${viewers} viewers`);

	const link = `https://twitch.tv/${raiderLogin}`;

	if (ctx.isWarzoneStreamer) {
		sendChatMessage(
			channelId,
			`🚨💥 INCOMING RAID! @${raider} just brought ${viewers} operators into the lobby! Loadouts ready, hype maxed! Drop a follow → ${link} 🪖🔥`,
		);
	} else {
		sendChatMessage(
			channelId,
			`🚨💙 RAID INCOMING! @${raider} brought ${viewers} legends through the portal! 🌀 Welcome ohana! Go show them love → ${link} ✨`,
		);
	}

	const user = await lookupTwitchUser(raiderLogin);
	broadcast(channelId, "raid", {
		username: raiderLogin,
		displayName: raider,
		viewers,
		avatarUrl: user ? user.profile_image_url : null,
		link,
	});
}

module.exports = { handleFollow, handleSubscribe, handleRaid };
