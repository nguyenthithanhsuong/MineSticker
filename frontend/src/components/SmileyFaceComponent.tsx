import React from 'react';
import { SmileyFace } from '../classes/SmileyFace';

/**
 * SmileyFaceComponent - Renders the game status smiley face
 */
interface SmileyFaceComponentProps {
  smileyFace: SmileyFace;
  onClick?: () => void;
  size?: number;
}

export const SmileyFaceComponent: React.FC<SmileyFaceComponentProps> = ({ 
  smileyFace, 
  onClick,
  size = 40 
}) => {
  const style: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    fontSize: `${size * 0.8}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backgroundColor: '#c0c0c0',
    border: '3px outset #999',
    borderRadius: '4px',
    userSelect: 'none',
  };

  return (
    <div 
      className="smiley-face" 
      style={style}
      onClick={onClick}
      title={`Game status: ${smileyFace.getState()}`}
    >
      {smileyFace.getEmoji()}
    </div>
  );
};
