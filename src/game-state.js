const { Collection } = require("discord.js");

// Create a singleton for game state
class GameStateManager {
	constructor() {
		if (!GameStateManager.instance) {
			this.activeGames = new Collection();
			GameStateManager.instance = this;
		}
		// biome-ignore lint/correctness/noConstructorReturn: <explanation>
		return GameStateManager.instance;
	}

	removePlayer(channelId, playerID) {
		const game = this.activeGames.get(channelId);
		return game.gameState.players.delete(playerID);
	}
	getGame(channelId) {
		return this.activeGames.get(channelId);
	}

	setGame(channelId, gameState) {
		this.activeGames.set(channelId, gameState);
	}

	removeGame(channelId) {
		this.activeGames.delete(channelId);
	}

	hasGame(channelId) {
		return this.activeGames.has(channelId);
	}
}

const gameManager = new GameStateManager();
module.exports = gameManager;
