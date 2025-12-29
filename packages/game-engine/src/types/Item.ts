export interface Item {
  id: string;
  name: string;
  description: string;
  payload?: any;
  unique: boolean;
  cooldown: number;
  currentCooldown: number;
}

