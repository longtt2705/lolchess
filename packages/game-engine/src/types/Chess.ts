import { Square } from "./Square";
import { ChessStats } from "./ChessStats";
import { Skill } from "./Skill";
import { Item } from "./Item";
import { Debuff } from "./Debuff";
import { Aura } from "./Aura";
import { Shield } from "./Shield";
import { AttackProjectile } from "./AttackProjectile";
import { SummonerSpell } from "./SummonerSpell";

export type ChampionRole = "assassin" | "mage" | "support" | "marksman" | "tank" | "fighter";

export interface Chess {
  id: string;
  name: string;
  position: Square;
  startingPosition?: Square;
  cannotMoveBackward: boolean;
  canOnlyMoveVertically?: boolean;
  hasMovedBefore: boolean;
  cannotAttack: boolean;
  ownerId: string;
  stats: ChessStats;
  blue: boolean;
  skill?: Skill;
  items: Item[];
  debuffs: Debuff[];
  auras: Aura[];
  shields: Shield[];
  attackProjectile?: AttackProjectile;
  deadAtRound?: number; // Track which round the piece died
  respawnAtRound?: number; // Round when this piece should respawn (if dead)
  summonerSpell?: SummonerSpell; // Summoner spell assigned during order phase
  role?: ChampionRole;
}

