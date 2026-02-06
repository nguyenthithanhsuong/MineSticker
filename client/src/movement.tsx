export type CardinalDirection = "Up" | "Down" | "Left" | "Right";
export type DiagonalDirection = "TopLeft" | "TopRight" | "BottomLeft" | "BottomRight";

export interface KeyBindings {
  up: string;
  down: string;
  left: string;
  right: string;
  flagUp: string;
  flagDown: string;
  flagLeft: string;
  flagRight: string;
  chord: string;
}

export interface DirectionResult {
  dr: number;
  dc: number;
  diagonal: DiagonalDirection | null;
  isDiagonal: boolean;
  isSingle: boolean;
}

const resolveDirection = (
  keys: Set<string>,
  upKey: string,
  downKey: string,
  leftKey: string,
  rightKey: string
): DirectionResult => {
  const up = keys.has(upKey);
  const down = keys.has(downKey);
  const left = keys.has(leftKey);
  const right = keys.has(rightKey);

  let dr = 0;
  let dc = 0;
  let diagonal: DiagonalDirection | null = null;
  let isDiagonal = false;
  let isSingle = false;

  if (up && right) {
    dr = -1;
    dc = 1;
    diagonal = "TopRight";
    isDiagonal = true;
  } else if (up && left) {
    dr = -1;
    dc = -1;
    diagonal = "TopLeft";
    isDiagonal = true;
  } else if (down && right) {
    dr = 1;
    dc = 1;
    diagonal = "BottomRight";
    isDiagonal = true;
  } else if (down && left) {
    dr = 1;
    dc = -1;
    diagonal = "BottomLeft";
    isDiagonal = true;
  } else if (up) {
    dr = -1;
    dc = 0;
    isSingle = keys.size === 1;
  } else if (down) {
    dr = 1;
    dc = 0;
    isSingle = keys.size === 1;
  } else if (left) {
    dr = 0;
    dc = -1;
    isSingle = keys.size === 1;
  } else if (right) {
    dr = 0;
    dc = 1;
    isSingle = keys.size === 1;
  }

  return { dr, dc, diagonal, isDiagonal, isSingle };
};

export const resolveMovementDirection = (
  keys: Set<string>,
  keyBindings: KeyBindings
): DirectionResult =>
  resolveDirection(
    keys,
    keyBindings.up,
    keyBindings.down,
    keyBindings.left,
    keyBindings.right
  );

export const resolveFlagDirection = (
  keys: Set<string>,
  keyBindings: KeyBindings
): DirectionResult =>
  resolveDirection(
    keys,
    keyBindings.flagUp,
    keyBindings.flagDown,
    keyBindings.flagLeft,
    keyBindings.flagRight
  );
