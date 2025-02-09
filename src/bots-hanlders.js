const {
	ButtonBuilder,
	EmbedBuilder,
	ButtonStyle,
	ActionRowBuilder,
	MessageFlags,
} = require("discord.js");
const wait = require("node:timers/promises").setTimeout;

const gameManager = require("./game-state");

function createBotPlayers(game, numberOfBots) {
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
		const botName = game.botUsers.get(playerId);

		switch (role.name) {
			case "Atirador": {
				const skillUsage = game.playerSkillUsage.get(playerId);
				if (skillUsage >= 2) {
					break;
				}

				const eligiblePlayers = [...game.players].filter((p) => p !== playerId);
				const randomPlayer =
					eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];

				const hasDecidedToShoot = Math.random() < 0.5;

				if (hasDecidedToShoot) {
					const targetRole = game.playerRoles.get(randomPlayer);

					let targetName = "";
					if (!randomPlayer.includes("bot_")) {
						targetName =
							await interaction.client.users.fetch(randomPlayer).username;
						game.deadPlayers.set(targetName, targetRole.name);
					} else {
						targetName = game.botUsers.get(randomPlayer);
						game.deadPlayers.set(targetName, targetRole);
					}
					game.playerSkillUsage.set(playerId, skillUsage + 1);
					game.players.delete(randomPlayer);
					game.playerRoles.delete(randomPlayer);

					await interaction.followUp(
						`💥BAANG! Um tiro ecoa em meio a multidão, se trata de ${botName} que acabou de atirar em ${targetName}!\n ${targetName} era o ${targetRole.name}`,
					);
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
				const eleigiblePlayersByRole = eligiblePlayers.filter(
					(p) => game.playerRoles.get(p).name !== "Lobo",
				);
				const randomPlayer =
					eleigiblePlayersByRole[
						Math.floor(Math.random() * eleigiblePlayersByRole.length)
					];

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
			case "Anjo da guarda": {
				const canUseSkill =
					game.cantUseSkill.get(playerId) === undefined ||
					!game.cantUseSkill.get(playerId);
				if (!canUseSkill) {
					break;
				}
				const eligiblePlayers = [...game.players].filter((p) => p !== playerId);
				const randomPlayer =
					eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];

				game.nightSkills.set(playerId, randomPlayer);
				game.nightProtection.set(playerId, randomPlayer);
				break;
			}
			default:
				break;
		}
	}
}

async function handleBotVoting(interaction, game) {
	for (const player of game.players) {
		if (player.includes("bot_")) {
			const eligiblePlayers = [...game.players].filter((p) => p !== player);

			const randomPlayer =
				eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];

			game.votes.set(player, randomPlayer);

			const botName = game.botUsers.get(player);
			const targetName = randomPlayer.includes("bot_")
				? game.botUsers.get(randomPlayer)
				: (await interaction.client.users.fetch(randomPlayer)).username;

			await interaction.followUp(`${botName} votou em ${targetName}`);

			if (game.playerRoles.get(player).name === "Prefeito") {
				game.votes.set(`${player}-1`, randomPlayer);
			}
			await wait(Math.floor(Math.random() * (5000 - 3000 + 1)) + 3000);
		}
	}
}

module.exports = {
	handleBotVoting,
	handleBotNightActions,
	createBotPlayers,
	handleBotDayActions,
};
