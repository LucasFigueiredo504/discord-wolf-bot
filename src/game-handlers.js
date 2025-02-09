const {
	ButtonBuilder,
	EmbedBuilder,
	ButtonStyle,
	ActionRowBuilder,
	MessageFlags,
} = require("discord.js");
const {
	handleBotVoting,
	handleBotNightActions,
	createBotPlayers,
	handleBotDayActions,
} = require("./bots-hanlders");
const wait = require("node:timers/promises").setTimeout;
const gameManager = require("./game-state");

const roles = [
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
			"Você é a cortesã, uma mulher com encantos poderosos. Durante a noite você pode escolher alguém para afzer uma visitinha e descobrir seu papel, mas cuidado, se for a casa do lobo ou alguém sendo atacado pelo lobo você morrerá",
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
			"Você é o atirador,joga pela vila, sua arma é sua maior aliada. Você possui 2 balas que pode usar para matar alguém durante o dia caso ache que essa pessoa é o lobo",
		nightMessage:
			"Você se recole para sua casa para dormir com sua arma em baixo do travesseiro",
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
	/* 	{
		name: "Assassino",
		icon: "🔪",
		proportion: 10,
		max: 1,
		startMessage:
			"Você é o assassino, joga por sí mesmo, apenas se importa com aumentar sua coleção de corpos",
		nightMessage: "A noite chegou, pegue sua faca e vá atrás de suas vítimas",
		dayMessage: "",
	}, */
];

async function assignRoles(players) {
	const playerArray = Array.from(players);
	const playerCount = playerArray.length;

	// Shuffle players
	for (let i = playerArray.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[playerArray[i], playerArray[j]] = [playerArray[j], playerArray[i]];
	}

	const playerRoles = new Map();
	const availablePlayers = [...playerArray];

	// Calculate desired count for each role based on proportion
	const roleDistribution = roles.map((role) => {
		const desiredCount = Math.floor(playerCount / role.proportion);
		return {
			...role,
			targetCount: Math.min(
				desiredCount,
				role.max,
				role.name === "Aldeão" ? Math.floor(playerCount / 3) : playerCount - 1,
			),
		};
	});

	// Ensure at least one Vidente (mandatory role)
	const videnteRole = roleDistribution.find((r) => r.name === "Vidente");
	if (videnteRole && availablePlayers.length > 0) {
		const randomIndex = Math.floor(Math.random() * availablePlayers.length);
		const selectedPlayer = availablePlayers.splice(randomIndex, 1)[0];
		playerRoles.set(selectedPlayer, videnteRole);
	}

	// Assign wolves first based on proportion
	const wolfRole = roleDistribution.find((r) => r.name === "Lobo");
	if (wolfRole) {
		const wolfCount = wolfRole.targetCount;
		for (let i = 0; i < wolfCount && availablePlayers.length > 0; i++) {
			const randomIndex = Math.floor(Math.random() * availablePlayers.length);
			const selectedPlayer = availablePlayers.splice(randomIndex, 1)[0];
			playerRoles.set(selectedPlayer, wolfRole);
		}
	}

	// Then assign other roles based on proportion and max limits
	for (const role of roleDistribution) {
		// Skip roles that were already handled
		if (
			role.name === "Lobo" ||
			role.name === "Vidente" ||
			role.name === "Aldeão"
		) {
			continue;
		}

		const remainingCount = Math.min(role.targetCount, availablePlayers.length);

		for (let i = 0; i < remainingCount && availablePlayers.length > 0; i++) {
			const randomIndex = Math.floor(Math.random() * availablePlayers.length);
			const selectedPlayer = availablePlayers.splice(randomIndex, 1)[0];
			playerRoles.set(selectedPlayer, role);
		}
	}

	// Assign remaining players as villagers
	const villagerRole = roles.find((r) => r.name === "Aldeão");
	for (const player of availablePlayers) {
		playerRoles.set(player, villagerRole);
	}
	return playerRoles;
}

async function handleNightKills(interaction) {
	const game = gameManager.getGame(interaction.channelId);
	const victms = [];
	if (!game || !game.nightKill || game.nightKill.size === 0) return victms;

	const targets = Array.from(game.nightKill.entries());

	for (const [userId, targetId] of targets) {
		if (targetId) {
			const userRole = game.playerRoles.get(userId).name;

			if (game.nightProtection.has(targetId)) {
				game.nightProtection.delete(targetId);
				if (!userId.includes("bot_")) {
					//sets a message for the wolf
					game.nightSkills.set(
						userId,
						"Na noite passada você invadiu a casa do seu alvo, quando estava prestes a desferir seu ataque, uma forte luz surge em sua frente na forma de um anjo. Você se assusta e foge pela janela",
					);
				}
				continue;
			}

			if (!targetId.includes("bot_")) {
				const victimUser = await interaction.client.users.fetch(targetId);
				const victimRole = game.playerRoles.get(targetId);

				if (victimRole.name === "Bêbado" && userRole === "Lobo") {
					//handle drunk wolf
					game.cantUseSkill.set(userId, true);
				}

				const killedEmbed = new EmbedBuilder()
					.setColor(0x000066)
					.setDescription("Você virou janta do lobo!")
					.setImage(
						"https://i.pinimg.com/originals/8d/17/a6/8d17a66e3c8eb6077a81ebf79814ced9.gif",
					);
				try {
					await victimUser.send({ embeds: [killedEmbed], components: [] });
				} catch (error) {
					console.error(`Couldn't send DM to wolf ${victimUser.username}`);
				}

				victms.push({ user: victimUser, role: victimRole.name });
				// Remove player from game
				game.players.delete(targetId);
				game.deadPlayers.set(victimUser.username, victimRole.name);
				game.playerRoles.delete(targetId);

				// Clear night kill votes

				continue;
			}
			if (!game.players.has(targetId)) {
				continue;
			}
			const [_, username] = [targetId, game.botUsers.get(targetId)];
			const victimRole = game.playerRoles.get(targetId).name;

			if (victimRole === "Bêbado" && userRole === "Lobo") {
				//handle drunk wolf
				game.cantUseSkill.set(userId, true);
				console.log("Churras", victimRole);
			}

			victms.push({ user: { username: username }, role: victimRole });
			// Remove player from game
			game.players.delete(targetId);
			game.deadPlayers.set(username, victimRole);
			game.playerRoles.delete(targetId);

			// Clear night kill votes
		}
	}
	game.nightKill.clear();

	return victms;
}

async function handleNewRound(interaction) {
	const game = gameManager.getGame(interaction.channelId);
	if (!game.cantUseSkill) game.cantUseSkill = new Map();

	if (!game) return;

	//asign roles to players

	if (!game.playerRoles) {
		game.playerRoles = await assignRoles(game.players);

		// Send private messages to each player with their role
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
	await wait(5000);

	// Start the game
	game.status = "night";

	const nightEmbed = new EmbedBuilder()
		.setColor(0x000066)
		.setTitle("🌙 A noite chegou!")
		.setDescription("Os habitantes da vila se recolhem em suas casas...")
		.setImage(
			"https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWQ3d25ucnI1Znhnbnk4aDJmdHJxZDRma2Eyc3Jyazc1YWFodTVsZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/ZLdy2L5W62WGs/giphy.gif",
		); // Replace with your night image

	await interaction.followUp({ embeds: [nightEmbed], components: [] });

	// Wait 40 seconds before morning
	await wait(5000);
	await interaction.followUp(
		"Jogadores tem 60 segundos para realizarem suas ações!",
	);

	// Private message during night
	await sendPrivateNightMessages(interaction, game);
	handleBotNightActions(game);

	await wait(60000);

	// Morning phase
	game.status = "morning-results";

	const morningAnoucementEmbed = new EmbedBuilder()
		.setColor(0xffff00)
		.setTitle("Manhã")
		.setDescription("🌞 O sol nasce em mais um dia na vila...")
		.setImage(
			"https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExMHh5bG15Z3RxcjMybHU0em1wN3dmOHV2aDM3YjFwMXhkM2JsMWw3MiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/uFmH8za4E6M5STIiTu/giphy.gif",
		);

	await interaction.followUp({ embeds: [morningAnoucementEmbed] });
	await wait(4000);
	const didSomeoneDie = await handleNightSKillsResults(interaction);
	const nightKillResults = await handleNightKills(interaction);

	let morningDescription = "";

	await sendPrivateDayMessages(interaction, game);

	if (nightKillResults.length > 0) {
		morningDescription += "\n\n💀 Durante a noite...\n";
		for (let i = 0; i < nightKillResults.length; i++) {
			morningDescription += `${nightKillResults[i].user.username} foi encontrado morto! Eles eram um ${nightKillResults[i].role}!\n`;
		}
		await interaction.followUp(morningDescription);
	} else {
		if (!didSomeoneDie) {
			morningDescription += "\n\nMilagrosamente, ninguém morreu esta noite!";
			await interaction.followUp(morningDescription);
		}
	}
	await wait(2000);
	await handleBotDayActions(interaction, game);
	await wait(1000);
	//checks if the game is not over yet
	await checkEndGameStatus(interaction, game);
	if (!gameManager.getGame(interaction.channelId)) {
		return;
	}

	await wait(4000);
	//shows who is alive and who is dead
	await displayWhoIsAlive(interaction, game);
	await wait(4000);
	await interaction.followUp(
		"Votação para decidir quem vai para forca começa em 30 segundos",
	);
	await wait(30000);

	//voting phase
	game.status = "voting";
	const morningEmbed = new EmbedBuilder()
		.setColor(0xffff00)
		.setTitle("Votação")
		.setDescription(
			"É hora de decidir! Quem será executado?\n" +
				"Use `/votar @jogador` para dar seu voto.\n" +
				"Você tem 60 segundos para votar!",
		);

	await interaction.followUp({ embeds: [morningEmbed] });
	await handleBotVoting(interaction, game);
	// Wait 60 seconds for voting
	await wait(60000);
	game.hasUsedSkill.clear();
	// Handle voting results
	await handleVotingResults(interaction);
}

async function handleVotingResults(interaction) {
	const game = gameManager.getGame(interaction.channelId);
	if (!game) return;

	// Count votes
	const voteCounts = new Map();
	game.votes.forEach((votedFor, voter) => {
		const currentCount = voteCounts.get(votedFor) || 0;
		voteCounts.set(votedFor, currentCount + 1);
	});

	// Find player(s) with most votes
	let maxVotes = 0;
	let playersWithMaxVotes = [];

	voteCounts.forEach((count, playerId) => {
		if (count > maxVotes) {
			maxVotes = count;
			playersWithMaxVotes = [playerId];
		} else if (count === maxVotes) {
			playersWithMaxVotes.push(playerId);
		}
	});

	// Check for tie
	if (playersWithMaxVotes.length > 1) {
		await interaction.followUp("Ninguém foi eliminado - houve um empate!");
		game.votes.clear();
		await checkEndGameStatus(interaction, game);

		if (gameManager.getGame(interaction.channelId)) {
			await wait(15000);
			await handleNewRound(interaction);
		}
		return;
	}

	const eliminated = playersWithMaxVotes[0];
	if (eliminated) {
		if (eliminated.includes("bot_")) {
			const [_, username] = [eliminated, game.botUsers.get(eliminated)];
			const eliminatedRole = game.playerRoles.get(eliminated);

			await interaction.followUp(
				`A vila votou! ${username} foi enforcado!\n ${username} era o ${eliminatedRole.name}`,
			);
			game.deadPlayers.set(username, eliminatedRole.name);
		} else {
			const eliminatedUser = await interaction.client.users.fetch(eliminated);
			const eliminatedRole = game.playerRoles.get(eliminated);

			await interaction.followUp(
				`A vila votou! ${eliminatedUser.username} foi enforcado!\n ${eliminatedUser.username} era o ${eliminatedRole.name}`,
			);

			game.deadPlayers.set(eliminatedUser.username, eliminatedRole.name);
		}
		game.players.delete(eliminated);
		game.playerRoles.delete(eliminated);
	}

	game.votes.clear();
	await checkEndGameStatus(interaction, game);

	if (gameManager.getGame(interaction.channelId)) {
		await wait(15000);
		await handleNewRound(interaction);
	}
}

async function sendPrivateNightMessages(interaction, game) {
	//wolf messages

	const wolves = Array.from(game.playerRoles.entries())
		.filter(([_, role]) => role.name === "Lobo")
		.map(([playerId]) => playerId);

	if (wolves.length > 0) {
		const wolfList = await Promise.all(
			wolves.map(async (wolfId) => {
				if (!wolfId.includes("bot_")) {
					const wolf = await interaction.client.users.fetch(wolfId);
					return wolf.username;
				}
				if (wolfId.includes("bot_")) {
					const username = game.botUsers.get(wolfId);
					return username;
				}
			}),
		);

		for (const wolfId of wolves) {
			if (wolfId.includes("bot_")) {
				continue;
			}
			const wolf = await interaction.client.users.fetch(wolfId);
			const canUseSkill =
				game.cantUseSkill.get(wolfId) === undefined ||
				!game.cantUseSkill.get(wolfId);
			if (canUseSkill) {
				const filteredWolfs = wolfList.filter(
					(wolfName) => wolfName !== wolf.username,
				);
				try {
					await wolf.send(
						`Você é um Lobo! Outros lobos: ${wolfList.join(", ")}\n` +
							"Use /atacar para escolher sua vítima!",
					);
				} catch (error) {
					console.error(`Couldn't send DM to wolf ${wolf.username}`);
				}
			}
		}
	}
	//other roles messages
	const villagers = Array.from(game.playerRoles.entries())
		.filter(([_, role]) => role.name !== "Lobo")
		.map(([villagerId, role]) => ({ villagerId, role }));

	for (const { villagerId, role } of villagers) {
		if (villagerId.includes("bot_")) {
			continue;
		}
		const canUseSkill =
			game.cantUseSkill.get(villagerId) === undefined ||
			!game.cantUseSkill.get(villagerId);
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

async function sendPrivateDayMessages(interaction, game) {
	//Shooter
	const villagers = Array.from(game.playerRoles.entries())
		.filter(([_, role]) => role.name === "Atirador")
		.map(([userId, role]) => ({ userId, role }));

	for (const { userId, role } of villagers) {
		if (userId.includes("bot_")) {
			continue;
		}
		const canUseSkill =
			game.cantUseSkill.get(userId) === undefined ||
			!game.cantUseSkill.get(userId);
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

async function handleNightSKillsResults(interaction) {
	const game = gameManager.getGame(interaction.channelId);
	const skills = Array.from(game.nightSkills.entries());
	let didSomeoneDie = false;

	for (const [userId, targetId] of skills) {
		if (userId.includes("bot_")) {
			continue;
		}
		const skillUser = await interaction.client.users.fetch(userId);
		const skillUserRole = game.playerRoles.get(userId);

		if (skillUserRole.name === "Lobo") {
			//send wolf message
			await skillUser.send(targetId);

			const cantUseSkill = game.cantUseSkill.get(userId);
			if (cantUseSkill) {
				await skillUser.send(
					"Você devorou o bêbado, ele ingeriu tanto alcool que até você ficou bebado ao come-lo e não poderá atacar esta noite!",
				);
			}
			continue;
		}
		const isTargetABot = targetId.includes("bot_");

		if (targetId) {
			const targetUser =
				!isTargetABot && (await interaction.client.users.fetch(targetId));
			let username = "";
			if (isTargetABot) {
				username = game.botUsers.get(targetId);
			}

			const targetRole = game.playerRoles.get(targetId);

			if (skillUserRole.name === "Vidente") {
				await skillUser.send(
					`Você vê que ${!isTargetABot ? targetUser.username : username} é o ${targetRole.name}`,
				);
			}
			if (skillUserRole.name === "Cortesã") {
				const findPlayerIdWithTarget = (targetId) => {
					for (const [playerId, victimId] of game.nightKill.entries()) {
						if (victimId === targetId) {
							return playerId;
						}
					}
					return null;
				};

				//if cortesain chooses the wolf
				if (targetRole.name === "Lobo") {
					await skillUser.send(
						`Ao visitar ${!isTargetABot ? targetUser.username : username}, tudo parecia ótimo até que ao chegarem no quarto, ${!isTargetABot ? targetUser.username : username} começou a rosnar e revelar garras e dentes enormes! ${!isTargetABot ? targetUser.username : username} era o ${targetRole.name}!\nVocê morreu!`,
					);
					game.players.delete(userId);
					game.deadPlayers.set(skillUser.username, skillUserRole.name);
					game.playerRoles.delete(userId);
					game.nightSkills.delete(userId);

					await interaction.followUp(
						`Um cheiro podre emana do chiqueiro da vila, ao inspecionar, os aldeões descobrem que se trata da carcaça de ${skillUser.username}!\n Ele era a cortesã.`,
					);
					didSomeoneDie = true;

					return didSomeoneDie;
				}
				//if cortesain chooses someone being attacked by the wolf
				if (findPlayerIdWithTarget(targetId)) {
					const attackingWolfUser = await interaction.client.users.fetch(
						findPlayerIdWithTarget(targetId),
					);
					await skillUser.send(
						`Ao entrar na casa de ${!isTargetABot ? targetUser.username : username}, você escuta fortes barulhos e ao investigar você encontra ${!isTargetABot ? targetUser.username : username} sendo atacado pelo lobo!\nO lobo vira pra você e parte para o ataque!\nVocê morreu!`,
					);
					game.players.delete(userId);
					game.deadPlayers.set(skillUser.username, skillUserRole.name);
					game.playerRoles.delete(userId);
					game.nightSkills.delete(userId);

					await interaction.followUp(
						`Um cheiro podre emana do chiqueiro da vila, ao inspecionar, os aldeões descobrem que se trata da carcaça de ${skillUser.username}!\n Ele era a cortesã.`,
					);
					victms.push("");
					try {
						await attackingWolfUser.send(
							`Ao realizar seu ataque noturno, ${skillUser.username} aparece na casa onde você estava, você aproveita e o devora também!`,
						);
					} catch (error) {
						console.error(`Couldn't send DM to wolf ${wolf.username}`);
					}
					didSomeoneDie = true;

					return didSomeoneDie;
				}
				await skillUser.send(
					`Após sua visita, você descobriu que ${!isTargetABot ? targetUser.username : username} é o ${targetRole.name}`,
				);
			}
			if (skillUserRole.name === "Anjo da guarda") {
				if (!game.nightProtection.has(userId)) {
					try {
						await skillUser.send(
							`Sua proteção foi forte e ${!isTargetABot ? targetUser.username : username} sobreviveu esta noite!`,
						);
					} catch (error) {
						console.error(`Couldn't send DM to wolf ${skillUser.username}`);
					}
					continue;
				}
				game.nightProtection.delete(userId);
			}
		}
	}
	game.nightSkills.clear();
	return false;
}

async function checkEndGameStatus(interaction, game) {
	if (game.players.size <= 1 || game.players.size === 2) {
		for (const player of game.players) {
			const playerRole = game.playerRoles.get(player).name;
			if (playerRole === "Lobo") {
				let name = "";
				if (player.includes("bot_")) {
					name = game.botUsers.get(player);
				} else {
					name = await interaction.client.users.fetch(player).username;
				}
				if (game.players.size === 2) {
					await interaction.followUp(
						`De repente presas e garras começam a surgir em ${name}, que então, parte para devorar o último sobrevivente!`,
					);
				}
				gameManager.removeGame(interaction.channelId);
				const wolfEmbed = new EmbedBuilder()
					.setColor(0xffff00)
					.setTitle("O jogo acabou! O Lobo venceu!")
					.setImage(
						"https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnhpNnc2N2I2OWoyYzJsNWs1eW41ajhsYjAwYzNkNHN4bWdhMnVhNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/tiP6DWUdHhvck/giphy.gif",
					);

				await interaction.followUp({
					embeds: [wolfEmbed],
					components: [],
				});
				/* //show who was alive
				let playersAliveDescription = "";
				for (const playerId of game.players) {
					if (!playerId.includes("bot_")) {
						const user = await interaction.client.users.fetch(playerId);
						const role = await game.playerRoles.get(playerId);
						playersAliveDescription += `🧑 ${user.username}${role.name}\n`;
					} else {
						const [_, username] = [playerId, game.botUsers.get(playerId)];
						const role = await game.playerRoles.get(playerId);
						//puts the name of the bot
						playersAliveDescription += `🧑 ${username}-${role.name}\n`;
					}
				}
				if (game.deadPlayers !== undefined) {
					for (const [playerUsername, role] of game.deadPlayers) {
						playersAliveDescription += `💀 ${playerUsername}-${role.name}\n`;
					}
				}
				const playersAliveEmbed = new EmbedBuilder()
					.setColor(0xffff00)
					.setTitle("Jogadores vivos")
					.setDescription(playersAliveDescription);

				await interaction.followUp({ embeds: [playersAliveEmbed] }); */
				return;
			}
			if (playerRole === "Assassino") {
				gameManager.removeGame(interaction.channelId);
				const killerEmbed = new EmbedBuilder()
					.setColor(0xffff00)
					.setTitle("O jogo acabou! O assassino venceu!")
					.setImage("	https://i.giphy.com/8cqVIPHCKLhfO.webp");

				await interaction.followUp({ embeds: [killerEmbed], components: [] });

				return;
			}
		}
		gameManager.removeGame(interaction.channelId);
		const villageEmbed = new EmbedBuilder()
			.setColor(0xffff00)
			.setTitle("O jogo acabou! A vila venceu!")
			.setImage(
				"https://www.lascosasquenoshacenfelices.com/wp-content/uploads/2021/08/angrymob.gif",
			);

		await interaction.followUp({ embeds: [villageEmbed], components: [] });
		//show who was alive
		/* let playersAliveDescription = "";
		for (const playerId of game.players) {
			if (!playerId.includes("bot_")) {
				const user = await interaction.client.users.fetch(playerId);
				const role = await game.playerRoles.get(playerId);
				playersAliveDescription += `🧑 ${user.username}${role.name}\n`;
			} else {
				const [_, username] = [playerId, game.botUsers.get(playerId)];
				const role = await game.playerRoles.get(playerId);
				//puts the name of the bot
				playersAliveDescription += `🧑 ${username}-${role.name}\n`;
			}
		}
		if (game.deadPlayers !== undefined) {
			for (const [playerUsername, role] of game.deadPlayers) {
				playersAliveDescription += `💀 ${playerUsername}-${role.name}\n`;
			}
		}
		const playersAliveEmbed = new EmbedBuilder()
			.setColor(0xffff00)
			.setTitle("Jogadores vivos")
			.setDescription(playersAliveDescription);

		await interaction.followUp({ embeds: [playersAliveEmbed] }); */
	} else {
		const hasWolf = [...game.playerRoles.values()].find(
			(r) => r.name === "Lobo",
		);
		const hasKiller = [...game.playerRoles.values()].find(
			(r) => r.name === "Assassino",
		);

		if (!hasWolf && !hasKiller) {
			gameManager.removeGame(interaction.channelId);
			const villageEmbed = new EmbedBuilder()
				.setColor(0xffff00)
				.setTitle("O jogo acabou! A vila venceu!")
				.setImage(
					"https://www.lascosasquenoshacenfelices.com/wp-content/uploads/2021/08/angrymob.gif",
				);

			await interaction.followUp({ embeds: [villageEmbed], components: [] });
			//show who was alive
			/* let playersAliveDescription = "";
			for (const playerId of game.players) {
				if (!playerId.includes("bot_")) {
					const user = await interaction.client.users.fetch(playerId);
					const role = await game.playerRoles.get(playerId);
					playersAliveDescription += `🧑 ${user.username}-${role.name}\n`;
				} else {
					const [_, username] = [playerId, game.botUsers.get(playerId)];
					const role = await game.playerRoles.get(playerId);
					//puts the name of the bot
					playersAliveDescription += `🧑 ${username}-${role.name}\n`;
				}
			}
			if (game.deadPlayers !== undefined) {
				for (const [playerUsername, role] of game.deadPlayers) {
					playersAliveDescription += `💀 ${playerUsername}-${role.name}\n`;
				}
			}
			const playersAliveEmbed = new EmbedBuilder()
				.setColor(0xffff00)
				.setTitle("Jogadores vivos")
				.setDescription(playersAliveDescription);

			await interaction.followUp({ embeds: [playersAliveEmbed] }); */
			return;
		}
	}
}

async function displayWhoIsAlive(interaction, game) {
	let playersAliveDescription = "";
	for (const playerId of game.players) {
		if (!playerId.includes("bot_")) {
			const user = await interaction.client.users.fetch(playerId);
			const role = await game.playerRoles.get(playerId);
			playersAliveDescription += `🧑 ${user.username}\n`;
		} else {
			const [_, username] = [playerId, game.botUsers.get(playerId)];
			const role = await game.playerRoles.get(playerId);
			//puts the name of the bot
			playersAliveDescription += `🧑 ${username}\n`;
		}
	}
	if (game.deadPlayers !== undefined) {
		for (const [playerUsername, role] of game.deadPlayers) {
			playersAliveDescription += `💀 ${playerUsername}\n`;
		}
	}
	const playersAliveEmbed = new EmbedBuilder()
		.setColor(0xffff00)
		.setTitle("Jogadores vivos")
		.setDescription(playersAliveDescription);

	await interaction.followUp({ embeds: [playersAliveEmbed] });
}

async function handlePlayersAutocomplete(
	game,
	interaction,
	focusedValue,
	choices,
) {
	for (const id of game.players) {
		let name;
		const userRole = game.playerRoles.get(interaction.user.id);
		const targetRole = game.playerRoles.get(id);
		if (userRole.name === "Lobo" && targetRole.name === "Lobo") {
			continue;
		}
		if (id.includes("bot_")) {
			for (const [key, value] of game.botUsers.entries()) {
				if (key === id) {
					name = value;
				}
			}
		} else {
			if (id === interaction.user.id) {
				continue;
			}
			try {
				const user = await interaction.client.users.fetch(id);
				name = user?.username;
			} catch (error) {
				console.error(`Failed to fetch user ${id}:`, error);
				continue;
			}
		}

		if (name?.toLowerCase().includes(focusedValue)) {
			choices.push({ name: name, value: id });
		}
	}
}

module.exports = {
	assignRoles,
	handleNightKills,
	handleVotingResults,
	handleNewRound,
	sendPrivateNightMessages,
	createBotPlayers,
	handlePlayersAutocomplete,
};
