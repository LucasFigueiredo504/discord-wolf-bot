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

async function handleBotDayActions(interaction, game) {
	for (const [playerId, role] of game.playerRoles) {
		if (!playerId.includes("bot_")) {
			continue;
		}

		switch (role.name) {
			case "Atirador": {
				const { _, skillUsage } = game.playerSkillUsage.get(playerId) || {};
				if (skillUsage >= 2) {
					break;
				}

				const eligiblePlayers = [...game.players].filter((p) => p !== playerId);
				const randomPlayer =
					eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];

				const hasDecidedToShoot = Math.random() < 0.5;

				if (hasDecidedToShoot) {
					const targetRole = game.playerRoles.get(randomPlayer);

					if (!randomPlayer.includes("bot_")) {
						const target = await interaction.client.users.fetch(randomPlayer);
						game.deadPlayers.set(target.username, targetRole.name);
					} else {
						const { _, username } = game.botUsers.get(randomPlayer);
						game.deadPlayers.set(username, targetRole.name);
					}
					game.playerSkillUsage.set(playerId, skillUsage + 1);
					game.players.delete(randomPlayer);
				}
				break;
			}
			default:
				break;
		}
	}
}

async function handleBotNightActions(game) {
	for (const [playerId, role] of game.playerRoles) {
		if (!playerId.includes("bot_")) {
			continue;
		}
		if (game.cantUseSkill.get(playerId)) {
			game.cantUseSkill.delete(playerId);
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
				{
					//visit
					const canUseSkill =
						game.cantUseSkill.get(playerId) === undefined ||
						!game.cantUseSkill.get(playerId);
					if (!canUseSkill) {
						break;
					}
					const eligiblePlayers = [...game.players].filter(
						(p) => p !== playerId,
					);
					const randomPlayer =
						eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];

					//game.nightSkills.set(playerId, randomPlayer);
					const foundedRole = game.playerRoles.get(randomPlayer);
				}
				break;
			case "Vidente":
				{
					//seer
					const canUseSkill =
						game.cantUseSkill.get(playerId) === undefined ||
						!game.cantUseSkill.get(playerId);
					if (!canUseSkill) {
						break;
					}
					const eligiblePlayers = [...game.players].filter(
						(p) => p !== playerId,
					);
					const randomPlayer =
						eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];

					//game.nightSkills.set(playerId, randomPlayer);
					const foundedRole = game.playerRoles.get(randomPlayer);
				}
				break;
			default:
				break;
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
				game.votes.set(`${player}-1`, randomPlayer);
			}
		}
	}
}

module.exports = {
	handleBotVoting,
	handleBotNightActions,
	createBotPlayers,
	handleBotDayActions,
};
