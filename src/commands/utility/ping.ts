import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { setTimeout } from "node:timers/promises";

export default {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!"),
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply("Pong!");
    await setTimeout(2000);
    await interaction.editReply("Pong again!");
    await setTimeout(2000);
    await interaction.followUp("Pong again again!");
  },
};
