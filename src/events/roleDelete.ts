import { AuditLogEvent, Client, Events } from "discord.js";
import { processRiskEvent } from "../security/guard.js";

export function registerRoleDeleteEvent(client: Client): void {
  client.on(Events.GuildRoleDelete, (role) => {
    void processRiskEvent({
      client,
      guild: role.guild,
      targetId: role.id,
      auditType: AuditLogEvent.RoleDelete,
      action: "roleDelete",
      eventReceivedAt: Date.now(),
      description: `Role ${role.name} was deleted.`
    }).catch((error: unknown) => {
      console.error("[event] roleDelete handler failed:", error);
    });
  });
}
