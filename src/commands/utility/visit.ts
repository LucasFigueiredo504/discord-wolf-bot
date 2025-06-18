import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  User,
} from "discord.js";
import gameManager from "../../game-state";
import { handlePlayersAutocomplete } from "../../game-handlers";

interface GameState {
  players: Map<string, any>;
  playerRoles: Map<string, { name: string }>;
  nightSkills: Map<string, string>;
  hasUsedSkill: Map<string, boolean>;
  cantUseSkill: Map<string, boolean>;
  botUsers: Map<string, string>;
  status: "waiting" | "night" | "morning-results" | "voting";
}

export default {
  data: new SlashCommandBuilder()
    .setName("visitar")
    .setDescription(
      'Se você for a cortesã, escolha um usuário para "visitar" durante a noite e descobrir seu papel'
    )
    .addStringOption((option) =>
      option
        .setName("jogador")
        .setDescription("O jogador que você quer visitar")
        .setRequired(true)
        .setAutocomplete(true)
    ),
  async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
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
  },
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
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

    const targetId = interaction.options.getString("jogador", true);
    if (!game.players.has(targetId)) {
      await interaction.reply({
        content: "Este jogador não é válido!",
        ephemeral: true,
      });
      return;
    }

    if (game.hasUsedSkill.has(interaction.user.id)) {
      await interaction.reply({
        content: "Você não pode usar esse comando!",
        ephemeral: true,
      });
      return;
    }

    const userRole = game.playerRoles.get(interaction.user.id);
    if (userRole?.name !== "Cortesã") {
      await interaction.reply({
        content: "Você não pode usar esse comando!",
        ephemeral: true,
      });
      return;
    }

    if (game.status !== "night") {
      await interaction.reply({
        content: "Não é possível usar este comando agora!",
        ephemeral: true,
      });
      return;
    }

    if (!game.players.has(interaction.user.id)) {
      await interaction.reply({
        content: "Você não está participando deste jogo!",
        ephemeral: true,
      });
      return;
    }

    const canUseSkill = !game.cantUseSkill.get(interaction.user.id);
    if (!canUseSkill) {
      await interaction.reply({
        content: "Você não pode usar este comando agora!",
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
        if (!game.players.has(target.id)) {
          await interaction.reply({
            content: "Este jogador não está participando do jogo!",
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

    if (!game.nightSkills) {
      game.nightSkills = new Map();
    }
    game.nightSkills.set(interaction.user.id, targetId);
    game.hasUsedSkill.set(interaction.user.id, true);

    const username = isTargetABot
      ? game.botUsers.get(targetId)!
      : (target as User).username;
    await interaction.reply({
      content: `Seu voto para visitar ${username} foi registrado!`, // Fixed typo: "vistar" to "visitar"
      ephemeral: true,
    });
  },
};
