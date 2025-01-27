const {
	ButtonBuilder,
	EmbedBuilder,
	ButtonStyle,
	ActionRowBuilder,
	MessageFlags,
} = require("discord.js");

const gameManager = require("./game-state");

function createBotPlayers(game, numberOfBots) {
	const botNames = [
		"Foxtrot",
		"Delta",
		"Apha",
		"Bravo",
		"Beta",
		"GaMma",
		"Zeta",
		"Omega",
		"Phi",
		"Sigma",
	];

	for (let i = 0; i < numberOfBots; i++) {
		const botId = `bot_${Date.now()}_${i}`;
		const botUser = {
			id: botId,
			username: botNames[i] || `Bot_${i + 1}`,
		};
		game.players.add(botId);
		game.botUsers.set(botUser.id, botUser.username);
	}
}

async function handleBotNightActions(game) {
	for (const [playerId, role] of game.playerRoles) {
		if (!playerId.includes("bot_")) {
			continue;
		}

		switch (role.name) {
			case "Lobo": {
				const canUseSkill =
					game.cantUseSkill.get(playerId) === undefined ||
					!game.cantUseSkill.get(playerId);
				if (!canUseSkill) {
					break;
				}
				const eligiblePlayers = [...game.players].filter((p) => p !== playerId);
				const randomPlayer =
					eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];

				game.nightKill.set(playerId, randomPlayer);
				break;
			}
			case "Cortesã":
				//visit
				break;
			case "Vidente":
				//seer
				break;
			default:
				break;
		}

		if (role.nightAction) {
			const target = botChooseNightTarget(game, role);
			await role.nightAction(game, target);
		}
	}
}

async function handleBotVoting(game) {
	for (const player of game.players) {
		if (player.includes("bot_")) {
			const eligiblePlayers = [...game.players].filter((p) => p !== player);

			const randomPlayer =
				eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];

			game.votes.set(player, randomPlayer);

			if (game.playerRoles.get(player).name === "Prefeito") {
				game.votes.set(player, randomPlayer);
			}
		}
	}
}

module.exports = {
	handleBotVoting,
	handleBotNightActions,
	createBotPlayers,
};
