export interface AttackProjectile {
  shape: string; // "bullet" | "arrow" | "orb" | "bolt" | "missile"
  color: string;
  trailColor?: string;
  size?: number;
  speed?: number;
  icon?: string;
}
