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
  NOT_CUPID: "Você não é o cupido!",
  WRONG_PHASE: "Não pode usar este comando agora!",
  NOT_PARTICIPANT: "Você não está participando deste jogo!",
  SELF_TARGET: "Você não pode usar este em você mesmo!",
  SAME_TARGET: "Você não pode unir o mesmo jogador duas vezes!",
  FETCH_ERROR: "Erro ao buscar o jogador!",
  SUCCESS: (username1: string, username2: string) =>
    `Voto para unir ${username1} com ${username2} foi registrado!`,
};

async function validateTarget(
  interaction: ChatInputCommandInteraction,
  game: GameState,
  targetId: string,
  isBot: boolean
): Promise<{ id: string; username: string } | null> {
  if (!game.players.has(targetId)) {
    await interaction.reply({
      content: MESSAGES.INVALID_PLAYER,
      ephemeral: true,
    });
    return null;
  }
  if (!isBot) {
    try {
      const user = await interaction.client.users.fetch(targetId);
      if (user.id === interaction.user.id) {
        await interaction.reply({
          content: MESSAGES.SELF_TARGET,
          ephemeral: true,
        });
        return null;
      }
      return { id: targetId, username: user.username };
    } catch (error) {
      console.error(`Failed to fetch user ${targetId}: ${error}`);
      await interaction.reply({
        content: MESSAGES.FETCH_ERROR,
        ephemeral: true,
      });
      return null;
    }
  }
  const username = game.botUsers.get(targetId);
  if (!username) {
    await interaction.reply({
      content: "Erro: Jogador bot não encontrado!",
      ephemeral: true,
    });
    return null;
  }
  return { id: targetId, username };
}

export const data = new SlashCommandBuilder()
  .setName("unir")
  .setDescription("Escolha dois jogadores para se apaixonarem")
  .addStringOption((option) =>
    option
      .setName("jogador")
      .setDescription("O jogador que quer juntar")
      .setRequired(true)
      .setAutocomplete(true)
  )
  .addStringOption((option) =>
    option
      .setName("jogador_dois")
      .setDescription("O jogador que você quer juntar")
      .setRequired(true)
      .setAutocomplete(true)
  );

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
  const targetIdTwo = interaction.options.getString("jogador_dois", true);

  if (targetId === targetIdTwo) {
    await interaction.reply({
      content: MESSAGES.SAME_TARGET,
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
  if (userRole?.name !== "Cupido") {
    await interaction.reply({
      content: MESSAGES.NOT_CUPID,
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
  const isTargetTwoABot = targetIdTwo.includes("bot_");

  const target = await validateTarget(
    interaction,
    game,
    targetId,
    isTargetABot
  );
  if (!target) return;
  const targetTwo = await validateTarget(
    interaction,
    game,
    targetIdTwo,
    isTargetTwoABot
  );
  if (!targetTwo) return;

  game.loveUnion.set(targetId, targetIdTwo);
  game.hasUsedSkill.set(interaction.user.id, true);
  console.log(
    `Cupid ${interaction.user.id} paired ${targetId} with ${targetIdTwo}`
  );

  await interaction.reply({
    content: MESSAGES.SUCCESS(target.username, targetTwo.username),
    ephemeral: true,
  });
}

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

    await handlePlayersAutocomplete(game, interaction, focusedValue, choices);
    await interaction.respond(choices.slice(0, 25));
  } catch (error) {
    console.error("Error in autocomplete handler:", error);
    await interaction.respond([]);
  }
}
