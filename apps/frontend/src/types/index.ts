export interface User {
  id: string
  username: string
  email: string
  level: number
  experience: number
  rating: number
  wins: number
  losses: number
  lastActive: Date
  isActive: boolean
}

export interface Game {
  id: string
  name: string
  status: 'waiting' | 'in_progress' | 'finished'
  players: Player[]
  maxPlayers: number
  createdAt: string
  currentRound: number
  gameSettings: GameSettings
}

export interface Player {
  id: string
  userId: string
  username: string
  health: number
  gold: number
  level: number
  experience: number
  board: Champion[]
  bench: Champion[]
  position: number
  isEliminated: boolean
}

export interface Champion {
  id: string
  name: string
  cost: number
  origin: string[]
  class: string[]
  stats: ChampionStats
  items: Item[]
  position?: { x: number; y: number }
  star: number
}

export interface ChampionStats {
  health: number
  mana: number
  attackDamage: number
  abilityPower: number
  armor: number
  magicResist: number
  attackSpeed: number
  critChance: number
  critDamage: number
  range: number
}

export interface Item {
  id: string
  name: string
  description: string
  stats: Partial<ChampionStats>
  unique: boolean
}

export interface GameSettings {
  roundTime: number
  maxLevel: number
  startingGold: number
  startingHealth: number
  carouselRounds: number[]
}

export interface SocketEvents {
  // Client to server
  'join-game': { gameId: string; playerId: string }
  'leave-game': { gameId: string; playerId: string }
  'buy-champion': { gameId: string; playerId: string; championId: string }
  'sell-champion': { gameId: string; playerId: string; championId: string }
  'move-champion': { gameId: string; playerId: string; championId: string; from: string; to: string }
  'level-up': { gameId: string; playerId: string }
  'refresh-shop': { gameId: string; playerId: string }
  
  // Server to client
  'game-state': { game: Game }
  'player-joined': { player: Player }
  'player-left': { playerId: string }
  'round-started': { round: number }
  'round-ended': { results: any[] }
  'game-ended': { winner: Player }
  'error': { message: string }
}
