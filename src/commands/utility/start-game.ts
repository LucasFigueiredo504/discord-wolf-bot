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

export default {
  data: new SlashCommandBuilder()
    .setName("start")
    .setDescription("Inicia um novo jogo"),
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (gameManager.hasGame(interaction.channelId)) {
      await interaction.reply({
        content: "Já existe um jogo em andamento neste canal!",
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
      cantUseSkill: new Map(),
    };
    gameManager.setGame(interaction.channelId, gameState);

    const button = new ButtonBuilder()
      .setCustomId("join-game")
      .setLabel("Entrar")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
    const gameEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("Nova caçada!")
      .setDescription(
        "A lua sobe aos céus simbolizando o perigo se aproximando da vila!"
      )
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
    if (!game) return;

    const botsToAdd = 8 - game.players.size;
    createBotPlayers(game, botsToAdd);
    await setTimeout(2000);

    if (game.players.size < 2) {
      await interaction.followUp(
        "Não há jogadores suficientes para iniciar o jogo. Cancelando..."
      );
      gameManager.removeGame(interaction.channelId);
      return;
    }

    await handleNewRound(interaction);
  },
};
