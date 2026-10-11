import type { Redis } from "ioredis";
import { config } from "../config.js";

function keyForGuild(guildId: string): string {
  return `anti-nuke:v1:whitelist:${guildId}`;
}

export async function isWhitelisted(
  redis: Redis,
  guildId: string,
  userId: string
): Promise<boolean> {
  if (userId === config.ownerId || config.staticWhitelistIds.includes(userId)) {
    return true;
  }

  return (await redis.sismember(keyForGuild(guildId), userId)) === 1;
}

export async function addToWhitelist(
  redis: Redis,
  guildId: string,
  userId: string
): Promise<void> {
  await redis.sadd(keyForGuild(guildId), userId);
}

export async function removeFromWhitelist(
  redis: Redis,
  guildId: string,
  userId: string
): Promise<void> {
  await redis.srem(keyForGuild(guildId), userId);
}

export async function listWhitelist(
  redis: Redis,
  guildId: string
): Promise<string[]> {
  const dynamicIds = await redis.smembers(keyForGuild(guildId));
  return [...new Set([config.ownerId, ...config.staticWhitelistIds, ...dynamicIds])].sort();
}
