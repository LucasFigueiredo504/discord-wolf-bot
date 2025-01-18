const {
	SlashCommandBuilder,
	ButtonBuilder,
	EmbedBuilder,
	ButtonStyle,
	ActionRowBuilder,
	Collection,
} = require("discord.js");
const wait = require("node:timers/promises").setTimeout;
const gameManager = require("../../game-state");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("start")
		.setDescription("Inicia um novo jogo"),
	async execute(interaction) {
		// Check if there's already a game in this channel
		if (gameManager.hasGame(interaction.channelId)) {
			return await interaction.reply({
				content: "Já existe um jogo em andamento neste canal!",
				ephemeral: true,
			});
		}

		// Create game state
		const gameState = {
			players: new Set(),
			status: "waiting",
			startTime: Date.now(),
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
			.setImage("https://i.imgur.com/d1JHPRq.jpeg");

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

		if (game.players.size < 2) {
			await interaction.followUp(
				"Não há jogadores suficientes para iniciar o jogo. Cancelando...",
			);
			gameManager.removeGame(interaction.channelId);
			return;
		}

		// Start the game
		game.status = "night";
		const nightEmbed = new EmbedBuilder()
			.setColor(0x000066)
			.setTitle("🌙 A noite chegou!")
			.setDescription("Os habitantes da vila se recolhem em suas casas...")
			.setImage("https://i.imgur.com/YourNightImage.jpeg"); // Replace with your night image

		await interaction.followUp({ embeds: [nightEmbed], components: [] });

		// Wait 30 seconds before morning
		await wait(30000);

		// Morning phase
		game.status = "voting";
		const morningEmbed = new EmbedBuilder()
			.setColor(0xffff00)
			.setTitle("🌞 Amanheceu!")
			.setDescription(
				"É hora de decidir! Quem será executado?\n" +
					"Use `/votar @jogador` para dar seu voto.\n" +
					"Você tem 60 segundos para votar!",
			);

		await interaction.followUp({ embeds: [morningEmbed] });

		// Wait 60 seconds for voting
		await wait(60000);

		// Handle voting results
		await handleVotingResults(interaction);
	},
};
