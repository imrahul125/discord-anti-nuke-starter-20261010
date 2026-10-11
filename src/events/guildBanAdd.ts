import { AuditLogEvent, Client, Events } from "discord.js";
import { processRiskEvent } from "../security/guard.js";

export function registerGuildBanAddEvent(client: Client): void {
  client.on(Events.GuildBanAdd, (ban) => {
    void processRiskEvent({
      client,
      guild: ban.guild,
      targetId: ban.user.id,
      auditType: AuditLogEvent.MemberBanAdd,
      action: "guildBanAdd",
      eventReceivedAt: Date.now(),
      description: `User ${ban.user.tag} was banned.`
    }).catch((error: unknown) => {
      console.error("[event] guildBanAdd handler failed:", error);
    });
  });
}
