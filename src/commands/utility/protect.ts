import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  User,
} from "discord.js";
import gameManager from "../../game-state";
import { handlePlayersAutocomplete } from "../../game-handlers";
import { GameState } from "../../types";

const MESSAGES = {
  NO_GAME: "Ocorreu um erro!",
  INVALID_PLAYER: "Este jogador não está participando do jogo!",
  SKILL_USED: "Você não pode usar este comando!",
  NOT_GUARDIAN: "Você não é o Anjo da Guarda!",
  WRONG_PHASE: "Não pode usar este comando agora!",
  NOT_PARTICIPANT: "Você não está participando deste jogo!",
  SELF_TARGET: "Você não pode usar este em você mesmo!",
  FETCH_ERROR: "Erro ao buscar o jogador!",
  SUCCESS: (username: string) =>
    `Voto para proteger ${username} foi registrado!`,
};

export const data = new SlashCommandBuilder()
  .setName("proteger")
  .setDescription("Escolha um jogador para proteger durante a noite")
  .addStringOption((option) =>
    option
      .setName("jogador")
      .setDescription("O jogador que você quer proteger")
      .setRequired(true)
      .setAutocomplete(true)
  );

export async function autocomplete(
  interaction: AutocompleteInteraction
): Promise<void> {
  try {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const choices: { name: string; value: string }[] = [];
    const game = gameManager.getGame(interaction.channelId);

    if (!game) {
      await interaction.respond([]);
      return;
    }

    if (!game.players.has(interaction.user.id)) {
      await interaction.respond([]);
      return;
    }

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
      content: MESSAGES.NO_GAME,
      ephemeral: true,
    });
    return;
  }

  const targetId = interaction.options.getString("jogador", true);
  if (!game.players.has(targetId)) {
    await interaction.reply({
      content: MESSAGES.INVALID_PLAYER,
      ephemeral: true,
    });
    return;
  }

  if (game.hasUsedSkill.has(interaction.user.id)) {
    await interaction.reply({
      content: MESSAGES.SKILL_USED,
      ephemeral: true,
    });
    return;
  }

  const userRole = game.playerRoles.get(interaction.user.id);
  if (userRole?.name !== "Anjo da guarda") {
    await interaction.reply({
      content: MESSAGES.NOT_GUARDIAN,
      ephemeral: true,
    });
    return;
  }

  if (game.status !== "night") {
    await interaction.reply({
      content: MESSAGES.WRONG_PHASE,
      ephemeral: true,
    });
    return;
  }

  if (!game.players.has(interaction.user.id)) {
    await interaction.reply({
      content: MESSAGES.NOT_PARTICIPANT,
      ephemeral: true,
    });
    return;
  }

  const canUseSkill = !game.cantUseSkill.get(interaction.user.id);
  if (!canUseSkill) {
    await interaction.reply({
      content: MESSAGES.SKILL_USED,
      ephemeral: true,
    });
    return;
  }

  const isTargetABot = targetId.includes("bot_");
  let username: string;
  if (!isTargetABot) {
    try {
      const targetUser = await interaction.client.users.fetch(targetId);
      if (targetUser.id === interaction.user.id) {
        await interaction.reply({
          content: MESSAGES.SELF_TARGET,
          ephemeral: true,
        });
        return;
      }
      username = targetUser.username;
    } catch (error) {
      console.error(`Failed to fetch user ${targetId}: ${error}`);
      await interaction.reply({
        content: MESSAGES.FETCH_ERROR,
        ephemeral: true,
      });
      return;
    }
  } else {
    username = game.botUsers.get(targetId) ?? "Unknown Bot";
  }

  game.nightSkills.set(interaction.user.id, targetId);
  game.nightProtection.set(targetId, true);
  game.hasUsedSkill.set(interaction.user.id, true);
  console.log(`Guardian ${interaction.user.id} protected ${targetId}`);

  await interaction.reply({
    content: MESSAGES.SUCCESS(username),
    ephemeral: true,
  });
}
