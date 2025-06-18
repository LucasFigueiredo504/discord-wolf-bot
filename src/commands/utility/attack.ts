import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  User,
} from "discord.js";
import { setTimeout } from "node:timers/promises";
import gameManager from "../../game-state";
import { handlePlayersAutocomplete } from "../../game-handlers";

export default {
  data: new SlashCommandBuilder()
    .setName("atacar")
    .setDescription(
      "Se você for o lobo, escolha um usuário para matar durante a noite"
    )
    .addStringOption((option) =>
      option
        .setName("jogador")
        .setDescription("O jogador que você quer matar")
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
    const game = gameManager.getGame(interaction.channelId);
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
    if (userRole?.name !== "Lobo") {
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

    let target: User | string = targetId;
    const isTargetABot = targetId.includes("bot_");
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

    const targetRole = game.playerRoles.get(targetId);
    if (targetRole?.name === "Lobo") {
      await interaction.reply({
        content: "Você não pode atacar outro Lobo!",
        ephemeral: true,
      });
      return;
    }

    if (!game.nightKill) {
      game.nightKill = new Map();
    }
    game.nightKill.set(interaction.user.id, targetId);
    game.hasUsedSkill.set(interaction.user.id, true);

    const username = isTargetABot
      ? game.botUsers.get(targetId)!
      : (target as User).username;
    await interaction.reply({
      content: `Seu voto para matar ${username} foi registrado!`,
      ephemeral: true,
    });
  },
};
