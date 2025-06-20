import {
  SlashCommandBuilder,
  ButtonBuilder,
  EmbedBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { setTimeout } from "node:timers/promises";
import gameManager from "../../game-state";
import { handleNewRound, createBotPlayers } from "../../game-handlers";
import { GameState } from "../../types";

const MESSAGES = {
  GAME_EXISTS: "Já existe um jogo em andamento neste canal!",
  NOT_ENOUGH_PLAYERS:
    "Não há jogadores suficientes para iniciar o jogo! Cancelando...",
  EMBED_TITLE: "Nova caçada!",
  EMBED_DESCRIPTION:
    "A lua sobe aos céus simbolizando o perigo se aproximando da vila!",
};

export const data = new SlashCommandBuilder()
  .setName("start")
  .setDescription("Inicia um novo jogo");

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (gameManager.hasGame(interaction.channelId)) {
    await interaction.reply({
      content: MESSAGES.GAME_EXISTS,
      ephemeral: true,
    });
    return;
  }

  const gameState: GameState = {
    players: new Map(),
    botUsers: new Map(),
    deadPlayers: new Map(),
    status: "waiting",
    startTime: Date.now(),
    hasUsedSkill: new Map(),
    votes: new Map(),
    playerRoles: new Map(),
    nightKill: new Map(),
    nightSkills: new Map(),
    playerSkillUsage: new Map(),
    nightProtection: new Map(),
    loveUnion: new Map(),
    cantUseSkill: new Map(),
  };
  gameManager.setGame(interaction.channelId, gameState);
  console.log(`New game started in channel ${interaction.channelId}`);

  const button = new ButtonBuilder()
    .setCustomId("join-game")
    .setLabel("Entrar")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
  const gameEmbed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle(MESSAGES.EMBED_TITLE)
    .setDescription(MESSAGES.EMBED_DESCRIPTION)
    .setImage(
      "https://i.pinimg.com/originals/be/75/55/be7555b15ad63c2d5ec78e5f3142ff49.gif"
    );

  await interaction.reply({
    embeds: [gameEmbed],
    components: [row],
  });

  await setTimeout(60000);

  const game = gameManager.getGame(interaction.channelId) as
    | GameState
    | undefined;
  if (!game) {
    console.log(
      `Game not found after timeout in channel ${interaction.channelId}`
    );
    return;
  }

  const botsToAdd = 8 - game.players.size;
  if (botsToAdd > 0) {
    createBotPlayers(game, botsToAdd);
    console.log(
      `Added ${botsToAdd} bot players to game in channel ${interaction.channelId}`
    );
  }
  await setTimeout(2000);

  if (game.players.size < 2) {
    await interaction.followUp(MESSAGES.NOT_ENOUGH_PLAYERS);
    gameManager.removeGame(interaction.channelId);
    console.log(
      `Game cancelled in channel ${interaction.channelId} due to insufficient players`
    );
    return;
  }

  await handleNewRound(interaction);
}
