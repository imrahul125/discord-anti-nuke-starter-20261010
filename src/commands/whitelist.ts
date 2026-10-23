import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction
} from "discord.js";
import type { Redis } from "ioredis";
import { config } from "../config.js";
import {
  addToWhitelist,
  listWhitelist,
  removeFromWhitelist
} from "../security/whitelistStore.js";

export const whitelistCommand = new SlashCommandBuilder()
  .setName("whitelist")
  .setDescription("Manage anti-nuke whitelist entries")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("add")
      .setDescription("Whitelist a user in this server")
      .addUserOption((option) =>
        option.setName("user").setDescription("User to whitelist").setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("remove")
      .setDescription("Remove a user from this server's whitelist")
      .addUserOption((option) =>
        option.setName("user").setDescription("User to remove").setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("list").setDescription("Show this server's whitelist")
  );

export async function handleWhitelistCommand(
  interaction: ChatInputCommandInteraction,
  redis: Redis
): Promise<void> {
  if (interaction.user.id !== config.ownerId) {
    await interaction.reply({
      content: "Only the configured bot owner can use this command.",
      ephemeral: true
    });
    return;
  }

  if (!interaction.inGuild() || !interaction.guildId) {
    await interaction.reply({
      content: "Run this command inside the configured server.",
      ephemeral: true
    });
    return;
  }

  if (interaction.guildId !== config.guildId) {
    await interaction.reply({
      content: "This command is only available in the configured server.",
      ephemeral: true
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "add") {
    const user = interaction.options.getUser("user", true);

    if (
      user.id === config.ownerId ||
      config.staticWhitelistIds.includes(user.id)
    ) {
      await interaction.reply({
        content: `${user.tag} is already on the environment whitelist.`,
        ephemeral: true
      });
      return;
    }

    await addToWhitelist(redis, interaction.guildId, user.id);
    await interaction.reply({
      content: `Whitelisted ${user.tag} for this server.`,
      ephemeral: true
    });
    return;
  }

  if (subcommand === "remove") {
    const user = interaction.options.getUser("user", true);

    if (
      user.id === config.ownerId ||
      config.staticWhitelistIds.includes(user.id)
    ) {
      await interaction.reply({
        content: "That user is on the environment whitelist. Remove the ID from WHITELIST_IDS to change it.",
        ephemeral: true
      });
      return;
    }

    await removeFromWhitelist(redis, interaction.guildId, user.id);
    await interaction.reply({
      content: `Removed ${user.tag} from this server's dynamic whitelist.`,
      ephemeral: true
    });
    return;
  }

  const ids = await listWhitelist(redis, interaction.guildId);
  const shown = ids.slice(0, 40).map((id) => `\`${id}\``);
  const suffix = ids.length > shown.length ? `\n…and ${ids.length - shown.length} more.` : "";

  await interaction.reply({
    content: ids.length
      ? `Whitelisted user IDs:\n${shown.join("\n")}${suffix}`
      : "The whitelist is empty.",
    ephemeral: true,
    allowedMentions: { parse: [] }
  });
}
