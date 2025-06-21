import {
  ButtonBuilder,
  EmbedBuilder,
  ButtonStyle,
  ActionRowBuilder,
  Client,
  User,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
} from "discord.js";
import {
  handleBotVoting,
  handleBotNightActions,
  createBotPlayers,
  handleBotDayActions,
} from "./bots-hanlders";
import { setTimeout } from "node:timers/promises";
import gameManager from "./game-state";
import { GameState, Role } from "./types";

interface Victim {
  user: { username: string };
  role: string;
}

const roles: Role[] = [
  {
    name: "Lobo",
    icon: "🐺",
    proportion: 4,
    max: 3,
    startMessage:
      "Você é o lobo, uma maldição antiga transformou você em uma besta insaciável por carne humana. Saia durante a noite e caçe todos até que não sobre ninguém!",
    nightMessage: "",
    dayMessage: "",
  },
  {
    name: "Aldeão",
    icon: "🧑",
    proportion: 0,
    max: 10,
    startMessage:
      "Você é um aldeão, vive uma vida simples na vila, arando campos e cuidando dos animais.",
    nightMessage: "A noite chegou, durma tranquilo e aguarde o amanhecer...",
    dayMessage: "",
  },
  {
    name: "Cortesã",
    icon: "💋",
    proportion: 7,
    max: 1,
    startMessage:
      "Você é a cortesã, uma mulher com encantos poderosos. Durante a noite você pode escolher alguém para fazer uma visitinha e descobrir seu papel, mas cuidado, se for a casa do lobo ou alguém sendo atacado pelo lobo você morrerá",
    nightMessage:
      "Você é a cortesã, escolha alguém para fazer uma visita esta noite usando /visit jogador.",
    dayMessage: "",
  },
  {
    name: "Vidente",
    icon: "🔮",
    proportion: 7,
    max: 1,
    startMessage:
      "Você é a vidente, dotada do poder de ver o futuro. A cada noite, você pode prever o papel de alguém.",
    nightMessage:
      "Você é a vidente, escolha alguém para prever seu papel usando /videncia jogador, mas cuidado, os lobos farão de tudo para te matar caso se revele.",
    dayMessage: "",
  },
  {
    name: "Bêbado",
    icon: "🍺",
    proportion: 7,
    max: 1,
    startMessage:
      "Você é o bêbado, sua única preocupação é a bebida. Nada pode te tirar dessa busca implacável por diversão, se os lobos te devorarem ficarão de ressaca e não atacarão na noite seguinte",
    nightMessage: "Você passa a noite toda bebendo enquanto a vila dorme...",
    dayMessage: "",
  },
  {
    name: "Prefeito",
    icon: "👑",
    proportion: 7,
    max: 1,
    startMessage:
      "Você é o prefeito, o líder da vila. Seu voto vale por 2 na forca, você sabe que a riqueza e o controle das taxas estão em suas mãos.",
    nightMessage:
      "Você dorme tranquilo, sabendo que o dinheiro das taxas está indo para seu bolso.",
    dayMessage: "",
  },
  {
    name: "Atirador",
    icon: "🔫",
    proportion: 7,
    max: 1,
    startMessage:
      "Você é o atirador, joga pela vila, sua arma é sua maior aliada. Você possui 2 balas que pode usar para matar alguém durante o dia caso ache que essa pessoa é o lobo",
    nightMessage:
      "Você se recolhe para sua casa para dormir com sua arma em baixo do travesseiro",
    dayMessage:
      "O dia chegou, pegue sua arma e use /tiro jogador para matar alguém",
  },
  {
    name: "Anjo da guarda",
    icon: "👼",
    proportion: 8,
    max: 1,
    startMessage:
      "Você é o anjo da guarda, joga pela vila, você pode escolher um jogador por noite para proteger contra os males",
    nightMessage:
      "As trevas da noite se aproximam... Use /proteger para proteger alguém esta noite",
    dayMessage: "",
  },
  {
    name: "Cupido",
    icon: "❤",
    proportion: 8,
    max: 1,
    startMessage:
      "Você é o cupido ❤, joga pela vila, você pode usar seu arco do amor para unir um casal apaixonado",
    nightMessage:
      "A noite cai, você pega seu arco e suas flechas em forma de coração preparado para espalhar amor pelo mundo. \n\n Use /Unir durante a noite para unir um casal",
    dayMessage: "",
  },
];

async function assignRoles(
  players: Map<string, User | string>
): Promise<Map<string, Role>> {
  const playerArray = Array.from(players.keys());
  const playerCount = playerArray.length;

  // Shuffle players
  for (let i = playerArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [playerArray[i], playerArray[j]] = [playerArray[j], playerArray[i]];
  }

  const playerRoles = new Map<string, Role>();
  const availablePlayers = [...playerArray];

  // Calculate desired count for each role based on proportion
  const roleDistribution = roles.map((role) => ({
    ...role,
    targetCount: Math.min(
      Math.floor(playerCount / role.proportion),
      role.max,
      role.name === "Aldeão" ? Math.floor(playerCount / 3) : playerCount - 1
    ),
  }));

  // Ensure at least one Vidente
  const videnteRole = roleDistribution.find((r) => r.name === "Vidente");
  if (videnteRole && availablePlayers.length > 0) {
    const randomIndex = Math.floor(Math.random() * availablePlayers.length);
    const selectedPlayer = availablePlayers.splice(randomIndex, 1)[0];
    playerRoles.set(selectedPlayer, videnteRole);
  }

  // Assign wolves first
  const wolfRole = roleDistribution.find((r) => r.name === "Lobo");
  if (wolfRole) {
    const wolfCount = wolfRole.targetCount!;
    for (let i = 0; i < wolfCount && availablePlayers.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availablePlayers.length);
      const selectedPlayer = availablePlayers.splice(randomIndex, 1)[0];
      playerRoles.set(selectedPlayer, wolfRole);
    }
  }

  // Assign other roles
  for (const role of roleDistribution) {
    if (
      role.name === "Lobo" ||
      role.name === "Vidente" ||
      role.name === "Aldeão"
    ) {
      continue;
    }

    const remainingCount = Math.min(role.targetCount!, availablePlayers.length);
    for (let i = 0; i < remainingCount && availablePlayers.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availablePlayers.length);
      const selectedPlayer = availablePlayers.splice(randomIndex, 1)[0];
      playerRoles.set(selectedPlayer, role);
    }
  }

  // Assign remaining players as villagers
  const villagerRole = roles.find((r) => r.name === "Aldeão")!;
  for (const player of availablePlayers) {
    playerRoles.set(player, villagerRole);
  }
  return playerRoles;
}

async function handleNightKills(
  interaction: ChatInputCommandInteraction
): Promise<Victim[]> {
  const game = gameManager.getGame(interaction.channelId) as
    | GameState
    | undefined;
  const victims: Victim[] = [];
  if (!game || !game.nightKill || game.nightKill.size === 0) return victims;

  const MESSAGES = {
    WOLF_PROTECTED:
      "Na noite passada você invadiu a casa do seu alvo, quando estava prestes a desferir seu ataque, uma forte luz surge em sua frente na forma de um anjo. Você se assusta e foge pela janela",
    VICTIM_KILLED: "Você virou janta do lobo!",
    LOVE_UNION_DEATH: (partnerName: string) =>
      `Seu amor, ${partnerName}, foi morto, e você não conseguiu viver sem ele(a)!`,
  };

  const targets = Array.from(game.nightKill.entries());

  for (const [userId, targetId] of targets) {
    if (!targetId) continue;

    const userRole = game.playerRoles.get(userId)?.name;
    if (!userRole) {
      console.error(`No role found for attacker ${userId}`);
      continue;
    }

    if (game.nightProtection.has(targetId)) {
      game.nightProtection.delete(targetId);
      if (!userId.includes("bot_")) {
        game.nightSkills.set(userId, MESSAGES.WOLF_PROTECTED);
      }
      continue;
    }
    if (!game.players.has(targetId)) {
      console.warn(`Victim ${targetId} not found in game.players`);
      continue;
    }

    const isBot = targetId.includes("bot_");
    let username: string;
    let victimUser: User | null = null;
    const victimRole = game.playerRoles.get(targetId);

    if (!victimRole?.name) {
      console.error(`No role found for victim ${targetId}`);
      continue;
    }

    if (!isBot) {
      victimUser = await interaction.client.users
        .fetch(targetId)
        .catch(() => null);
      if (!victimUser) {
        console.error(`Failed to fetch user ${targetId}`);
        continue;
      }
      username = victimUser.username;
    } else {
      username = game.botUsers.get(targetId) ?? "Unknown Bot";
    }

    if (victimRole?.name === "Bêbado" && userRole === "Lobo") {
      if (!userId.includes("bot_")) {
        const user = await interaction.client.users.fetch(userId);
        await user.send(
          "Você devorou o bêbado, ele ingeriu tanto álcool que até você ficou bêbado ao comê-lo e não poderá atacar na próxima noite!"
        );
      }
      console.log(`Wolf ${userId} incapacitated by eating Bêbado ${targetId}`);
    }

    victims.push({ user: { username }, role: victimRole.name });
    game.players.delete(targetId);
    game.deadPlayers.set(username, victimRole);

    if (!isBot && victimUser) {
      const killedEmbed = new EmbedBuilder()
        .setColor(0x000066)
        .setDescription(MESSAGES.VICTIM_KILLED)
        .setImage(
          "https://i.pinimg.com/originals/8d/17/a6/8d17a66e3c8eb6077a81ebf79814ced9.gif"
        );
      try {
        await victimUser.send({ embeds: [killedEmbed], components: [] });
      } catch (error) {
        console.error(`Couldn't send DM to victim ${username}: ${error}`);
      }
    }
  }

  game.nightKill.clear();
  return victims;
}

async function handleNewRound(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const game = gameManager.getGame(interaction.channelId) as
    | GameState
    | undefined;
  if (!game) return;

  if (game.playerRoles.size === 0) {
    game.playerRoles = await assignRoles(game.players);

    for (const [playerId, role] of game.playerRoles) {
      if (playerId.includes("bot_")) {
        continue;
      }
      const player = await interaction.client.users.fetch(playerId);

      const roleEmbed = new EmbedBuilder()
        .setColor(0xff6600)
        .setTitle(`${role.icon} ${role.name}`)
        .setDescription(role.startMessage);

      try {
        await player.send({ embeds: [roleEmbed], components: [] });
      } catch (error) {
        console.error(`Couldn't send DM to ${player.username}`);
      }
    }
  }

  await displayWhoIsAlive(interaction, game);
  await setTimeout(5000);

  game.status = "night";

  const nightEmbed = new EmbedBuilder()
    .setColor(0x000066)
    .setTitle("🌙 A noite chegou!")
    .setDescription("Os habitantes da vila se recolhem em suas casas...")
    .setImage(
      "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWQ3d25ucnI1Znhnbnk4aDJmdHJxZDRma2Eyc3Jyazc1YWFodTVsZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/ZLdy2L5W62WGs/giphy.gif"
    );

  await interaction.followUp({ embeds: [nightEmbed], components: [] });

  await setTimeout(5000);
  await interaction.followUp(
    "Jogadores tem 60 segundos para realizarem suas ações!"
  );

  await sendPrivateNightMessages(interaction, game);
  handleBotNightActions(game);

  await setTimeout(60000);

  game.status = "morning-results";

  const morningAnnouncementEmbed = new EmbedBuilder()
    .setColor(0xffff00)
    .setTitle("Manhã")
    .setDescription("🌞 O sol nasce em mais um dia na vila...")
    .setImage(
      "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExMHh5bG15Z3RxcjMybHU0em1wN3dmOHV2aDM3YjFwMXhkM2JsMWw3MiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/uFmH8za4E6M5STIiTu/giphy.gif"
    );

  await interaction.followUp({ embeds: [morningAnnouncementEmbed] });
  await setTimeout(4000);
  const didSomeoneDie = await handleNightSkillsResults(interaction);

  const nightKillResults = await handleNightKills(interaction);

  let morningDescription = "";
  await sendPrivateDayMessages(interaction, game);

  if (nightKillResults.length > 0) {
    morningDescription += "\n\n💀 Durante a noite...\n";
    for (const result of [...nightKillResults]) {
      morningDescription += `${result.user.username} foi encontrado morto! Ele era um ${result.role}!\n`;
    }
    await interaction.followUp(morningDescription);
  } else if (!didSomeoneDie) {
    morningDescription += "\n\nMilagrosamente, ninguém morreu esta noite!";
    await interaction.followUp(morningDescription);
  }
  await checkForPartnersDeath(interaction, game);

  await setTimeout(2000);
  await handleBotDayActions(interaction, game);
  await setTimeout(1000);

  await checkEndGameStatus(interaction, game);
  if (!gameManager.getGame(interaction.channelId)) {
    return;
  }

  await setTimeout(4000);
  await displayWhoIsAlive(interaction, game);
  await setTimeout(4000);
  await interaction.followUp(
    "Votação para decidir quem vai para forca começa em 30 segundos"
  );

  await setTimeout(30000);

  game.status = "voting";
  const morningEmbed = new EmbedBuilder()
    .setColor(0xffff00)
    .setTitle("Votação")
    .setDescription(
      "É hora de decidir! Quem será executado?\n" +
        "Use `/votar @jogador` para dar seu voto.\n" +
        "Você tem 60 segundos para votar!"
    );

  await interaction.followUp({ embeds: [morningEmbed] });
  await handleBotVoting(interaction, game);
  await setTimeout(60000);
  game.hasUsedSkill.clear();
  await handleVotingResults(interaction);
}

async function handleVotingResults(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const game = gameManager.getGame(interaction.channelId) as
    | GameState
    | undefined;
  if (!game) return;

  const voteCounts = new Map<string, number>();
  game.votes.forEach((votedFor, voter) => {
    const currentCount = voteCounts.get(votedFor) || 0;
    voteCounts.set(votedFor, currentCount + 1);
  });

  let maxVotes = 0;
  let playersWithMaxVotes: string[] = [];

  voteCounts.forEach((count, playerId) => {
    if (count > maxVotes) {
      maxVotes = count;
      playersWithMaxVotes = [playerId];
    } else if (count === maxVotes) {
      playersWithMaxVotes.push(playerId);
    }
  });

  if (playersWithMaxVotes.length > 1) {
    await interaction.followUp("Ninguém foi eliminado - houve um empate!");
    game.votes.clear();
    await checkEndGameStatus(interaction, game);
    if (gameManager.getGame(interaction.channelId)) {
      await setTimeout(15000);
      await handleNewRound(interaction);
    }
    return;
  }

  const eliminatedId = playersWithMaxVotes[0];
  if (eliminatedId) {
    const isBot = eliminatedId.includes("bot_");
    const username = isBot
      ? game.botUsers.get(eliminatedId) ?? "Unknown Bot"
      : (await interaction.client.users.fetch(eliminatedId)).username;
    const eliminatedRole = game.playerRoles.get(eliminatedId)!;

    await interaction.followUp(
      `A vila votou! ${username} foi enforcado!\n${username} era o ${eliminatedRole.name}`
    );
    game.deadPlayers.set(username, eliminatedRole);
    game.players.delete(eliminatedId);
    checkForPartnersDeath(interaction, game);
  }

  game.votes.clear();
  await checkEndGameStatus(interaction, game);
  if (gameManager.getGame(interaction.channelId)) {
    await setTimeout(15000);
    await handleNewRound(interaction);
  }
}
async function sendPrivateNightMessages(
  interaction: ChatInputCommandInteraction,
  game: GameState
): Promise<void> {
  const wolves = Array.from(game.playerRoles.entries())
    .filter(([_, role]) => role.name === "Lobo")
    .map(([playerId]) => playerId);

  if (wolves.length > 0) {
    const wolfList = await Promise.all(
      wolves.map(async (wolfId: string) => {
        if (!wolfId.includes("bot_")) {
          const wolf = await interaction.client.users.fetch(wolfId);
          return wolf.username;
        }
        return game.botUsers.get(wolfId)!;
      })
    );

    for (const wolfId of wolves) {
      if (wolfId.includes("bot_")) continue;
      const wolf = await interaction.client.users.fetch(wolfId);
      const canUseSkill = !game.cantUseSkill.get(wolfId);
      if (game.deadPlayers.has(wolfId)) {
        continue;
      }
      if (canUseSkill) {
        try {
          await wolf.send(
            `Você é um Lobo! Outros lobos: ${wolfList.join(
              ", "
            )}\nUse /atacar para escolher sua vítima!`
          );
        } catch (error) {
          console.error(`Couldn't send DM to wolf ${wolf.username}`);
        }
      }
    }
  }

  const others = Array.from(game.playerRoles.entries())
    .filter(([_, role]) => role.name !== "Lobo")
    .map(([villagerId, role]) => ({ villagerId, role }));

  for (const { villagerId, role } of others) {
    if (game.deadPlayers.has(villagerId)) {
      continue;
    }
    if (villagerId.includes("bot_")) continue;
    const canUseSkill = !game.cantUseSkill.get(villagerId);
    if (canUseSkill) {
      try {
        const villager = await interaction.client.users.fetch(villagerId);
        await villager.send(role.nightMessage);
      } catch (error) {
        console.error(`Couldn't send DM to villager ${villagerId}`);
      }
    }
  }
}

async function sendPrivateDayMessages(
  interaction: ChatInputCommandInteraction,
  game: GameState
): Promise<void> {
  const shooters = Array.from(game.playerRoles.entries())
    .filter(([_, role]) => role.name === "Atirador")
    .map(([userId, role]) => ({ userId, role }));

  for (const { userId, role } of shooters) {
    if (game.deadPlayers.has(userId)) {
      continue;
    }
    if (userId.includes("bot_")) continue;
    const canUseSkill = !game.cantUseSkill.get(userId);
    if (canUseSkill) {
      try {
        const villager = await interaction.client.users.fetch(userId);
        await villager.send(role.dayMessage);
      } catch (error) {
        console.error(`Couldn't send DM to villager ${userId}`);
      }
    }
  }
}

async function handleNightSkillsResults(
  interaction: ChatInputCommandInteraction
): Promise<boolean> {
  const game = gameManager.getGame(interaction.channelId) as GameState;
  const skills = Array.from(game.nightSkills.entries());
  let didSomeoneDie = false;

  for (const [userId, targetId] of skills) {
    if (userId.includes("bot_")) continue;
    const skillUser = await interaction.client.users.fetch(userId);
    const skillUserRole = game.playerRoles.get(userId)!;

    if (skillUserRole.name === "Lobo") {
      if (game.cantUseSkill.get(userId)) {
        await skillUser.send(
          "Você devorou o bêbado, ele ingeriu tanto álcool que até você ficou bêbado ao comê-lo e não poderá atacar esta noite!"
        );
      }
      continue;
    }

    const isTargetABot = targetId.includes("bot_");
    if (targetId) {
      const targetUser = !isTargetABot
        ? await interaction.client.users.fetch(targetId)
        : null;
      const username = isTargetABot
        ? game.botUsers.get(targetId)!
        : targetUser!.username;
      const targetRole = game.playerRoles.get(targetId)!;

      if (skillUserRole.name === "Vidente") {
        await skillUser.send(`Você vê que ${username} é o ${targetRole.name}`);
      } else if (skillUserRole.name === "Cortesã") {
        const findPlayerIdWithTarget = (targetId: string): string | null => {
          for (const [playerId, victimId] of game.nightKill.entries()) {
            if (victimId === targetId) return playerId;
          }
          return null;
        };

        if (targetRole.name === "Lobo") {
          await skillUser.send(
            `Ao visitar ${username}, tudo parecia ótimo até que ao chegarem no quarto, ${username} começou a rosnar e revelar garras e dentes enormes! ${username} era o ${targetRole.name}!\nVocê morreu!`
          );
          game.players.delete(userId);
          game.deadPlayers.set(skillUser.username, skillUserRole);
          game.nightSkills.delete(userId);

          await interaction.followUp(
            `Um cheiro podre emana do chiqueiro da vila, ao inspecionar, os aldeões descobrem que se trata da carcaça de ${skillUser.username}!\nEle era a cortesã.`
          );
          didSomeoneDie = true;
          return didSomeoneDie;
        }

        const attackingWolfId = findPlayerIdWithTarget(targetId);
        if (attackingWolfId) {
          const attackingWolfUser = await interaction.client.users.fetch(
            attackingWolfId
          );
          await skillUser.send(
            `Ao entrar na casa de ${username}, você escuta fortes barulhos e ao investigar você encontra ${username} sendo atacado pelo lobo!\nO lobo vira pra você e parte para o ataque!\nVocê morreu!`
          );
          game.players.delete(userId);
          game.deadPlayers.set(skillUser.username, skillUserRole);
          game.nightSkills.delete(userId);

          await interaction.followUp(
            `Um cheiro podre emana do chiqueiro da vila, ao inspecionar, os aldeões descobrem que se trata da carcaça de ${skillUser.username}!\nEle era a cortesã.`
          );

          try {
            await attackingWolfUser.send(
              `Ao realizar seu ataque noturno, ${skillUser.username} aparece na casa onde você estava, você aproveita e o devora também!`
            );
          } catch (error) {
            console.error(
              `Couldn't send DM to wolf ${attackingWolfUser.username}`
            );
          }
          didSomeoneDie = true;
          return didSomeoneDie;
        }

        await skillUser.send(
          `Após sua visita, você descobriu que ${username} é o ${targetRole.name}`
        );
      } else if (skillUserRole.name === "Anjo da guarda") {
        if (!game.nightProtection.has(userId)) {
          try {
            await skillUser.send(
              `Sua proteção foi forte e ${username} sobreviveu esta noite!`
            );
          } catch (error) {
            console.error(`Couldn't send DM to ${skillUser.username}`);
          }
          continue;
        }
        game.nightProtection.delete(userId);
      }
    }
  }
  game.nightSkills.clear();
  return didSomeoneDie;
}

async function checkEndGameStatus(
  interaction: ChatInputCommandInteraction,
  game: GameState
): Promise<void> {
  const playerCount = game.players.size;

  // Get role counts
  let wolfCount = 0;
  let killerCount = 0;
  let otherCount = 0;

  for (const role of game.playerRoles.values()) {
    if (role.name === "Lobo") wolfCount++;
    else if (role.name === "Assassino") killerCount++;
    else otherCount++;
  }

  // Wolves win if they are equal or more than the other players
  if (wolfCount > 0 && wolfCount >= otherCount) {
    const wolfPlayerId = Array.from(game.playerRoles.entries()).find(
      ([, role]) => role.name === "Lobo"
    )?.[0];

    const name = wolfPlayerId?.includes("bot_")
      ? game.botUsers.get(wolfPlayerId)!
      : (await interaction.client.users.fetch(wolfPlayerId!)).username;

    await interaction.followUp(
      `De repente presas e garras começam a surgir em ${name}, que então, parte para devorar o último sobrevivente!`
    );

    const wolfEmbed = new EmbedBuilder()
      .setColor(0xffff00)
      .setTitle("O jogo acabou! O Lobo venceu!")
      .setImage(
        "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnhpNnc2N2I2OWoyYzJsNWs1eW41ajhsYjAwYzNkNHN4bWdhMnVhNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/tiP6DWUdHhvck/giphy.gif"
      );

    await interaction.followUp({ embeds: [wolfEmbed], components: [] });
    displayWhoIsAlive(interaction, game, true);
    gameManager.removeGame(interaction.channelId);
    return;
  }

  // Killer wins if he's the last special role alive
  if (killerCount === 1 && wolfCount === 0 && playerCount === 1) {
    const killerPlayerId = Array.from(game.playerRoles.entries()).find(
      ([, role]) => role.name === "Assassino"
    )?.[0];

    const name = killerPlayerId?.includes("bot_")
      ? game.botUsers.get(killerPlayerId)!
      : (await interaction.client.users.fetch(killerPlayerId!)).username;

    const killerEmbed = new EmbedBuilder()
      .setColor(0xffff00)
      .setTitle("O jogo acabou! O assassino venceu!")
      .setImage("https://i.giphy.com/8cqVIPHCKLhfO.webp");

    await interaction.followUp({ embeds: [killerEmbed], components: [] });
    displayWhoIsAlive(interaction, game, true);
    gameManager.removeGame(interaction.channelId);
    return;
  }

  // Village wins if no wolves and no assassins remain
  if (wolfCount === 0 && killerCount === 0) {
    const villageEmbed = new EmbedBuilder()
      .setColor(0xffff00)
      .setTitle("O jogo acabou! A vila venceu!")
      .setImage(
        "https://www.lascosasquenoshacenfelices.com/wp-content/uploads/2021/08/angrymob.gif"
      );

    await interaction.followUp({ embeds: [villageEmbed], components: [] });
    displayWhoIsAlive(interaction, game, true);
    gameManager.removeGame(interaction.channelId);
    return;
  }
}

async function displayWhoIsAlive(
  interaction: ChatInputCommandInteraction,
  game: GameState,
  reveal: boolean = false
): Promise<void> {
  let playersAliveDescription = "";
  for (const playerId of game.players.keys()) {
    if (!playerId.includes("bot_")) {
      const user = await interaction.client.users.fetch(playerId);
      const role = game.playerRoles.get(playerId)!;
      playersAliveDescription += `🧑 ${user.username} ${
        reveal ? `(${role.icon} ${role.name})` : ""
      }\n`;
    } else {
      const username = game.botUsers.get(playerId)!;
      const role = game.playerRoles.get(playerId)!;
      playersAliveDescription += `🧑 ${username} ${
        reveal ? `(${role.icon} ${role.name})` : ""
      }\n`;
    }
  }

  if (game.deadPlayers) {
    for (const [playerUsername, playerRole] of game.deadPlayers) {
      playersAliveDescription += `💀 ${playerUsername} (${playerRole.icon} ${playerRole.name})\n`;
    }
  }

  const playersAliveEmbed = new EmbedBuilder()
    .setColor(0xffff00)
    .setTitle(reveal ? "Papéis da partida" : "Jogadores vivos")
    .setDescription(playersAliveDescription);

  await interaction.followUp({ embeds: [playersAliveEmbed] });
}
async function checkForPartnersDeath(
  interaction: ChatInputCommandInteraction,
  game: GameState
) {
  const MESSAGES = {
    LOVE_UNION_DEATH: (partnerName: string) =>
      `Seu amor, ${partnerName}, foi morto, e você não conseguiu viver sem ele(a)!`,
  };

  // Create a map of player IDs to usernames
  const playerUsernames = new Map<string, string>();
  for (const playerId of game.players.keys()) {
    if (playerId.includes("bot_")) {
      playerUsernames.set(
        playerId,
        game.botUsers.get(playerId) || "Unknown Bot"
      );
    } else {
      try {
        const user = await interaction.client.users.fetch(playerId);
        playerUsernames.set(playerId, user.username);
      } catch (error) {
        console.error(`Failed to fetch username for ${playerId}:`, error);
      }
    }
  }
  // Add dead players (assuming deadPlayers uses player IDs as keys)
  for (const [username, role] of game.deadPlayers) {
    const playerId = Array.from(game.playerRoles.entries()).find(
      ([id, r]) =>
        r === role && (game.botUsers.get(id) === username || id === username)
    )?.[0];
    if (playerId) {
      playerUsernames.set(playerId, username);
    }
  }

  for (const [playerId, partnerId] of game.loveUnion) {
    if (!game.players.has(playerId)) continue;
    if (!game.players.has(partnerId)) {
      const victimRole = game.playerRoles.get(playerId);
      if (!victimRole) {
        console.error(`No role found for ${playerId}`);
        continue;
      }

      const username = playerUsernames.get(playerId);
      const partnerName = playerUsernames.get(partnerId);
      if (!username || !partnerName) {
        console.error(`Missing username for ${playerId} or ${partnerId}`);
        continue;
      }

      game.players.delete(playerId);
      game.deadPlayers.set(username, victimRole);

      if (!playerId.includes("bot_")) {
        try {
          const victimUser = await interaction.client.users.fetch(playerId);
          const loveDeathEmbed = new EmbedBuilder()
            .setColor(0x000066)
            .setDescription(MESSAGES.LOVE_UNION_DEATH(partnerName))
            .setImage(
              "https://i.pinimg.com/originals/8d/17/a6/8d17a66e3c8eb6077a81ebf79814ced9.gif"
            );
          await victimUser.send({ embeds: [loveDeathEmbed], components: [] });
        } catch (error) {
          console.error(`Couldn't send DM to ${username}: ${error}`);
        }
      }

      await interaction.followUp(
        `${username} morreu de coração partido após a morte de seu amor, ${partnerName}! Eles eram um ${victimRole.name}.`
      );
    }
  }
}

async function handlePlayersAutocomplete(
  game: GameState,
  interaction: AutocompleteInteraction,
  focusedValue: string,
  choices: { name: string; value: string }[]
): Promise<void> {
  if (!game) {
    await interaction.respond([]);
    return;
  }

  if (!game.players.has(interaction.user.id)) {
    await interaction.respond([]);
    return;
  }
  for (const id of game.players.keys()) {
    let name: string | undefined;
    const userRole = game.playerRoles.get(interaction.user.id)!;

    if (userRole.name === "Lobo" && game.playerRoles.get(id)!.name === "Lobo") {
      continue;
    }

    if (id.includes("bot_")) {
      name = game.botUsers.get(id);
    } else if (id !== interaction.user.id) {
      try {
        const user = await interaction.client.users.fetch(id);
        name = user?.username;
      } catch (error) {
        console.error(`Failed to fetch user ${id}:`, error);
        continue;
      }
    }

    if (name?.toLowerCase().includes(focusedValue.toLowerCase())) {
      choices.push({ name, value: id });
    }
  }
}

export {
  assignRoles,
  handleNightKills,
  handleVotingResults,
  handleNewRound,
  sendPrivateNightMessages,
  createBotPlayers,
  checkForPartnersDeath,
  handlePlayersAutocomplete,
};
