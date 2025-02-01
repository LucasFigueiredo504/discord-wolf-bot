const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const wait = require("node:timers/promises").setTimeout;
const gameManager = require("../../game-state");
const { handlePlayersAutocomplete } = require("../../game-handlers");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("tiro")
		.setDescription(
			"Se você for o atirador, escolha um usuario para atirar durante o dia",
		)
		.addStringOption((option) =>
			option
				.setName("jogador")
				.setDescription("O jogador que você quer atirar")
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

		let target = null;
		let isTargetABot = false;
		if (interaction.options.getString("jogador").includes("bot_")) {
			target = interaction.options.getString("jogador");
			isTargetABot = true;
		} else {
			target = interaction.options.getUser("jogador");
			isTargetABot = false;
			if (target.id === interaction.user.id) {
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

		const targetRole = game.playerRoles.get(isTargetABot ? target : target.id);
		const username = isTargetABot ? game.botUsers.get(target) : null;

		game.playerSkillUsage.set(interaction.user.id, skillUsage + 1);
		game.deadPlayers.set(
			isTargetABot ? username : target.username,
			targetRole.name,
		);
		game.players.delete(isTargetABot ? target : target.id);

		await interaction.reply({
			content: `Seu voto para atirar em ${isTargetABot ? username : target.username} foi registrado!`,
			flags: MessageFlags.Ephemeral,
		});
		await interaction.followUp(
			`💥BAANG! Um tiro ecoa em meio a multidão, se trata de ${interaction.user.username} que acabou de atirar em ${isTargetABot ? username : target.username}!\n ${isTargetABot ? username : target.username} era o ${targetRole.name}`,
		);
	},
};
