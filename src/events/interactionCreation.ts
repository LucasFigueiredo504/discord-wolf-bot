import {
  Events,
  Interaction,
  ButtonInteraction,
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  User,
} from "discord.js";
import gameManager from "../game-state";

async function handleButton(interaction: ButtonInteraction): Promise<void> {
  if (interaction.customId !== "join-game") return;

  const game = gameManager.getGame(interaction.channelId);
  if (!game || game.status !== "waiting") {
    await interaction.reply({
      content: "Não há um jogo disponível para entrar no momento.",
      ephemeral: true,
    });
    return;
  }

  if (game.players.has(interaction.user.id)) {
    await interaction.reply({
      content: "Você já está participando deste jogo!",
      ephemeral: true,
    });
    return;
  }

  game.players.set(interaction.user.id, interaction.user.id);
  await interaction.reply({
    content: `${interaction.user.username} entrou no jogo!`,
  });
}

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction): Promise<void> {
    if (interaction.isButton()) {
      await handleButton(interaction as ButtonInteraction);
    }

    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) {
        console.error(
          `No command matching ${interaction.commandName} was found.`
        );
        return;
      }
      try {
        if (command.autocomplete) {
          await command.autocomplete(interaction as AutocompleteInteraction);
        }
      } catch (error) {
        console.error(
          `Error handling autocomplete for ${interaction.commandName}:`,
          error
        );
      }
    }

    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) {
        console.error(
          `No command matching ${interaction.commandName} was found.`
        );
        return;
      }
      try {
        await command.execute(interaction as ChatInputCommandInteraction);
      } catch (error) {
        console.error(
          `Error executing command ${interaction.commandName}:`,
          error
        );
        const content = "There was an error while executing this command!";
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content, ephemeral: true });
        } else {
          await interaction.reply({ content, ephemeral: true });
        }
      }
    }
  },
};
