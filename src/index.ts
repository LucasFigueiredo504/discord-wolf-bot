import * as fs from "node:fs";
import * as path from "node:path";
import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
} from "discord.js";
import "dotenv/config";

// Extend Client interface to include commands
declare module "discord.js" {
  interface Client {
    commands: Collection<string, Command>;
  }
}

interface Command {
  data: { name: string };
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

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".ts"));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    import(filePath)
      .then((commandModule) => {
        const command = commandModule.default;
        if ("data" in command && "execute" in command) {
          client.commands.set(command.data.name, command);
        } else {
          console.log(
            `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
          );
        }
      })
      .catch((error) => {
        console.error(`[ERROR] Failed to load command at ${filePath}:`, error);
      });
  }
}

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".ts"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  import(filePath)
    .then((eventModule) => {
      const event = eventModule.default;
      if (event.once) {
        client.once(event.name, (...args: unknown[]) => event.execute(...args));
      } else {
        client.on(event.name, (...args: unknown[]) => event.execute(...args));
      }
    })
    .catch((error) => {
      console.error(`[ERROR] Failed to load event at ${filePath}:`, error);
    });
}

if (!process.env.TOKEN) {
  console.error("Error: TOKEN not found in .env file");
  process.exit(1);
}

client.login(process.env.TOKEN);
