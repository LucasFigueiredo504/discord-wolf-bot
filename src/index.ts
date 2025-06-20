import {
  Client,
  Collection,
  GatewayIntentBits,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
} from "discord.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import "dotenv/config";

// Extend Client interface to include commands
declare module "discord.js" {
  interface Client {
    commands: Collection<string, Command>;
  }
}

interface Command {
  data: { name: string; toJSON(): unknown };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
});
client.commands = new Collection<string, Command>();

const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

async function loadCommands() {
  for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      try {
        // Convert Windows path to file:// URL
        const fileUrl = pathToFileURL(filePath).href;
        const commandModule = await import(fileUrl);

        console.log(
          `Imported module for ${filePath}:`,
          Object.keys(commandModule)
        );

        // Handle both default exports and named exports
        const moduleData = commandModule.default || commandModule;
        const command: Command = {
          data: moduleData.data,
          execute: moduleData.execute,
          autocomplete: moduleData.autocomplete,
        };

        if (command.data) {
          client.commands.set(command.data.name, command);
          console.log(
            `[INFO] Successfully loaded command ${command.data.name}`
          );
        } else {
          console.warn(
            `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
          );
        }
      } catch (error) {
        console.error(`[ERROR] Failed to load command at ${filePath}:`, error);
      }
    }
  }
}

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

async function loadEvents() {
  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    try {
      // Convert Windows path to file:// URL
      const fileUrl = pathToFileURL(filePath).href;
      const eventModule = await import(fileUrl);

      console.log(
        `Imported event module for ${filePath}:`,
        Object.keys(eventModule)
      );

      const event = eventModule.default || eventModule;

      if (event.name && event.execute) {
        if (event.once) {
          client.once(event.name, (...args: unknown[]) =>
            event.execute(...args)
          );
        } else {
          client.on(event.name, (...args: unknown[]) => event.execute(...args));
        }
        console.log(`[INFO] Successfully loaded event ${event.name}`);
      } else {
        console.warn(
          `[WARNING] The event at ${filePath} is missing a required "name" or "execute" property.`
        );
      }
    } catch (error) {
      console.error(`[ERROR] Failed to load event at ${filePath}:`, error);
    }
  }
}

async function main() {
  if (!process.env.TOKEN) {
    console.error("[ERROR] TOKEN not found in .env file");
    process.exit(1);
  }

  try {
    console.log("[INFO] Loading commands...");
    await loadCommands();
    console.log("[INFO] Loading events...");
    await loadEvents();
    console.log("[INFO] Logging in to Discord...");
    await client.login(process.env.TOKEN);
    console.log("[INFO] Bot is now connected to Discord");
  } catch (error) {
    console.error("[ERROR] Failed to initialize bot:", error);
    process.exit(1);
  }
}

main();
