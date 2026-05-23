/** @format */

const { DEFAULT_CTX } = require("../config");
const { getChannelConfig } = require("../channels");
const { isIgnoredBot } = require("../ignoredBots");
const { handleGlobalCommands } = require("./global");
const { handleBluCommands } = require("./blu");
const { handleNobodyCommands } = require("./nobody");
const { handleLuckyCommands } = require("./lucky");

// Personality module routing — keyed off Channel.customCommandsModule
const PERSONALITY_HANDLERS = {
	blu: handleBluCommands,
	nobody: handleNobodyCommands,
	lucky: handleLuckyCommands,
};

async function handleCommands(broadcasterId, username, displayName, message, perms = {}) {
	if (isIgnoredBot(username)) return;
	if (!message.startsWith("!")) return;

	const args = message.slice(1).trim().split(" ");
	const command = args.shift().toLowerCase();

	console.log(`💬 Command Received [In room ${broadcasterId} from ${displayName}]: !${command}`);

	const ctx = getChannelConfig(broadcasterId) || DEFAULT_CTX;
	const user = `@${displayName}`;
	const targetUser = args[0] ? args[0] : user;
	const passTarget = args[0] ? args[0] : "the chat";

	const params = {
		broadcasterId,
		username,
		displayName,
		user,
		targetUser,
		passTarget,
		args,
		ctx,
		isMod: !!perms.isMod,
		isBroadcaster: !!perms.isBroadcaster,
	};

	if (await handleGlobalCommands(command, params)) return;

	// Route to the personality module configured for this channel
	const personalityKey = ctx.customCommandsModule;
	const handler = PERSONALITY_HANDLERS[personalityKey];
	if (handler) {
		handler(command, params);
	}
}

module.exports = { handleCommands };
