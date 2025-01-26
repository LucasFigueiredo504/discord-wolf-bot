const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const wait = require("node:timers/promises").setTimeout;
const gameManager = require("../../game-state");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("atacar")
		.setDescription(
			"Se você for o lobo, escolha um usuario para matar durante a noite",
		)
		.addUserOption((option) =>
			option
				.setName("jogador")
				.setDescription("O jogador que você quer matar")
				.setRequired(true),
		),
	async execute(interaction) {
		const game = gameManager.getGame(interaction.channelId);

		const userRole = game.playerRoles.get(interaction.user.id);

		const target = interaction.options.getUser("jogador");

		if (target.id === interaction.user.id) {
			return await interaction.reply({
				content: "Você não pode usar esse em você mesmo!",
				flags: MessageFlags.Ephemeral,
			});
		}

		if (userRole.name !== "Lobo") {
			return await interaction.reply({
				content: "Você não pode usar esse comando!",
				flags: MessageFlags.Ephemeral,
			});
		}

		if (!game || game.status !== "night") {
			return await interaction.reply({
				content: "Não é possível usar este commando agora!",
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

		if (!game.players.has(target.id)) {
			return await interaction.reply({
				content: "Este jogador não está participando do jogo!",
				flags: MessageFlags.Ephemeral,
			});
		}
		// Check if target is not a wolf
		const targetRole = game.playerRoles.get(target.id);
		if (targetRole.name === "Lobo") {
			return await interaction.reply({
				content: "Você não pode atacar outro Lobo!",
				flags: MessageFlags.Ephemeral,
			});
		}

		// Store the wolf kill vote
		if (!game.nightKill) {
			game.nightKill = new Map();
		}
		game.nightKill.set(interaction.user.id, target.id);

		await interaction.reply({
			content: `Seu voto para matar ${target.username} foi registrado!`,
			flags: MessageFlags.Ephemeral,
		});
	},
};
