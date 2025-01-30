const gameManager = require("../../game-state");
const { SlashCommandBuilder, MessageFlags } = require("discord.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("votar")
		.setDescription("Vota em um jogador para ser eliminado")
		.addStringOption((option) =>
			option
				.setName("jogador")
				.setDescription("O jogador que você quer votar")
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

			for (const id of game.players) {
				let name;
				if (id.includes("bot_")) {
					name = "bot";
				} else {
					try {
						const user = await interaction.client.users.fetch(id);
						name = user?.username;
					} catch (error) {
						console.error(`Failed to fetch user ${id}:`, error);
						continue;
					}
				}

				if (name?.toLowerCase().includes(focusedValue)) {
					choices.push({ name: name, value: id });
				}
			}

			await interaction.respond(choices.slice(0, 25));
		} catch (error) {
			console.error("Error in autocomplete handler:", error);
			await interaction.respond([]);
		}
	},

	async execute(interaction) {
		const game = gameManager.getGame(interaction.channelId);
		if (!game || game.status === "voting") {
			return await interaction.reply({
				content: "Não há uma votação em andamento no momento!",
				flags: MessageFlags.Ephemeral,
			});
		}
		const target = interaction.options.getUser("jogador");

		if (target.id !== interaction.user.id) {
			return await interaction.reply({
				content: "Você não pode usar esse em você mesmo!",
				flags: MessageFlags.Ephemeral,
			});
		}

		if (!game.players.has(interaction.user.id)) {
			return await interaction.reply({
				content: "Você não está participando deste jogo!",
				flags: MessageFlags.Ephemeral,
			});
		}

		if (!game.players.has(target.id)) {
			return await interaction.reply({
				content: "Este jogador não está participando do jogo!",
				flags: MessageFlags.Ephemeral,
			});
		}

		if (!game.votes) game.votes = new Map();
		if (game.playersRoles.get(interaction.user.id) === "Prefeito") {
			game.votes.set(`${interaction.user.id}-1`, target.id);
		}
		game.votes.set(interaction.user.id, target.id);

		await interaction.reply({
			content: `Seu voto em ${target.username} foi registrado!`,
			flags: MessageFlags.Ephemeral,
		});
	},
};
