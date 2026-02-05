import { useEffect, useRef, useState, useMemo } from "react";
import {
  Character,
  Face,
  Matrix,
  Tile,
  TileTexture,
  SPRITE_SHEET,
  CHAR_SPRITE_SHEET,
  IDLE_SPRITE_SHEET,
  INTRO_SPRITE_SHEET,
  WALK_SPRITE_SHEET,
  CHILLWALK_SPRITE_SHEET,
  PANIC_SPRITE_SHEET,
  DEAD_SPRITE_SHEET,
  KABOOM_SPRITE_SHEET,
  SCORCH_SPRITE_SHEET,
  PLACEFLAG_SPRITE_SHEET,
  CHEER_SPRITE_SHEET,
  DIAGONAL_SPRITE_SHEET,
  KEY_SPRITE_SHEET,
  TILE_COORDS,
  FACE_COORDS,
  NUMBER_COORDS,
  KEY_COORDS,
  CHAR_FULL_COORDS,
  CHAR_FEET_COORDS,
  IDLE_COORDS,
  INTRO_COORDS,
  WALK_COORDS,
  CHILLWALK_COORDS,
  PANIC_COORDS,
  DEAD_COORDS,
  KABOOM_COORDS,
  SCORCH_COORDS,
  CHEER_COORDS,
  PLACEFLAG_COORDS,
  DIAGONAL_COORDS
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
  const whooshAudio = useRef<HTMLAudioElement | null>(null);
  
  // Initialize audio on mount
  useEffect(() => {
    flagPlaceAudio.current = new Audio("/placeflag.wav");
    kaboomAudio.current = new Audio("/kaboom.wav");
    chillWalkAudio.current = new Audio("/chillwalk.wav");
    stepOnBlockAudio.current = new Audio("/steponblock.wav");
    whooshAudio.current = new Audio("/whoosh.wav");
    
    // Preload all audio
    [flagPlaceAudio, kaboomAudio, chillWalkAudio, stepOnBlockAudio, whooshAudio].forEach(audio => {
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
  const [pressedMovementKeys, setPressedMovementKeys] = useState<Set<string>>(new Set());
  const pressedMovementKeysRef = useRef<Set<string>>(new Set());
  const [animationFrame, setAnimationFrame] = useState(0);
  const [lastDirection, setLastDirection] = useState<"Up" | "Down" | "Left" | "Right">("Down");
  
  // Key bindings
  const [keyBindings, setKeyBindings] = useState(() => {
    const stored = localStorage.getItem("minestickerKeyBindings");
    return stored ? JSON.parse(stored) : {
      up: "w",
      down: "s",
      left: "a",
      right: "d",
      flagUp: "arrowup",
      flagDown: "arrowdown",
      flagLeft: "arrowleft",
      flagRight: "arrowright"
    };
  });
  const [isRebindingKey, setIsRebindingKey] = useState<string | null>(null);
  const [diagonalDirection, setDiagonalDirection] = useState<"TopLeft" | "TopRight" | "BottomLeft" | "BottomRight" | null>(null);
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
  const [isIntro, setIsIntro] = useState(false);
  const [introFrameIndex, setIntroFrameIndex] = useState(0);
  const [introTargetPos, setIntroTargetPos] = useState<{ row: number; col: number } | null>(null);
  const [activeExplosions, setActiveExplosions] = useState<ExplosionState[]>([]);
  const [scorchMarks, setScorchMarks] = useState<ScorchState[]>([]);
  const explosionQueueRef = useRef<Array<{ row: number; col: number }>>([]);
  const explosionIdRef = useRef(0);
  const scorchIdRef = useRef(0);
  const explosionsPlayedRef = useRef(false);
  const explosionTickRef = useRef(0);
  const [shouldMirrorWalk, setShouldMirrorWalk] = useState(false);
  const lastWasVerticalMirroredRef = useRef(false);
  const lastVerticalDirectionRef = useRef<"Up" | "Down" | null>(null);
  const isMovingRef = useRef(false);
  const skipNextAutoSaveRef = useRef(false);
  const [placingFlagDirection, setPlacingFlagDirection] = useState<"Up" | "Down" | "Left" | "Right" | "UpLeft" | "UpRight" | "DownLeft" | "DownRight" | null>(null);
  const [placeFlagFrameIndex, setPlaceFlagFrameIndex] = useState(0);
  const [isRemovingFlag, setIsRemovingFlag] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(() => {
    const stored = localStorage.getItem("minestickerAnimationSpeed");
    return stored ? parseInt(stored) : 30;
  });
  const [soundVolume, setSoundVolume] = useState(() => {
    const stored = localStorage.getItem("minestickerSoundVolume");
    return stored ? parseInt(stored) : 70;
  });
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem("minestickerDarkMode");
    return stored ? JSON.parse(stored) : false;
  });
  const [isInstructionsCollapsed, setIsInstructionsCollapsed] = useState(() => {
    const stored = localStorage.getItem("minestickerInstructionsCollapsed");
    return stored ? JSON.parse(stored) : false;
  });
  const [isAnimationSpeedCollapsed, setIsAnimationSpeedCollapsed] = useState(() => {
    const stored = localStorage.getItem("minestickerAnimationSpeedCollapsed");
    return stored ? JSON.parse(stored) : false;
  });
  const [isSoundVolumeCollapsed, setIsSoundVolumeCollapsed] = useState(() => {
    const stored = localStorage.getItem("minestickerSoundVolumeCollapsed");
    return stored ? JSON.parse(stored) : false;
  });
  const [isKeyBindingsCollapsed, setIsKeyBindingsCollapsed] = useState(() => {
    const stored = localStorage.getItem("minestickerKeyBindingsCollapsed");
    return stored ? JSON.parse(stored) : false;
  });
  const [keyButtonScale, setKeyButtonScale] = useState(() => {
    const stored = localStorage.getItem("minestickerKeyButtonScale");
    return stored ? parseFloat(stored) : 0.5;
  });
  const [isKeyButtonScaleCollapsed, setIsKeyButtonScaleCollapsed] = useState(() => {
    const stored = localStorage.getItem("minestickerKeyButtonScaleCollapsed");
    return stored ? JSON.parse(stored) : false;
  });
  const INTRO_FRAME_SEQUENCE = [0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const GRID_SIZE = 16; // Tile size in pixels
  const KABOOM_FRAME_SIZE = 270;
  const SCORCH_FRAME_SIZE = 200;

  // Count flags in the matrix
  const flagCount = localMatrix.data.flat().filter((tile: Tile) => tile.isFlagged).length;
  const remainingMines = mineCount - flagCount;

  // Memoize animation interval calculations
  const animationIntervals = useMemo(() => ({
    base: Math.max(8, 42 * (30 / animationSpeed)),
    intro: 50, // Fixed at 30 FPS (1000ms / 30fps = 33.33ms)
    walk: Math.max(8, 40 * (30 / animationSpeed)),
    flag: Math.max(8, (1000 / animationSpeed) * 2.5),
    panic: 100, // 1600ms / 16 frames
    cheer: 100  // 400ms / 4 frames
  }), [animationSpeed]);

  // Save animation speed to localStorage
  useEffect(() => {
    localStorage.setItem("minestickerAnimationSpeed", animationSpeed.toString());
  }, [animationSpeed]);

  // Save sound volume to localStorage and apply to audio elements
  useEffect(() => {
    localStorage.setItem("minestickerSoundVolume", soundVolume.toString());
    const volume = soundVolume / 100;
    [flagPlaceAudio, kaboomAudio, chillWalkAudio, stepOnBlockAudio, whooshAudio].forEach(audio => {
      if (audio.current) {
        audio.current.volume = volume;
      }
    });
  }, [soundVolume]);

  // Save dark mode preference to localStorage
  useEffect(() => {
    localStorage.setItem("minestickerDarkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  // Save collapsed state for sections to localStorage
  useEffect(() => {
    localStorage.setItem("minestickerInstructionsCollapsed", JSON.stringify(isInstructionsCollapsed));
  }, [isInstructionsCollapsed]);

  useEffect(() => {
    localStorage.setItem("minestickerAnimationSpeedCollapsed", JSON.stringify(isAnimationSpeedCollapsed));
  }, [isAnimationSpeedCollapsed]);

  useEffect(() => {
    localStorage.setItem("minestickerSoundVolumeCollapsed", JSON.stringify(isSoundVolumeCollapsed));
  }, [isSoundVolumeCollapsed]);

  useEffect(() => {
    localStorage.setItem("minestickerKeyBindingsCollapsed", JSON.stringify(isKeyBindingsCollapsed));
  }, [isKeyBindingsCollapsed]);

  // Save key button scale to localStorage
  useEffect(() => {
    localStorage.setItem("minestickerKeyButtonScale", keyButtonScale.toString());
  }, [keyButtonScale]);

  // Save key button scale collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem("minestickerKeyButtonScaleCollapsed", JSON.stringify(isKeyButtonScaleCollapsed));
  }, [isKeyButtonScaleCollapsed]);

  const saveGameState = (
    matrix: Matrix<Tile>,
    overrides?: {
      gridSize?: { rows: number; cols: number };
      mineCount?: number;
      charPos?: { row: number; col: number };
      status?: GameStatus;
      timer?: number;
      gameStarted?: boolean;
      firstMove?: boolean;
    }
  ) => {
    const gameState = {
      gridSize: overrides?.gridSize ?? gridSize,
      mineCount: overrides?.mineCount ?? mineCount,
      charPos: overrides?.charPos ?? charPos,
      status: overrides?.status ?? status,
      timer: overrides?.timer ?? timer,
      gameStarted: overrides?.gameStarted ?? gameStarted,
      firstMove: overrides?.firstMove ?? firstMove,
      matrixData: matrix.data.map(row =>
        row.map(tile => ({
          texture: tile.texture,
          isMine: tile.isMine,
          isOpen: tile.isOpen,
          isFlagged: tile.isFlagged
        }))
      )
    };
    localStorage.setItem("minestickerGameState", JSON.stringify(gameState));
  };

  // Save game state to localStorage
  useEffect(() => {
    if (gameStarted) {
      if (skipNextAutoSaveRef.current) {
        skipNextAutoSaveRef.current = false;
        return;
      }
      saveGameState(localMatrix);
    }
  }, [gridSize, mineCount, charPos, status, timer, gameStarted, localMatrix, firstMove]);

  // Load game state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem("minestickerGameState");
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        // Only restore if it was an active game
        if (parsed.gameStarted && parsed.status === "playing") {
          setGridSize(parsed.gridSize);
          setMineCount(parsed.mineCount);
          setCharPos(parsed.charPos);
          setStatus(parsed.status);
          setTimer(parsed.timer);
          setGameStarted(parsed.gameStarted);
          
          // Reconstruct matrix
          const matrix = new Matrix<Tile>(parsed.gridSize.rows, parsed.gridSize.cols, (r, c) => {
            const tileData = parsed.matrixData[r][c];
            return new Tile(tileData.texture, tileData.isMine, tileData.isOpen, tileData.isFlagged);
          });
          setLocalMatrix(matrix);

          if (typeof parsed.firstMove === "boolean") {
            setFirstMove(parsed.firstMove);
          } else {
            const anyOpen = parsed.matrixData?.some((row: any[]) => row.some((tile: any) => tile?.isOpen));
            setFirstMove(!anyOpen);
          }
        }
      } catch (e) {
        console.error("Failed to load game state:", e);
      }
    }
  }, []);

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
    
    if (targets.length === 0) return;
    
    explosionQueueRef.current = targets.slice(1); // Queue remaining targets
    explosionTickRef.current = 0;
    explosionsPlayedRef.current = true;

    // Trigger first explosion immediately
    const first = targets[0];
    const scale = 0.33 + Math.random() * 0.42;
    explosionIdRef.current += 1;
    setActiveExplosions([{ row: first.row, col: first.col, frameIndex: 0, scale, id: explosionIdRef.current }]);
    
    // Play kaboom sound for first explosion
    if (kaboomAudio.current) {
      kaboomAudio.current.currentTime = 0;
      kaboomAudio.current.play().catch(() => {});
    }
  }, [status, localMatrix, gridSize, steppedMine]);

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
      if (kaboomAudio.current) {
        kaboomAudio.current.currentTime = 0;
        kaboomAudio.current.play().catch(() => {});
      }
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
    const frameInterval = 100; // Use constant interval, check frame in update
    
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
          
          // Play kaboom sound for new explosion
          if (kaboomAudio.current) {
            kaboomAudio.current.currentTime = 0;
            kaboomAudio.current.play().catch(() => {});
          }
        }
      }

      setActiveExplosions((prev) => {
        const scorchesToAdd: ScorchState[] = [];
        
        const updated = prev
          .map((exp) => {
            // Create scorch mark when explosion reaches frame 6 (only once)
            if (exp.frameIndex === 6) {
              scorchIdRef.current += 1;
              scorchesToAdd.push({ row: exp.row, col: exp.col, scale: exp.scale, id: scorchIdRef.current });
            }
            return { ...exp, frameIndex: exp.frameIndex + 1 };
          })
          .filter((exp) => exp.frameIndex < 16);
        
        // Add scorch marks in batch to prevent duplicates
        if (scorchesToAdd.length > 0) {
          setScorchMarks((scorches) => [...scorches, ...scorchesToAdd]);
        }
        
        // If no explosions left and queue is empty, stop the interval
        if (updated.length === 0 && explosionQueueRef.current.length === 0) {
          clearInterval(kaboomIntervalId);
        }
        
        return updated;
      });
    }, frameInterval);

    return () => clearInterval(kaboomIntervalId);
  }, [status, gridSize]);

  // Trigger cheer animation when game is won and no animations are playing
  useEffect(() => {
    if (status !== "won") return;
    if (isMoving || placingFlagDirection !== null) return;
    
    setIsCheer(true);
    
    // Play whoosh sound
    if (whooshAudio.current) {
      whooshAudio.current.currentTime = 0;
      whooshAudio.current.play().catch(() => {});
    }
  }, [status, isMoving, placingFlagDirection]);

  // Animation effect
  useEffect(() => {
    if (!gameStarted) return;
    
    const animationInterval = setInterval(() => {
      setAnimationFrame((prev) => (prev + 1) % 100);
    }, animationIntervals.base);
    
    return () => clearInterval(animationInterval);
  }, [gameStarted, animationIntervals.base]);

  // Intro animation effect (plays once at game start)
  useEffect(() => {
    if (!isIntro) return;

    const introIntervalId = setInterval(() => {
      setIntroFrameIndex((prev) => {
        const nextFrame = prev + 1;
        
        // Reveal tile and play sound at frame 6 (3rd actual intro frame)
        if (nextFrame === 6 && introTargetPos) {
          revealAt(introTargetPos.row, introTargetPos.col);
          if (stepOnBlockAudio.current) {
            stepOnBlockAudio.current.currentTime = 0;
            stepOnBlockAudio.current.play().catch(() => {});
          }
        }
        
        if (nextFrame >= INTRO_FRAME_SEQUENCE.length) {
          setIsIntro(false);
          return 0;
        }
        return nextFrame;
      });
    }, animationIntervals.intro);

    return () => clearInterval(introIntervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIntro, animationIntervals.intro, introTargetPos]);

  // Walk animation effect
  useEffect(() => {
    if (!isMoving) return;
    
    const walkIntervalId = setInterval(() => {
      setWalkFrameIndex((prev) => {
        const nextFrame = prev + 1;

        // Play sound effects at specific frames
        if (diagonalDirection !== null) {
          // Diagonal movement: play at frame 5 only
          if (nextFrame === 5) {
            if (isChillWalk) {
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
          }
        } else if (diagonalDirection === null) {
          // Cardinal movement only: original timing
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
        }

        if (!isChillWalk) {
          // Reveal tile at frame 7 for normal walk
          if (nextFrame === 7 && pendingCharPos) {
            revealAt(pendingCharPos.row, pendingCharPos.col);
          }
        }

        const totalFrames = isChillWalk && diagonalDirection === null ? 6 : 11;
        // Complete animation at final frame
        if (nextFrame >= totalFrames) {
          // Update character position after animation completes
          if (pendingCharPos) {
            setCharPos(pendingCharPos);
            setPendingCharPos(null);
          }
          isMovingRef.current = false;
          setIsMoving(false);
          return 0;
        }
        return nextFrame;
      });
    }, animationIntervals.walk);
    
    return () => clearInterval(walkIntervalId);
  }, [isMoving, pendingCharPos, animationIntervals.walk, isChillWalk, diagonalDirection]);

  // Place flag animation effect
  useEffect(() => {
    if (placingFlagDirection === null) return;
    
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
    }, animationIntervals.flag);
    
    return () => clearTimeout(timeout);
  }, [placingFlagDirection, placeFlagFrameIndex, isRemovingFlag, animationIntervals.flag]);

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
    }, animationIntervals.panic);

    return () => clearInterval(panicIntervalId);
  }, [isPanic, animationIntervals.panic]);

  // Cheer animation effect
  useEffect(() => {
    if (!isCheer) return;

    const cheerIntervalId = setInterval(() => {
      setCheerFrameIndex((prev) => {
        const nextFrame = prev + 1;
        if (nextFrame >= 4) {
          // Stop incrementing but keep showing the last frame (frame 3)
          return 3;
        }
        return nextFrame;
      });
    }, animationIntervals.cheer);

    // Stop interval after animation completes
    const timeoutId = setTimeout(() => {
      clearInterval(cheerIntervalId);
    }, 400);

    return () => {
      clearInterval(cheerIntervalId);
      clearTimeout(timeoutId);
    };
  }, [isCheer, animationIntervals.cheer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      // Always prevent default for arrow keys to stop page scrolling
      if (key.startsWith("arrow")) {
        e.preventDefault();
      }
      
      // Allow restart with Enter key anytime during the game
      if (key === "enter") {
        if (gameStarted) {
          // Restart current game
          setDifficulty(gridSize.rows, gridSize.cols, mineCount);
        } else if (status === "playing") {
          // Randomly pick a starter tile if game hasn't started
          const randomRow = Math.floor(Math.random() * gridSize.rows);
          const randomCol = Math.floor(Math.random() * gridSize.cols);
          toggleFlag(randomRow, randomCol);
        }
        return;
      }
      
      if (isRebindingKey) return; // Disable game controls while rebinding
      if (!gameStarted) return; // Block input before game starts
      if (status !== "playing") return;
      if (isMoving || placingFlagDirection !== null || isIntro) return; // Block input during animations

      // Check if key is a flag key
      const isFlagKey = [keyBindings.flagUp, keyBindings.flagDown, keyBindings.flagLeft, keyBindings.flagRight].includes(key);
      
      if (isFlagKey) {
        setPressedArrows((prev) => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
        return;
      }

      // Check if key is a movement key - add to set for diagonal tracking
      const isMovementKey = [keyBindings.up, keyBindings.down, keyBindings.left, keyBindings.right].includes(key);
      if (isMovementKey) {
        const next = new Set(pressedMovementKeysRef.current);
        next.add(key);
        pressedMovementKeysRef.current = next;
        setPressedMovementKeys(next);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isRebindingKey) return; // Disable game controls while rebinding
      if (!gameStarted) return; // Block input before game starts
      if (isIntro) return;
      const key = e.key.toLowerCase();
      
      // Handle flag key release
      const isFlagKey = [keyBindings.flagUp, keyBindings.flagDown, keyBindings.flagLeft, keyBindings.flagRight].includes(key);
      if (isFlagKey) {
        setPressedArrows((prev) => {
          const current = new Set(prev);
          // Use current (including released key) to determine direction
          const up = current.has(keyBindings.flagUp);
          const down = current.has(keyBindings.flagDown);
          const left = current.has(keyBindings.flagLeft);
          const right = current.has(keyBindings.flagRight);

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
        return;
      }

      // Handle movement key release
      const isMovementKey = [keyBindings.up, keyBindings.down, keyBindings.left, keyBindings.right].includes(key);
      if (isMovementKey) {
        const current = new Set(pressedMovementKeysRef.current);
        // Use current (including released key) to determine direction
        const up = current.has(keyBindings.up);
        const down = current.has(keyBindings.down);
        const left = current.has(keyBindings.left);
        const right = current.has(keyBindings.right);

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
          moveCharacter(dr, dc, 
            dc === 1 ? (dr === -1 ? "TopRight" : "BottomRight") : 
            (dr === -1 ? "TopLeft" : "BottomLeft")
          );
          pressedMovementKeysRef.current = new Set();
          setPressedMovementKeys(new Set());
          return;
        }

        if (isSingle && (dr !== 0 || dc !== 0)) {
          moveCharacter(dr, dc, null);
        }

        current.delete(key);
        pressedMovementKeysRef.current = current;
        setPressedMovementKeys(current);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gridSize, status, localMatrix, charPos, remainingMines, gameStarted, isMoving, placingFlagDirection, isIntro, keyBindings, isRebindingKey, mineCount]);

  // Handle key rebinding
  useEffect(() => {
    if (!isRebindingKey) return;

    const handleRebindKey = (e: KeyboardEvent) => {
      e.preventDefault();
      const newKey = e.key.toLowerCase();
      
      // Ignore modifier keys
      if (["control", "alt", "shift", "meta"].includes(newKey)) return;
      
      // Update the key binding and remove any duplicate keys
      setKeyBindings((prev: any) => {
        const updated = { ...prev };
        
        // First, find and clear any existing binding with this key
        for (const [bindingKey, bindingValue] of Object.entries(updated)) {
          if (bindingValue === newKey && bindingKey !== isRebindingKey) {
            updated[bindingKey] = ""; // Clear the old binding
          }
        }
        
        // Then set the new binding
        updated[isRebindingKey] = newKey;
        
        localStorage.setItem("minestickerKeyBindings", JSON.stringify(updated));
        return updated;
      });
      
      setIsRebindingKey(null);
    };

    window.addEventListener("keydown", handleRebindKey);
    return () => {
      window.removeEventListener("keydown", handleRebindKey);
    };
  }, [isRebindingKey]);

  // Tile reveal now happens in intro animation at frame 6
  // No need for auto-reveal on game start

  const clearAllAnimations = () => {
    setIsMoving(false);
    isMovingRef.current = false;
    skipNextAutoSaveRef.current = false;
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
    setIsIntro(false);
    setIntroFrameIndex(0);
    setIntroTargetPos(null);
    setActiveExplosions([]);
    setScorchMarks([]);
    explosionQueueRef.current = [];
    pressedMovementKeysRef.current = new Set();
    explosionsPlayedRef.current = false;
    explosionTickRef.current = 0;
    scorchIdRef.current = 0;
    lastVerticalDirectionRef.current = null;
    setShouldMirrorWalk(false);
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
    // Clear saved game state when starting new game
    localStorage.removeItem("minestickerGameState");
  };

  const hardReset = () => {
    // Clear all localStorage items
    localStorage.removeItem("minestickerGameState");
    localStorage.removeItem("minestickerKeyBindings");
    localStorage.removeItem("minestickerAnimationSpeed");
    localStorage.removeItem("minestickerSoundVolume");
    localStorage.removeItem("minestickerDarkMode");
    localStorage.removeItem("minestickerInstructionsCollapsed");
    localStorage.removeItem("minestickerAnimationSpeedCollapsed");
    localStorage.removeItem("minestickerSoundVolumeCollapsed");
    localStorage.removeItem("minestickerKeyBindingsCollapsed");
    localStorage.removeItem("minestickerKeyButtonScale");
    localStorage.removeItem("minestickerKeyButtonScaleCollapsed");
    
    // Reset all state to defaults
    setKeyBindings({
      up: "w",
      down: "s",
      left: "a",
      right: "d",
      flagUp: "arrowup",
      flagDown: "arrowdown",
      flagLeft: "arrowleft",
      flagRight: "arrowright"
    });
    setAnimationSpeed(30);
    setSoundVolume(70);
    setDarkMode(false);
    setIsInstructionsCollapsed(false);
    setIsAnimationSpeedCollapsed(true);
    setIsSoundVolumeCollapsed(true);
    setIsKeyBindingsCollapsed(true);
    setIsKeyButtonScaleCollapsed(true);
    setKeyButtonScale(0.5);
    setDifficulty(9, 9, 10);
  };

  const getIdleFrame = useMemo(() => {
    const frameIndex = Math.floor((animationFrame / 100) * 4) % 4;
    return IDLE_COORDS[`idle${frameIndex}`];
  }, [animationFrame]);

  const getIntroFrame = useMemo(() => {
    const frameIndex = INTRO_FRAME_SEQUENCE[introFrameIndex] ?? 0;
    return INTRO_COORDS[`intro${frameIndex}`];
  }, [introFrameIndex]);

  const getWalkFrame = useMemo(() => {
    const directionMap: Record<string, string> = {
      "Up": "walkUp",
      "Down": "walkDown",
      "Left": "walkLeft",
      "Right": "walkRight"
    };
    const prefix = directionMap[lastDirection] || "walkDown";
    return WALK_COORDS[`${prefix}${walkFrameIndex}`];
  }, [lastDirection, walkFrameIndex]);

  const getDiagonalWalkFrame = useMemo(() => {
    const directionMap: Record<string, string> = {
      "TopLeft": "diagonalTopLeft",
      "TopRight": "diagonalTopRight",
      "BottomLeft": "diagonalBottomLeft",
      "BottomRight": "diagonalBottomRight"
    };
    const prefix = directionMap[diagonalDirection || "TopLeft"] || "diagonalTopLeft";
    return DIAGONAL_COORDS[`${prefix}${walkFrameIndex}`];
  }, [diagonalDirection, walkFrameIndex]);

  const getChillWalkFrame = useMemo(() => {
    const directionMap: Record<string, string> = {
      "Up": "chillWalkUp",
      "Down": "chillWalkDown",
      "Left": "chillWalkLeft",
      "Right": "chillWalkRight"
    };
    const prefix = directionMap[lastDirection] || "chillWalkDown";
    const frameIndex = walkFrameIndex % 6;
    return CHILLWALK_COORDS[`${prefix}${frameIndex}`];
  }, [lastDirection, walkFrameIndex]);

  const getPanicFrame = useMemo(() => PANIC_COORDS[`panic${panicFrameIndex}`], [panicFrameIndex]);

  const getPlaceFlagFrame = useMemo(() => {
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
  }, [placingFlagDirection, placeFlagFrameIndex]);

  const getCurrentCharacterSprite = useMemo(() => {
    if (isIntro) {
      return {
        spriteSheet: INTRO_SPRITE_SHEET,
        coords: getIntroFrame
      };
    }
    if (isDead) {
      return {
        spriteSheet: DEAD_SPRITE_SHEET,
        coords: DEAD_COORDS.dead0
      };
    }
    if (isPanic) {
      return {
        spriteSheet: PANIC_SPRITE_SHEET,
        coords: getPanicFrame
      };
    }
    if (placingFlagDirection !== null) {
      return {
        spriteSheet: PLACEFLAG_SPRITE_SHEET,
        coords: getPlaceFlagFrame
      };
    } else if (diagonalDirection !== null && isMoving) {
      return {
        spriteSheet: DIAGONAL_SPRITE_SHEET,
        coords: getDiagonalWalkFrame
      };
    } else if (isMoving) {
      return {
        spriteSheet: isChillWalk ? CHILLWALK_SPRITE_SHEET : WALK_SPRITE_SHEET,
        coords: isChillWalk ? getChillWalkFrame : getWalkFrame
      };
    } else {
      return {
        spriteSheet: IDLE_SPRITE_SHEET,
        coords: getIdleFrame
      };
    }
  }, [isIntro, isDead, isPanic, placingFlagDirection, diagonalDirection, isMoving, isChillWalk, getIntroFrame, getPanicFrame, getPlaceFlagFrame, getDiagonalWalkFrame, getChillWalkFrame, getWalkFrame, getIdleFrame]);

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

  const getFaceCoords = useMemo(() => {
    if (isFacePressed) return FACE_COORDS.face2;
    if (status === "won") return FACE_COORDS.face3;
    if (status === "lost") return FACE_COORDS.face4;
    return FACE_COORDS.face1;
  }, [isFacePressed, status]);

  const moveCharacter = (dr: number, dc: number, diagonal: "TopLeft" | "TopRight" | "BottomLeft" | "BottomRight" | null = null) => {
    if (status !== "playing" || isIntro) return;
    if (isMovingRef.current) return;
    
    // Calculate new position
    const newRow = charPos.row + dr;
    const newCol = charPos.col + dc;
    
    // Check if new position is out of bounds
    if (newRow < 0 || newRow >= gridSize.rows || newCol < 0 || newCol >= gridSize.cols) {
      return; // Don't animate if moving out of bounds
    }

    const targetTile = localMatrix.get(newRow, newCol);
    const shouldChillWalk = !!targetTile && (targetTile.isOpen || targetTile.isFlagged);
    
    // Set diagonal direction
    setDiagonalDirection(diagonal);
    
    // Determine new direction
    let newDirection: "Up" | "Down" | "Left" | "Right" = "Down";
    if (dr === -1) newDirection = "Up";
    else if (dr === 1) newDirection = "Down";
    else if (dc === -1) newDirection = "Left";
    else if (dc === 1) newDirection = "Right";
    
    // Check if this is the exact same vertical direction as the previous vertical move (for alternating mirror)
    // Only apply mirroring to Up and Down directions
    const isVerticalDirection = newDirection === "Up" || newDirection === "Down";
    
    if (!diagonal && isVerticalDirection) {
      const verticalDirection = newDirection === "Up" || newDirection === "Down" ? newDirection : null;
      const isSameVerticalAsLast = lastVerticalDirectionRef.current === verticalDirection;
      if (isSameVerticalAsLast) {
        // Alternate: if last time was mirrored, don't mirror this time, and vice versa
        const nextMirror = !lastWasVerticalMirroredRef.current;
        setShouldMirrorWalk(nextMirror);
        lastWasVerticalMirroredRef.current = nextMirror;
      } else {
        // First move in this vertical direction: no mirror
        setShouldMirrorWalk(false);
        lastWasVerticalMirroredRef.current = false;
      }
      lastVerticalDirectionRef.current = verticalDirection;
    } else {
      // Not vertical or moving diagonally: no mirror
      setShouldMirrorWalk(false);
      lastWasVerticalMirroredRef.current = false;
      lastVerticalDirectionRef.current = null;
    }
    
    setLastDirection(newDirection);
    
    setWalkFrameIndex(0);
    isMovingRef.current = true;
    setIsMoving(true);
    setIsChillWalk(shouldChillWalk);
    setPendingCharPos({ row: newRow, col: newCol });
    
    // Play initial walk sound (only for cardinal movements, diagonal handles its own timing)
    if (!diagonal) {
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
    }
  };

  const KEY_BUTTON_SCALE = keyButtonScale;
  const KEY_BUTTON_BASE = 50;
  const KEY_BUTTON_SIZE = Math.round(KEY_BUTTON_BASE * KEY_BUTTON_SCALE);
  const KEY_SPRITE_SHEET_WIDTH = 400;
  const KEY_SPRITE_SHEET_HEIGHT = 100;

  const renderKeyButton = (
    coords: { x1: number; y1: number; x2: number; y2: number },
    onClick: () => void,
    ariaLabel: string
  ) => {
    const width = coords.x2 - coords.x1 + 1;
    const height = coords.y2 - coords.y1 + 1;
    const scaledWidth = Math.round(width * KEY_BUTTON_SCALE);
    const scaledHeight = Math.round(height * KEY_BUTTON_SCALE);
    return (
      <button
        type="button"
        onClick={() => {
          // Block input during animations or before game starts
          if (!gameStarted || isMoving || placingFlagDirection !== null) return;
          onClick();
        }}
        aria-label={ariaLabel}
        style={{
          width: scaledWidth,
          height: scaledHeight,
          padding: 0,
          border: "none",
          backgroundColor: "transparent",
          backgroundImage: `url(${KEY_SPRITE_SHEET})`,
          backgroundPosition: `-${coords.x1 * KEY_BUTTON_SCALE}px -${coords.y1 * KEY_BUTTON_SCALE}px`,
          backgroundSize: `${KEY_SPRITE_SHEET_WIDTH * KEY_BUTTON_SCALE}px ${KEY_SPRITE_SHEET_HEIGHT * KEY_BUTTON_SCALE}px`,
          backgroundRepeat: "no-repeat",
          cursor: "pointer"
        }}
      />
    );
  };

  const toggleFlagAt = (row: number, col: number) => {
    if (!gameStarted || status !== "playing" || isIntro) return;
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
        skipNextAutoSaveRef.current = true;
        saveGameState(next, {
          charPos: { row, col },
          status: "playing",
          timer: 0,
          gameStarted: true,
          firstMove: true
        });
        return next;
      });
      
      setGameStarted(true);
      setCharPos({ row, col });
      setIntroTargetPos({ row, col });
      setIsIntro(true);
      setIntroFrameIndex(0);
      // Tile will be revealed at frame 6 of intro animation
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
    <div style={{ 
      padding: 12, 
      fontFamily: "sans-serif",
      backgroundColor: darkMode ? "#1A1A1E" : "#ffffff",
      color: darkMode ? "#FFFFFF" : "#000000",
      minHeight: "100vh",
      transition: "background-color 0.3s ease, color 0.3s ease"
    }}>
      {/* <h1>MineSticker</h1>
      <p>React + NestJS starter with shared game classes.</p>

      <section style={{ marginTop: 16 }}>
        <h2>Server State</h2>
        <pre style={{ background: "#f4f4f4", padding: 12 }}>
          {state ? JSON.stringify(state, null, 2) : "No state loaded"}
        </pre>
      </section> */}

      <section style={{ marginTop: 16, overflow: "visible" }}>
        <div
          onClick={() => setIsInstructionsCollapsed(!isInstructionsCollapsed)}
          style={{
            cursor: "pointer",
            userSelect: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: isInstructionsCollapsed ? 0 : 12
          }}
        >
          <span style={{ fontSize: 18 }}>
            {isInstructionsCollapsed ? "▶" : "▼"}
          </span>
          <h2 style={{ margin: 0, display: "inline" }}>Minesweeper (But with The Dark Lord)</h2>
        </div>
        <div
          style={{
            maxHeight: isInstructionsCollapsed ? 0 : "1000px",
            overflow: "hidden",
            transition: "max-height 0.3s ease-in-out",
            marginBottom: isInstructionsCollapsed ? 0 : 12
          }}
        >
          <div className="p-4 bg-gray-900 text-white rounded-lg">
        <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">
          Inspired by Animator vs Animation 3 - Alan Becker</p>
          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">
          Don't know how to play Minesweeper?&nbsp;
                <a href="https://www.spriters-resource.com/pc_computer/minesweeper/asset/19849/" target="_blank" rel="noopener noreferrer" style={{ color: "#0066cc", textDecoration: "underline" }}>
                  Here's how!
                </a></p>
          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">
          Please select any tile to start the game!</p>
          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">
          Use WASD to move around, and press arrow keys to place flags (two arrow key can be pressed together for diagonal flags)!</p>
          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">
           Use the on-screen WASD and arrow keys if you're on a touch device!</p>
           <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">
           To Restart the game, press the face button above the mine counter or Enter! You can randomize a start with Enter!</p>
           <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">
           Encountered bugs? Hard Reset the game:&nbsp;  
        <button 
              type="button" 
              onClick={() => {
                if (window.confirm("This will reset ALL data including game progress, settings, and keybindings. Continue?")) {
                  hardReset();
                }
              }}
              style={{
                backgroundColor: "#ff4444",
                color: "white",
                fontWeight: "bold",
                border: "2px solid #cc0000",
                padding: "4px 12px",
                cursor: "pointer",
                borderRadius: "4px"
              }}
            >
              Reset
            </button></p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" onClick={() => setDifficulty(9, 9, 10)}>
            Easy 9x9
          </button>
          <button type="button" onClick={() => setDifficulty(16, 16, 40)}>
            Normal 16x16
          </button>
          <button type="button" onClick={() => setDifficulty(16, 30, 99)}>
            Hard 30x16
          </button>
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            style={{
              backgroundColor: darkMode ? "#333333" : "#f0f0f0",
              color: darkMode ? "#FFFFFF" : "#000000",
              border: darkMode ? "2px solid #666666" : "2px solid #999999",
              padding: "4px 12px",
              cursor: "pointer",
              borderRadius: "4px",
              fontWeight: "bold"
            }}
          >
            {darkMode ? "Dark" : "Light"}
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
          boxShadow: "4px 4px 8px rgba(0, 0, 0, 0.3)",
          overflow: "visible"
        }}>
          {/* Counter displays */}
          <div style={{ 
            border: `8px solid ${darkMode ? "#C6C6C6" : "#C6C6C6"}`,
            width: "fit-content"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: gridSize.cols * 16 - 8,
              background: darkMode ? "#C6C6C6" : "#C6C6C6",
              border: "4px solid #808080",
              borderRightColor: darkMode ? "#ffffff" : "#ffffff",
              borderBottomColor: darkMode ? "#ffffff" : "#ffffff",
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
                  backgroundPosition: `-${getFaceCoords.x1}px -${getFaceCoords.y1}px`,
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
                borderBottomColor: "#ffffff",
                overflow: "visible"
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
                      skipNextAutoSaveRef.current = true;
                      saveGameState(next, {
                        charPos: { row, col },
                        status: "playing",
                        timer: 0,
                        gameStarted: true,
                        firstMove: true
                      });
                      return next;
                    });
                    
                    setGameStarted(true);
                    setCharPos({ row, col });
                    setIntroTargetPos({ row, col });
                    setIsIntro(true);
                    setIntroFrameIndex(0);
                    // Tile will be revealed at frame 6 of intro animation
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
                  zIndex: 2,
                  willChange: "transform"
                }}
              />
            );
          })}
          </div>
          {activeExplosions.map((explosion) => {
            const kaboomCoords = KABOOM_COORDS[`kaboom${explosion.frameIndex}`];
            const explosionTop = explosion.row * GRID_SIZE - (KABOOM_FRAME_SIZE - 16) / 2;
            const explosionLeft = explosion.col * GRID_SIZE - (KABOOM_FRAME_SIZE - 16) / 2;
            
            return (
              <div
                key={`explosion-${explosion.id}`}
                style={{
                  position: "absolute",
                  top: explosionTop,
                  left: explosionLeft,
                  width: KABOOM_FRAME_SIZE,
                  height: KABOOM_FRAME_SIZE,
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
                top: (introFrameIndex < 4
                  ? (introTargetPos ?? charPos).row * GRID_SIZE - (112 - 16) / 2 + (-40 + introFrameIndex * 10)
                  : (introTargetPos ?? charPos).row * GRID_SIZE - (112 - 16) / 2),
                left: (introFrameIndex < 4
                  ? (introTargetPos ?? charPos).col * GRID_SIZE - (112 - 16) / 2 + (-GRID_SIZE * ((introTargetPos ?? charPos).col + 2) + introFrameIndex * (GRID_SIZE * ((introTargetPos ?? charPos).col + 2))/4)
                  : (introTargetPos ?? charPos).col * GRID_SIZE - (112 - 16) / 2),
                width: 112,
                height: 112,
                backgroundImage: `url(${INTRO_SPRITE_SHEET})`,
                backgroundPosition: `-${getIntroFrame.x1}px -${getIntroFrame.y1}px`,
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
                top: charPos.row * GRID_SIZE - (112 - 16) / 2,
                left: charPos.col * GRID_SIZE - (112 - 16) / 2,
                width: 112,
                height: 112,
                backgroundImage: `url(${getCurrentCharacterSprite.spriteSheet})`,
                backgroundPosition: `-${getCurrentCharacterSprite.coords.x1}px -${getCurrentCharacterSprite.coords.y1}px`,
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
                gridTemplateColumns: `repeat(3, ${KEY_BUTTON_SIZE}px)`,
                gap: 4
              }}
            >
              {renderKeyButton(KEY_COORDS.arrowUpLeft, () => moveCharacter(-1, -1, "TopLeft"), "Move up-left")}
              {renderKeyButton(KEY_COORDS.keyW, () => moveCharacter(-1, 0), "Move up")}
              {renderKeyButton(KEY_COORDS.arrowUpRight, () => moveCharacter(-1, 1, "TopRight"), "Move up-right")}
              {renderKeyButton(KEY_COORDS.keyA, () => moveCharacter(0, -1), "Move left")}
              <div style={{ width: KEY_BUTTON_SIZE, height: KEY_BUTTON_SIZE }} />
              {renderKeyButton(KEY_COORDS.keyD, () => moveCharacter(0, 1), "Move right")}
              {renderKeyButton(KEY_COORDS.arrowDownLeft, () => moveCharacter(1, -1, "BottomLeft"), "Move down-left")}
              {renderKeyButton(KEY_COORDS.keyS, () => moveCharacter(1, 0), "Move down")}
              {renderKeyButton(KEY_COORDS.arrowDownRight, () => moveCharacter(1, 1, "BottomRight"), "Move down-right")}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, marginBottom: 6 }}></div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(3, ${KEY_BUTTON_SIZE}px)`,
                gap: 4
              }}
            >
              {renderKeyButton(KEY_COORDS.arrowUpLeft, () => toggleFlagAt(charPos.row - 1, charPos.col - 1), "Flag up-left")}
              {renderKeyButton(KEY_COORDS.arrowUp, () => toggleFlagAt(charPos.row - 1, charPos.col), "Flag up")}
              {renderKeyButton(KEY_COORDS.arrowUpRight, () => toggleFlagAt(charPos.row - 1, charPos.col + 1), "Flag up-right")}
              {renderKeyButton(KEY_COORDS.arrowLeft, () => toggleFlagAt(charPos.row, charPos.col - 1), "Flag left")}
              <div style={{ width: KEY_BUTTON_SIZE, height: KEY_BUTTON_SIZE }} />
              {renderKeyButton(KEY_COORDS.arrowRight, () => toggleFlagAt(charPos.row, charPos.col + 1), "Flag right")}
              {renderKeyButton(KEY_COORDS.arrowDownLeft, () => toggleFlagAt(charPos.row + 1, charPos.col - 1), "Flag down-left")}
              {renderKeyButton(KEY_COORDS.arrowDown, () => toggleFlagAt(charPos.row + 1, charPos.col), "Flag down")}
              {renderKeyButton(KEY_COORDS.arrowDownRight, () => toggleFlagAt(charPos.row + 1, charPos.col + 1), "Flag down-right")}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24, maxWidth: 300 }}>
          <div
            onClick={() => setIsAnimationSpeedCollapsed(!isAnimationSpeedCollapsed)}
            style={{
              cursor: "pointer",
              userSelect: "none",
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: isAnimationSpeedCollapsed ? 0 : 12
            }}
          >
            <span style={{ fontSize: 16 }}>
              {isAnimationSpeedCollapsed ? "▶" : "▼"}
            </span>
            <label style={{ margin: 0, fontSize: 12, color: darkMode ? "#FFFFFF" : "#000000", fontWeight: "bold" }}>
              Animation Speed: {animationSpeed}
            </label>
          </div>
          <div
            style={{
              maxHeight: isAnimationSpeedCollapsed ? 0 : "500px",
              overflow: "hidden",
              transition: "max-height 0.3s ease-in-out",
              marginBottom: isAnimationSpeedCollapsed ? 0 : 16
            }}
          >
            <input
              type="range"
              min="1"
              max="60"
              value={animationSpeed}
              onChange={(e) => setAnimationSpeed(parseInt(e.target.value))}
              style={{
                width: "100%",
                cursor: "pointer",
                marginBottom: 8
              }}
            />
            <div style={{ fontSize: 10, color: darkMode ? "#999999" : "#666", marginTop: 4, marginBottom: 8 }}>
              1 = Slow, 60 = Fast (Default: 30)
            </div>
            <button
              onClick={() => setAnimationSpeed(30)}
              style={{
                padding: "4px 12px",
                fontSize: 12,
                cursor: "pointer",
                backgroundColor: darkMode ? "#333333" : "#f0f0f0",
                color: darkMode ? "#FFFFFF" : "#000000",
                border: `1px solid ${darkMode ? "#666666" : "#999"}`,
                borderRadius: 2
              }}
            >
              Reset to Default
            </button>
          </div>

          <div
            onClick={() => setIsSoundVolumeCollapsed(!isSoundVolumeCollapsed)}
            style={{
              cursor: "pointer",
              userSelect: "none",
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 16,
              marginBottom: isSoundVolumeCollapsed ? 0 : 12
            }}
          >
            <span style={{ fontSize: 16 }}>
              {isSoundVolumeCollapsed ? "▶" : "▼"}
            </span>
            <label style={{ margin: 0, fontSize: 12, color: darkMode ? "#FFFFFF" : "#000000", fontWeight: "bold" }}>
              Sound Volume: {soundVolume}%
            </label>
          </div>
          <div
            style={{
              maxHeight: isSoundVolumeCollapsed ? 0 : "500px",
              overflow: "hidden",
              transition: "max-height 0.3s ease-in-out",
              marginBottom: isSoundVolumeCollapsed ? 0 : 16
            }}
          >
            <input
              type="range"
              min="0"
              max="100"
              value={soundVolume}
              onChange={(e) => setSoundVolume(parseInt(e.target.value))}
              style={{
                width: "100%",
                cursor: "pointer",
                marginBottom: 8
              }}
            />
            <div style={{ fontSize: 10, color: darkMode ? "#999999" : "#666", marginTop: 4, marginBottom: 8 }}>
              0 = Mute, 100 = Max (Default: 70)
            </div>
            <button
              onClick={() => setSoundVolume(70)}
              style={{
                padding: "4px 12px",
                fontSize: 12,
                cursor: "pointer",
                backgroundColor: darkMode ? "#333333" : "#f0f0f0",
                color: darkMode ? "#FFFFFF" : "#000000",
                border: `1px solid ${darkMode ? "#666666" : "#999"}`,
                borderRadius: 2
              }}
            >
              Reset to Default
            </button>
          </div>
        </div>
<div style={{ marginTop: 24, maxWidth: 300 }}>
          <div
            onClick={() => setIsKeyButtonScaleCollapsed(!isKeyButtonScaleCollapsed)}
            style={{
              cursor: "pointer",
              userSelect: "none",
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: isKeyButtonScaleCollapsed ? 0 : 12
            }}
          >
            <span style={{ fontSize: 16 }}>
              {isKeyButtonScaleCollapsed ? "▶" : "▼"}
            </span>
            <label style={{ margin: 0, fontSize: 12, color: darkMode ? "#FFFFFF" : "#000000", fontWeight: "bold" }}>
              Control Size: {(keyButtonScale * 100).toFixed(0)}%
            </label>
          </div>
          <div
            style={{
              maxHeight: isKeyButtonScaleCollapsed ? 0 : "500px",
              overflow: "hidden",
              transition: "max-height 0.3s ease-in-out",
              marginBottom: isKeyButtonScaleCollapsed ? 0 : 16
            }}
          >
            <input
              type="range"
              min="0.25"
              max="2"
              step="0.05"
              value={keyButtonScale}
              onChange={(e) => setKeyButtonScale(parseFloat(e.target.value))}
              style={{
                width: "100%",
                cursor: "pointer",
                marginBottom: 8
              }}
            />
            <div style={{ fontSize: 10, color: darkMode ? "#999999" : "#666", marginTop: 4, marginBottom: 8 }}>
              0.25x = Smallest, 2x = Largest (Default: 0.5x)
            </div>
            <button
              onClick={() => setKeyButtonScale(0.5)}
              style={{
                padding: "4px 12px",
                fontSize: 12,
                cursor: "pointer",
                backgroundColor: darkMode ? "#333333" : "#f0f0f0",
                color: darkMode ? "#FFFFFF" : "#000000",
                border: `1px solid ${darkMode ? "#666666" : "#999"}`,
                borderRadius: 2
              }}
            >
              Reset to Default
            </button>
          </div>
        </div>
        <div style={{ marginTop: 24, maxWidth: 400 }}>
          <div
            onClick={() => setIsKeyBindingsCollapsed(!isKeyBindingsCollapsed)}
            style={{
              cursor: "pointer",
              userSelect: "none",
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: isKeyBindingsCollapsed ? 0 : 12
            }}
          >
            <span style={{ fontSize: 16 }}>
              {isKeyBindingsCollapsed ? "▶" : "▼"}
            </span>
            <label style={{ margin: 0, fontSize: 12, fontWeight: "bold", color: darkMode ? "#FFFFFF" : "#000000" }}>
              Key Bindings
            </label>
          </div>
          
          <div
            style={{
              maxHeight: isKeyBindingsCollapsed ? 0 : "2000px",
              overflow: "hidden",
              transition: "max-height 0.3s ease-in-out",
              marginBottom: isKeyBindingsCollapsed ? 0 : 12
            }}
          >
            <div style={{ fontSize: 11, color: darkMode ? "#999999" : "#666", marginBottom: 12, lineHeight: 1.5 }}>
              Click on any key binding below to rebind it to a different key.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
              {/* Movement Keys */}
              <div>
                <div style={{ fontSize: 11, fontWeight: "bold", marginBottom: 8, color: darkMode ? "#FFFFFF" : "#333" }}>Movement (WASD)</div>
                {[
                  { label: "Move Up", key: "up", display: keyBindings.up.toUpperCase() },
                  { label: "Move Left", key: "left", display: keyBindings.left.toUpperCase() },
                  { label: "Move Down", key: "down", display: keyBindings.down.toUpperCase() },
                  { label: "Move Right", key: "right", display: keyBindings.right.toUpperCase() }
                ].map((binding) => (
                  <div key={binding.key} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, marginBottom: 3, color: darkMode ? "#CCCCCC" : "#555" }}>{binding.label}</div>
                  <button
                    onClick={() => setIsRebindingKey(binding.key)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: 11,
                      backgroundColor: isRebindingKey === binding.key ? "#ffeb3b" : (darkMode ? "#333333" : "#f0f0f0"),
                      border: `1px solid ${darkMode ? "#666666" : "#999"}`,
                      borderRadius: 3,
                      cursor: "pointer",
                      fontWeight: "bold",
                      color: isRebindingKey === binding.key ? "#000" : (darkMode ? "#FFFFFF" : "#333")
                    }}
                  >
                    {isRebindingKey === binding.key ? "Press any key..." : binding.display}
                  </button>
                </div>
              ))}
            </div>

            {/* Flag Keys */}
            <div>
              <div style={{ fontSize: 11, fontWeight: "bold", marginBottom: 8, color: darkMode ? "#FFFFFF" : "#333" }}>Flag Keys (Arrows)</div>
              {[
                { label: "Flag Up", key: "flagUp", display: keyBindings.flagUp.toUpperCase() },
                { label: "Flag Left", key: "flagLeft", display: keyBindings.flagLeft.toUpperCase() },
                { label: "Flag Down", key: "flagDown", display: keyBindings.flagDown.toUpperCase() },
                { label: "Flag Right", key: "flagRight", display: keyBindings.flagRight.toUpperCase() }
              ].map((binding) => (
                <div key={binding.key} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, marginBottom: 3, color: darkMode ? "#CCCCCC" : "#555" }}>{binding.label}</div>
                  <button
                    onClick={() => setIsRebindingKey(binding.key)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: 11,
                      backgroundColor: isRebindingKey === binding.key ? "#ffeb3b" : (darkMode ? "#333333" : "#f0f0f0"),
                      border: `1px solid ${darkMode ? "#666666" : "#999"}`,
                      borderRadius: 3,
                      cursor: "pointer",
                      fontWeight: "bold",
                      color: isRebindingKey === binding.key ? "#000" : (darkMode ? "#FFFFFF" : "#333")
                    }}
                  >
                    {isRebindingKey === binding.key ? "Press any key..." : binding.display}
                  </button>
                </div>
              ))}
            </div>
          </div>

            <button
              onClick={() => {
                const defaultBindings = {
                  up: "w",
                  down: "s",
                  left: "a",
                  right: "d",
                  flagUp: "arrowup",
                  flagDown: "arrowdown",
                  flagLeft: "arrowleft",
                  flagRight: "arrowright"
                };
                setKeyBindings(defaultBindings);
                localStorage.setItem("minestickerKeyBindings", JSON.stringify(defaultBindings));
                setIsRebindingKey(null);
              }}
              style={{
                padding: "6px 12px",
                fontSize: 11,
                backgroundColor: darkMode ? "#333333" : "#f0f0f0",
                color: darkMode ? "#FFFFFF" : "#000000",
                border: `1px solid ${darkMode ? "#666666" : "#999"}`,
                borderRadius: 3,
                cursor: "pointer"
              }}
            >
              Reset to Default
            </button>
          </div>
        </div>

        

        <div style={{ marginTop: 24, maxWidth: 700 }}>
          <div style={{ fontSize: 11, color: "#555", marginTop: 12, lineHeight: 1.6 }}>
            <div>
              Any Suggestion, Feedback or Bug Report?
              <a href="https://minesticker-support.straw.page" target="_blank" rel="noopener noreferrer" style={{ color: "#0066cc", textDecoration: "underline" }}>
                &nbsp;Send Anonymously via My MineSticker Straw.Page!
              </a><br />
            </div>
             <div style={{ fontWeight: "bold", marginBottom: 4 }}>Changelogs (GMT+7):</div>
            <div>Version 0.1.0: Website is Deployed (3 P.M, Feb 4, 2026) </div>
            <div>Version 0.2.0: Fixed Page Scroll when using Arrow; Added Diagonal Movement, Custom Keybind, Quick Start/Restart and other Q.O.Ls!; Added Hard Reset! (Feb 5, 2026)</div>
            <div style={{ fontWeight: "bold", marginBottom: 4 }}>  </div>
            <div style={{ fontWeight: "bold", marginBottom: 4 }}>Credit:</div>
            <div>Website and TDL's texture were made by&nbsp;
              <a href="https://x.com/scottandersinn" target="_blank" rel="noopener noreferrer" style={{ color: "#0066cc", textDecoration: "underline" }}>
                ScottAndersinn
              </a></div>
            <div>Explosion Animation and Sound Effect were taken directly from&nbsp;
              <a href="https://www.youtube.com/watch?v=PCtr04cnx5A" target="_blank" rel="noopener noreferrer" style={{ color: "#0066cc", textDecoration: "underline" }}>
                Animator vs Animation 3 - Alan Becker
              </a></div>
            <div>Credit to Black Squirrel for&nbsp;
              <a href="https://www.spriters-resource.com/pc_computer/minesweeper/asset/19849/" target="_blank" rel="noopener noreferrer" style={{ color: "#0066cc", textDecoration: "underline" }}>
                Winmine 31/NT4 and 2000+ Texture!
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
