import "dotenv/config";
import { PermissionFlagsBits } from "discord.js";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const staticWhitelistIds = (process.env.WHITELIST_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

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
  clientId: requiredEnv("DISCORD_CLIENT_ID"),
  ownerId: requiredEnv("BOT_OWNER_ID"),
  guildId: requiredEnv("GUILD_ID"),
  logChannelId: requiredEnv("LOG_CHANNEL_ID"),
  redisUrl: requiredEnv("REDIS_URL"),
  staticWhitelistIds,
  limits: ACTION_LIMITS
};
