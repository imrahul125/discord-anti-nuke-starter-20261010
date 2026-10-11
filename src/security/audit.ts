import type { AuditLogEvent, Guild } from "discord.js";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function findAuditExecutor(
  guild: Guild,
  auditType: AuditLogEvent,
  targetId: string,
  eventReceivedAt: number
): Promise<string | null> {
  const earliestAllowedTimestamp = eventReceivedAt - 15_000;
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const logs = await guild.fetchAuditLogs({
        type: auditType,
        limit: 25
      });

      const entry = logs.entries.find(
        (candidate) =>
          candidate.targetId === targetId &&
          candidate.executorId !== null &&
          candidate.createdTimestamp >= earliestAllowedTimestamp &&
          candidate.createdTimestamp <= Date.now() + 5_000
      );

      if (entry?.executorId) {
        return entry.executorId;
      }
    } catch (error) {
      lastError = error;
    }

    if (attempt < 2) {
      await delay(250 * (attempt + 1));
    }
  }

  if (lastError) {
    console.error("[audit] Could not fetch audit logs:", lastError);
  }

  return null;
}
