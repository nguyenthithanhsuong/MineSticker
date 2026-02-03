import React from 'react';

/**
 * CharacterSprite component - Displays character sprites for the game
 */
interface CharacterSpriteProps {
  character: 'hero' | 'enemy' | 'darklord';
  size?: number;
  className?: string;
}

export const CharacterSprite: React.FC<CharacterSpriteProps> = ({ 
  character, 
  size = 32,
  className = '' 
}) => {
  const getCharacterStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      width: `${size}px`,
      height: `${size}px`,
      display: 'inline-block',
      border: '2px solid #333',
      borderRadius: '4px',
      textAlign: 'center',
      lineHeight: `${size}px`,
      fontSize: `${size * 0.6}px`,
      backgroundColor: '#f0f0f0',
    };

    switch (character) {
      case 'darklord':
        return { ...baseStyle, backgroundColor: '#2c1810', color: '#ff4444' };
      case 'enemy':
        return { ...baseStyle, backgroundColor: '#661111', color: '#ff8888' };
      case 'hero':
        return { ...baseStyle, backgroundColor: '#116611', color: '#88ff88' };
      default:
        return baseStyle;
    }
  };

  const getCharacterEmoji = (): string => {
    switch (character) {
      case 'darklord':
        return '👹';
      case 'enemy':
        return '💀';
      case 'hero':
        return '🛡️';
      default:
        return '👤';
    }
  };

  return (
    <div 
      className={`character-sprite ${className}`}
      style={getCharacterStyle()}
      title={`Character: ${character}`}
    >
      {getCharacterEmoji()}
    </div>
  );
};
