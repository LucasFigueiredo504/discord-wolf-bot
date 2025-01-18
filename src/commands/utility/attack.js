const { SlashCommandBuilder } = require("discord.js");
const wait = require("node:timers/promises").setTimeout;

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
		//confirma pro discord que a interaçaõ foi bem sucedida e ao mesmo tempo da tempo para o codigo
		//await interaction.deferReply();
		//espera
		//await wait(4_000);
		//await interaction.editReply("Pong!");

		await interaction.reply("Pong!");
		//delete
		//await interaction.deleteReply();

		//fetch data from the response
		//const message = await interaction.fetchReply();
		//console.log(message);

		//espera
		await wait(2_000);
		//edita a mensagem
		await interaction.editReply("Pong again!");

		await wait(2_000);
		//envia uma nova mensagem em seguida
		//Note that if you use followUp() after a deferReply(), the first follow-up will edit the <application> is thinking message rather than sending a new one.
		await interaction.followUp("Pong again again!");
	},
};
