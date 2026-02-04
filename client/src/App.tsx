import { useEffect, useRef, useState } from "react";
import {
  Character,
  Face,
  Matrix,
  Tile,
  TileTexture,
  SPRITE_SHEET,
  CHAR_SPRITE_SHEET,
  IDLE_SPRITE_SHEET,
  WALK_SPRITE_SHEET,
  CHILLWALK_SPRITE_SHEET,
  PANIC_SPRITE_SHEET,
  DEAD_SPRITE_SHEET,
  KABOOM_SPRITE_SHEET,
  SCORCH_SPRITE_SHEET,
  PLACEFLAG_SPRITE_SHEET,
  CHEER_SPRITE_SHEET,
  TILE_COORDS,
  FACE_COORDS,
  NUMBER_COORDS,
  KEY_COORDS,
  CHAR_FULL_COORDS,
  CHAR_FEET_COORDS,
  IDLE_COORDS,
  WALK_COORDS,
  CHILLWALK_COORDS,
  PANIC_COORDS,
  DEAD_COORDS,
  KABOOM_COORDS,
  SCORCH_COORDS,
  CHEER_COORDS,
  PLACEFLAG_COORDS
} from "../../shared";

interface GameState {
  rows: number;
  cols: number;
  character: Character;
  face: Face;
  tiles: string[][];
}

type GameStatus = "playing" | "won" | "lost";

interface ExplosionState {
  row: number;
  col: number;
  frameIndex: number;
  scale: number;
  id: number;
}

interface ScorchState {
  row: number;
  col: number;
  scale: number;
  id: number;
}

function createMatrix(rows: number, cols: number, mines: number) {
  const matrix = new Matrix<Tile>(rows, cols, () => new Tile("tile0"));
  const total = rows * cols;
  const minePositions = new Set<number>();

  while (minePositions.size < mines && minePositions.size < total) {
    const random = Math.floor(Math.random() * total);
    minePositions.add(random);
  }

  minePositions.forEach((index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const tile = matrix.get(row, col);
    if (tile) tile.isMine = true;
  });

  return matrix;
}

function cloneMatrix(matrix: Matrix<Tile>) {
  return new Matrix<Tile>(matrix.rows, matrix.cols, (r, c) => {
    const t = matrix.get(r, c) ?? new Tile("tile0");
    return new Tile(t.texture, t.isMine, t.isOpen, t.isFlagged);
  });
}

const numberTexture = (count: number): TileTexture => {
  if (count <= 0) return "tile9";
  if (count >= 8) return "tile8";
  return (`tile${count}` as TileTexture);
};

export default function App() {
  const [state, setState] = useState<GameState | null>(null);
  const [gridSize, setGridSize] = useState({ rows: 9, cols: 9 });
  const [mineCount, setMineCount] = useState(10);
  
  // Audio instances - lazy init
  const flagPlaceAudio = useRef<HTMLAudioElement | null>(null);
  const kaboomAudio = useRef<HTMLAudioElement | null>(null);
  const chillWalkAudio = useRef<HTMLAudioElement | null>(null);
  const stepOnBlockAudio = useRef<HTMLAudioElement | null>(null);
  
  // Initialize audio on mount
  useEffect(() => {
    flagPlaceAudio.current = new Audio("/placeflag.wav");
    kaboomAudio.current = new Audio("/kaboom.wav");
    chillWalkAudio.current = new Audio("/chillwalk.wav");
    stepOnBlockAudio.current = new Audio("/steponblock.wav");
    
    // Preload all audio
    [flagPlaceAudio, kaboomAudio, chillWalkAudio, stepOnBlockAudio].forEach(audio => {
      if (audio.current) {
        audio.current.preload = "auto";
        audio.current.load();
      }
    });
  }, []);
  
  const [localMatrix, setLocalMatrix] = useState(() =>
    createMatrix(9, 9, 10)
  );
  const [charPos, setCharPos] = useState({ row: 0, col: 0 });
  const [pendingCharPos, setPendingCharPos] = useState<{ row: number; col: number } | null>(null);
  const [status, setStatus] = useState<GameStatus>("playing");
  const [firstMove, setFirstMove] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isFacePressed, setIsFacePressed] = useState(false);
  const [pressedArrows, setPressedArrows] = useState<Set<string>>(new Set());
  const [animationFrame, setAnimationFrame] = useState(0);
  const [lastDirection, setLastDirection] = useState<"Up" | "Down" | "Left" | "Right">("Down");
  const [previousWalkDirection, setPreviousWalkDirection] = useState<"Up" | "Down" | "Left" | "Right" | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [walkFrameIndex, setWalkFrameIndex] = useState(0);
  const [isChillWalk, setIsChillWalk] = useState(false);
  const [isPanic, setIsPanic] = useState(false);
  const [panicFrameIndex, setPanicFrameIndex] = useState(0);
  const [isDead, setIsDead] = useState(false);
  const [pendingLoss, setPendingLoss] = useState(false);
  const [steppedMine, setSteppedMine] = useState<{ row: number; col: number } | null>(null);
  const [isCheer, setIsCheer] = useState(false);
  const [cheerFrameIndex, setCheerFrameIndex] = useState(0);
  const [activeExplosions, setActiveExplosions] = useState<ExplosionState[]>([]);
  const [scorchMarks, setScorchMarks] = useState<ScorchState[]>([]);
  const explosionQueueRef = useRef<Array<{ row: number; col: number }>>([]);
  const explosionIdRef = useRef(0);
  const explosionsPlayedRef = useRef(false);
  const explosionTickRef = useRef(0);
  const shouldMirrorWalkRef = useRef(false);
  const lastWasVerticalMirroredRef = useRef(false);
  const [placingFlagDirection, setPlacingFlagDirection] = useState<"Up" | "Down" | "Left" | "Right" | "UpLeft" | "UpRight" | "DownLeft" | "DownRight" | null>(null);
  const [placeFlagFrameIndex, setPlaceFlagFrameIndex] = useState(0);
  const [isRemovingFlag, setIsRemovingFlag] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(30);
  const GRID_SIZE = 16; // Tile size in pixels
  const KABOOM_FRAME_SIZE = 270;
  const SCORCH_FRAME_SIZE = 200;

  // Count flags in the matrix
  const flagCount = localMatrix.data.flat().filter((tile: Tile) => tile.isFlagged).length;
  const remainingMines = mineCount - flagCount;

  // Timer effect
  useEffect(() => {
    if (status === "playing" && gameStarted) {
      const interval = setInterval(() => {
        setTimer((prev) => Math.min(prev + 1, 999));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status, gameStarted]);

  // Kaboom explosion sequence when losing
  useEffect(() => {
    if (status !== "lost") return;
    if (explosionsPlayedRef.current) return;
    if (activeExplosions.length > 0 || explosionQueueRef.current.length > 0) return;

    const mines: Array<{ row: number; col: number }> = [];
    for (let r = 0; r < localMatrix.rows; r += 1) {
      for (let c = 0; c < localMatrix.cols; c += 1) {
        const t = localMatrix.get(r, c);
        if (t?.isMine) mines.push({ row: r, col: c });
      }
    }

    // Determine mine explosion frequency based on difficulty
    let explosionFrequency = 1; // Easy: 9x9 - every mine
    if (gridSize.rows === 16 && gridSize.cols === 16) {
      explosionFrequency = 2; // Normal: 16x16 - every 2 mines
    } else if (gridSize.rows === 16 && gridSize.cols === 30) {
      explosionFrequency = 3; // Hard: 30x16 - every 3 mines
    }

    const targets = mines
      .filter((m) => !(steppedMine && m.row === steppedMine.row && m.col === steppedMine.col))
      .sort((a, b) => {
        const diagA = a.col + a.row;
        const diagB = b.col + b.row;
        if (diagA !== diagB) return diagA - diagB;
        return a.row - b.row;
      })
      .filter((_, idx) => idx % explosionFrequency === 0);
    explosionQueueRef.current = targets;
    explosionTickRef.current = 0;

    const first = explosionQueueRef.current.shift();
    if (first) {
      const scale = 0.33 + Math.random() * 0.42;
      explosionIdRef.current += 1;
      setActiveExplosions([{ row: first.row, col: first.col, frameIndex: 0, scale, id: explosionIdRef.current }]);
      explosionsPlayedRef.current = true;
      
      // Play kaboom sound for first explosion - create new instance
      const audio = new Audio("/kaboom.wav");
      audio.play().catch(() => {});
    }
  }, [status, localMatrix, activeExplosions.length]);

  // Character explosion after 1.5 seconds when status becomes lost
  useEffect(() => {
    if (status !== "lost") return;

    const timeout = setTimeout(() => {
      const scale = 1.0;
      explosionIdRef.current += 1;
      setActiveExplosions((prev) => [
        ...prev,
        { row: charPos.row, col: charPos.col, frameIndex: 0, scale, id: explosionIdRef.current }
      ]);
      
      // Play kaboom sound for character explosion
      const audio = new Audio("/kaboom.wav");
      audio.play().catch(() => {});
    }, 1500);

    return () => clearTimeout(timeout);
  }, [status, charPos]);

  // Clear explosions if status changes away from lost
  useEffect(() => {
    if (status !== "lost" && activeExplosions.length > 0) {
      setActiveExplosions([]);
      explosionQueueRef.current = [];
      explosionsPlayedRef.current = false;
      explosionTickRef.current = 0;
    }
  }, [status, activeExplosions.length]);

  useEffect(() => {
    if (status !== "lost") return;
    if (activeExplosions.length === 0 && explosionQueueRef.current.length === 0) return;

    // First 7 frames at 10 FPS (100ms), last 9 frames at 6 FPS (166.67ms)
    const getFrameInterval = () => {
      const minFrame = Math.min(...activeExplosions.map(e => e.frameIndex), 0);
      return minFrame < 7 ? 100 : 166.67;
    };
    
    // Determine explosion cadence based on difficulty
    let explosionCadence = 5; // Easy: 9x9
    if (gridSize.rows === 16 && gridSize.cols === 16) {
      explosionCadence = 3; // Normal: 16x16
    } else if (gridSize.rows === 16 && gridSize.cols === 30) {
      explosionCadence = 2; // Hard: 30x16
    }
    
    const kaboomIntervalId = setInterval(() => {
      explosionTickRef.current += 1;

      if (explosionTickRef.current % explosionCadence === 0) {
        const nextTarget = explosionQueueRef.current.shift();
        if (nextTarget) {
          const scale = 0.33 + Math.random() * 0.42;
          explosionIdRef.current += 1;
          setActiveExplosions((prev) => [
            ...prev,
            { row: nextTarget.row, col: nextTarget.col, frameIndex: 0, scale, id: explosionIdRef.current }
          ]);
          
          // Play kaboom sound for new explosion - create new instance
          const audio = new Audio("/kaboom.wav");
          audio.play().catch(() => {});
        }
      }

      setActiveExplosions((prev) => {
        const updated = prev
          .map((exp) => {
            // Create scorch mark when explosion reaches frame 6
            if (exp.frameIndex === 6) {
              setScorchMarks((scorches) => [
                ...scorches,
                { row: exp.row, col: exp.col, scale: exp.scale, id: exp.id }
              ]);
            }
            return { ...exp, frameIndex: exp.frameIndex + 1 };
          })
          .filter((exp) => exp.frameIndex < 16);
        
        // If no explosions left and queue is empty, stop the interval
        if (updated.length === 0 && explosionQueueRef.current.length === 0) {
          clearInterval(kaboomIntervalId);
        }
        
        return updated;
      });
    }, getFrameInterval());

    return () => clearInterval(kaboomIntervalId);
  }, [status, gridSize, activeExplosions]);

  // Trigger cheer animation when game is won and no animations are playing
  useEffect(() => {
    if (status !== "won") return;
    if (isMoving || placingFlagDirection !== null) return;
    
    setIsCheer(true);
  }, [status, isMoving, placingFlagDirection]);

  // Animation effect
  useEffect(() => {
    if (!gameStarted) return;
    
    const baseInterval = 42; // ~24fps for animation
    const interval = Math.max(8, baseInterval * (30 / animationSpeed));
    
    const animationInterval = setInterval(() => {
      setAnimationFrame((prev) => (prev + 1) % 100);
    }, interval);
    
    return () => clearInterval(animationInterval);
  }, [gameStarted, animationSpeed]);

  // Walk animation effect
  useEffect(() => {
    if (!isMoving) return;
    
    const baseWalkInterval = 40;
    const walkInterval = Math.max(8, baseWalkInterval * (30 / animationSpeed));
    
    const walkIntervalId = setInterval(() => {
      setWalkFrameIndex((prev) => {
        const nextFrame = prev + 1;

        // Play sound effects at specific frames
        if (isChillWalk && nextFrame === 3) {
          if (chillWalkAudio.current) {
            chillWalkAudio.current.currentTime = 0;
            chillWalkAudio.current.play().catch(() => {});
          }
        } else if (!isChillWalk && nextFrame === 6) {
          if (chillWalkAudio.current) {
            chillWalkAudio.current.currentTime = 0;
            chillWalkAudio.current.play().catch(() => {});
          }
        }

        if (!isChillWalk) {
          // Reveal tile at frame 7 for normal walk
          if (nextFrame === 7 && pendingCharPos) {
            revealAt(pendingCharPos.row, pendingCharPos.col);
          }
        }

        const totalFrames = isChillWalk ? 6 : 11;
        // Complete animation at final frame
        if (nextFrame >= totalFrames) {
          // Update character position after animation completes
          if (pendingCharPos) {
            setCharPos(pendingCharPos);
            setPendingCharPos(null);
          }
          setIsMoving(false);
          return 0;
        }
        return nextFrame;
      });
    }, walkInterval);
    
    return () => clearInterval(walkIntervalId);
  }, [isMoving, pendingCharPos, animationSpeed, isChillWalk]);

  // Place flag animation effect
  useEffect(() => {
    if (placingFlagDirection === null) return;
    
    const flagInterval = Math.max(8, (1000 / animationSpeed) * 2.5);
    
    const timeout = setTimeout(() => {
      if (isRemovingFlag) {
        // Reverse animation: go from 5 down to 0
        if (placeFlagFrameIndex > 0) {
          setPlaceFlagFrameIndex((prev) => prev - 1);
        } else {
          setPlacingFlagDirection(null);
          setPlaceFlagFrameIndex(0);
          setIsRemovingFlag(false);
        }
      } else {
        // Forward animation: go from 0 to 5
        if (placeFlagFrameIndex < 5) {
          setPlaceFlagFrameIndex((prev) => prev + 1);
          
          // Play sound at frame 3 (when reaching frame 3)
          if (placeFlagFrameIndex === 2) {
            if (flagPlaceAudio.current) {
              flagPlaceAudio.current.currentTime = 0;
              flagPlaceAudio.current.play().catch(() => {});
            }
          }
        } else {
          setPlacingFlagDirection(null);
          setPlaceFlagFrameIndex(0);
        }
      }
    }, flagInterval);
    
    return () => clearTimeout(timeout);
  }, [placingFlagDirection, placeFlagFrameIndex, isRemovingFlag, animationSpeed]);

  // Trigger panic after loss once walk animation finishes
  useEffect(() => {
    if (!pendingLoss) return;
    if (isMoving) return;

    setIsPanic(true);
    setPanicFrameIndex(0);
    setPendingLoss(false);
  }, [pendingLoss, isMoving]);

  // Panic animation effect
  useEffect(() => {
    if (!isPanic) return;

    const panicInterval = 1600 / 16; // 1.6 seconds total / 16 frames = 100ms per frame
    const panicIntervalId = setInterval(() => {
      setPanicFrameIndex((prev) => {
        const nextFrame = prev + 1;
        if (nextFrame >= 16) {
          setIsPanic(false);
          setIsDead(true);
          return 0;
        }
        return nextFrame;
      });
    }, panicInterval);

    return () => clearInterval(panicIntervalId);
  }, [isPanic]);

  // Cheer animation effect
  useEffect(() => {
    if (!isCheer) return;

    const cheerInterval = 400 / 4; // 0.4 seconds total / 4 frames = 100ms per frame
    const cheerIntervalId = setInterval(() => {
      setCheerFrameIndex((prev) => {
        const nextFrame = prev + 1;
        if (nextFrame >= 4) {
          // Stop incrementing but keep showing the last frame (frame 3)
          return 3;
        }
        return nextFrame;
      });
    }, cheerInterval);

    // Stop interval after animation completes
    const timeoutId = setTimeout(() => {
      clearInterval(cheerIntervalId);
    }, 400);

    return () => {
      clearInterval(cheerIntervalId);
      clearTimeout(timeoutId);
    };
  }, [isCheer]);

  useEffect(() => {
    fetch("http://localhost:3000/state")
      .then((res) => res.json())
      .then((data: GameState) => setState(data))
      .catch(() => setState(null));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== "playing") return;
      if (isMoving || placingFlagDirection !== null) return; // Block input during animations
      
      const key = e.key.toLowerCase();

      if (key.startsWith("arrow")) {
        e.preventDefault();
        setPressedArrows((prev) => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
        return;
      }

      if (key === "w") moveCharacter(-1, 0);
      if (key === "s") moveCharacter(1, 0);
      if (key === "a") moveCharacter(0, -1);
      if (key === "d") moveCharacter(0, 1);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!key.startsWith("arrow")) return;

      setPressedArrows((prev) => {
        const current = new Set(prev);
        // Use current (including released key) to determine direction
        const up = current.has("arrowup");
        const down = current.has("arrowdown");
        const left = current.has("arrowleft");
        const right = current.has("arrowright");

        let dr = 0;
        let dc = 0;
        let isDiagonal = false;
        let isSingle = false;

        if (up && right) {
          dr = -1;
          dc = 1;
          isDiagonal = true;
        } else if (up && left) {
          dr = -1;
          dc = -1;
          isDiagonal = true;
        } else if (down && right) {
          dr = 1;
          dc = 1;
          isDiagonal = true;
        } else if (down && left) {
          dr = 1;
          dc = -1;
          isDiagonal = true;
        } else if (up) {
          dr = -1;
          dc = 0;
          isSingle = current.size === 1;
        } else if (down) {
          dr = 1;
          dc = 0;
          isSingle = current.size === 1;
        } else if (left) {
          dr = 0;
          dc = -1;
          isSingle = current.size === 1;
        } else if (right) {
          dr = 0;
          dc = 1;
          isSingle = current.size === 1;
        }

        if (isDiagonal && (dr !== 0 || dc !== 0)) {
          toggleFlagAt(charPos.row + dr, charPos.col + dc);
          return new Set();
        }

        if (isSingle && (dr !== 0 || dc !== 0)) {
          toggleFlagAt(charPos.row + dr, charPos.col + dc);
        }

        current.delete(key);
        return current;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gridSize, status, localMatrix, charPos, remainingMines, gameStarted, isMoving, placingFlagDirection]);

  useEffect(() => {
    // Only reveal if we just started the game (first move)
    if (status === "playing" && gameStarted && firstMove && charPos.row === 0 && charPos.col === 0) {
      revealAt(charPos.row, charPos.col);
    }
  }, [status, gameStarted, firstMove]);

  const clearAllAnimations = () => {
    setIsMoving(false);
    setWalkFrameIndex(0);
    setIsChillWalk(false);
    setPendingCharPos(null);
    setPlacingFlagDirection(null);
    setPlaceFlagFrameIndex(0);
    setIsRemovingFlag(false);
    setIsPanic(false);
    setPanicFrameIndex(0);
    setIsDead(false);
    setPendingLoss(false);
    setSteppedMine(null);
    setIsCheer(false);
    setCheerFrameIndex(0);
    setActiveExplosions([]);
    setScorchMarks([]);
    explosionQueueRef.current = [];
    explosionsPlayedRef.current = false;
    explosionTickRef.current = 0;
    setPreviousWalkDirection(null);
    shouldMirrorWalkRef.current = false;
    lastWasVerticalMirroredRef.current = false;
  };

  const setDifficulty = (rows: number, cols: number, mines: number) => {
    clearAllAnimations();
    setGridSize({ rows, cols });
    setMineCount(mines);
    setLocalMatrix(createMatrix(rows, cols, mines));
    setCharPos({ row: 0, col: 0 });
    setStatus("playing");
    setFirstMove(true);
    setGameStarted(false);
    setTimer(0);
  };

  const getIdleFrame = () => {
    const frameIndex = Math.floor((animationFrame / 100) * 4) % 4;
    return IDLE_COORDS[`idle${frameIndex}`];
  };

  const getWalkFrame = () => {
    const directionMap: Record<string, string> = {
      "Up": "walkUp",
      "Down": "walkDown",
      "Left": "walkLeft",
      "Right": "walkRight"
    };
    const prefix = directionMap[lastDirection] || "walkDown";
    return WALK_COORDS[`${prefix}${walkFrameIndex}`];
  };

  const getChillWalkFrame = () => {
    const directionMap: Record<string, string> = {
      "Up": "chillWalkUp",
      "Down": "chillWalkDown",
      "Left": "chillWalkLeft",
      "Right": "chillWalkRight"
    };
    const prefix = directionMap[lastDirection] || "chillWalkDown";
    const frameIndex = walkFrameIndex % 6;
    return CHILLWALK_COORDS[`${prefix}${frameIndex}`];
  };

  const getPanicFrame = () => PANIC_COORDS[`panic${panicFrameIndex}`];

  const getPlaceFlagFrame = () => {
    const directionMap: Record<string, string> = {
      "Up": "placeflagTop",
      "Down": "placeflagBottom",
      "Left": "placeflagLeft",
      "Right": "placeflagRight",
      "UpLeft": "placeflagTopLeft",
      "UpRight": "placeflagTopRight",
      "DownLeft": "placeflagBottomLeft",
      "DownRight": "placeflagBottomRight"
    };
    const prefix = directionMap[placingFlagDirection || "Down"] || "placeflagBottom";
    return PLACEFLAG_COORDS[`${prefix}${placeFlagFrameIndex}`];
  };

  const getCurrentCharacterSprite = () => {
    if (isDead) {
      return {
        spriteSheet: DEAD_SPRITE_SHEET,
        coords: DEAD_COORDS.dead0
      };
    }
    if (isPanic) {
      return {
        spriteSheet: PANIC_SPRITE_SHEET,
        coords: getPanicFrame()
      };
    }
    if (placingFlagDirection !== null) {
      return {
        spriteSheet: PLACEFLAG_SPRITE_SHEET,
        coords: getPlaceFlagFrame()
      };
    } else if (isMoving) {
      return {
        spriteSheet: isChillWalk ? CHILLWALK_SPRITE_SHEET : WALK_SPRITE_SHEET,
        coords: isChillWalk ? getChillWalkFrame() : getWalkFrame()
      };
    } else {
      return {
        spriteSheet: IDLE_SPRITE_SHEET,
        coords: getIdleFrame()
      };
    }
  };

  const renderThreeDigitNumber = (value: number) => {
    const digits = Math.min(Math.max(value, 0), 999).toString().padStart(3, '0').split('');
    return (
      <div style={{ display: 'flex', gap: 2 }}>
        {digits.map((digit, idx) => {
          const coords = NUMBER_COORDS[`number${digit}`];
          const width = coords.x2 - coords.x1 + 1;
          const height = coords.y2 - coords.y1 + 1;
          return (
            <div
              key={idx}
              style={{
                width,
                height,
                backgroundImage: `url(${SPRITE_SHEET})`,
                backgroundPosition: `-${coords.x1}px -${coords.y1}px`,
                backgroundSize: 'auto'
              }}
            />
          );
        })}
      </div>
    );
  };

  const getFaceCoords = () => {
    if (isFacePressed) return FACE_COORDS.face2;
    if (status === "won") return FACE_COORDS.face3;
    if (status === "lost") return FACE_COORDS.face4;
    return FACE_COORDS.face1;
  };

  const moveCharacter = (dr: number, dc: number) => {
    if (status !== "playing") return;
    
    // Calculate new position
    const newRow = charPos.row + dr;
    const newCol = charPos.col + dc;
    
    // Check if new position is out of bounds
    if (newRow < 0 || newRow >= gridSize.rows || newCol < 0 || newCol >= gridSize.cols) {
      return; // Don't animate if moving out of bounds
    }

    const targetTile = localMatrix.get(newRow, newCol);
    const shouldChillWalk = !!targetTile && (targetTile.isOpen || targetTile.isFlagged);
    
    // Determine new direction
    let newDirection: "Up" | "Down" | "Left" | "Right" = "Down";
    if (dr === -1) newDirection = "Up";
    else if (dr === 1) newDirection = "Down";
    else if (dc === -1) newDirection = "Left";
    else if (dc === 1) newDirection = "Right";
    
    // Check if this is the exact same direction as the previous move (for alternating mirror)
    // Only apply mirroring to Up and Down directions
    const isVerticalDirection = newDirection === "Up" || newDirection === "Down";
    const isSameDirectionAsLast = previousWalkDirection === newDirection;
    
    // Determine if we should mirror: toggle on each repeat of vertical direction
    if (isVerticalDirection && isSameDirectionAsLast) {
      // Alternate: if last time was mirrored, don't mirror this time, and vice versa
      shouldMirrorWalkRef.current = !lastWasVerticalMirroredRef.current;
      lastWasVerticalMirroredRef.current = shouldMirrorWalkRef.current;
    } else {
      // Not a repeat of vertical, or moving horizontally: no mirror
      shouldMirrorWalkRef.current = false;
      if (isVerticalDirection) {
        lastWasVerticalMirroredRef.current = false; // Reset toggle when changing direction
      }
    }
    
    setLastDirection(newDirection);
    setPreviousWalkDirection(newDirection);
    
    setWalkFrameIndex(0);
    setIsMoving(true);
    setIsChillWalk(shouldChillWalk);
    setPendingCharPos({ row: newRow, col: newCol });
    
    // Play initial walk sound
    if (shouldChillWalk) {
      if (chillWalkAudio.current) {
        chillWalkAudio.current.currentTime = 0;
        chillWalkAudio.current.play().catch(() => {});
      }
    } else {
      if (stepOnBlockAudio.current) {
        stepOnBlockAudio.current.currentTime = 0;
        stepOnBlockAudio.current.play().catch(() => {});
      }
    }
  };

  const renderKeyButton = (
    coords: { x1: number; y1: number; x2: number; y2: number },
    onClick: () => void,
    ariaLabel: string
  ) => {
    const width = coords.x2 - coords.x1 + 1;
    const height = coords.y2 - coords.y1 + 1;
    return (
      <button
        type="button"
        onClick={() => {
          // Block input during animations
          if (isMoving || placingFlagDirection !== null) return;
          onClick();
        }}
        aria-label={ariaLabel}
        style={{
          width,
          height,
          padding: 0,
          border: "none",
          backgroundColor: "transparent",
          backgroundImage: `url(${SPRITE_SHEET})`,
          backgroundPosition: `-${coords.x1}px -${coords.y1}px`,
          backgroundSize: "auto",
          cursor: "pointer"
        }}
      />
    );
  };

  const toggleFlagAt = (row: number, col: number) => {
    if (!gameStarted || status !== "playing") return;
    if (!localMatrix.inBounds(row, col)) return;

    // Check if tile is legal for flagging before animating
    const tile = localMatrix.get(row, col);
    if (!tile || tile.isOpen) return;
    if (!tile.isFlagged && remainingMines <= 0) return;

    // Calculate direction for animation
    const dr = row - charPos.row;
    const dc = col - charPos.col;
    
    let direction: "Up" | "Down" | "Left" | "Right" | "UpLeft" | "UpRight" | "DownLeft" | "DownRight" | null = null;
    if (dr === -1 && dc === 0) direction = "Up";
    else if (dr === 1 && dc === 0) direction = "Down";
    else if (dr === 0 && dc === -1) direction = "Left";
    else if (dr === 0 && dc === 1) direction = "Right";
    else if (dr === -1 && dc === -1) direction = "UpLeft";
    else if (dr === -1 && dc === 1) direction = "UpRight";
    else if (dr === 1 && dc === -1) direction = "DownLeft";
    else if (dr === 1 && dc === 1) direction = "DownRight";
    
    // Check if flag already exists to determine animation direction
    const isFlagPresent = tile.isFlagged;

    // Trigger animation
    if (direction) {
      setPlacingFlagDirection(direction);
      setPlaceFlagFrameIndex(isFlagPresent ? 5 : 0);
      setIsRemovingFlag(isFlagPresent);
    }

    setLocalMatrix((prev) => {
      const next = cloneMatrix(prev);
      const tile = next.get(row, col);
      if (!tile || tile.isOpen) return prev;
      if (!tile.isFlagged && remainingMines <= 0) return prev;

      tile.isFlagged = !tile.isFlagged;
      tile.setTexture(tile.isFlagged ? "tilef" : "tile0");
      return next;
    });
  };

  const toggleFlag = (row: number, col: number) => {
    if (!gameStarted) {
      // Start game on first click
      // First, clear mines from the starter area
      setLocalMatrix((prev) => {
        const next = cloneMatrix(prev);
        clearStarterArea(next, row, col);
        return next;
      });
      
      setGameStarted(true);
      setCharPos({ row, col });
      revealAt(row, col);
      return;
    }

    if (status !== "playing") return;

    // Check if tile is within 3x3 area around character
    const rowDist = Math.abs(row - charPos.row);
    const colDist = Math.abs(col - charPos.col);
    if (rowDist > 1 || colDist > 1) return;

    setLocalMatrix((prev) => {
      const next = cloneMatrix(prev);
      const tile = next.get(row, col);
      if (!tile || tile.isOpen) return prev;
      
      // Check if we can place more flags
      if (!tile.isFlagged && remainingMines <= 0) return prev;
      
      tile.isFlagged = !tile.isFlagged;
      tile.setTexture(tile.isFlagged ? "tilef" : "tile0");
      return next;
    });
  };

  const revealAt = (row: number, col: number) => {
    if (status !== "playing") return;
    if (firstMove) setFirstMove(false);

    setLocalMatrix((prev) => {
      const next = cloneMatrix(prev);
      const tile = next.get(row, col);
      if (!tile || tile.isOpen || tile.isFlagged) return prev;

      if (firstMove && tile.isMine) {
        relocateMine(next, row, col);
      }

      if (tile.isMine) {
        revealAllMines(next, row, col);
        setStatus("lost");
        setPendingLoss(true);
        setSteppedMine({ row, col });
        return next;
      }

      floodReveal(next, row, col);

      if (checkWin(next, mineCount)) {
        setStatus("won");
      }

      return next;
    });
  };

  const relocateMine = (matrix: Matrix<Tile>, row: number, col: number) => {
    for (let r = 0; r < matrix.rows; r += 1) {
      for (let c = 0; c < matrix.cols; c += 1) {
        const t = matrix.get(r, c);
        if (t && !t.isMine && (r !== row || c !== col)) {
          t.isMine = true;
          const original = matrix.get(row, col);
          if (original) original.isMine = false;
          return;
        }
      }
    }
  };

  const clearStarterArea = (matrix: Matrix<Tile>, row: number, col: number) => {
    // Clear mines from 3x3 area around starter tile
    for (let r = row - 1; r <= row + 1; r += 1) {
      for (let c = col - 1; c <= col + 1; c += 1) {
        const tile = matrix.get(r, c);
        if (tile && tile.isMine) {
          tile.isMine = false;
          // Find a safe location outside the starter area to place the mine
          for (let mr = 0; mr < matrix.rows; mr += 1) {
            for (let mc = 0; mc < matrix.cols; mc += 1) {
              const safeTile = matrix.get(mr, mc);
              // Check if tile is outside 3x3 starter area and not already a mine
              if (safeTile && !safeTile.isMine && 
                  (Math.abs(mr - row) > 1 || Math.abs(mc - col) > 1)) {
                safeTile.isMine = true;
                return;
              }
            }
          }
        }
      }
    }
  };

  const revealAllMines = (matrix: Matrix<Tile>, steppedRow?: number, steppedCol?: number) => {
    for (let r = 0; r < matrix.rows; r += 1) {
      for (let c = 0; c < matrix.cols; c += 1) {
        const t = matrix.get(r, c);
        if (t?.isMine) {
          t.isOpen = true;
          // Use tileb2 for the mine that was stepped on, tileb1 for others
          if (r === steppedRow && c === steppedCol) {
            t.setTexture("tileb2");
          } else {
            t.setTexture("tileb1");
          }
        }
      }
    }
  };

  const countAdjacentMines = (matrix: Matrix<Tile>, row: number, col: number) =>
    matrix
      .neighbors(row, col)
      .reduce((acc, [r, c]) => (matrix.get(r, c)?.isMine ? acc + 1 : acc), 0);

  const floodReveal = (matrix: Matrix<Tile>, row: number, col: number) => {
    const stack: Array<[number, number]> = [[row, col]];
    while (stack.length) {
      const [r, c] = stack.pop()!;
      const t = matrix.get(r, c);
      if (!t || t.isOpen || t.isFlagged || t.isMine) continue;

      const count = countAdjacentMines(matrix, r, c);
      t.isOpen = true;
      t.setTexture(numberTexture(count));

      if (count === 0) {
        matrix.neighbors(r, c).forEach(([nr, nc]) => {
          const nt = matrix.get(nr, nc);
          if (nt && !nt.isOpen && !nt.isMine) stack.push([nr, nc]);
        });
      }
    }
  };

  const checkWin = (matrix: Matrix<Tile>, mines: number) => {
    let opened = 0;
    for (let r = 0; r < matrix.rows; r += 1) {
      for (let c = 0; c < matrix.cols; c += 1) {
        if (matrix.get(r, c)?.isOpen) opened += 1;
      }
    }
    return opened === matrix.rows * matrix.cols - mines;
  };

  return (
    <div style={{ padding: 12, fontFamily: "sans-serif" }}>
      {/* <h1>MineSticker</h1>
      <p>React + NestJS starter with shared game classes.</p>

      <section style={{ marginTop: 16 }}>
        <h2>Server State</h2>
        <pre style={{ background: "#f4f4f4", padding: 12 }}>
          {state ? JSON.stringify(state, null, 2) : "No state loaded"}
        </pre>
      </section> */}

      <section style={{ marginTop: 16 }}>
        <h2>Minesweeper (But with TDL)</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button type="button" onClick={() => setDifficulty(9, 9, 10)}>
            Easy 9x9
          </button>
          <button type="button" onClick={() => setDifficulty(16, 16, 40)}>
            Normal 16x16
          </button>
          <button type="button" onClick={() => setDifficulty(16, 30, 99)}>
            Hard 30x16
          </button>
        </div>
        
        {/* Game board with counter and matrix */}
        <div style={{
          border: "8px solid",
          borderTopColor: "#ffffff",
          borderLeftColor: "#ffffff",
          borderBottomColor: "#808080",
          borderRightColor: "#808080",
          width: "fit-content",
          boxShadow: "4px 4px 8px rgba(0, 0, 0, 0.3)"
        }}>
          {/* Counter displays */}
          <div style={{ 
            border: "8px solid #C6C6C6",
            width: "fit-content"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: gridSize.cols * 16 - 8,
              background: "#C6C6C6",
              border: "4px solid #808080",
              borderRightColor: "#ffffff",
              borderBottomColor: "#ffffff",
              padding: "4px 4px",
              boxSizing: "content-box",
              position: "relative"
            }}>
              {renderThreeDigitNumber(remainingMines)}
              <button
                type="button"
                onMouseDown={() => setIsFacePressed(true)}
                onMouseUp={() => setIsFacePressed(false)}
                onMouseLeave={() => setIsFacePressed(false)}
                onClick={() => {
                  setDifficulty(gridSize.rows, gridSize.cols, mineCount);
                  if (stepOnBlockAudio.current) {
                    stepOnBlockAudio.current.currentTime = 0;
                    stepOnBlockAudio.current.play().catch(() => {});
                  }
                }}
                style={{
                  position: "absolute",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 24,
                  height: 24,
                  padding: 0,
                  border: "none",
                  backgroundColor: "transparent",
                  backgroundImage: `url(${SPRITE_SHEET})`,
                  backgroundPosition: `-${getFaceCoords().x1}px -${getFaceCoords().y1}px`,
                  backgroundSize: "auto",
                  cursor: "pointer"
                }}
                aria-label="Reset game"
              />
              {renderThreeDigitNumber(timer)}
            </div>
          </div>

          <div style={{ border: "8px solid #C6C6C6", width: "fit-content" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${gridSize.cols}, 16px)`,
                position: "relative",
                width: "fit-content",
                background: "#f0f0f0",
                border: "4px solid #808080",
                borderRightColor: "#ffffff",
                borderBottomColor: "#ffffff"
              }}
            >
          {localMatrix.data.flat().map((tile: Tile, i: number) => {
            const { x1, y1, x2, y2 } = tile.coords;
            const width = x2 - x1 + 1;
            const height = y2 - y1 + 1;
            const row = Math.floor(i / gridSize.cols);
            const col = i % gridSize.cols;

            return (
              <div
                key={i}
                onClick={() => {
                  if (!gameStarted) {
                    // First, clear mines from the starter area
                    setLocalMatrix((prev) => {
                      const next = cloneMatrix(prev);
                      clearStarterArea(next, row, col);
                      return next;
                    });
                    
                    setGameStarted(true);
                    setCharPos({ row, col });
                    revealAt(row, col);
                  }
                }}
                style={{
                  width,
                  height,
                  backgroundImage: `url(${SPRITE_SHEET})`,
                  backgroundPosition: `-${x1}px -${y1}px`,
                  backgroundSize: "auto",
                  cursor: "pointer"
                }}
              />
            );
          })}
          <div style={{ position: "absolute", top: 0, left: 0, width: gridSize.cols * 16, height: gridSize.rows * 16, overflow: "hidden", pointerEvents: "none" }}>
          {scorchMarks.map((scorch) => {
            // Position scorch at tile center, same as explosions
            const scorchTop = scorch.row * GRID_SIZE - (SCORCH_FRAME_SIZE - 16) / 2;
            const scorchLeft = scorch.col * GRID_SIZE - (SCORCH_FRAME_SIZE - 16) / 2;
            
            return (
              <div
                key={`scorch-${scorch.id}`}
                style={{
                  position: "absolute",
                  top: scorchTop,
                  left: scorchLeft,
                  width: SCORCH_FRAME_SIZE,
                  height: SCORCH_FRAME_SIZE,
                  backgroundImage: `url(${SCORCH_SPRITE_SHEET})`,
                  backgroundPosition: `-${SCORCH_COORDS.x1}px -${SCORCH_COORDS.y1}px`,
                  backgroundSize: "auto",
                  pointerEvents: "none",
                  transform: `scale(${scorch.scale})`,
                  transformOrigin: "center",
                  zIndex: 2
                }}
              />
            );
          })}
          </div>
          {activeExplosions.map((explosion) => {
            const kaboomCoords = KABOOM_COORDS[`kaboom${explosion.frameIndex}`];
            return (
              <div
                key={explosion.id}
                style={{
                  position: "absolute",
                  top: explosion.row * GRID_SIZE - (KABOOM_FRAME_SIZE - 16) / 2,
                  left: explosion.col * GRID_SIZE - (KABOOM_FRAME_SIZE - 16) / 2,
                  width: KABOOM_FRAME_SIZE,
                  height: KABOOM_FRAME_SIZE,
                  backgroundImage: `url(${KABOOM_SPRITE_SHEET})`,
                  backgroundPosition: `-${kaboomCoords.x1}px -${kaboomCoords.y1}px`,
                  backgroundSize: "auto",
                  pointerEvents: "none",
                  transform: `scale(${explosion.scale})`,
                  transformOrigin: "center",
                  zIndex: 11
                }}
              />
            );
          })}
          {gameStarted && !isCheer && (
            <div
              style={{
                position: "absolute",
                top: charPos.row * GRID_SIZE - (112 - 16) / 2,
                left: charPos.col * GRID_SIZE - (112 - 16) / 2,
                width: 112,
                height: 112,
                backgroundImage: `url(${getCurrentCharacterSprite().spriteSheet})`,
                backgroundPosition: `-${getCurrentCharacterSprite().coords.x1}px -${getCurrentCharacterSprite().coords.y1}px`,
                backgroundSize: "auto",
                pointerEvents: "none",
                transform: isMoving && shouldMirrorWalkRef.current ? "scaleX(-1)" : "none",
                transformOrigin: "center",
                zIndex: 10
              }}
            />
          )}
          {isCheer && (
            <div
              style={{
                position: "absolute",
                top: charPos.row * GRID_SIZE - (112 - 16) / 2,
                left: charPos.col * GRID_SIZE - (112 - 16) / 2,
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
          
          </div>
        </div>
        </div>
        {/* <div style={{ marginTop: 12, fontSize: 12 }}>
          <p>Position: Row {charPos.row}, Col {charPos.col}</p>
          <p style={{ color: "#666" }}>Use WASD to move</p>
          <p style={{ color: status === "won" ? "#00AA00" : status === "lost" ? "#FF0000" : "#666", fontWeight: status !== "playing" ? "bold" : "normal" }}>
            Status: {status}
          </p>
        </div> */}
        <div style={{ marginTop: 16, display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, marginBottom: 6 }}></div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 24px)",
                gap: 4
              }}
            >
              <div style={{ width: 24, height: 24 }} />
              {renderKeyButton(KEY_COORDS.keyW, () => moveCharacter(-1, 0), "Move up")}
              <div style={{ width: 24, height: 24 }} />
              {renderKeyButton(KEY_COORDS.keyA, () => moveCharacter(0, -1), "Move left")}
              <div style={{ width: 24, height: 24 }} />
              {renderKeyButton(KEY_COORDS.keyD, () => moveCharacter(0, 1), "Move right")}
              <div style={{ width: 24, height: 24 }} />
              {renderKeyButton(KEY_COORDS.keyS, () => moveCharacter(1, 0), "Move down")}
              <div style={{ width: 24, height: 24 }} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, marginBottom: 6 }}></div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 24px)",
                gap: 4
              }}
            >
              {renderKeyButton(KEY_COORDS.arrowUpLeft, () => toggleFlagAt(charPos.row - 1, charPos.col - 1), "Flag up-left")}
              {renderKeyButton(KEY_COORDS.arrowUp, () => toggleFlagAt(charPos.row - 1, charPos.col), "Flag up")}
              {renderKeyButton(KEY_COORDS.arrowUpRight, () => toggleFlagAt(charPos.row - 1, charPos.col + 1), "Flag up-right")}
              {renderKeyButton(KEY_COORDS.arrowLeft, () => toggleFlagAt(charPos.row, charPos.col - 1), "Flag left")}
              <div style={{ width: 24, height: 24 }} />
              {renderKeyButton(KEY_COORDS.arrowRight, () => toggleFlagAt(charPos.row, charPos.col + 1), "Flag right")}
              {renderKeyButton(KEY_COORDS.arrowDownLeft, () => toggleFlagAt(charPos.row + 1, charPos.col - 1), "Flag down-left")}
              {renderKeyButton(KEY_COORDS.arrowDown, () => toggleFlagAt(charPos.row + 1, charPos.col), "Flag down")}
              {renderKeyButton(KEY_COORDS.arrowDownRight, () => toggleFlagAt(charPos.row + 1, charPos.col + 1), "Flag down-right")}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24, maxWidth: 300 }}>
          <label style={{ display: "block", marginBottom: 8, fontSize: 12 }}>
            Animation Speed: {animationSpeed}
          </label>
          <input
            type="range"
            min="1"
            max="60"
            value={animationSpeed}
            onChange={(e) => setAnimationSpeed(parseInt(e.target.value))}
            style={{
              width: "100%",
              cursor: "pointer"
            }}
          />
          <div style={{ fontSize: 10, color: "#666", marginTop: 4, marginBottom: 8 }}>
            1 = Slow, 60 = Fast (Default: 30)
          </div>
          <button
            onClick={() => setAnimationSpeed(30)}
            style={{
              padding: "4px 12px",
              fontSize: 12,
              cursor: "pointer",
              backgroundColor: "#f0f0f0",
              border: "1px solid #999",
              borderRadius: 2
            }}
          >
            Reset to Default
          </button>
        </div>
      </section>

      {/* <section style={{ marginTop: 24 }}>
        <h2>Texture Gallery</h2>
        
        <h3>Faces</h3>
        <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          {Object.entries(FACE_COORDS).map(([name, coords]) => {
            const width = coords.x2 - coords.x1 + 1;
            const height = coords.y2 - coords.y1 + 1;
            return (
              <div key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div
                  style={{
                    width,
                    height,
                    backgroundImage: `url(${SPRITE_SHEET})`,
                    backgroundPosition: `-${coords.x1}px -${coords.y1}px`,
                    backgroundSize: "auto",
                    border: "2px solid #333",
                    marginBottom: 8
                  }}
                />
                <span style={{ fontSize: 12, fontWeight: "bold" }}>{name}</span>
              </div>
            );
          })}
        </div>

        <h3>Tiles</h3>
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          {Object.entries(TILE_COORDS).map(([name, coords]) => {
            const width = coords.x2 - coords.x1 + 1;
            const height = coords.y2 - coords.y1 + 1;
            return (
              <div key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div
                  style={{
                    width,
                    height,
                    backgroundImage: `url(${SPRITE_SHEET})`,
                    backgroundPosition: `-${coords.x1}px -${coords.y1}px`,
                    backgroundSize: "auto",
                    border: "2px solid #333",
                    marginBottom: 8
                  }}
                />
                <span style={{ fontSize: 11, fontWeight: "bold" }}>{name}</span>
              </div>
            );
          })}
        </div>

        <h3>Numbers</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {Object.entries(NUMBER_COORDS).map(([name, coords]) => {
            const width = coords.x2 - coords.x1 + 1;
            const height = coords.y2 - coords.y1 + 1;
            return (
              <div key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div
                  style={{
                    width,
                    height,
                    backgroundImage: `url(${SPRITE_SHEET})`,
                    backgroundPosition: `-${coords.x1}px -${coords.y1}px`,
                    backgroundSize: "auto",
                    border: "2px solid #333",
                    marginBottom: 6
                  }}
                />
                <span style={{ fontSize: 10, fontWeight: "bold" }}>{name}</span>
              </div>
            );
          })}
        </div>
      </section> */}
    </div>
  );
}
