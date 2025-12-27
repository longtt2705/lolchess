export interface AuraEffect {
  stat: string; // 'speed', 'ad', 'ap', etc.
  modifier: number; // positive or negative value
  type: string; // 'add', 'multiply', 'set'
  target: string; // 'allies', 'enemies', 'all'
}

export interface Aura {
  id: string; // unique identifier
  name: string;
  description: string;
  range: number; // how many squares the aura reaches (1 = adjacent only)
  effects: AuraEffect[]; // stat modifications
  active: boolean; // whether the aura is currently active
  requiresAlive: boolean; // aura only works if the piece is alive
  duration: string; // 'permanent', 'turn', 'combat'
}

