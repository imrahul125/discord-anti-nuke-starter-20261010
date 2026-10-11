import {
  Client,
  Events,
  GatewayIntentBits,
  REST,
  Routes
} from "discord.js";
import { config } from "./config.js";
import { whitelistCommand, handleWhitelistCommand } from "./commands/whitelist.js";
import { registerChannelDeleteEvent } from "./events/channelDelete.js";
import { registerGuildBanAddEvent } from "./events/guildBanAdd.js";
import { registerRoleDeleteEvent } from "./events/roleDelete.js";
import { redis } from "./redis.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildModeration
  ]
});

let shuttingDown = false;

async function registerCommands(): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(config.token);

  await rest.post(
    Routes.applicationGuildCommands(config.clientId, config.guildId),
    { body: whitelistCommand.toJSON() }
  );
}

async function shutdown(): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  client.destroy();

  if (redis.status !== "end") {
    await redis.quit().catch(() => undefined);
  }
}

registerChannelDeleteEvent(client);
registerGuildBanAddEvent(client);
registerRoleDeleteEvent(client);

client.once(Events.ClientReady, (readyClient) => {
  console.info(`[discord] Logged in as ${readyClient.user.tag}`);
});

client.on(Events.Error, (error) => {
  console.error("[discord] Client error:", error);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "whitelist") return;

  try {
    await handleWhitelistCommand(interaction, redis);
  } catch (error) {
    console.error("[command] whitelist failed:", error);

    const reply = {
      content: "The command failed. Check the bot logs for details.",
      ephemeral: true
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply).catch(() => undefined);
    } else {
      await interaction.reply(reply).catch(() => undefined);
    }
  }
});

async function main(): Promise<void> {
  await redis.connect();
  await redis.ping();
  console.info("[redis] Connected.");

  await registerCommands();
  console.info(`[discord] Registered /whitelist for guild ${config.guildId}.`);

  await client.login(config.token);
}

process.once("SIGINT", () => {
  void shutdown();
});

process.once("SIGTERM", () => {
  void shutdown();
});

void main().catch(async (error: unknown) => {
  console.error("[startup] Bot could not start:", error);
  await shutdown();
  process.exitCode = 1;
});
