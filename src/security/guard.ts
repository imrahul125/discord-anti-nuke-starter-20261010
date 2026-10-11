import type { AuditLogEvent, Client, Guild } from "discord.js";
import { config, DANGEROUS_PERMISSIONS, type RiskAction } from "../config.js";
import { redis } from "../redis.js";
import { findAuditExecutor } from "./audit.js";
import { sendSecurityAlert } from "./alerts.js";
import { quarantineMember } from "./quarantine.js";
import { recordAction } from "./rateLimiter.js";
import { isWhitelisted } from "./whitelistStore.js";

export interface RiskEventInput {
  client: Client;
  guild: Guild;
  targetId: string;
  auditType: AuditLogEvent;
  action: RiskAction;
  eventReceivedAt: number;
  description: string;
}

let lastDegradedAlertAt = 0;

async function reportRedisDegraded(guild: Guild): Promise<void> {
  const now = Date.now();
  if (now - lastDegradedAlertAt < 60_000) return;

  lastDegradedAlertAt = now;
  try {
    await sendSecurityAlert(
      guild,
      "Anti-nuke protection degraded",
      "Redis is unavailable, so this event could not be checked against the sliding-window limits."
    );
  } catch (error) {
    console.error("[security] Could not send Redis outage alert:", error);
  }
}

export async function processRiskEvent(input: RiskEventInput): Promise<void> {
  const {
    client,
    guild,
    targetId,
    auditType,
    action,
    eventReceivedAt,
    description
  } = input;

  if (guild.id !== config.guildId) return;

  const executorId = await findAuditExecutor(
    guild,
    auditType,
    targetId,
    eventReceivedAt
  );

  if (!executorId) {
    console.warn(
      `[security] Could not identify the executor for ${action} in guild ${guild.id}.`
    );
    return;
  }

  if (executorId === guild.ownerId || executorId === client.user?.id) {
    return;
  }

  try {
    if (await isWhitelisted(redis, guild.id, executorId)) {
      return;
    }

    const member = await guild.members.fetch(executorId).catch(() => null);
    if (!member || !member.permissions.any(DANGEROUS_PERMISSIONS)) {
      return;
    }

    const limit = config.limits[action];
    const count = await recordAction(
      redis,
      guild.id,
      executorId,
      action,
      limit.windowMs
    );

    if (count < limit.maxEvents) {
      return;
    }

    const result = await quarantineMember(
      redis,
      member,
      action,
      count,
      limit.windowMs
    );

    if (result.status === "already-quarantined") {
      return;
    }

    const resultText =
      result.status === "failed"
        ? `Quarantine failed. ${result.errors.join(" ")}`
        : `Member ${result.status}.`;

    await sendSecurityAlert(
      guild,
      "Anti-nuke threshold reached",
      `${description} The unwhitelisted administrator reached the configured limit.`,
      [
        { name: "Executor ID", value: executorId, inline: true },
        { name: "Action", value: action, inline: true },
        {
          name: "Window count",
          value: `${count}/${limit.maxEvents} in ${limit.windowMs / 1000}s`,
          inline: true
        },
        { name: "Response", value: resultText },
        {
          name: "Dangerous roles removed",
          value: String(result.rolesRemoved),
          inline: true
        }
      ]
    ).catch((error: unknown) => {
      console.error("[security] Could not send quarantine alert:", error);
    });

    console.warn(
      `[security] ${action} limit reached for ${executorId} in ${guild.id}: ${result.status}`
    );
  } catch (error) {
    console.error("[security] Could not evaluate risk event:", error);
    await reportRedisDegraded(guild);
  }
}
