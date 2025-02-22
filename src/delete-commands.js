const { REST, Routes } = require("discord.js");
require("dotenv").config();

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.TOKEN);

// Delete all commands function
async function deleteAllCommands() {
	try {
		console.log(`Started deleting application (/) commands.`);

		// For global commands
		await rest.put(Routes.applicationCommands(process.env.APP_ID), {
			body: [],
		});

		// If you also want to delete guild-specific commands, uncomment this
		/*
    await rest.put(
      Routes.applicationGuildCommands(process.env.APP_ID, process.env.GUILD_ID),
      { body: [] }
    );
    */

		console.log(`Successfully deleted all application (/) commands.`);
	} catch (error) {
		console.error(error);
	}
}

// Run the function
deleteAllCommands();
