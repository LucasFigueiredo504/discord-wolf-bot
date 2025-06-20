import { REST, Routes } from "discord.js";
import * as dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

dotenv.config();

interface Command {
  data: {
    toJSON(): unknown;
  };
  execute: Function;
}

const commands: unknown[] = [];

const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

async function loadCommands() {
  for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js") || file.endsWith(".ts"));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      try {
        // Convert Windows path to file:// URL
        const fileUrl = pathToFileURL(filePath).href;
        const commandModule = await import(fileUrl);

        console.log(`Imported module for ${filePath}:`, commandModule);

        // Handle both default exports and named exports
        const moduleData = commandModule.default || commandModule;
        const command: Command = {
          data: moduleData.data,
          execute: moduleData.execute,
        };

        if (command.data && command.execute) {
          commands.push(command.data.toJSON());
          console.log(`Loaded command from ${filePath}`);
        } else {
          console.warn(
            `[WARNING] The command at ${filePath} is missing "data" or "execute" property.`
          );
        }
      } catch (error) {
        console.error(`[ERROR] Failed to load command at ${filePath}:`, error);
      }
    }
  }
}

const rest = new REST().setToken(process.env.TOKEN ?? "");

(async () => {
  try {
    if (!process.env.TOKEN || !process.env.APP_ID) {
      throw new Error("Missing TOKEN or APP_ID in .env file");
    }

    await loadCommands();

    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    const data = await rest.put(
      Routes.applicationCommands(process.env.APP_ID),
      { body: commands }
    );

    console.log(
      `Successfully reloaded ${
        (data as any[]).length
      } application (/) commands.`
    );
  } catch (error) {
    console.error("Deployment error:", error);
  }
})();
