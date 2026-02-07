import { useEffect, useRef, useState, useMemo } from "react";
import {
  Character,
  Face,
  Matrix,
  Tile,
  SPRITE_SHEET,
  CHAR_SPRITE_SHEET,
  IDLE_SPRITE_SHEET,
  INTRO_SPRITE_SHEET,
  WALK_SPRITE_SHEET,
  CHILLWALK_SPRITE_SHEET,
  PANIC_SPRITE_SHEET,
  DEAD_SPRITE_SHEET,
  PLACEFLAG_SPRITE_SHEET,
  CHEER_SPRITE_SHEET,
  DIAGONAL_SPRITE_SHEET,
  JUMP_SPRITE_SHEET,
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
  PLACEFLAG_COORDS,
  DIAGONAL_COORDS,
  JUMP_COORDS
} from "../../shared";
import PatchNotes from "./patchnotes.tsx";
import Credits from "./credit.tsx";
import {
  createMatrix,
  cloneMatrix,
  generateNoGuessingBoard,
  numberTexture
} from "./minegeneration.tsx";
import {
  resolveFlagDirection,
  resolveMovementDirection,
  KeyBindings
} from "./movement.tsx";
import GameAnimations, { ExplosionState, ScorchState } from "./render.tsx";
import HeaderSection from "./header.tsx";

interface GameState {
  rows: number;
  cols: number;
  character: Character;
  face: Face;
  tiles: string[][];
}

type GameStatus = "playing" | "won" | "lost";

const DEFAULT_KEY_BINDINGS: KeyBindings = {
  up: "w",
  down: "s",
  left: "a",
  right: "d",
  flagUp: "arrowup",
  flagDown: "arrowdown",
  flagLeft: "arrowleft",
  flagRight: "arrowright",
  chord: "space"
};

const normalizeKey = (key: string) => {
  const lower = key.toLowerCase();
  if (lower === " " || lower === "spacebar") return "space";
  return lower;
};

const formatKeyLabel = (key: string) => {
  if (!key) return "UNBOUND";
  if (key === "space") return "SPACE";
  return key.toUpperCase();
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
    const createAudio = (fileName: string) => new Audio(fileName);

    flagPlaceAudio.current = createAudio("placeflag.wav");
    kaboomAudio.current = createAudio("kaboom.wav");
    chillWalkAudio.current = createAudio("chillwalk.wav");
    stepOnBlockAudio.current = createAudio("steponblock.wav");
    whooshAudio.current = createAudio("whoosh.wav");
    
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
  const chordHeldRef = useRef(false);
  const pendingChordRef = useRef(false);
  const pendingChordFromButtonRef = useRef(false);
  const chordFailTimeoutRef = useRef<number | null>(null);
  const lastExplosionAdvanceRef = useRef(0);
  const lastMoveTapRef = useRef<Record<string, number>>({});
  const [animationFrame, setAnimationFrame] = useState(0);
  const [lastDirection, setLastDirection] = useState<"Up" | "Down" | "Left" | "Right">("Down");
  
  // Key bindings
  const [keyBindings, setKeyBindings] = useState<KeyBindings>(() => {
    const stored = localStorage.getItem("minestickerKeyBindings");
    if (!stored) return { ...DEFAULT_KEY_BINDINGS };

    try {
      const parsed = JSON.parse(stored);
      const merged = { ...DEFAULT_KEY_BINDINGS, ...parsed } as KeyBindings;
      (Object.keys(merged) as Array<keyof KeyBindings>).forEach((bindingKey) => {
        const value = merged[bindingKey];
        merged[bindingKey] = typeof value === "string" ? normalizeKey(value) : DEFAULT_KEY_BINDINGS[bindingKey];
      });
      return merged;
    } catch {
      return { ...DEFAULT_KEY_BINDINGS };
    }
  });
  const [isRebindingKey, setIsRebindingKey] = useState<string | null>(null);
  const [diagonalDirection, setDiagonalDirection] = useState<"TopLeft" | "TopRight" | "BottomLeft" | "BottomRight" | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [walkFrameIndex, setWalkFrameIndex] = useState(0);
  const [jumpFrameIndex, setJumpFrameIndex] = useState(0);
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
  const [characterExplosions, setCharacterExplosions] = useState<ExplosionState[]>([]);
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
  const isJumpingRef = useRef(false);
  const pendingJumpChordRef = useRef(false);
  const pendingJumpFromButtonRef = useRef(false);
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
  const [chordButtonActive, setChordButtonActive] = useState(() => {
    const stored = localStorage.getItem("minestickerChordButtonActive");
    return stored ? JSON.parse(stored) : false;
  });
  const [chordButtonMode, setChordButtonMode] = useState<"toggle" | "one-shot">(() => {
    const stored = localStorage.getItem("minestickerChordButtonMode");
    return stored === "one-shot" || stored === "toggle" ? stored : "toggle";
  });
  const [isCustomModeCollapsed, setIsCustomModeCollapsed] = useState(() => {
    const stored = localStorage.getItem("minestickerCustomModeCollapsed");
    return stored ? JSON.parse(stored) : true;
  });
  const [customWidth, setCustomWidth] = useState(16);
  const [customHeight, setCustomHeight] = useState(16);
  const [customMineDensity, setCustomMineDensity] = useState(15);
  const [difficultyType, setDifficultyType] = useState<"easy" | "normal" | "hard" | "custom">("easy");
  const [gameMode, setGameMode] = useState<"classic" | "no-guessing">("classic");
  const INTRO_FRAME_SEQUENCE = [0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const GRID_SIZE = 16; // Tile size in pixels
  const KABOOM_FRAME_SIZE = 270;
  const SCORCH_FRAME_SIZE = 200;
  const CHORD_DOUBLE_TAP_MS = 400;
  const CHORD_FAIL_FLASH_MS = 200;

  // Count flags in the matrix
  const flagCount = localMatrix.data.flat().filter((tile: Tile) => tile.isFlagged).length;
  const remainingMines = mineCount - flagCount;

  // Memoize animation interval calculations
  const animationIntervals = useMemo(() => ({
    base: Math.max(8, 42 * (30 / animationSpeed)),
    intro: 50, // Fixed at 30 FPS (1000ms / 30fps = 33.33ms)
    walk: Math.max(8, 40 * (30 / animationSpeed)),
    jump: Math.max(8, 38 * (30 / animationSpeed)),
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

  useEffect(() => {
    const background = darkMode ? "#0F0F12" : "#ffffff";
    const textColor = darkMode ? "#FFFFFF" : "#000000";
    document.documentElement.style.backgroundColor = background;
    document.body.style.backgroundColor = background;
    document.body.style.color = textColor;
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

  useEffect(() => {
    localStorage.setItem("minestickerChordButtonActive", JSON.stringify(chordButtonActive));
  }, [chordButtonActive]);

  useEffect(() => {
    localStorage.setItem("minestickerChordButtonMode", chordButtonMode);
  }, [chordButtonMode]);

  // Save custom mode collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem("minestickerCustomModeCollapsed", JSON.stringify(isCustomModeCollapsed));
  }, [isCustomModeCollapsed]);

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

  const advanceExplosionFrames = () => {
    lastExplosionAdvanceRef.current = Date.now();
    setActiveExplosions((prev) => {
      const scorchesToAdd: ScorchState[] = [];
      const updated = prev
        .map((exp) => {
          if (exp.frameIndex === 6) {
            scorchIdRef.current += 1;
            scorchesToAdd.push({ row: exp.row, col: exp.col, scale: exp.scale, id: scorchIdRef.current });
          }
          return { ...exp, frameIndex: exp.frameIndex + 1 };
        })
        .filter((exp) => exp.frameIndex < 16);

      if (scorchesToAdd.length > 0) {
        setScorchMarks((scorches) => [...scorches, ...scorchesToAdd]);
      }

      return updated;
    });
  };

  const advanceCharacterExplosionFrames = () => {
    setCharacterExplosions((prev) => {
      if (prev.length === 0) return prev;
      const scorchesToAdd: ScorchState[] = [];
      const updated = prev
        .map((exp) => {
          if (exp.frameIndex === 6) {
            scorchIdRef.current += 1;
            scorchesToAdd.push({ row: exp.row, col: exp.col, scale: exp.scale, id: scorchIdRef.current });
          }
          return { ...exp, frameIndex: exp.frameIndex + 1 };
        })
        .filter((exp) => exp.frameIndex < 16);

      if (scorchesToAdd.length > 0) {
        setScorchMarks((scorches) => [...scorches, ...scorchesToAdd]);
      }

      return updated;
    });
  };

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

    // Determine mine explosion frequency based on mine count
    // < 15 = 1, 15-30 = 1, 30-60 = 2, 60-120 = 2, 120-300 = 3, >= 300 = 4
    let explosionFrequency = 1; // Very small (< 15 mines)
    if (mineCount >= 15 && mineCount < 30) {
      explosionFrequency = 1; // Small (15-30 mines)
    } else if (mineCount >= 30 && mineCount < 60) {
      explosionFrequency = 2; // Small-medium (30-60 mines)
    } else if (mineCount >= 60 && mineCount < 120) {
      explosionFrequency = 2; // Medium (60-120 mines)
    } else if (mineCount >= 120 && mineCount < 240) {
      explosionFrequency = 3; // Large (120-240 mines)
    } else if (mineCount >= 240 && mineCount < 360) {
      explosionFrequency = 4; // Very large (>= 240 mines)
    } else if (mineCount >= 360 && mineCount < 480) {
      explosionFrequency = 5; // Very large (>= 360 mines)
    } else if (mineCount >= 480) {
      explosionFrequency = 7; // Very large (>= 480 mines)
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
      setCharacterExplosions([
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
    if (status !== "lost" && characterExplosions.length > 0) {
      setCharacterExplosions([]);
    }
  }, [status, characterExplosions.length]);

  useEffect(() => {
    if (status !== "lost") return;

    // First 7 frames at 10 FPS (100ms), last 9 frames at 6 FPS (166.67ms)
    const frameInterval = 100; // Use constant interval, check frame in update
    
    // Determine explosion cadence based on mine count
    // < 15 = 5, 15-30 = 4, 30-60 = 3, 60-120 = 2, 120-300 = 2, >= 300 = 1
    let explosionCadence = 5; // Very small (< 15 mines)
    if (mineCount >= 15 && mineCount < 30) {
      explosionCadence = 4; // Small (15-30 mines)
    } else if (mineCount >= 30 && mineCount < 60) {
      explosionCadence = 3; // Small-medium (30-60 mines)
    } else if (mineCount >= 60 && mineCount < 120) {
      explosionCadence = 2; // Medium (60-120 mines)
    } else if (mineCount >= 120 && mineCount < 240) {
      explosionCadence = 2; // Large (120-240 mines)
    } else if (mineCount >= 240) {
      explosionCadence = 1; // Very large (>= 240 mines)
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

      advanceExplosionFrames();
    }, frameInterval);

    return () => clearInterval(kaboomIntervalId);
  }, [status, gridSize, mineCount]);

  useEffect(() => {
    if (status !== "lost") return;

    const characterIntervalId = setInterval(() => {
      advanceCharacterExplosionFrames();
    }, 100);

    return () => clearInterval(characterIntervalId);
  }, [status]);

  useEffect(() => {
    if (status !== "lost") return;

    const watchdogId = setInterval(() => {
      if (activeExplosions.length === 0) return;
      const lastAdvance = lastExplosionAdvanceRef.current;
      if (lastAdvance === 0 || Date.now() - lastAdvance > 220) {
        advanceExplosionFrames();
      }
    }, 220);

    return () => clearInterval(watchdogId);
  }, [status, activeExplosions.length]);

  // Clear explosions when all are complete and queue is empty
  useEffect(() => {
    if (status !== "lost") return;
    if (activeExplosions.length === 0 && explosionQueueRef.current.length === 0) {
      // All explosions have finished naturally
      setActiveExplosions([]);
    }
  }, [status, activeExplosions.length]);

  // Trigger cheer animation when game is won and no animations are playing
  useEffect(() => {
    if (status !== "won") return;
    if (isMoving || isJumping || placingFlagDirection !== null) return;
    
    setIsCheer(true);
    
    // Play whoosh sound
    if (whooshAudio.current) {
      whooshAudio.current.currentTime = 0;
      whooshAudio.current.play().catch(() => {});
    }
  }, [status, isMoving, isJumping, placingFlagDirection]);

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
            const chordIntent = pendingChordRef.current || chordHeldRef.current || pendingChordFromButtonRef.current || chordButtonActive;
            revealAt(pendingCharPos.row, pendingCharPos.col, { chord: chordIntent });
          }
        }

        const totalFrames = isChillWalk && diagonalDirection === null ? 6 : 11;
        // Complete animation at final frame
        if (nextFrame >= totalFrames) {
          if (pendingCharPos && isChillWalk) {
            const chordIntent = pendingChordRef.current || chordHeldRef.current || pendingChordFromButtonRef.current || chordButtonActive;
            if (chordIntent) {
              chordRevealAt(pendingCharPos.row, pendingCharPos.col, pendingChordFromButtonRef.current);
            }
          }

          // Update character position after animation completes
          if (pendingCharPos) {
            setCharPos(pendingCharPos);
            setPendingCharPos(null);
          }
          pendingChordRef.current = false;
          pendingChordFromButtonRef.current = false;
          isMovingRef.current = false;
          setIsMoving(false);
          return 0;
        }
        return nextFrame;
      });
    }, animationIntervals.walk);
    
    return () => clearInterval(walkIntervalId);
  }, [isMoving, pendingCharPos, animationIntervals.walk, isChillWalk, diagonalDirection]);

  // Jump animation effect
  useEffect(() => {
    if (!isJumping) return;

    const jumpIntervalId = setInterval(() => {
      setJumpFrameIndex((prev) => {
        const nextFrame = prev + 1;
        if (nextFrame === 6) {
          if (chillWalkAudio.current) {
            chillWalkAudio.current.currentTime = 0;
            chillWalkAudio.current.play().catch(() => {});
          }
        }
        if (nextFrame >= 10) {
          const chordIntent = pendingJumpChordRef.current || chordHeldRef.current || pendingJumpFromButtonRef.current || chordButtonActive;
          if (chordIntent) {
            chordRevealAt(charPos.row, charPos.col, pendingJumpFromButtonRef.current);
          }
          pendingJumpChordRef.current = false;
          pendingJumpFromButtonRef.current = false;
          isJumpingRef.current = false;
          setIsJumping(false);
          return 0;
        }
        return nextFrame;
      });
    }, animationIntervals.jump);

    return () => clearInterval(jumpIntervalId);
  }, [isJumping, animationIntervals.jump, charPos]);

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
    if (isMoving || isJumping) return;

    setIsPanic(true);
    setPanicFrameIndex(0);
    setPendingLoss(false);
  }, [pendingLoss, isMoving, isJumping]);

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
      const key = normalizeKey(e.key);
      
      // Always prevent default for arrow keys to stop page scrolling
      if (key.startsWith("arrow")) {
        e.preventDefault();
      }
      
      // Allow restart with Enter key anytime during the game
      if (key === "enter") {
        if (gameStarted) {
          // Restart current game
          setDifficulty(gridSize.rows, gridSize.cols, mineCount, difficultyType);
        } else if (status === "playing") {
          // Randomly pick a starter tile if game hasn't started
          const randomRow = Math.floor(Math.random() * gridSize.rows);
          const randomCol = Math.floor(Math.random() * gridSize.cols);
          
          // In no-guessing mode, regenerate board with this random position as start
          if (gameMode === "no-guessing") {
            const newMatrix = generateNoGuessingBoard(gridSize.rows, gridSize.cols, mineCount, randomRow, randomCol);
            setLocalMatrix(newMatrix);
          }
          
          toggleFlag(randomRow, randomCol);
        }
        return;
      }
      
      if (isRebindingKey) return; // Disable game controls while rebinding
      if (!gameStarted) return; // Block input before game starts
      if (status !== "playing") return;

      if (key === keyBindings.chord) {
        e.preventDefault();
        chordHeldRef.current = true;
        if (isMovingRef.current) {
          pendingChordRef.current = true;
          pendingChordFromButtonRef.current = false;
        }
        return;
      }

      if (isMoving || placingFlagDirection !== null || isIntro) return; // Block input during animations
      if (isJumping) return;

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

        if (next.has(keyBindings.up) && next.has(keyBindings.down)) {
          pressedMovementKeysRef.current = new Set();
          setPressedMovementKeys(new Set());
          jumpInPlace({
            chord: chordHeldRef.current || chordButtonActive,
            chordFromButton: chordButtonActive
          });
          return;
        }

        if (next.has(keyBindings.left) && next.has(keyBindings.right)) {
          pressedMovementKeysRef.current = new Set();
          setPressedMovementKeys(new Set());
          jumpInPlace({
            chord: chordHeldRef.current || chordButtonActive,
            chordFromButton: chordButtonActive
          });
          return;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isRebindingKey) return; // Disable game controls while rebinding
      if (!gameStarted) return; // Block input before game starts
      if (isIntro) return;
      const key = normalizeKey(e.key);

      if (key === keyBindings.chord) {
        chordHeldRef.current = false;
        return;
      }
      
      // Handle flag key release
      const isFlagKey = [keyBindings.flagUp, keyBindings.flagDown, keyBindings.flagLeft, keyBindings.flagRight].includes(key);
      if (isFlagKey) {
        setPressedArrows((prev) => {
          const current = new Set(prev);
          const direction = resolveFlagDirection(current, keyBindings);
          if (direction.isDiagonal && (direction.dr !== 0 || direction.dc !== 0)) {
            toggleFlagAt(charPos.row + direction.dr, charPos.col + direction.dc);
            return new Set();
          }

          if (direction.isSingle && (direction.dr !== 0 || direction.dc !== 0)) {
            toggleFlagAt(charPos.row + direction.dr, charPos.col + direction.dc);
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
        const direction = resolveMovementDirection(current, keyBindings);

        if (direction.isDiagonal && (direction.dr !== 0 || direction.dc !== 0)) {
          moveCharacter(direction.dr, direction.dc, direction.diagonal, {
            chord: chordHeldRef.current || chordButtonActive,
            chordFromButton: chordButtonActive
          });
          pressedMovementKeysRef.current = new Set();
          setPressedMovementKeys(new Set());
          return;
        }

        if (direction.isSingle && (direction.dr !== 0 || direction.dc !== 0)) {
          moveCharacter(direction.dr, direction.dc, null, {
            chord: chordHeldRef.current || chordButtonActive,
            chordFromButton: chordButtonActive
          });
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
  }, [gridSize, status, localMatrix, charPos, remainingMines, gameStarted, isMoving, isJumping, placingFlagDirection, isIntro, keyBindings, isRebindingKey, mineCount]);

  // Handle key rebinding
  useEffect(() => {
    if (!isRebindingKey) return;

    const handleRebindKey = (e: KeyboardEvent) => {
      e.preventDefault();
      const newKey = normalizeKey(e.key);
      
      // Ignore modifier keys
      if (["control", "alt", "shift", "meta"].includes(newKey)) return;
      
      // Update the key binding and remove any duplicate keys
      setKeyBindings((prev: KeyBindings) => {
        const updated: KeyBindings = { ...prev };
        const bindingToSet = isRebindingKey as keyof KeyBindings;
        
        // First, find and clear any existing binding with this key
        (Object.keys(updated) as Array<keyof KeyBindings>).forEach((bindingKey) => {
          if (updated[bindingKey] === newKey && bindingKey !== bindingToSet) {
            updated[bindingKey] = "";
          }
        });
        
        // Then set the new binding
        updated[bindingToSet] = newKey;
        
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
    setIsJumping(false);
    isJumpingRef.current = false;
    skipNextAutoSaveRef.current = false;
    setWalkFrameIndex(0);
    setJumpFrameIndex(0);
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
    setCharacterExplosions([]);
    setScorchMarks([]);
    explosionQueueRef.current = [];
    pressedMovementKeysRef.current = new Set();
    explosionsPlayedRef.current = false;
    explosionTickRef.current = 0;
    scorchIdRef.current = 0;
    lastVerticalDirectionRef.current = null;
    setShouldMirrorWalk(false);
    lastWasVerticalMirroredRef.current = false;
    chordHeldRef.current = false;
    pendingChordRef.current = false;
    pendingChordFromButtonRef.current = false;
    pendingJumpChordRef.current = false;
    pendingJumpFromButtonRef.current = false;
    if (chordFailTimeoutRef.current !== null) {
      clearTimeout(chordFailTimeoutRef.current);
      chordFailTimeoutRef.current = null;
    }
  };

  const setDifficulty = (rows: number, cols: number, mines: number, type: "easy" | "normal" | "hard" | "custom" = "easy") => {
    clearAllAnimations();
    setGridSize({ rows, cols });
    setMineCount(mines);
    
    // Use appropriate mine generation based on game mode
    let matrix: Matrix<Tile>;
    if (gameMode === "no-guessing") {
      matrix = generateNoGuessingBoard(rows, cols, mines, 0, 0);
    } else {
      matrix = createMatrix(rows, cols, mines);
    }
    
    setLocalMatrix(matrix);
    setCharPos({ row: 0, col: 0 });
    setStatus("playing");
    setFirstMove(true);
    setGameStarted(false);
    setTimer(0);
    setDifficultyType(type);
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
    localStorage.removeItem("minestickerCustomModeCollapsed");
    localStorage.removeItem("minestickerChordButtonActive");
    localStorage.removeItem("minestickerChordButtonMode");
    
    // Reset all state to defaults
    setKeyBindings({ ...DEFAULT_KEY_BINDINGS });
    setAnimationSpeed(30);
    setSoundVolume(70);
    setDarkMode(false);
    setIsInstructionsCollapsed(false);
    setIsAnimationSpeedCollapsed(true);
    setIsSoundVolumeCollapsed(true);
    setIsKeyBindingsCollapsed(true);
    setIsKeyButtonScaleCollapsed(true);
    setIsCustomModeCollapsed(true);
    setKeyButtonScale(0.5);
    setChordButtonActive(false);
    setChordButtonMode("toggle");
    setCustomWidth(16);
    setCustomHeight(16);
    setCustomMineDensity(15);
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

  const getJumpFrame = useMemo(() => {
    const frameIndex = jumpFrameIndex % 10;
    return JUMP_COORDS[`jump${frameIndex}`];
  }, [jumpFrameIndex]);

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
    if (isJumping) {
      return {
        spriteSheet: JUMP_SPRITE_SHEET,
        coords: getJumpFrame
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
  }, [isIntro, isJumping, isDead, isPanic, placingFlagDirection, diagonalDirection, isMoving, isChillWalk, getIntroFrame, getJumpFrame, getPanicFrame, getPlaceFlagFrame, getDiagonalWalkFrame, getChillWalkFrame, getWalkFrame, getIdleFrame]);

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

  const moveCharacter = (
    dr: number,
    dc: number,
    diagonal: "TopLeft" | "TopRight" | "BottomLeft" | "BottomRight" | null = null,
    options?: { chord?: boolean; chordFromButton?: boolean }
  ) => {
    if (status !== "playing" || isIntro) return;
    if (isMovingRef.current || isJumpingRef.current) return;
    
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
    pendingChordRef.current = options?.chord ?? chordHeldRef.current;
    pendingChordFromButtonRef.current = options?.chordFromButton ?? false;
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

  const jumpInPlace = (options?: { chord?: boolean; chordFromButton?: boolean }) => {
    if (status !== "playing" || isIntro) return;
    if (isMovingRef.current || isJumpingRef.current) return;

    setJumpFrameIndex(0);
    isJumpingRef.current = true;
    setIsJumping(true);
    pendingJumpChordRef.current = options?.chord ?? chordHeldRef.current;
    pendingJumpFromButtonRef.current = options?.chordFromButton ?? false;
  };

  const KEY_BUTTON_SCALE = keyButtonScale;
  const KEY_BUTTON_BASE = 50;
  const KEY_BUTTON_SIZE = Math.round(KEY_BUTTON_BASE * KEY_BUTTON_SCALE);
  const KEY_SPRITE_SHEET_WIDTH = 400;
  const KEY_SPRITE_SHEET_HEIGHT = 100;

  const handleMoveButton = (
    keyId: string,
    dr: number,
    dc: number,
    diagonal: "TopLeft" | "TopRight" | "BottomLeft" | "BottomRight" | null = null
  ) => {
    const now = Date.now();
    const lastTap = lastMoveTapRef.current[keyId] ?? 0;
    const isDoubleTap = now - lastTap <= CHORD_DOUBLE_TAP_MS;
    lastMoveTapRef.current[keyId] = now;

    if (isMovingRef.current) {
      if (chordButtonActive) {
        pendingChordRef.current = true;
        pendingChordFromButtonRef.current = true;
      } else if (isDoubleTap) {
        pendingChordRef.current = true;
        pendingChordFromButtonRef.current = false;
      }
      return;
    }

    const chordFromButton = chordButtonActive;
    const chordForMove = chordFromButton || isDoubleTap || chordHeldRef.current;

    moveCharacter(dr, dc, diagonal, { chord: chordForMove, chordFromButton });
  };

  const handleJumpButton = () => {
    const chordFromButton = chordButtonActive;
    const chordForJump = chordFromButton || chordHeldRef.current;
    jumpInPlace({ chord: chordForJump, chordFromButton });
  };

  const toggleChordButton = () => {
    setChordButtonActive((prev: boolean) => !prev);
  };

  const renderKeyButton = (
    coords: { x1: number; y1: number; x2: number; y2: number },
    onClick: () => void,
    ariaLabel: string,
    options?: { allowDuringMove?: boolean }
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
          if (!gameStarted || placingFlagDirection !== null) return;
          if ((isMoving || isJumping) && !options?.allowDuringMove) return;
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

    setLocalMatrix((prev: Matrix<Tile>) => {
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
      setLocalMatrix((prev: Matrix<Tile>) => {
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

    setLocalMatrix((prev: Matrix<Tile>) => {
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

  const revealAt = (row: number, col: number, options?: { chord?: boolean }) => {
    if (status !== "playing") return;
    if (firstMove) setFirstMove(false);

    const shouldChord = options?.chord ?? false;
    const handleChordSuccess = (didChord: boolean) => {
      if (!didChord || !(pendingChordFromButtonRef.current || chordButtonActive)) return;
      if (chordButtonMode !== "one-shot") return;
      setChordButtonActive(false);
      localStorage.setItem("minestickerChordButtonActive", JSON.stringify(false));
    };

    setLocalMatrix((prev: Matrix<Tile>) => {
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

      if (shouldChord) {
        const chordResult = applyChordReveal(next, row, col);
        handleChordSuccess(chordResult.didChord);
        if (chordResult.didChord && chordResult.revealedCount > 0 && !chordResult.steppedMine) {
          if (stepOnBlockAudio.current) {
            stepOnBlockAudio.current.currentTime = 0;
            stepOnBlockAudio.current.play().catch(() => {});
          }
        }
        if (!chordResult.didChord) {
          const flashedPositions = applyChordFailIndicator(next, row, col);
          scheduleChordFailReset(flashedPositions);
        }
        if (chordResult.steppedMine) {
          setStatus("lost");
          setPendingLoss(true);
          setSteppedMine(chordResult.steppedMine);
          return next;
        }
      }

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

  const countAdjacentFlags = (matrix: Matrix<Tile>, row: number, col: number) =>
    matrix
      .neighbors(row, col)
      .reduce((acc, [r, c]) => (matrix.get(r, c)?.isFlagged ? acc + 1 : acc), 0);

  const applyChordReveal = (matrix: Matrix<Tile>, row: number, col: number) => {
    const center = matrix.get(row, col);
    if (!center || !center.isOpen || center.isMine) return { didChord: false, revealedCount: 0 };

    const adjacentMines = countAdjacentMines(matrix, row, col);
    const adjacentFlags = countAdjacentFlags(matrix, row, col);
    if (adjacentMines !== adjacentFlags) return { didChord: false, revealedCount: 0 };

    let stepped: { row: number; col: number } | null = null;
    for (const [nr, nc] of matrix.neighbors(row, col)) {
      const neighbor = matrix.get(nr, nc);
      if (!neighbor || neighbor.isOpen || neighbor.isFlagged) continue;
      if (neighbor.isMine) {
        stepped = { row: nr, col: nc };
        break;
      }
    }

    if (stepped) {
      revealAllMines(matrix, stepped.row, stepped.col);
      return { didChord: true, steppedMine: stepped, revealedCount: 0 };
    }

    let revealedCount = 0;
    matrix.neighbors(row, col).forEach(([nr, nc]) => {
      const neighbor = matrix.get(nr, nc);
      if (!neighbor || neighbor.isOpen || neighbor.isFlagged || neighbor.isMine) return;
      floodReveal(matrix, nr, nc);
      revealedCount += 1;
    });

    return { didChord: true, revealedCount };
  };

  const applyChordFailIndicator = (matrix: Matrix<Tile>, row: number, col: number) => {
    const flashed: Array<[number, number]> = [];
    for (let r = row - 1; r <= row + 1; r += 1) {
      for (let c = col - 1; c <= col + 1; c += 1) {
        if (!matrix.inBounds(r, c)) continue;
        const tile = matrix.get(r, c);
        if (!tile || tile.isOpen || tile.isFlagged) continue;
        tile.setTexture("tile9");
        flashed.push([r, c]);
      }
    }
    if (flashed.length > 0 && stepOnBlockAudio.current) {
      stepOnBlockAudio.current.currentTime = 0;
      stepOnBlockAudio.current.play().catch(() => {});
    }
    return flashed;
  };

  const scheduleChordFailReset = (positions: Array<[number, number]>) => {
    if (positions.length === 0) return;
    if (chordFailTimeoutRef.current !== null) {
      clearTimeout(chordFailTimeoutRef.current);
    }

    chordFailTimeoutRef.current = window.setTimeout(() => {
      setLocalMatrix((prev: Matrix<Tile>) => {
        const next = cloneMatrix(prev);
        let changed = false;
        positions.forEach(([r, c]) => {
          const tile = next.get(r, c);
          if (!tile || tile.isOpen || tile.isFlagged) return;
          if (tile.texture !== "tile9") return;
          tile.setTexture("tile0");
          changed = true;
        });
        return changed ? next : prev;
      });
      chordFailTimeoutRef.current = null;
    }, CHORD_FAIL_FLASH_MS);
  };

  const chordRevealAt = (row: number, col: number, chordFromButton = false) => {
    if (status !== "playing") return;

    setLocalMatrix((prev: Matrix<Tile>) => {
      const center = prev.get(row, col);
      if (!center || center.isMine) return prev;
      if (!center.isOpen) {
        const next = cloneMatrix(prev);
        const flashedPositions = applyChordFailIndicator(next, row, col);
        scheduleChordFailReset(flashedPositions);
        return flashedPositions.length > 0 ? next : prev;
      }

      const adjacentMines = countAdjacentMines(prev, row, col);
      const adjacentFlags = countAdjacentFlags(prev, row, col);
      if (adjacentMines !== adjacentFlags) {
        const next = cloneMatrix(prev);
        const flashedPositions = applyChordFailIndicator(next, row, col);
        scheduleChordFailReset(flashedPositions);
        return flashedPositions.length > 0 ? next : prev;
      }

      const next = cloneMatrix(prev);
      const chordResult = applyChordReveal(next, row, col);
      if (chordResult.didChord && chordResult.revealedCount > 0 && !chordResult.steppedMine) {
        if (stepOnBlockAudio.current) {
          stepOnBlockAudio.current.currentTime = 0;
          stepOnBlockAudio.current.play().catch(() => {});
        }
      }
      if (chordResult.didChord && chordButtonMode === "one-shot" && (chordFromButton || chordButtonActive)) {
        setChordButtonActive(false);
        localStorage.setItem("minestickerChordButtonActive", JSON.stringify(false));
      }
      if (chordResult.steppedMine) {
        setStatus("lost");
        setPendingLoss(true);
        setSteppedMine(chordResult.steppedMine);
        return next;
      }

      if (checkWin(next, mineCount)) {
        setStatus("won");
      }

      return next;
    });
  };

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
      backgroundColor: darkMode ? "#0F0F12" : "#ffffff",
      color: darkMode ? "#FFFFFF" : "#000000",
      minHeight: "100vh",
      minWidth: "fit-content",
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
        <HeaderSection
          isInstructionsCollapsed={isInstructionsCollapsed}
          darkMode={darkMode}
          onToggleInstructions={() => setIsInstructionsCollapsed(!isInstructionsCollapsed)}
          onHardReset={hardReset}
        />
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button 
            type="button" 
            onClick={() => {
              setGameMode("classic");
              setDifficulty(gridSize.rows, gridSize.cols, mineCount, difficultyType);
            }}
            style={{
              backgroundColor: gameMode === "classic" ? "#4CAF50" : "#888888",
              color: "white",
              border: "none",
              padding: "6px 12px",
              cursor: "pointer",
              borderRadius: "4px",
              fontWeight: "bold"
            }}
          >
            Classic
          </button>
          <button 
            type="button" 
            onClick={() => {
              setGameMode("no-guessing");
              setDifficulty(gridSize.rows, gridSize.cols, mineCount, difficultyType);
            }}
            style={{
              backgroundColor: gameMode === "no-guessing" ? "#2196F3" : "#888888",
              color: "white",
              border: "none",
              padding: "6px 12px",
              cursor: "pointer",
              borderRadius: "4px",
              fontWeight: "bold"
            }}
          >
            No Guessing
          </button>
         {/* Change the wrapper div to this: */}
<div style={{ flexBasis: "100%", width: "100%" }}>
  {gameMode === "no-guessing" && (
    <div style={{ 
      fontSize: 13, 
      color: darkMode ? "#CCCCCC" : "#666", 
      fontStyle: "italic", 
      marginLeft: 8, 
      marginTop: 8 // Increased margin for better spacing
    }}>
      No Guessing mode is very experimental right now! It's more like a 'Safe Start' mode! 
      <br />
      Please contact me if you encounter any 50/50s in this mode, it'll help me improve the mine randomization!
    </div>
  )}
</div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" onClick={() => setDifficulty(9, 9, 10, "easy")}>
            Easy 9x9
          </button>
          <button type="button" onClick={() => setDifficulty(16, 16, 40, "normal")}>
            Normal 16x16
          </button>
          <button type="button" onClick={() => setDifficulty(16, 30, 99, "hard")}>
            Hard 30x16
          </button>
          <button type="button" onClick={() => {
            const width = Math.max(7, Math.min(50, customWidth));
            const height = Math.max(7, Math.min(50, customHeight));
            const density = Math.max(10, Math.min(25, customMineDensity));
            const mines = Math.floor((width * height * density) / 100);
            setDifficultyType("custom");
            setIsCustomModeCollapsed(false);
            setDifficulty(height, width, mines, "custom");
          }}>
            Custom {customWidth}x{customHeight}
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
        
        {difficultyType === "custom" && (
          <div style={{ marginTop: 12, marginBottom: 12, maxWidth: 300 }}>
            <div
              onClick={() => setIsCustomModeCollapsed(!isCustomModeCollapsed)}
              style={{
                cursor: "pointer",
                userSelect: "none",
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: isCustomModeCollapsed ? 0 : 12
              }}
            >
              <span style={{ fontSize: 16 }}>
                {isCustomModeCollapsed ? "▶" : "▼"}
              </span>
              <label style={{ margin: 0, fontSize: 12, color: darkMode ? "#FFFFFF" : "#000000", fontWeight: "bold" }}>
                Custom Difficulty Settings
              </label>
            </div>
            <div
              style={{
                maxHeight: isCustomModeCollapsed ? 0 : "500px",
                overflow: "hidden",
                transition: "max-height 0.3s ease-in-out",
                marginBottom: isCustomModeCollapsed ? 0 : 16
              }}
            >
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: darkMode ? "#CCCCCC" : "#555", display: "block", marginBottom: 4 }}>
                  Width (7-50): {customWidth}
                </label>
                <input
                  type="number"
                  min="7"
                  max="50"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(Math.max(7, Math.min(50, parseInt(e.target.value) || 7)))}
                  style={{
                    width: "100%",
                    padding: "6px",
                    fontSize: 12,
                    backgroundColor: darkMode ? "#333333" : "#ffffff",
                    color: darkMode ? "#FFFFFF" : "#000000",
                    border: `1px solid ${darkMode ? "#666666" : "#999"}`,
                    borderRadius: 2
                  }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: darkMode ? "#CCCCCC" : "#555", display: "block", marginBottom: 4 }}>
                  Height (7-50): {customHeight}
                </label>
                <input
                  type="number"
                  min="7"
                  max="50"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(Math.max(7, Math.min(50, parseInt(e.target.value) || 7)))}
                  style={{
                    width: "100%",
                    padding: "6px",
                    fontSize: 12,
                    backgroundColor: darkMode ? "#333333" : "#ffffff",
                    color: darkMode ? "#FFFFFF" : "#000000",
                    border: `1px solid ${darkMode ? "#666666" : "#999"}`,
                    borderRadius: 2
                  }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: darkMode ? "#CCCCCC" : "#555", display: "block", marginBottom: 4 }}>
                  Mine Density (10-25%): {customMineDensity}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="25"
                  value={customMineDensity}
                  onChange={(e) => setCustomMineDensity(parseInt(e.target.value))}
                  style={{
                    width: "100%",
                    cursor: "pointer",
                    marginBottom: 4
                  }}
                />
                <div style={{ fontSize: 10, color: darkMode ? "#999999" : "#666" }}>
                  Mines: {Math.floor((customWidth * customHeight * customMineDensity) / 100)} / {customWidth * customHeight} tiles
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => {
                    const width = Math.max(7, Math.min(50, customWidth));
                    const height = Math.max(7, Math.min(50, customHeight));
                    const density = Math.max(10, Math.min(25, customMineDensity));
                    const mines = Math.floor((width * height * density) / 100);
                    setDifficulty(height, width, mines, "custom");
                  }}
                  style={{
                    padding: "4px 12px",
                    fontSize: 12,
                    cursor: "pointer",
                    backgroundColor: "#4CAF50",
                    color: "#FFFFFF",
                    border: "1px solid #45a049",
                    borderRadius: 2,
                    fontWeight: "bold",
                    flex: 1
                  }}
                >
                  Set Custom
                </button>
                <button
                  onClick={() => {
                    setCustomWidth(16);
                    setCustomHeight(16);
                    setCustomMineDensity(15);
                  }}
                  style={{
                    padding: "4px 12px",
                    fontSize: 12,
                    cursor: "pointer",
                    backgroundColor: darkMode ? "#333333" : "#f0f0f0",
                    color: darkMode ? "#FFFFFF" : "#000000",
                    border: `1px solid ${darkMode ? "#666666" : "#999"}`,
                    borderRadius: 2,
                    flex: 1
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div style={{ width: "fit-content" }}>
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
                    setDifficulty(gridSize.rows, gridSize.cols, mineCount, difficultyType);
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
                      // In no-guessing mode, regenerate board with this position as start
                      if (gameMode === "no-guessing") {
                        const newMatrix = generateNoGuessingBoard(gridSize.rows, gridSize.cols, mineCount, row, col);
                        setLocalMatrix(newMatrix);
                      }
                      
                      // First, clear mines from the starter area
                      setLocalMatrix((prev: Matrix<Tile>) => {
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
            <GameAnimations
              gridSize={gridSize}
              charPos={charPos}
              activeExplosions={[...activeExplosions, ...characterExplosions]}
              scorchMarks={scorchMarks}
              isIntro={isIntro}
              introFrameIndex={introFrameIndex}
              introTargetPos={introTargetPos}
              introFrameCoords={getIntroFrame}
              gameStarted={gameStarted}
              isCheer={isCheer}
              cheerFrameIndex={cheerFrameIndex}
              currentCharacterSprite={getCurrentCharacterSprite}
              isMoving={isMoving}
              shouldMirrorWalk={shouldMirrorWalk}
              gridSizePx={GRID_SIZE}
              kaboomFrameSize={KABOOM_FRAME_SIZE}
              scorchFrameSize={SCORCH_FRAME_SIZE}
            />
            
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
        <div style={{ marginTop: 16, display: "flex", gap: 24, flexWrap: "wrap", width: "100%" }}>
          <div>
            <div style={{ fontSize: 12, marginBottom: 6 }}></div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(3, ${KEY_BUTTON_SIZE}px)`,
                gap: 4
              }}
            >
              {renderKeyButton(KEY_COORDS.arrowUpLeft, () => handleMoveButton("moveUpLeft", -1, -1, "TopLeft"), "Move up-left", { allowDuringMove: true })}
              {renderKeyButton(KEY_COORDS.keyW, () => handleMoveButton("moveUp", -1, 0), "Move up", { allowDuringMove: true })}
              {renderKeyButton(KEY_COORDS.arrowUpRight, () => handleMoveButton("moveUpRight", -1, 1, "TopRight"), "Move up-right", { allowDuringMove: true })}
              {renderKeyButton(KEY_COORDS.keyA, () => handleMoveButton("moveLeft", 0, -1), "Move left", { allowDuringMove: true })}
              {renderKeyButton(
                KEY_COORDS.jump,
                () => {
                  if (!gameStarted || placingFlagDirection !== null || isIntro) return;
                  if (isMoving || isJumping) return;
                  handleJumpButton();
                },
                "Jump in place"
              )}
              {renderKeyButton(KEY_COORDS.keyD, () => handleMoveButton("moveRight", 0, 1), "Move right", { allowDuringMove: true })}
              {renderKeyButton(KEY_COORDS.arrowDownLeft, () => handleMoveButton("moveDownLeft", 1, -1, "BottomLeft"), "Move down-left", { allowDuringMove: true })}
              {renderKeyButton(KEY_COORDS.keyS, () => handleMoveButton("moveDown", 1, 0), "Move down", { allowDuringMove: true })}
              {renderKeyButton(KEY_COORDS.arrowDownRight, () => handleMoveButton("moveDownRight", 1, 1, "BottomRight"), "Move down-right", { allowDuringMove: true })}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            {renderKeyButton(
              chordButtonActive ? KEY_COORDS.chordOn : KEY_COORDS.chordOff,
              toggleChordButton,
              chordButtonActive ? "Chording on" : "Chording off"
            )}
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
                  { label: "Move Up", key: "up", display: formatKeyLabel(keyBindings.up) },
                  { label: "Move Left", key: "left", display: formatKeyLabel(keyBindings.left) },
                  { label: "Move Down", key: "down", display: formatKeyLabel(keyBindings.down) },
                  { label: "Move Right", key: "right", display: formatKeyLabel(keyBindings.right) }
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
                { label: "Flag Up", key: "flagUp", display: formatKeyLabel(keyBindings.flagUp) },
                { label: "Flag Left", key: "flagLeft", display: formatKeyLabel(keyBindings.flagLeft) },
                { label: "Flag Down", key: "flagDown", display: formatKeyLabel(keyBindings.flagDown) },
                { label: "Flag Right", key: "flagRight", display: formatKeyLabel(keyBindings.flagRight) }
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

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: "bold", marginBottom: 8, color: darkMode ? "#FFFFFF" : "#333" }}>Chording</div>
              {[{ label: "Chord Reveal", key: "chord", display: formatKeyLabel(keyBindings.chord) }].map((binding) => (
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

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: "bold", marginBottom: 8, color: darkMode ? "#FFFFFF" : "#333" }}>Chord Button Mode</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setChordButtonMode("toggle")}
                  style={{
                    padding: "6px 10px",
                    fontSize: 11,
                    cursor: "pointer",
                    backgroundColor: chordButtonMode === "toggle" ? "#4CAF50" : (darkMode ? "#333333" : "#f0f0f0"),
                    color: chordButtonMode === "toggle" ? "#FFFFFF" : (darkMode ? "#FFFFFF" : "#000000"),
                    border: `1px solid ${darkMode ? "#666666" : "#999"}`,
                    borderRadius: 3,
                    fontWeight: "bold",
                    flex: 1
                  }}
                >
                  Toggle
                </button>
                <button
                  onClick={() => setChordButtonMode("one-shot")}
                  style={{
                    padding: "6px 10px",
                    fontSize: 11,
                    cursor: "pointer",
                    backgroundColor: chordButtonMode === "one-shot" ? "#4CAF50" : (darkMode ? "#333333" : "#f0f0f0"),
                    color: chordButtonMode === "one-shot" ? "#FFFFFF" : (darkMode ? "#FFFFFF" : "#000000"),
                    border: `1px solid ${darkMode ? "#666666" : "#999"}`,
                    borderRadius: 3,
                    fontWeight: "bold",
                    flex: 1
                  }}
                >
                  One-shot
                </button>
              </div>
              <div style={{ fontSize: 10, color: darkMode ? "#999999" : "#666", marginTop: 6 }}>
                Toggle stays on. One-shot turns off after a successful chord.
              </div>
            </div>
          </div>

            <button
              onClick={() => {
                const defaultBindings = { ...DEFAULT_KEY_BINDINGS };
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
            <PatchNotes />
            <Credits />
          </div>
        </div>
      </section>
    </div>
  );
}
