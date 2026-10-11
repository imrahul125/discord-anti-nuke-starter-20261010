import { randomUUID } from "node:crypto";
import type { Redis } from "ioredis";
import type { RiskAction } from "../config.js";

const SLIDING_WINDOW_SCRIPT = `
local windowMs = tonumber(ARGV[1])
local eventId = ARGV[2]

local time = redis.call("TIME")
local nowMs = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
local cutoff = nowMs - windowMs

redis.call("ZREMRANGEBYSCORE", KEYS[1], "-inf", cutoff)
redis.call("ZADD", KEYS[1], nowMs, eventId)

local count = redis.call("ZCARD", KEYS[1])
redis.call("PEXPIRE", KEYS[1], windowMs + 1000)

return count
`;

export async function recordAction(
  redis: Redis,
  guildId: string,
  userId: string,
  action: RiskAction,
  windowMs: number
): Promise<number> {
  const key = `anti-nuke:v1:rate:${guildId}:${userId}:${action}`;
  const eventId = randomUUID();

  const result = await redis.eval(
    SLIDING_WINDOW_SCRIPT,
    1,
    key,
    String(windowMs),
    eventId
  );

  return Number(result);
}
