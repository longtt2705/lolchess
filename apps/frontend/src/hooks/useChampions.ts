import { useEffect, useState } from "react";

export interface AttackProjectile {
  shape: "bullet" | "arrow" | "orb" | "bolt" | "missile";
  color: string;
  trailColor?: string;
  size?: number; // 0.5 to 2, default 1
  speed?: number; // 0.5 to 2, default 1
  icon?: string; // Optional emoji/icon
}

export interface ChampionData {
  name: string;
  stats: {
    maxHp?: number;
    ad?: number;
    ap?: number;
    physicalResistance?: number;
    magicResistance?: number;
    speed?: number;
    goldValue?: number;
    durability?: number;
    attackRange?: {
      range: number | undefined;
      diagonal: boolean;
      horizontal: boolean;
      vertical: boolean;
      lShape?: boolean;
    };
  };
  skill: {
    type: string;
    name: string;
    description: string;
    cooldown?: number;
    currentCooldown?: number;
    targetTypes?: string;
    attackRange?: {
      range: number | undefined;
      diagonal: boolean;
      horizontal: boolean;
      vertical: boolean;
      lShape?: boolean;
    };
  };
  aura?: {
    id: string;
    name: string;
    description: string;
    range: number;
    effects: Array<{
      stat: string;
      modifier: number;
      type: string;
      target: string;
    }>;
    active: boolean;
    requiresAlive: boolean;
    duration: string;
  };
  attackProjectile?: AttackProjectile;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const useChampions = () => {
  const [champions, setChampions] = useState<ChampionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChampions = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/games/champions`);
        if (!response.ok) {
          throw new Error("Failed to fetch champions");
        }
        const data = await response.json();
        setChampions(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch champions"
        );
        console.error("Error fetching champions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchChampions();
  }, []);

  return { champions, loading, error };
};
