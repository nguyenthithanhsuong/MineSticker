# MineSticker
Minesweeper but with the Dark Lord

A modern minesweeper game built with React and NestJS, featuring character sprites and a clean class-based architecture.

## Project Structure

### Frontend (React + TypeScript + Vite)
```
frontend/
├── src/
│   ├── classes/          # Game logic classes
│   │   ├── Block.ts              # Block/cell class for minesweeper grid
│   │   ├── SmileyFace.ts         # Game status indicator class
│   │   ├── NumberDisplay.ts      # Base class for numeric displays
│   │   ├── Time.ts               # Timer class (extends NumberDisplay)
│   │   └── FlagCount.ts          # Flag counter class (extends NumberDisplay)
│   ├── components/       # React components
│   │   ├── BlockTexture.tsx      # Block rendering component with textures
│   │   ├── CharacterSprite.tsx   # Character sprite component (hero, enemy, dark lord)
│   │   └── SmileyFaceComponent.tsx  # Smiley face UI component
│   ├── App.tsx           # Main application component
│   └── main.tsx          # Entry point
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### Backend (NestJS + TypeScript)
```
backend/
├── src/
│   ├── app.module.ts     # Main application module
│   ├── app.controller.ts # API controller
│   ├── app.service.ts    # Business logic service
│   └── main.ts           # Entry point
├── nest-cli.json
├── tsconfig.json
└── package.json
```

## Key Components

### Classes

1. **Block** - Represents a single minesweeper cell
   - Manages mine state, revealed state, flagged state
   - Tracks neighboring mine count
   - Provides display state for rendering

2. **SmileyFace** - Game status indicator
   - States: happy, nervous, cool (won), dead (lost)
   - Provides emoji representations

3. **NumberDisplay** - Base class for numeric displays
   - Manages numeric values with max digits
   - Provides formatted output with leading zeros

4. **Time** - Timer functionality (extends NumberDisplay)
   - Start/stop/reset timer
   - Auto-increment every second

5. **FlagCount** - Flag counter (extends NumberDisplay)
   - Tracks remaining flags
   - Place/remove flag operations

### Components

1. **CharacterSprite** - Displays game characters
   - Supports: hero, enemy, dark lord sprites
   - Customizable size and styling

2. **BlockTexture** - Renders minesweeper blocks
   - Shows different states: hidden, flagged, revealed, mine
   - Includes placeholder textures for each state

3. **SmileyFaceComponent** - Renders game status
   - Shows current game state via emoji
   - Clickable to reset game

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Install frontend dependencies:
```bash
cd frontend
npm install
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

### Running the Application

1. Start the frontend (port 3000):
```bash
cd frontend
npm run dev
```

2. Start the backend (port 3001):
```bash
cd backend
npm run start:dev
```

3. Open http://localhost:3000 in your browser

## How to Play

- **Left click** on a block to reveal it
- **Right click** on a block to place/remove a flag
- Click the **smiley face** to reset the game
- Timer starts when you click the first block
- Avoid the mines (💣) and flag all mine locations to win!

## Features

- ✅ Clean class-based architecture
- ✅ Separate class files for each game component
- ✅ Character sprites (Hero, Enemy, Dark Lord)
- ✅ Block texture placeholders
- ✅ Smiley face game status indicator
- ✅ Number display system (Time & Flag counter)
- ✅ React frontend with TypeScript
- ✅ NestJS backend with TypeScript
- ✅ Vite for fast development

## Future Enhancements

- Add actual sprite images/textures
- Implement difficulty levels
- Add game state API in backend
- Implement multiplayer support
- Add sound effects
- Create custom theme with dark lord aesthetics
