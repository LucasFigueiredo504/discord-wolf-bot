import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  User,
} from "discord.js";
import gameManager from "../../game-state";
import { handlePlayersAutocomplete } from "../../game-handlers";
import { GameState } from "../../types";

export const data = new SlashCommandBuilder()
  .setName("votar")
  .setDescription("Vota em um jogador para ser eliminado")
  .addStringOption((option) =>
    option
      .setName("jogador")
      .setDescription("O jogador que você quer votar")
      .setRequired(true)
      .setAutocomplete(true)
  );
export async function autocomplete(
  interaction: AutocompleteInteraction
): Promise<void> {
  const game = gameManager.getGame(interaction.channelId);
  if (!game) {
    await interaction.respond([]);
    return;
  }

  if (!game.players.has(interaction.user.id)) {
    await interaction.respond([]);
    return;
  }

  try {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const choices: { name: string; value: string }[] = [];
    await handlePlayersAutocomplete(game, interaction, focusedValue, choices);
    await interaction.respond(choices.slice(0, 25));
  } catch (error) {
    console.error("Error in autocomplete handler:", error);
    await interaction.respond([]);
  }
}
export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const game = gameManager.getGame(interaction.channelId) as
    | GameState
    | undefined;
  if (!game?.players) {
    await interaction.reply({
      content: "Ocorreu um erro!",
      ephemeral: true,
    });
    return;
  }

  if (game.status !== "voting") {
    await interaction.reply({
      content: "Não há uma votação em andamento no momento!",
      ephemeral: true,
    });
    return;
  }

  const targetId = interaction.options.getString("jogador", true);
  if (!game.players.has(targetId)) {
    await interaction.reply({
      content: "Este jogador não é válido!",
      ephemeral: true,
    });
    return;
  }

  let target: { id: string; username: string } | string = targetId;
  let isTargetABot = targetId.includes("bot_");
  if (!isTargetABot) {
    try {
      target = await interaction.client.users.fetch(targetId);
      if (target.id === interaction.user.id) {
        await interaction.reply({
          content: "Você não pode usar esse em você mesmo!",
          ephemeral: true,
        });
        return;
      }
    } catch (error) {
      await interaction.reply({
        content: "Erro ao buscar o jogador!",
        ephemeral: true,
      });
      return;
    }
  }

  if (!game.players.has(interaction.user.id)) {
    await interaction.reply({
      content: "Você não está participando deste jogo!",
      ephemeral: true,
    });
    return;
  }

  const userRole = game.playerRoles.get(interaction.user.id);
  if (userRole?.name === "Prefeito") {
    game.votes.set(`${interaction.user.id}-1`, targetId);
  }
  game.votes.set(interaction.user.id, targetId);

  const username = isTargetABot
    ? game.botUsers.get(targetId)!
    : (target as User).username;
  await interaction.reply({
    content: `${interaction.user.username} votou em ${username}!`,
  });
}
