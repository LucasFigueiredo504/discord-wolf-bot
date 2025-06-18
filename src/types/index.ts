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
  players: Map<string, User | string>;
  playerRoles: Map<string, Role>;
  deadPlayers: Map<string, string>;
  nightKill: Map<string, string>;
  nightSkills: Map<string, string>;
  nightProtection: Map<string, boolean>;
  votes: Map<string, string>;
  botUsers: Map<string, string>;
  cantUseSkill: Map<string, boolean>;
  hasUsedSkill: Map<string, boolean>;
  status: "waiting" | "night" | "morning-results" | "voting";
  startTime: number;
  playerSkillUsage: Map<string, number>;
}
