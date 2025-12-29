import { AttackRange } from "./AttackRange";

export interface Skill {
  name: string;
  description: string;
  cooldown: number;
  attackRange: AttackRange;
  targetTypes:
    | "square"
    | "squareInRange"
    | "ally"
    | "allyMinion"
    | "enemy"
    | "none";
  currentCooldown: number;
  type: "passive" | "active";
  payload?: any;
}

