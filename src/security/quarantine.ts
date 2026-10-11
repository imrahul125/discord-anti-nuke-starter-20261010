import type { GuildMember } from "discord.js";
import type { Redis } from "ioredis";
import { DANGEROUS_PERMISSIONS, type RiskAction } from "../config.js";

export interface QuarantineResult {
  status: "banned" | "kicked" | "failed" | "already-quarantined";
  rolesRemoved: number;
  errors: string[];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function quarantineMember(
  redis: Redis,
  member: GuildMember,
  action: RiskAction,
  count: number,
  windowMs: number
): Promise<QuarantineResult> {
  const guild = member.guild;
  const lockKey = `anti-nuke:v1:quarantine:${guild.id}:${member.id}`;
  const lock = await redis.set(lockKey, "1", "EX", 60, "NX");

  if (lock !== "OK") {
    return {
      status: "already-quarantined",
      rolesRemoved: 0,
      errors: []
    };
  }

  const reason = `Anti-nuke threshold reached: ${action}, ${count} actions in ${windowMs}ms.`;
  const errors: string[] = [];
  let rolesRemoved = 0;

  const dangerousRoleIds = member.roles.cache
    .filter(
      (role) =>
        role.id !== guild.id &&
        role.editable &&
        role.permissions.any(DANGEROUS_PERMISSIONS)
    )
    .map((role) => role.id);

  if (dangerousRoleIds.length > 0) {
    try {
      await member.roles.remove(dangerousRoleIds, reason);
      rolesRemoved = dangerousRoleIds.length;
    } catch (error) {
      errors.push(`Role removal failed: ${errorMessage(error)}`);
    }
  }

  try {
    if (!member.bannable) {
      throw new Error("The bot cannot ban this member due to permissions or role hierarchy.");
    }

    await member.ban({ reason });
    return { status: "banned", rolesRemoved, errors };
  } catch (error) {
    errors.push(`Ban failed: ${errorMessage(error)}`);
  }

  try {
    if (!member.kickable) {
      throw new Error("The bot cannot kick this member due to permissions or role hierarchy.");
    }

    await member.kick(reason);
    return { status: "kicked", rolesRemoved, errors };
  } catch (error) {
    errors.push(`Kick failed: ${errorMessage(error)}`);
  }

  return { status: "failed", rolesRemoved, errors };
}
