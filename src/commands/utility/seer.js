const gameManager = require("../../game-state");
const { SlashCommandBuilder, MessageFlags } = require("discord.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("videncia")
		.setDescription("Escole um jogador para descobrir seu papel")
		.addUserOption((option) =>
			option
				.setName("jogador")
				.setDescription("O jogador que você quer prever o papel")
				.setRequired(true),
		),
	async execute(interaction) {
		const game = gameManager.getGame(interaction.channelId);

		const userRole = game.playerRoles.get(interaction.user.id);

		if (userRole.name !== "Vidente") {
			return await interaction.reply({
				content: "Você não é um vidente!",
				flags: MessageFlags.Ephemeral,
			});
		}

		if (!game || game.status !== "night") {
			return await interaction.reply({
				content: "Não pode usar esse comando agora!",
				flags: MessageFlags.Ephemeral,
			});
		}

		if (!game.players.has(interaction.user.id)) {
			return await interaction.reply({
				content: "Você não está participando deste jogo!",
				flags: MessageFlags.Ephemeral,
			});
		}

		const target = interaction.options.getUser("jogador");
		if (!game.players.has(target.id)) {
			return await interaction.reply({
				content: "Este jogador não está participando do jogo!",
				flags: MessageFlags.Ephemeral,
			});
		}

		if (!game.nightSkills) {
			game.nightSkills = new Map();
		}
		game.nightSkills.set(interaction.user.id, target.id);

		await interaction.reply({
			content: `Voto para prever o papel de ${target.username} foi registrado!`,
			flags: MessageFlags.Ephemeral,
		});
	},
};
