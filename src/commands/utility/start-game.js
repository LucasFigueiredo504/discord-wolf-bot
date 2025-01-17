const {
	SlashCommandBuilder,
	ButtonBuilder,
	EmbedBuilder,
	ButtonStyle,
	ActionRowBuilder,
} = require("discord.js");
const wait = require("node:timers/promises").setTimeout;

module.exports = {
	data: new SlashCommandBuilder()
		.setName("start")
		.setDescription("Inicia um novo jogo"),
	async execute(interaction) {
		const button = new ButtonBuilder()
			.setCustomId("start")
			.setLabel("Entrar")
			.setStyle(ButtonStyle.Primary);

		const row = new ActionRowBuilder().addComponents(button);
		const gameEmbed = new EmbedBuilder()
			.setColor(0x0099ff)
			.setTitle("Nova caçada!")
			.setDescription(
				"A lua sob aos céus simbolizando o perigo se aproximando da vila!",
			)
			.setImage("https://i.imgur.com/d1JHPRq.jpeg");

		await interaction.reply({
			embeds: [gameEmbed],
			components: [row],
		});
	},
};
