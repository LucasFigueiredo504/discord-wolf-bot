const { Events } = require("discord.js");
const { Character } = require("../models");

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		await Promise.all([Character.sync()]);
		console.log(`Ready! Logged in as ${client.user.tag}`);
	},
};
