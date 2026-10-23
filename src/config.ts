import "dotenv/config";
import { PermissionFlagsBits } from "discord.js";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function requiredSnowflake(name: string): string {
  const value = requiredEnv(name);
  if (!/^\d{17,20}$/.test(value)) {
    throw new Error(`${name} must be a Discord snowflake ID (17–20 digits).`);
  }
  return value;
}

function parseRedisUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("REDIS_URL must be a valid redis:// or rediss:// URL.");
  }

  if (url.protocol !== "redis:" && url.protocol !== "rediss:") {
    throw new Error("REDIS_URL must use redis:// or rediss://.");
  }

  return value;
}

const staticWhitelistIds = (process.env.WHITELIST_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

for (const id of staticWhitelistIds) {
  if (!/^\d{17,20}$/.test(id)) {
    throw new Error("WHITELIST_IDS must contain only comma-separated Discord user IDs.");
  }
}

export const ACTION_LIMITS = {
  channelDelete: { maxEvents: 2, windowMs: 10_000 },
  guildBanAdd: { maxEvents: 3, windowMs: 10_000 },
  roleDelete: { maxEvents: 2, windowMs: 10_000 }
} as const;

export type RiskAction = keyof typeof ACTION_LIMITS;

export const DANGEROUS_PERMISSIONS = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.ManageWebhooks,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.ModerateMembers,
  PermissionFlagsBits.ManageEvents
] as const;

export const config = {
  token: requiredEnv("DISCORD_TOKEN"),
  clientId: requiredSnowflake("DISCORD_CLIENT_ID"),
  ownerId: requiredSnowflake("BOT_OWNER_ID"),
  guildId: requiredSnowflake("GUILD_ID"),
  logChannelId: requiredSnowflake("LOG_CHANNEL_ID"),
  redisUrl: parseRedisUrl(requiredEnv("REDIS_URL")),
  staticWhitelistIds,
  limits: ACTION_LIMITS
};
