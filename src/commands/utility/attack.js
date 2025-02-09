const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const wait = require("node:timers/promises").setTimeout;
const gameManager = require("../../game-state");
const { handlePlayersAutocomplete } = require("../../game-handlers");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("atacar")
		.setDescription(
			"Se você for o lobo, escolha um usuario para matar durante a noite",
		)
		.addStringOption((option) =>
			option
				.setName("jogador")
				.setDescription("O jogador que você quer matar")
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

		if (!game.players) {
			return await interaction.reply({
				content: "Ocorreu um erro!",
				flags: MessageFlags.Ephemeral,
			});
		}

		if (!game.players.has(interaction.options.getString("jogador"))) {
			return await interaction.reply({
				content: "Este jogador não é válido!",
				flags: MessageFlags.Ephemeral,
			});
		}
		if (game.hasUsedSkill.has(interaction.user.id)) {
			return await interaction.reply({
				content: "Você não pode usar esse comando!",
				flags: MessageFlags.Ephemeral,
			});
		}

		const userRole = game.playerRoles.get(interaction.user.id);

		let target = null;
		let isTargetABot = false;
		if (interaction.options.getString("jogador").includes("bot_")) {
			target = interaction.options.getString("jogador");
			isTargetABot = true;
		} else {
			target = await interaction.client.users.fetch(
				interaction.options.getString("jogador"),
			);
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

		// Check if target is not a wolf
		const targetRole = game.playerRoles.get(isTargetABot ? target : target.id);
		const targetRoleName = isTargetABot ? targetRole : targetRole.name;
		if (targetRoleName === "Lobo") {
			return await interaction.reply({
				content: "Você não pode atacar outro Lobo!",
				flags: MessageFlags.Ephemeral,
			});
		}

		// Store the wolf kill vote
		if (!game.nightKill) {
			game.nightKill = new Map();
		}
		game.nightKill.set(interaction.user.id, isTargetABot ? target : target.id);

		const username = isTargetABot ? game.botUsers.get(target) : null;
		game.hasUsedSkill.add(interaction.user.id);
		await interaction.reply({
			content: `Seu voto para matar ${isTargetABot ? username : target.username} foi registrado!`,
			flags: MessageFlags.Ephemeral,
		});
	},
};
