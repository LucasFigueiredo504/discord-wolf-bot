import { User } from "discord.js";

export interface Role {
  name: string;
  icon: string;
  proportion: number;
  max: number;
  startMessage: string;
  nightMessage: string;
  dayMessage: string;
  targetCount?: number;
}

export interface GameState {
  players: Map<string, string>;
  playerRoles: Map<string, Role>;
  deadPlayers: Map<string, Role>;
  nightKill: Map<string, string>;
  nightSkills: Map<string, string>;
  nightProtection: Map<string, boolean>;
  votes: Map<string, string>;
  botUsers: Map<string, string>;
  cantUseSkill: Map<string, boolean>;
  hasUsedSkill: Map<string, boolean>;
  loveUnion: Map<string, string>;
  status: "waiting" | "night" | "morning-results" | "voting";
  startTime: number;
  playerSkillUsage: Map<string, number>;
}
