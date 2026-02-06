import {
  CHEER_COORDS,
  CHEER_SPRITE_SHEET,
  INTRO_SPRITE_SHEET,
  KABOOM_COORDS,
  KABOOM_SPRITE_SHEET,
  SCORCH_COORDS,
  SCORCH_SPRITE_SHEET
} from "../../shared";

export interface ExplosionState {
  row: number;
  col: number;
  frameIndex: number;
  scale: number;
  id: number;
}

export interface ScorchState {
  row: number;
  col: number;
  scale: number;
  id: number;
}

export interface SpriteCoords {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface CharacterSprite {
  spriteSheet: string;
  coords: SpriteCoords;
}

interface GameAnimationsProps {
  gridSize: { rows: number; cols: number };
  charPos: { row: number; col: number };
  activeExplosions: ExplosionState[];
  scorchMarks: ScorchState[];
  isIntro: boolean;
  introFrameIndex: number;
  introTargetPos: { row: number; col: number } | null;
  introFrameCoords: SpriteCoords;
  gameStarted: boolean;
  isCheer: boolean;
  cheerFrameIndex: number;
  currentCharacterSprite: CharacterSprite;
  isMoving: boolean;
  shouldMirrorWalk: boolean;
  gridSizePx: number;
  kaboomFrameSize: number;
  scorchFrameSize: number;
}

export default function GameAnimations({
  gridSize,
  charPos,
  activeExplosions,
  scorchMarks,
  isIntro,
  introFrameIndex,
  introTargetPos,
  introFrameCoords,
  gameStarted,
  isCheer,
  cheerFrameIndex,
  currentCharacterSprite,
  isMoving,
  shouldMirrorWalk,
  gridSizePx,
  kaboomFrameSize,
  scorchFrameSize
}: GameAnimationsProps) {
  const introPos = introTargetPos ?? charPos;

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: gridSize.cols * gridSizePx,
          height: gridSize.rows * gridSizePx,
          overflow: "hidden",
          pointerEvents: "none"
        }}
      >
        {scorchMarks.map((scorch) => {
          const scorchTop = scorch.row * gridSizePx - (scorchFrameSize - 16) / 2;
          const scorchLeft = scorch.col * gridSizePx - (scorchFrameSize - 16) / 2;

          return (
            <div
              key={`scorch-${scorch.id}`}
              style={{
                position: "absolute",
                top: scorchTop,
                left: scorchLeft,
                width: scorchFrameSize,
                height: scorchFrameSize,
                backgroundImage: `url(${SCORCH_SPRITE_SHEET})`,
                backgroundPosition: `-${SCORCH_COORDS.x1}px -${SCORCH_COORDS.y1}px`,
                backgroundSize: "auto",
                pointerEvents: "none",
                transform: `scale(${scorch.scale})`,
                transformOrigin: "center",
                zIndex: 2,
                willChange: "transform"
              }}
            />
          );
        })}
      </div>
      {activeExplosions.map((explosion) => {
        const kaboomCoords = KABOOM_COORDS[`kaboom${explosion.frameIndex}`];
        const explosionTop = explosion.row * gridSizePx - (kaboomFrameSize - 16) / 2;
        const explosionLeft = explosion.col * gridSizePx - (kaboomFrameSize - 16) / 2;

        return (
          <div
            key={`explosion-${explosion.id}`}
            style={{
              position: "absolute",
              top: explosionTop,
              left: explosionLeft,
              width: kaboomFrameSize,
              height: kaboomFrameSize,
              backgroundImage: `url(${KABOOM_SPRITE_SHEET})`,
              backgroundPosition: `-${kaboomCoords.x1}px -${kaboomCoords.y1}px`,
              backgroundSize: "auto",
              pointerEvents: "none",
              transform: `scale(${explosion.scale})`,
              transformOrigin: "center",
              zIndex: 11,
              willChange: "transform"
            }}
          />
        );
      })}
      {isIntro && (
        <div
          style={{
            position: "absolute",
            top:
              introFrameIndex < 4
                ? introPos.row * gridSizePx - (112 - 16) / 2 + (-40 + introFrameIndex * 10)
                : introPos.row * gridSizePx - (112 - 16) / 2,
            left:
              introFrameIndex < 4
                ? introPos.col * gridSizePx -
                  (112 - 16) / 2 +
                  (-gridSizePx * (introPos.col + 2) +
                    introFrameIndex * (gridSizePx * (introPos.col + 2)) / 4)
                : introPos.col * gridSizePx - (112 - 16) / 2,
            width: 112,
            height: 112,
            backgroundImage: `url(${INTRO_SPRITE_SHEET})`,
            backgroundPosition: `-${introFrameCoords.x1}px -${introFrameCoords.y1}px`,
            backgroundSize: "auto",
            pointerEvents: "none",
            zIndex: 10
          }}
        />
      )}
      {gameStarted && !isCheer && !isIntro && (
        <div
          style={{
            position: "absolute",
            top: charPos.row * gridSizePx - (112 - 16) / 2,
            left: charPos.col * gridSizePx - (112 - 16) / 2,
            width: 112,
            height: 112,
            backgroundImage: `url(${currentCharacterSprite.spriteSheet})`,
            backgroundPosition: `-${currentCharacterSprite.coords.x1}px -${currentCharacterSprite.coords.y1}px`,
            backgroundSize: "auto",
            pointerEvents: "none",
            transform: isMoving && shouldMirrorWalk ? "scaleX(-1)" : "none",
            transformOrigin: "center",
            zIndex: 10
          }}
        />
      )}
      {isCheer && (
        <div
          style={{
            position: "absolute",
            top: charPos.row * gridSizePx - (112 - 16) / 2,
            left: charPos.col * gridSizePx - (112 - 16) / 2,
            width: 112,
            height: 112,
            backgroundImage: `url(${CHEER_SPRITE_SHEET})`,
            backgroundPosition: `-${CHEER_COORDS[`cheer${cheerFrameIndex}`].x1}px -${CHEER_COORDS[`cheer${cheerFrameIndex}`].y1}px`,
            backgroundSize: "auto",
            pointerEvents: "none",
            zIndex: 10
          }}
        />
      )}
    </>
  );
}
