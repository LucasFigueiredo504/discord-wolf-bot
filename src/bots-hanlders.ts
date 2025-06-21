import {
  ButtonBuilder,
  EmbedBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ChatInputCommandInteraction,
  User,
} from "discord.js";
import { setTimeout } from "node:timers/promises";
import gameManager from "./game-state";
import { GameState } from "./types";

function createBotPlayers(game: GameState, numberOfBots: number): void {
  const botNames = [
    "Foxtrot",
    "Finn",
    "Jake",
    "Marceline",
    "Benson",
    "GaMma",
    "Zeta",
    "Omega",
    "Phi",
    "Sigma",
    "Bruce",
    "Reub",
    "Jerry",
    "Tom",
  ];

  for (let i = 0; i < numberOfBots; i++) {
    const botId = `bot_${Date.now()}_${i}`;
    const botUsername = botNames[i] || `Bot_${i + 1}`;
    game.players.set(botId, botId);
    game.botUsers.set(botId, botUsername);
  }
}

async function handleBotDayActions(
  interaction: ChatInputCommandInteraction,
  game: GameState
): Promise<void> {
  for (const [playerId, role] of game.playerRoles) {
    if (!playerId.includes("bot_")) {
      continue;
    }
    const botName = game.botUsers.get(playerId)!;

    if (role.name === "Atirador") {
      const skillUsage = game.playerSkillUsage.get(playerId) || 0;
      if (skillUsage >= 2) {
        continue;
      }

      const eligiblePlayers = Array.from(game.players.keys()).filter(
        (p) => p !== playerId
      );
      if (eligiblePlayers.length === 0) continue;

      const randomPlayer =
        eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
      const hasDecidedToShoot = Math.random() < 0.5;

      if (hasDecidedToShoot) {
        const targetRole = game.playerRoles.get(randomPlayer);
        if (!targetRole) continue;

        let targetName: string;
        if (!randomPlayer.includes("bot_")) {
          try {
            const targetUser = await interaction.client.users.fetch(
              randomPlayer
            );
            targetName = targetUser.username;
            game.deadPlayers.set(targetName, targetRole);
          } catch (error) {
            console.error(`Failed to fetch user ${randomPlayer}:`, error);
            continue;
          }
        } else {
          targetName = game.botUsers.get(randomPlayer)!;
          game.deadPlayers.set(targetName, targetRole);
        }

        game.playerSkillUsage.set(playerId, skillUsage + 1);
        game.players.delete(randomPlayer);
        game.playerRoles.delete(randomPlayer);

        await interaction.followUp(
          `💥BAANG! Um tiro ecoa em meio a multidão, se trata de ${botName} que acabou de atirar em ${targetName}!\n ${targetName} era o ${targetRole.name}`
        );
      }
    }
  }
}

async function handleBotNightActions(game: GameState): Promise<void> {
  for (const [playerId, role] of game.playerRoles) {
    if (!playerId.includes("bot_")) {
      continue;
    }
    if (game.cantUseSkill.get(playerId)) {
      game.cantUseSkill.delete(playerId);
      continue;
    }

    const canUseSkill = !game.cantUseSkill.get(playerId);
    if (!canUseSkill) {
      continue;
    }

    const eligiblePlayers = Array.from(game.players.keys()).filter(
      (p) => p !== playerId
    );
    if (eligiblePlayers.length === 0) continue;

    switch (role.name) {
      case "Lobo": {
        const eligiblePlayersByRole = eligiblePlayers.filter(
          (p) => game.playerRoles.get(p)?.name !== "Lobo"
        );
        if (eligiblePlayersByRole.length === 0) break;

        const randomPlayer =
          eligiblePlayersByRole[
            Math.floor(Math.random() * eligiblePlayersByRole.length)
          ];
        game.nightKill.set(playerId, randomPlayer);
        break;
      }
      case "Cortesã": {
        const randomPlayer =
          eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
        game.nightSkills.set(playerId, randomPlayer);
        break;
      }
      case "Vidente": {
        const randomPlayer =
          eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
        game.nightSkills.set(playerId, randomPlayer);
        break;
      }
      case "Anjo da guarda": {
        const randomPlayer =
          eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
        game.nightProtection.set(randomPlayer, true);
        break;
      }
      case "Cupido": {
        if (game.hasUsedSkill.get(playerId)) break;
        if (eligiblePlayers.length < 2) break;

        const shuffled = [...eligiblePlayers].sort(() => 0.5 - Math.random());
        const player1 = shuffled[0];
        const player2 = shuffled[1];

        game.loveUnion.set(player1, player2);
        game.hasUsedSkill.set(playerId, true);

        console.log(`Cupido bot ${playerId} united ${player1} and ${player2}`);
        break;
      }
      default:
        break;
    }
  }
}

async function handleBotVoting(
  interaction: ChatInputCommandInteraction,
  game: GameState
): Promise<void> {
  for (const player of game.players.keys()) {
    if (!player.includes("bot_")) continue;

    const eligiblePlayers = Array.from(game.players.keys()).filter(
      (p) => p !== player
    );
    if (eligiblePlayers.length === 0) continue;

    const randomPlayer =
      eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
    game.votes.set(player, randomPlayer);

    const botName = game.botUsers.get(player)!;
    let targetName: string;
    if (randomPlayer.includes("bot_")) {
      targetName = game.botUsers.get(randomPlayer)!;
    } else {
      try {
        targetName = (await interaction.client.users.fetch(randomPlayer))
          .username;
      } catch (error) {
        console.error(`Failed to fetch user ${randomPlayer}:`, error);
        continue;
      }
    }

    await interaction.followUp(`${botName} votou em ${targetName}`);

    const playerRole = game.playerRoles.get(player);
    if (playerRole?.name === "Prefeito") {
      game.votes.set(`${player}-1`, randomPlayer);
    }

    await setTimeout(Math.floor(Math.random() * (5000 - 3000 + 1)) + 3000);
  }
}

export {
  createBotPlayers,
  handleBotDayActions,
  handleBotNightActions,
  handleBotVoting,
};
