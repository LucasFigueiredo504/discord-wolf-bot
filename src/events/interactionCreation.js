const { Events, MessageFlags } = require("discord.js");
const gameManager = require("../game-state.js");

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (interaction.isButton()) {
			await handleButton(interaction);
		}

		if (!interaction.isChatInputCommand()) return;

		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(
				`No command matching ${interaction.commandName} was found.`,
			);
			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(error);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({
					content: "There was an error while executing this command!",
					flags: MessageFlags.Ephemeral,
				});
			} else {
				await interaction.reply({
					content: "There was an error while executing this command!",
					flags: MessageFlags.Ephemeral,
				});
			}
		}
	},
};
async function handleButton(interaction) {
	if (!interaction.isButton()) return;
	if (interaction.customId !== "join-game") return;

	const game = gameManager.getGame(interaction.channelId);
	if (!game || game.status !== "waiting") {
		return await interaction.reply({
			content: "Não há um jogo disponível para entrar no momento.",
			ephemeral: true,
		});
	}

	if (game.players.has(interaction.user.id)) {
		return await interaction.reply({
			content: "Você já está participando deste jogo!",
			ephemeral: true,
		});
	}

	game.players.add(interaction.user.id);
	await interaction.reply({
		content: `${interaction.user.username} entrou no jogo!`,
		ephemeral: false,
	});
}
