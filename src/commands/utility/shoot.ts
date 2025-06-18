import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  User,
} from "discord.js";
import gameManager from "../../game-state";
import { handlePlayersAutocomplete } from "../../game-handlers";

export default {
  data: new SlashCommandBuilder()
    .setName("tiro")
    .setDescription(
      "Se você for o atirador, escolha um usuário para atirar durante o dia"
    )
    .addStringOption((option) =>
      option
        .setName("jogador")
        .setDescription("O jogador que você quer atirar")
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
    if (userRole?.name !== "Atirador") {
      await interaction.reply({
        content: "Você não pode usar esse comando!",
        ephemeral: true,
      });
      return;
    }

    if (game.status !== "morning-results") {
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

    const skillUsage = game.playerSkillUsage.get(interaction.user.id) || 0;
    if (skillUsage >= 2) {
      await interaction.reply({
        content: "Você não possui mais balas!",
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
    if (!targetRole) {
      await interaction.reply({
        content: "Erro: Jogador alvo não encontrado!",
        ephemeral: true,
      });
      return;
    }

    const username = isTargetABot
      ? game.botUsers.get(targetId)!
      : (target as User).username;

    game.playerSkillUsage.set(interaction.user.id, skillUsage + 1);
    game.deadPlayers.set(username, targetRole.name);
    game.players.delete(targetId);
    game.playerRoles.delete(targetId);
    game.hasUsedSkill.set(interaction.user.id, true);

    await interaction.reply({
      content: `Seu voto para atirar em ${username} foi registrado!`,
      ephemeral: true,
    });
    await interaction.followUp(
      `💥BAANG! Um tiro ecoa em meio a multidão, se trata de ${interaction.user.username} que acabou de atirar em ${username}!\n${username} era o ${targetRole.name}`
    );
  },
};
