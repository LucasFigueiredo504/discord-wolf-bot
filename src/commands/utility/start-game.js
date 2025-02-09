const {
	SlashCommandBuilder,
	ButtonBuilder,
	EmbedBuilder,
	ButtonStyle,
	ActionRowBuilder,
	MessageFlags,
} = require("discord.js");
const wait = require("node:timers/promises").setTimeout;
const gameManager = require("../../game-state");
const { handleNewRound, createBotPlayers } = require("../../game-handlers");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("start")
		.setDescription("Inicia um novo jogo"),
	async execute(interaction) {
		// Check if there's already a game in this channel
		if (gameManager.hasGame(interaction.channelId)) {
			return await interaction.reply({
				content: "Já existe um jogo em andamento neste canal!",
				flags: MessageFlags.Ephemeral,
			});
		}

		// Create game state
		const gameState = {
			players: new Set(),
			botUsers: new Map(),
			deadPlayers: new Map(),
			status: "waiting",
			startTime: Date.now(),
			hasUsedSkill: new Set(),
			votes: new Map(),
			playerRoles: null,
			nightKill: new Map(),
			nightSkills: new Map(),
			playerSkillUsage: new Map(),
			nightProtection: new Map(),
			cantUseSkill: new Map(),
		};
		gameManager.setGame(interaction.channelId, gameState);

		const button = new ButtonBuilder()
			.setCustomId("join-game")
			.setLabel("Entrar")
			.setStyle(ButtonStyle.Primary);

		const row = new ActionRowBuilder().addComponents(button);
		const gameEmbed = new EmbedBuilder()
			.setColor(0x0099ff)
			.setTitle("Nova caçada!")
			.setDescription(
				"A lua sob aos céus simbolizando o perigo se aproximando da vila!",
			)
			.setImage(
				"https://i.pinimg.com/originals/be/75/55/be7555b15ad63c2d5ec78e5f3142ff49.gif",
			);

		const response = await interaction.reply({
			embeds: [gameEmbed],
			components: [row],
			withResponse: true,
		});

		// Wait 60 seconds for players to join
		await wait(60000);

		// Check if game still exists and has enough players
		const game = gameManager.getGame(interaction.channelId);
		if (!game) return;

		const botsToAdd = 8 - game.players.size;
		createBotPlayers(game, botsToAdd);
		await wait(2000);

		if (game.players.size < 2) {
			await interaction.followUp(
				"Não há jogadores suficientes para iniciar o jogo. Cancelando...",
			);
			gameManager.removeGame(interaction.channelId);
			return;
		}

		//start round
		await handleNewRound(interaction);
	},
};
