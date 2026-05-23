<!-- @format -->

# Blue-Bot 🤖💙

A self-healing, multi-channel Twitch bot built by **MavScriptBlu** — written in pure Node.js with EventSub WebSockets, Google Gemini AI, YouTube playback in OBS, and modular per-streamer personalities.

---

## ✨ Features

### 💬 Chat & Commands

- **Global commands** that work in every channel: `!hello`, `!lurk`, `!ask` (Gemini AI), `!so`, `!fmk`, `!vibe`, `!brat`, and ~30 more
- **Per-streamer modules** with custom command sets (MrNobody warzone vibes, Lucky's Subnautica/Fortnite, Blu's chaos pack)
- **Paginated `!commands core | fun | games`** that respects Twitch's 500-character chat limit
- **First-time chatter Auto-SO** with stream title detection
- **Spam bot auto-ban** with promotional keyword detection

### 🎵 Music Request System

- **`!sr <song title>`** — Gemini-powered YouTube search picks the top result
- **`!sr <youtube_url>`** — paste any YouTube URL (watch, youtu.be, shorts, embed)
- **`!queue`** / **`!skip`** — list and advance the queue
- **OBS Browser Source overlay** with animated "Now Playing" card and auto-advance
- **Persistent queue** (`data/queue.json`) survives bot restarts
- 50-song cap, fallback playlist when queue empties

### 🚨 Stream Alerts

- **`channel.follow`** alerts with custom hype messages
- **`channel.subscribe`** alerts (requires broadcaster OAuth — see [Multi-Broadcaster Setup](#multi-broadcaster-setup))
- **`channel.raid`** alerts with auto-shoutout of the raider
- **First-message-of-stream** detection that resets each stream

### ⏰ AI-Powered Reminders

- **`!ask remind chat to hydrate every 5 minutes`** — Gemini detects the intent and arms a `setFlexTimer`
- **Persistent across bot restarts** (`data/timers.json`)
- **Auto-clear on `stream.offline`** event
- **`!listtimers`** to view, **`!cleartimers`** (mod-gated) to wipe

### 🛡️ Self-Healing & Reliability

- **Proactive 30-min token watchdog** refreshes OAuth before it expires
- **Zombie WebSocket detector** force-reconnects after 30 seconds of silence
- **401 self-healing** on every Helix API call (auto-refresh and retry)
- **`session_keepalive` + `session_reconnect`** EventSub message handling
- **Timestamped logs** for stream events, errors, and lifecycle moments

---

## 🛠️ Setup

### 1. Prerequisites

- **Node.js 18+** (needs native `fetch`)
- A **Twitch developer application** at [dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps)
- A **Google Generative AI API key** for Gemini at [aistudio.google.com](https://aistudio.google.com/)
- A **YouTube Data API v3 key** (free tier 10k/day) for `!sr` title search
- A **MongoDB Atlas cluster** (free tier is plenty) — see "MongoDB Setup" below

### 2. Twitch App Configuration

When creating your Twitch app, add these **OAuth Redirect URLs**:

```
http://localhost:3000/auth/callback
http://localhost:3000/auth/broadcaster-callback
```

Save the **Client ID** and **Client Secret** for the `.env` file below.

### 3. Install Dependencies

```bash
npm install
```

### 4. Create `.env`

```env
# --- TWITCH ---
CLIENT_ID=your_twitch_app_client_id
CLIENT_SECRET=your_twitch_app_client_secret
OAUTH_TOKEN=will_be_filled_by_auth_flow
REFRESH_TOKEN=will_be_filled_by_auth_flow

# Bot account user ID (the account that sends chat messages)
BOT_USER_ID=your_bot_account_user_id

# Channel(s) the bot should join (comma-separated user IDs)
CHAT_CHANNEL_USER_ID=your_channel_id,friend_channel_id,another_id

# Individual streamer IDs (for personality routing in commands)
MY_TWITCH_ID=your_personal_channel_id
NOBODY_TWITCH_ID=optional_friend_id
LUCKY_TWITCH_ID=optional_friend_id

# --- GEMINI AI ---
GEMINI_API_KEY=your_google_aistudio_key

# --- YOUTUBE SEARCH ---
YOUTUBE_API_KEY=your_youtube_data_api_v3_key

# --- MONGODB ---
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/bluebot?retryWrites=true&w=majority

# --- ADMIN API ---
ADMIN_API_KEY=pick_a_long_random_string_here  # used to gate /admin/* routes

# --- OPTIONAL ---
OVERLAY_PORT=3000                  # default Express port
PERSONALITY_ENABLED=true           # set to "false" to silence the random bot-thoughts loop entirely
PERSONALITY_MIN_MINUTES=30         # minimum delay between random bot thoughts
PERSONALITY_MAX_MINUTES=45         # maximum delay between random bot thoughts
```

### MongoDB Setup (3-minute Atlas walkthrough)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and sign up (free)
2. Create a new project → click **"Build a Database"**
3. Pick **M0 (FREE)** tier — choose any cloud provider/region near you
4. **Create a database user**:
   - Username: e.g., `bluebot`
   - Password: generate a strong one and save it
5. **Network access**:
   - Click "Add IP Address"
   - For dev: select **"Allow access from anywhere"** (`0.0.0.0/0`)
   - For production: lock down to your server's IP
6. Once the cluster is up, click **"Connect" → "Drivers" → "Node.js"**
7. Copy the connection string — looks like:
   ```
   mongodb+srv://bluebot:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
8. Replace `<password>` with your actual password, and add `bluebot` as the database name before the `?`:
   ```
   mongodb+srv://bluebot:YourPassword123@cluster0.xxxxx.mongodb.net/bluebot?retryWrites=true&w=majority
   ```
9. Paste it as `MONGODB_URI=...` in your `.env`

The bot will create collections automatically on first run (`broadcasterTokens` is the only one so far).

### 5. Initial OAuth Setup

Start the bot once:

```bash
node bot.js
```

Then, in a browser **logged in as your bot account** (not your personal Twitch), visit:

```
http://localhost:3000/auth/start
```

Authorize the bot — your `.env` will be auto-populated with `OAUTH_TOKEN` and `REFRESH_TOKEN`. Restart the bot.

### 6. (Optional) Multi-Broadcaster Setup

Each streamer who wants **sub alerts** in their channel needs to authorize the bot once.

Send them this URL (must be opened on a machine that can reach your local bot — or you can host this publicly):

```
http://localhost:3000/auth/broadcaster-start
```

Their tokens get stored in `data/broadcaster_tokens.json` (per-channel, automatically refreshed). View who has authorized at `/auth/broadcaster-status`.

---

## 📁 Project Structure

```
blue-bot/
├── bot.js                        # Entry point — boots auth, websocket, server, personality
├── package.json
├── .env                          # Secrets (gitignored)
│
├── src/
│   ├── auth.js                   # OAuth validation & refresh, 30-min watchdog
│   ├── api.js                    # Twitch Helix API helpers (sendChatMessage, banUser)
│   ├── ai.js                     # Gemini client setup with tool definitions
│   ├── aiTools.js                # Gemini tool implementations (setFlexTimer) + persistence
│   ├── alerts.js                 # Follow/Sub/Raid hype message functions
│   ├── broadcasterAuth.js        # Per-broadcaster OAuth token management
│   ├── config.js                 # Channel configs, streamer personalities
│   ├── personality.js            # Stitch-themed bot thought loop
│   ├── server.js                 # Express server: overlay assets, OAuth routes, queue API
│   ├── state.js                  # Shared mutable state, persistent song queue
│   ├── utils.js                  # Timestamp helper
│   ├── websocket.js              # Twitch EventSub WebSocket client + subscriptions
│   ├── youtube.js                # YouTube Data API search wrapper with cache
│   │
│   └── commands/
│       ├── index.js              # Command router (broadcaster -> personality module)
│       ├── global.js             # Commands available in every channel
│       ├── blu.js                # Blu's custom chaos commands
│       ├── nobody.js             # MrNobody warzone commands
│       └── lucky.js              # Lucky's game-specific commands
│
├── public/
│   └── index.html                # OBS Browser Source overlay (YouTube player + Now Playing card)
│
└── data/                         # Runtime state (gitignored)
    ├── queue.json                # Persistent song queue
    ├── timers.json               # Persistent reminder timers
    └── broadcaster_tokens.json   # Per-broadcaster OAuth tokens
```

---

## 🎛️ OBS Setup

The bot serves **TWO separate Browser Sources** per channel:

### 🎵 Music Overlay (song requests + Now Playing card)

1. **Add Browser Source** in OBS → name it "Blue-Bot Music"
2. **URL**: `http://localhost:3000/overlay/?channel=YOUR_BROADCASTER_ID`
3. **Width**: 1280, **Height**: 720
4. **Check**: "Refresh browser when scene becomes active"
5. **Check**: "Control audio via OBS"

### 🚨 Alerts Overlay (welcome, follow, sub, raid banners)

1. **Add Browser Source** in OBS → name it "Blue-Bot Alerts"
2. **URL**: `http://localhost:3000/alerts/?channel=YOUR_BROADCASTER_ID`
3. **Width**: 1280, **Height**: 720
4. **Check**: "Refresh browser when scene becomes active"

The alerts overlay pushes banners via Server-Sent Events the moment something fires — no polling delay. Animated entrance, color-coded by event type (green=follow, purple=sub, red=raid, blue=welcome), with confetti for subs + raids.

### Testing Alerts

Append `?test=<type>` to preview a banner without waiting for a real event:
- `http://localhost:3000/alerts/?channel=248515674&test=welcome`
- `http://localhost:3000/alerts/?channel=248515674&test=follow`
- `http://localhost:3000/alerts/?channel=248515674&test=subscribe`
- `http://localhost:3000/alerts/?channel=248515674&test=raid`

Songs requested in one channel will NOT appear in another channel's overlay — full per-channel isolation across both overlays.

---

## 🧪 Available Routes

| Route | Method | Purpose |
|---|---|---|
| `/overlay/` | GET | The OBS Browser Source HTML page |
| `/api/queue/current` | GET | Current song + queue length |
| `/api/queue` | GET | Full song queue |
| `/api/queue/advance` | POST | Pop the current song (called by overlay on track end) |
| `/api/health` | GET | Health check |
| `/api/log` | POST | Overlay phones home events to bot terminal |
| `/auth/start` | GET | OAuth flow for the BOT account |
| `/auth/callback` | GET | OAuth callback for the bot |
| `/auth/broadcaster-start` | GET | OAuth flow for individual broadcasters |
| `/auth/broadcaster-callback` | GET | OAuth callback for broadcasters |
| `/auth/broadcaster-status` | GET | Admin view of authorized broadcasters |
| `/alerts/?channel=ID` | GET | OBS alerts overlay (welcome, follow, sub, raid banners) |
| `/api/events?channel=ID` | GET | Server-Sent Events stream consumed by the alerts overlay |
| `/admin/channels` | GET | List all channels (requires `Authorization: Bearer ADMIN_API_KEY`) |
| `/admin/channels` | POST | Add a new channel |
| `/admin/channels/:id` | PATCH | Update a channel |
| `/admin/channels/:id` | DELETE | Remove a channel |
| `/admin/channels/:id/pause` | POST | Pause a channel — bot ignores all its events until resumed |
| `/admin/channels/:id/resume` | POST | Resume a paused channel — bot starts responding again immediately |
| `/admin/channels/reload` | POST | Force-reload channel cache from DB |
| `/admin/bots` | GET | List all ignored bot accounts |
| `/admin/bots` | POST | Add a bot to the ignore list (`{ "username": "newbot", "note": "..." }`) |
| `/admin/bots/:username` | DELETE | Remove a bot from the ignore list |

### Adding A New Streamer

**macOS / Linux / Git Bash:**
```bash
curl -X POST http://localhost:3000/admin/channels \
  -H "Authorization: Bearer YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "broadcasterId": "555555",
    "twitchLogin": "newstreamer",
    "streamerName": "NewStreamer",
    "isWarzoneStreamer": false,
    "customCommandsModule": null,
    "socialsLink": "https://twitch.tv/newstreamer",
    "discordLink": "https://discord.gg/example",
    "tier": "basic"
  }'
```

**Windows PowerShell** (use `curl.exe` to bypass the `Invoke-WebRequest` alias):
```powershell
curl.exe -X POST http://localhost:3000/admin/channels `
  -H "Authorization: Bearer YOUR_ADMIN_KEY" `
  -H "Content-Type: application/json" `
  -d '{\"broadcasterId\":\"555555\",\"twitchLogin\":\"newstreamer\",\"streamerName\":\"NewStreamer\",\"tier\":\"basic\"}'
```

Then restart the bot to pick up the new channel's EventSub subscriptions.

---

## 🩺 Debugging

### Overlay isn't playing audio

Add `?debug=1` to the overlay URL:
```
http://localhost:3000/overlay/?debug=1
```

A green debug panel appears in the top-right showing real-time player state. All overlay events also POST to `/api/log` → visible in your bot terminal as `🎬 [overlay] ...` lines.

### Chat commands not working

Check the terminal for `💬 Command Received` logs. If you don't see them, the EventSub WebSocket subscription is broken — usually a token scope issue. Run `/auth/start` again with the bot account.

### Token issues

The bot's 30-min watchdog should keep your token fresh automatically. If you see `401 Unauthorized` on a Helix call, the watchdog will auto-refresh and the next call will succeed. If your **bot account's** OAuth token gets desynced, run `/auth/start` again.

### Sub alerts not working in a friend's channel

That broadcaster needs to authorize via `/auth/broadcaster-start`. Twitch's `channel:read:subscriptions` scope is per-broadcaster — there's no way around it. Check `/auth/broadcaster-status` to see who has authorized.

---

## 🧠 Architecture Notes

### Bot vs Broadcaster Tokens

| Token | Stored in | Used for |
|---|---|---|
| **Bot token** | `.env` (`OAUTH_TOKEN`) | Sending chat, banning users, subscribing to chat.message + follow events as a mod |
| **Broadcaster tokens** | `data/broadcaster_tokens.json` | Channel-specific scopes the broadcaster controls (subs, channel points, bits) |

When `websocket.js` subscribes to a `channel.subscribe` event, it automatically looks up the broadcaster's token from the JSON file instead of using the bot's token.

### Persistence Strategy

Hybrid model — JSON files for runtime state that doesn't need multi-instance sharing, MongoDB for data that's part of the platform:

| Data | Storage | Collection |
|---|---|---|
| **Broadcaster OAuth tokens** | MongoDB | `broadcasterTokens` |
| **Channel configs** | MongoDB | `channels` |
| **Song queues (per-channel)** | MongoDB | `songQueueEntries` |
| **Reminder timers (per-channel)** | MongoDB | `timers` |

**Legacy migrations** run automatically on startup — if old JSON files (`broadcaster_tokens.json`, `timers.json`) are present, their contents move into Mongo, then the files get renamed to `.migrated` so it doesn't run again.

### Self-Healing Layers

1. **Reactive** — Every Helix call catches 401 and refreshes
2. **Proactive** — 30-min `validateToken()` watchdog runs ahead of expiry
3. **Defensive** — WebSocket keepalive detector reconnects on 30s silence
4. **Recovery** — Twitch's own `session_reconnect` event handled gracefully

---

## 🤝 Built By

MavScript.blu — tech systems engineer, software builder, and code family captain.
[beacons.ai/mavscriptblu](https://beacons.ai/mavscriptblu)

Co-engineered alongside Claude. 💙
