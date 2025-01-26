const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const wait = require("node:timers/promises").setTimeout;
const gameManager = require("../../game-state");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("tiro")
		.setDescription(
			"Se você for o atirador, escolha um usuario para atirar durante o dia",
		)
		.addUserOption((option) =>
			option
				.setName("jogador")
				.setDescription("O jogador que você quer atirar")
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

		if (userRole.name !== "Atirador") {
			return await interaction.reply({
				content: "Você não pode usar esse comando!",
				flags: MessageFlags.Ephemeral,
			});
		}

		if (!game || game.status !== "morning-results") {
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
		const { _, skillUsage } =
			game.playerSkillUsage.get(interaction.user.id) || {};

		if (skillUsage >= 2) {
			return await interaction.reply({
				content: "Você possui mais balas!",
				flags: MessageFlags.Ephemeral,
			});
		}

		const targetRole = game.playerRoles.get(target.id);
		if (!game.players.has(target.id)) {
			return await interaction.reply({
				content: "Este jogador não está participando do jogo!",
				flags: MessageFlags.Ephemeral,
			});
		}
		game.playerSkillUsage.set(interaction.user.id, skillUsage + 1);
		game.deadPlayers.set(target.username, targetRole.name);
		game.players.delete(target.id);

		await interaction.reply({
			content: `Seu voto para atirar em ${target.username} foi registrado!`,
			flags: MessageFlags.Ephemeral,
		});
		await interaction.followUp(
			`💥BAANG! Um tiro ecoa em meio a multidão, se trata de ${interaction.user.username} que acabou de atirar em ${target.username}!\n ${target.username} era o ${targetRole.name}`,
		);
	},
};
