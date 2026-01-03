import { ChessPosition } from "@/hooks/useGame";

export interface AttackAnimation {
  attackerId: string;
  targetId: string;
  attackerPos: ChessPosition;
  targetPos: ChessPosition;
  damage?: number;
  guinsooProc?: boolean;
}

export interface MoveAnimation {
  pieceId: string;
  fromPos: ChessPosition;
  toPos: ChessPosition;
}

export interface DamageEffect {
  id: string;
  targetId: string; // ID of the piece that took damage
  damage: number;
  isDamage: boolean; // true for damage, false for healing
}

export interface ItemPurchaseAnimation {
  id: string;
  targetId: string; // ID of the champion who bought the item
  itemId: string;
  itemIcon?: string;
}
