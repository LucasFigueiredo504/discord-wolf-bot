const gameManager = require("../../game-state");
const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { handlePlayersAutocomplete } = require("../../game-handlers");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("videncia")
		.setDescription("Escole um jogador para descobrir seu papel")
		.addStringOption((option) =>
			option
				.setName("jogador")
				.setDescription("O jogador que você quer prever o papel")
				.setRequired(true)
				.setAutocomplete(true),
		),
	async autocomplete(interaction) {
		try {
			const focusedValue = interaction.options.getFocused().toLowerCase();
			const choices = [];

			const game = gameManager.getGame(interaction.channelId);
			if (!game) {
				await interaction.respond([]);
				return;
			}

			await handlePlayersAutocomplete(game, interaction, focusedValue, choices);

			await interaction.respond(choices.slice(0, 25));
		} catch (error) {
			console.error("Error in autocomplete handler:", error);
			await interaction.respond([]);
		}
	},
	async execute(interaction) {
		const game = gameManager.getGame(interaction.channelId);

		const userRole = game.playerRoles.get(interaction.user.id);

		if (userRole.name === "Vidente") {
			return await interaction.reply({
				content: "Você não é um vidente!",
				flags: MessageFlags.Ephemeral,
			});
		}
		let target = null;
		let isTargetABot = false;
		if (interaction.options.getString("jogador").includes("bot_")) {
			target = interaction.options.getString("jogador");
			isTargetABot = true;
		} else {
			target = interaction.options.getUser("jogador");
			isTargetABot = false;
			if (target.id !== interaction.user.id) {
				return await interaction.reply({
					content: "Você não pode usar esse em você mesmo!",
					flags: MessageFlags.Ephemeral,
				});
			}
			if (!game.players.has(target.id)) {
				return await interaction.reply({
					content: "Este jogador não está participando do jogo!",
					flags: MessageFlags.Ephemeral,
				});
			}
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

		const canUseSkill =
			game.cantUseSkill.get(interaction.user.id) === undefined ||
			!game.cantUseSkill.get(interaction.user.id);

		if (!canUseSkill) {
			return await interaction.reply({
				content: "Você não pode usar este comando agora!",
				flags: MessageFlags.Ephemeral,
			});
		}

		if (!game.nightSkills) {
			game.nightSkills = new Map();
		}
		game.nightSkills.set(
			interaction.user.id,
			isTargetABot ? target : target.id,
		);
		const { botId = null, username = null } = isTargetABot
			? game.botUsers.get(target)
			: {};

		await interaction.reply({
			content: `Voto para prever o papel de ${isTargetABot ? username : target.username} foi registrado!`,
			flags: MessageFlags.Ephemeral,
		});
	},
};
