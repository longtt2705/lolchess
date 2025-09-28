# LOL Chess - League of Legends Auto Chess Game

A modern online multiplayer auto chess game inspired by League of Legends, built with a monorepo architecture using NestJS backend and React frontend.

## 🎮 Features

- **Real-time 1v1 Battles**: Head-to-head matches with WebSocket connectivity
- **League of Legends Theme**: Champions, items, and abilities inspired by LoL
- **Strategic Gameplay**: Position champions, manage resources, and climb ranks
- **Modern Tech Stack**: NestJS + React + TypeScript + MongoDB
- **Responsive UI**: Beautiful, League-themed interface with animations

## 🏗️ Architecture

This project uses a monorepo structure with the following packages:

```
lolchess/
├── apps/
│   ├── backend/          # NestJS API server
│   └── frontend/         # React web application
├── packages/
│   └── shared/           # Shared types and utilities
└── package.json          # Root workspace configuration
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- MongoDB (local or cloud instance)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd lolchess
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   **Backend** (`apps/backend/.env`):
   ```env
   PORT=3001
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/lolchess
   JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
   FRONTEND_URL=http://localhost:3000
   ```

   **Frontend** (`apps/frontend/.env`):
   ```env
   VITE_API_URL=http://localhost:3001
   VITE_WS_URL=http://localhost:3001
   VITE_NODE_ENV=development
   ```

4. **Start MongoDB**
   Make sure MongoDB is running locally or update the `MONGODB_URI` to point to your cloud instance.

5. **Start the development servers**
   ```bash
   # Start both frontend and backend concurrently
   npm run dev
   
   # Or start them individually
   npm run dev:backend    # Starts NestJS server on port 3001
   npm run dev:frontend   # Starts React app on port 3000
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000` to start playing!

## 🛠️ Development

### Available Scripts

**Root level:**
- `npm run dev` - Start both frontend and backend
- `npm run build` - Build all packages
- `npm run test` - Run tests for all packages
- `npm run lint` - Lint all packages
- `npm run clean` - Clean all node_modules and dist folders

**Backend specific:**
- `npm run dev:backend` - Start backend in development mode
- `npm run build:backend` - Build backend
- `npm run start:prod --workspace=apps/backend` - Start backend in production

**Frontend specific:**
- `npm run dev:frontend` - Start frontend in development mode
- `npm run build:frontend` - Build frontend for production
- `npm run preview --workspace=apps/frontend` - Preview production build

### Tech Stack

**Backend:**
- **NestJS** - Progressive Node.js framework
- **MongoDB** - NoSQL database with Mongoose ODM
- **Socket.io** - Real-time communication
- **JWT** - Authentication
- **TypeScript** - Type safety

**Frontend:**
- **React 18** - UI library with hooks
- **Vite** - Fast build tool and dev server
- **Redux Toolkit** - State management
- **Socket.io Client** - Real-time communication
- **Styled Components** - CSS-in-JS styling
- **Framer Motion** - Animations
- **React Hook Form** - Form handling
- **TypeScript** - Type safety

**Shared:**
- **TypeScript** - Shared types and interfaces
- **Constants** - Game configuration and rules

## 🎯 Game Features

### Current Implementation
- ✅ User registration and authentication
- ✅ Game lobby system
- ✅ Real-time WebSocket communication
- ✅ Beautiful League of Legends themed UI
- ✅ Responsive design with animations
- ✅ Player profiles and statistics
- ✅ Rating system

### Coming Soon
- 🚧 Champion placement and battles
- 🚧 Item system and combinations
- 🚧 Synergies and team compositions
- 🚧 Carousel rounds
- 🚧 Spectator mode
- 🚧 Leaderboards
- 🚧 Tournament system

## 🎮 How to Play

1. **Register/Login** - Create an account or sign in
2. **Enter 1v1 Lobby** - Challenge an opponent or join an existing match
3. **Build Your Team** - Buy and position champions strategically
4. **Battle** - Watch your team fight your opponent automatically
5. **Climb Ranks** - Win 1v1 matches to increase your rating

## 📁 Project Structure

```
apps/backend/
├── src/
│   ├── auth/           # Authentication module
│   ├── game/           # Game logic and WebSocket handling
│   ├── users/          # User management
│   └── main.ts         # Application entry point
└── package.json

apps/frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Route pages
│   ├── store/          # Redux store and slices
│   ├── hooks/          # Custom React hooks
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Utility functions
└── package.json

packages/shared/
├── src/
│   ├── types/          # Shared TypeScript interfaces
│   ├── constants/      # Game constants and configuration
│   └── index.ts        # Package exports
└── package.json
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎖️ Acknowledgments

- Inspired by League of Legends and Teamfight Tactics
- Built with modern web technologies
- Community feedback and contributions welcome

---

**Happy gaming! 🎮✨**

*Note: This is a fan project and is not affiliated with Riot Games or League of Legends.*
