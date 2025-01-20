const {
	ButtonBuilder,
	EmbedBuilder,
	ButtonStyle,
	ActionRowBuilder,
	MessageFlags,
} = require("discord.js");
const wait = require("node:timers/promises").setTimeout;
const gameManager = require("./game-state");

const roles = [{ name: "Lobo" }, { name: "Aldeão" }];

async function assignRoles(players) {
	// Convert Set to Array for easier manipulation
	const playerArray = Array.from(players);

	// Shuffle players
	for (let i = playerArray.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[playerArray[i], playerArray[j]] = [playerArray[j], playerArray[i]];
	}

	// Assign roles based on player count
	const playerRoles = new Map();
	const numPlayers = playerArray.length;
	const numWolves = Math.max(1, Math.floor(numPlayers / 5));
	const numSeers = Math.max(0, Math.floor(numPlayers / 5));
	const numHunter = Math.max(0, Math.floor(numPlayers / 5));
	const numMayor = Math.max(0, Math.floor(numPlayers / 5));
	const numSuicidal = Math.max(0, Math.floor(numPlayers / 10));
	const numKiller = Math.max(0, Math.floor(numPlayers / 10));
	const numInquisitor = Math.max(0, Math.floor(numPlayers / 10));
	const numMason = Math.max(0, Math.floor(numPlayers / 14));

	// Assign wolves first
	for (let i = 0; i < numWolves; i++) {
		playerRoles.set(playerArray[i], roles[0]); // Lobo
	}

	// Assign villagers to remaining players
	for (let i = numWolves; i < numPlayers; i++) {
		playerRoles.set(playerArray[i], roles[1]); // Aldeão
	}

	return playerRoles;
}

async function handleNightKills(interaction) {
	const game = gameManager.getGame(interaction.channelId);
	if (!game || !game.nightKill || game.nightKill.size === 0) return null;

	const targets = Array.from(game.nightKill.entries());

	for (const [_, targetId] of targets) {
		if (targetId) {
			const victimUser = await interaction.client.users.fetch(targetId);
			const victimRole = game.playerRoles.get(targetId);

			// Remove player from game
			game.players.delete(targetId);
			game.playerRoles.delete(targetId);

			// Clear night kill votes
			game.nightKill.clear();

			return {
				user: victimUser,
				role: victimRole,
			};
		}
	}

	return null;
}

async function handleNewRound(interaction) {
	const game = gameManager.getGame(interaction.channelId);
	if (!game) return;

	//asign roles to players

	if (!game.playerRoles) {
		game.playerRoles = await assignRoles(game.players);

		// Send private messages to each player with their role
		for (const [playerId, role] of game.playerRoles) {
			const player = await interaction.client.users.fetch(playerId);
			try {
				await player.send(`Você é: ${role.name}`);
			} catch (error) {
				console.error(`Couldn't send DM to ${player.username}`);
			}
		}
	}

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

	// Wait 30 seconds before morning
	await wait(5000);
	// Private message during night

	await sendPrivateNightMessages(interaction, game);

	await wait(30000);

	// Morning phase
	game.status = "morning-results";

	const nightKillResult = await handleNightKills(interaction);

	let morningDescription = "🌞 O sol nasce em mais um dia na vila...";

	if (nightKillResult) {
		morningDescription += `\n\n💀 Durante a noite, ${nightKillResult.user.username} foi encontrado morto! Eles eram um ${nightKillResult.role.name}!`;
	} else {
		morningDescription += "\n\nMilagrosamente, ninguém morreu esta noite!";
	}

	await interaction.followUp(morningDescription);
	await interaction.followUp("Votação para forca começa em 30 segundos");
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
		)
		.setImage(
			"https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExMHh5bG15Z3RxcjMybHU0em1wN3dmOHV2aDM3YjFwMXhkM2JsMWw3MiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/uFmH8za4E6M5STIiTu/giphy.gif",
		);

	await interaction.followUp({ embeds: [morningEmbed] });

	// Wait 60 seconds for voting
	await wait(60000);

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

	// Find player with most votes
	let maxVotes = 0;
	let eliminated = null;

	voteCounts.forEach((count, playerId) => {
		if (count > maxVotes) {
			maxVotes = count;
			eliminated = playerId;
		} else if (count === maxVotes) {
			// Handle tie by randomly selecting between tied players
			if (Math.random() < 0.5) {
				eliminated = playerId;
			}
		}
	});

	if (eliminated) {
		const eliminatedUser = await interaction.client.users.fetch(eliminated);
		const eliminatedRole = game.playerRoles.get(eliminated);

		await interaction.followUp(
			`A vila votou! ${eliminatedUser.username} foi enforcado!\n ${eliminatedUser.username} era o ${eliminatedRole.name}`,
		);
		game.players.delete(eliminated);
		game.playerRoles.delete(eliminated);
	} else {
		await interaction.followUp("Ninguém foi eliminado - houve um empate!");
	}

	// Check game end condition
	if (game.players.size <= 1) {
		gameManager.removeGame(interaction.channelId);
		await interaction.followUp("O jogo acabou!");
	} else {
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
				const wolf = await interaction.client.users.fetch(wolfId);
				return wolf.username;
			}),
		);

		for (const wolfId of wolves) {
			const wolf = await interaction.client.users.fetch(wolfId);
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
	//other roles messages
	const villagers = Array.from(game.playerRoles.entries())
		.filter(([_, role]) => role.name !== "Lobo")
		.map(([villagerId, role]) => ({ villagerId, role }));

	for (const { villagerId, role } of villagers) {
		try {
			const villager = await interaction.client.users.fetch(villagerId);
			await villager.send(
				`Você é um ${role.name} A noite chegou, durma tranquilo e aguarde o amanhecer...`,
			);
		} catch (error) {
			console.error(`Couldn't send DM to villager ${villagerId}`);
		}
	}
}

module.exports = {
	assignRoles,
	handleNightKills,
	handleVotingResults,
	handleNewRound,
	sendPrivateNightMessages,
};
