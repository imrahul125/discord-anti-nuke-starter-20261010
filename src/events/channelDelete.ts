import { AuditLogEvent, Client, Events } from "discord.js";
import { processRiskEvent } from "../security/guard.js";

export function registerChannelDeleteEvent(client: Client): void {
  client.on(Events.ChannelDelete, (channel) => {
    if (!("guild" in channel) || !channel.guild) return;

    void processRiskEvent({
      client,
      guild: channel.guild,
      targetId: channel.id,
      auditType: AuditLogEvent.ChannelDelete,
      action: "channelDelete",
      eventReceivedAt: Date.now(),
      description: `Channel ${channel.name ?? channel.id} was deleted.`
    }).catch((error: unknown) => {
      console.error("[event] channelDelete handler failed:", error);
    });
  });
}
