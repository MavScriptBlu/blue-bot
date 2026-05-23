/** @format */

// Lightweight YouTube Data API v3 search wrapper.
// Requires YOUTUBE_API_KEY in your .env file.

// Tiny in-memory cache so repeated requests for the same title don't burn quota.
// Lives for the bot process lifetime — clears on restart, which is fine.
const searchCache = new Map();
const CACHE_MAX = 500;

async function searchYouTube(query) {
	if (!query || !query.trim()) return null;

	const apiKey = process.env.YOUTUBE_API_KEY;
	if (!apiKey) {
		console.warn("⚠️ YOUTUBE_API_KEY missing from .env — can't search by title. Add it to enable title-based !sr.");
		return null;
	}

	const normalized = query.trim().toLowerCase();
	if (searchCache.has(normalized)) {
		return searchCache.get(normalized);
	}

	const url = new URL("https://www.googleapis.com/youtube/v3/search");
	url.searchParams.set("part", "snippet");
	url.searchParams.set("type", "video");
	url.searchParams.set("maxResults", "1");
	url.searchParams.set("videoEmbeddable", "true"); // filter out unembeddable results
	url.searchParams.set("q", query);
	url.searchParams.set("key", apiKey);

	try {
		const res = await fetch(url.toString());
		const data = await res.json();

		if (data.error) {
			console.error(`❌ YouTube API error [${data.error.code}]:`, data.error.message);
			return null;
		}

		if (!data.items || data.items.length === 0) {
			return null;
		}

		const top = data.items[0];
		const result = {
			videoId: top.id.videoId,
			title: top.snippet.title,
			channel: top.snippet.channelTitle,
		};

		// LRU-ish eviction — when cache hits cap, drop oldest entry
		if (searchCache.size >= CACHE_MAX) {
			const firstKey = searchCache.keys().next().value;
			searchCache.delete(firstKey);
		}
		searchCache.set(normalized, result);

		return result;
	} catch (err) {
		console.error("❌ YouTube search failed:", err.message);
		return null;
	}
}

module.exports = { searchYouTube };
