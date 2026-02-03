import React, { useState } from 'react';
import { Block } from '../classes/Block';
import { SmileyFace } from '../classes/SmileyFace';
import { Time } from '../classes/Time';
import { FlagCount } from '../classes/FlagCount';
import { CharacterSprite } from '../components/CharacterSprite';
import { BlockTexture } from '../components/BlockTexture';
import { SmileyFaceComponent } from '../components/SmileyFaceComponent';
import { NumberDisplay } from '../classes/NumberDisplay';

/**
 * NumberDisplayComponent - Renders a number display (for time and flags)
 */
interface NumberDisplayComponentProps {
  display: NumberDisplay;
  label: string;
}

const NumberDisplayComponent: React.FC<NumberDisplayComponentProps> = ({ display, label }) => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      margin: '10px'
    }}>
      <div style={{ fontSize: '12px', marginBottom: '5px' }}>{label}</div>
      <div style={{
        backgroundColor: '#000',
        color: '#ff0000',
        padding: '5px 10px',
        fontFamily: 'monospace',
        fontSize: '24px',
        fontWeight: 'bold',
        border: '2px inset #666',
      }}>
        {display.getFormattedValue()}
      </div>
    </div>
  );
};

/**
 * App - Main MineSticker application component
 */
function App() {
  // Initialize game objects
  const [blocks] = useState<Block[][]>(() => {
    const rows = 8;
    const cols = 8;
    const grid: Block[][] = [];
    for (let i = 0; i < rows; i++) {
      const row: Block[] = [];
      for (let j = 0; j < cols; j++) {
        const block = new Block(i, j);
        // Set some example mines
        if (Math.random() < 0.15) {
          block.setMine(true);
        }
        row.push(block);
      }
      grid.push(row);
    }
    return grid;
  });

  const [smileyFace] = useState(() => new SmileyFace());
  const [timeDisplay] = useState(() => new Time());
  const [flagCount] = useState(() => new FlagCount(10));
  const [, forceUpdate] = useState({});

  const handleBlockClick = (block: Block) => {
    if (!block.getIsRevealed() && !block.getIsFlagged()) {
      block.reveal();
      if (block.getIsMine()) {
        smileyFace.setDead();
        timeDisplay.stop();
      }
      forceUpdate({});
    }
  };

  const handleBlockRightClick = (e: React.MouseEvent, block: Block) => {
    e.preventDefault();
    if (block.toggleFlag()) {
      if (block.getIsFlagged()) {
        flagCount.placeFlag();
      } else {
        flagCount.removeFlag();
      }
      forceUpdate({});
    }
  };

  const handleSmileyClick = () => {
    // Reset game
    smileyFace.reset();
    timeDisplay.reset();
    flagCount.reset();
    blocks.forEach(row => row.forEach(block => block.reset()));
    forceUpdate({});
  };

  const startTimer = () => {
    if (!timeDisplay.getIsRunning()) {
      timeDisplay.start();
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh',
    }}>
      <h1 style={{ textAlign: 'center' }}>MineSticker - Minesweeper with the Dark Lord</h1>
      
      {/* Character Sprites Demo */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '20px', 
        marginBottom: '20px',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <CharacterSprite character="hero" size={50} />
          <div>Hero</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <CharacterSprite character="enemy" size={50} />
          <div>Enemy</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <CharacterSprite character="darklord" size={50} />
          <div>Dark Lord</div>
        </div>
      </div>

      {/* Game Board */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        maxWidth: '600px',
        margin: '0 auto',
      }}>
        {/* Top Panel */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          marginBottom: '20px',
          padding: '10px',
          backgroundColor: '#c0c0c0',
          border: '3px outset #999',
        }}>
          <NumberDisplayComponent display={flagCount} label="Flags" />
          <SmileyFaceComponent 
            smileyFace={smileyFace} 
            onClick={handleSmileyClick}
            size={50}
          />
          <NumberDisplayComponent display={timeDisplay} label="Time" />
        </div>

        {/* Game Grid */}
        <div 
          style={{
            display: 'inline-block',
            backgroundColor: '#c0c0c0',
            border: '3px inset #999',
            padding: '10px',
          }}
          onClick={startTimer}
        >
          {blocks.map((row, i) => (
            <div key={i} style={{ display: 'flex' }}>
              {row.map((block, j) => (
                <BlockTexture
                  key={`${i}-${j}`}
                  block={block}
                  onClick={() => handleBlockClick(block)}
                  onContextMenu={(e) => handleBlockRightClick(e, block)}
                  size={30}
                />
              ))}
            </div>
          ))}
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center', color: '#666' }}>
          <p>Left click to reveal blocks | Right click to flag</p>
          <p>Click the smiley face to reset the game</p>
        </div>
      </div>
    </div>
  );
}

export default App;
