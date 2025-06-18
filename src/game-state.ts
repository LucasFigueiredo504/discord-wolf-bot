import { Collection, User } from "discord.js";
import { GameState } from "./types";

class GameStateManager {
  private static instance: GameStateManager;
  private activeGames: Collection<string, GameState>;

  private constructor() {
    this.activeGames = new Collection();
  }

  public static getInstance(): GameStateManager {
    if (!GameStateManager.instance) {
      GameStateManager.instance = new GameStateManager();
    }
    return GameStateManager.instance;
  }

  removePlayer(channelId: string, playerId: string): boolean {
    const game = this.activeGames.get(channelId);
    return game?.players.delete(playerId) ?? false;
  }

  getGame(channelId: string): GameState | undefined {
    return this.activeGames.get(channelId);
  }

  setGame(channelId: string, gameState: GameState): void {
    this.activeGames.set(channelId, gameState);
  }

  removeGame(channelId: string): void {
    this.activeGames.delete(channelId);
  }

  hasGame(channelId: string): boolean {
    return this.activeGames.has(channelId);
  }
}

const gameManager = GameStateManager.getInstance();
export default gameManager;
