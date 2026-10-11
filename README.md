# Discord Anti-Nuke Bot

Single-server Discord anti-nuke starter using Node.js 20+, TypeScript, discord.js v14, and Redis.

## Setup

1. Install Node.js 20 or newer and make a Redis 6.2+ service available to the bot.
2. Copy `.env.example` to `.env` and fill in the Discord token, application ID, bot owner ID, server ID, alert channel ID, and Redis URL. Keep `.env` private; it is excluded by `.gitignore`.
3. Install packages with `npm install`.
4. Run locally with `npm run dev`. Compile with `npm run build`; run the compiled app with `npm start`.

The bot registers `/whitelist` in the configured guild on startup. The command is restricted to `BOT_OWNER_ID`; it has `add`, `remove`, and `list` subcommands. Dynamic whitelist entries are server-specific in Redis. IDs in `WHITELIST_IDS` and the bot owner are always exempt.

## Discord permissions and intents

The client requests only the standard `Guilds` and `GuildModeration` intents. No privileged intents are needed. The bot needs View Audit Log, Manage Roles, Ban Members, Kick Members, and access to the configured alert channel. Keep the bot's highest role above the roles and members it may need to manage. Administrator grants much broader access and is not required by the code.

## Detection behavior

The bot counts each action type separately in an atomic Redis sliding window. It quarantines an unwhitelisted member with dangerous permissions when they reach 2 channel deletions, 3 bans, or 2 role deletions within 10 seconds. It removes editable roles that grant dangerous permissions, then attempts a ban and falls back to a kick.

Discord delivers events after actions occur and audit-log entries can lag. This is a response and mitigation system, not a guarantee that the first destructive action can be prevented. The starter is intentionally scoped to one `GUILD_ID` and one `LOG_CHANNEL_ID`.
