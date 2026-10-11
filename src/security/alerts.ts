import { EmbedBuilder, type Guild } from "discord.js";
import { config } from "../config.js";

export interface AlertField {
  name: string;
  value: string;
  inline?: boolean;
}

export async function sendSecurityAlert(
  guild: Guild,
  title: string,
  description: string,
  fields: AlertField[] = []
): Promise<void> {
  const channel = await guild.channels.fetch(config.logChannelId);

  if (!channel?.isTextBased()) {
    throw new Error(
      `LOG_CHANNEL_ID ${config.logChannelId} is missing or is not a text channel in guild ${guild.id}.`
    );
  }

  const embed = new EmbedBuilder()
    .setColor(0xd83c3e)
    .setTitle(title)
    .setDescription(description)
    .addFields(fields)
    .setTimestamp();

  await channel.send({
    embeds: [embed],
    allowedMentions: { parse: [] }
  });
}
