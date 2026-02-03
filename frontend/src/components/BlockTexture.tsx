import React from 'react';
import { Block } from '../classes/Block';

/**
 * BlockTexture component - Renders a minesweeper block with placeholder textures
 */
interface BlockTextureProps {
  block: Block;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  size?: number;
}

export const BlockTexture: React.FC<BlockTextureProps> = ({ 
  block, 
  onClick, 
  onContextMenu,
  size = 30 
}) => {
  const displayState = block.getDisplayState();

  const getBlockStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      width: `${size}px`,
      height: `${size}px`,
      border: '1px solid #999',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      fontSize: `${size * 0.6}px`,
      fontWeight: 'bold',
      userSelect: 'none',
    };

    if (displayState === 'hidden') {
      return {
        ...baseStyle,
        backgroundColor: '#c0c0c0',
        borderStyle: 'outset',
        borderWidth: '3px',
      };
    } else if (displayState === 'flagged') {
      return {
        ...baseStyle,
        backgroundColor: '#c0c0c0',
        borderStyle: 'outset',
        borderWidth: '3px',
        color: 'red',
      };
    } else if (displayState === 'mine') {
      return {
        ...baseStyle,
        backgroundColor: '#ff4444',
        borderStyle: 'inset',
      };
    } else if (displayState === 'empty') {
      return {
        ...baseStyle,
        backgroundColor: '#d0d0d0',
        borderStyle: 'inset',
      };
    } else {
      // Number states
      const colors: { [key: string]: string } = {
        'number-1': 'blue',
        'number-2': 'green',
        'number-3': 'red',
        'number-4': 'darkblue',
        'number-5': 'darkred',
        'number-6': 'cyan',
        'number-7': 'black',
        'number-8': 'gray',
      };
      return {
        ...baseStyle,
        backgroundColor: '#d0d0d0',
        borderStyle: 'inset',
        color: colors[displayState] || 'black',
      };
    }
  };

  const getBlockContent = (): string => {
    if (displayState === 'flagged') {
      return '🚩';
    } else if (displayState === 'mine') {
      return '💣';
    } else if (displayState === 'hidden') {
      return '';
    } else if (displayState === 'empty') {
      return '';
    } else if (displayState.startsWith('number-')) {
      return block.getNeighborMines().toString();
    }
    return '';
  };

  return (
    <div
      className="block-texture"
      style={getBlockStyle()}
      onClick={onClick}
      onContextMenu={onContextMenu}
      title={`Block at (${block.getPosition().row}, ${block.getPosition().col})`}
    >
      {getBlockContent()}
    </div>
  );
};
