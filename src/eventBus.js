/** @format */

// Server-Sent Events broadcaster for OBS overlays.
// Each channel's overlay opens an SSE connection to /api/events?channel=ID
// and we push real-time events (welcome, follow, sub, raid) directly to it.

const { ts } = require("./utils");

// Map<channelId, Set<express.Response>> — multiple browser sources per channel allowed
const channelClients = new Map();

function addClient(channelId, res) {
	if (!channelClients.has(channelId)) channelClients.set(channelId, new Set());
	channelClients.get(channelId).add(res);
	console.log(`${ts()} 📡 [eventBus] Overlay connected for channel ${channelId} (total: ${channelClients.get(channelId).size})`);
}

function removeClient(channelId, res) {
	const clients = channelClients.get(channelId);
	if (clients) {
		clients.delete(res);
		console.log(`${ts()} 📡 [eventBus] Overlay disconnected for channel ${channelId} (remaining: ${clients.size})`);
	}
}

function broadcast(channelId, eventType, data) {
	const clients = channelClients.get(channelId);
	if (!clients || clients.size === 0) return;
	const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
	for (const res of clients) {
		try {
			res.write(payload);
		} catch (e) {
			// dead connection — will be cleaned up on next 'close' event
		}
	}
	console.log(`${ts()} 📡 [eventBus] Broadcast '${eventType}' to ${clients.size} overlay(s) on channel ${channelId}`);
}

module.exports = { addClient, removeClient, broadcast };
