import { Matrix, Tile, TileTexture } from "../../shared";

// True No Guessing Mode: Validates board is 100% solvable through logic
class MineSolver {
  private grid: boolean[][] = [];
  private w: number;
  private h: number;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.grid = Array(h)
      .fill(null)
      .map(() => Array(w).fill(false));
  }

  setMine(x: number, y: number, isMine: boolean) {
    if (x >= 0 && x < this.w && y >= 0 && y < this.h) {
      this.grid[y][x] = isMine;
    }
  }

  getMineCount(x: number, y: number): number {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < this.w && ny >= 0 && ny < this.h && this.grid[ny][nx]) {
          count++;
        }
      }
    }
    return count;
  }

  // True solver: attempts to solve the board using only logical deduction
  isSolvable(startX: number, startY: number): boolean {
    // Ensure good starting area first
    if (this.getMineCount(startX, startY) !== 0) {
      return false;
    }

    // Create a knowledge grid: -2 = unknown, -1 = flagged mine, 0-8 = opened
    const knowledge: number[][] = Array(this.h)
      .fill(null)
      .map(() => Array(this.w).fill(-2));

    // Open the starting position with flood fill
    this.floodFillOpen(knowledge, startX, startY);

    // Check if opening is large enough
    let openedCount = 0;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (knowledge[y][x] >= 0) openedCount++;
      }
    }
    if (openedCount < 12) return false;

    // Now try to solve using logic
    let madeProgress = true;
    let iterations = 0;
    const maxIterations = 100;

    while (madeProgress && iterations < maxIterations) {
      madeProgress = false;
      iterations++;

      // For each opened cell with a number
      for (let y = 0; y < this.h; y++) {
        for (let x = 0; x < this.w; x++) {
          if (knowledge[y][x] < 0) continue;

          const number = knowledge[y][x];
          if (number === 0) continue;

          // Count unknowns and flags around this cell
          const neighbors = this.getNeighbors(x, y);
          const unknowns: Array<[number, number]> = [];
          let flagCount = 0;

          for (const [nx, ny] of neighbors) {
            if (knowledge[ny][nx] === -2) {
              unknowns.push([nx, ny]);
            } else if (knowledge[ny][nx] === -1) {
              flagCount++;
            }
          }

          const remainingMines = number - flagCount;

          // Rule 1: If remaining mines == unknown count, all unknowns are mines
          if (remainingMines > 0 && remainingMines === unknowns.length) {
            for (const [nx, ny] of unknowns) {
              knowledge[ny][nx] = -1;
              madeProgress = true;
            }
          }

          // Rule 2: If remaining mines == 0, all unknowns are safe
          if (remainingMines === 0 && unknowns.length > 0) {
            for (const [nx, ny] of unknowns) {
              this.floodFillOpen(knowledge, nx, ny);
              madeProgress = true;
            }
          }
        }
      }
    }

    // Check if we solved everything
    let solvedCells = 0;

    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (knowledge[y][x] >= -1) solvedCells++;
      }
    }

    // Board is solvable if we identified all cells (no -2 unknowns left)
    return solvedCells === this.w * this.h;
  }

  private getNeighbors(x: number, y: number): Array<[number, number]> {
    const neighbors: Array<[number, number]> = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < this.w && ny >= 0 && ny < this.h) {
          neighbors.push([nx, ny]);
        }
      }
    }
    return neighbors;
  }

  private floodFillOpen(knowledge: number[][], startX: number, startY: number) {
    const queue: Array<[number, number]> = [[startX, startY]];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      visited.add(key);

      if (x < 0 || x >= this.w || y < 0 || y >= this.h) continue;
      if (knowledge[y][x] >= 0) continue; // Already opened
      if (this.grid[y][x]) continue; // Do not open mines

      const count = this.getMineCount(x, y);
      knowledge[y][x] = count;

      if (count === 0) {
        for (const [nx, ny] of this.getNeighbors(x, y)) {
          queue.push([nx, ny]);
        }
      }
    }
  }
}

// Generate a true no-guessing board - 100% solvable through logic alone
export function generateNoGuessingBoard(
  rows: number,
  cols: number,
  mineCount: number,
  startRow: number,
  startCol: number
): Matrix<Tile> {
  const maxAttempts = 2000; // Increased since true solvability is harder to find

  console.log("Generating true no-guessing board...");

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const solver = new MineSolver(cols, rows);
    const positions = new Set<number>();
    const total = rows * cols;

    // Extended forbidden zone: 5x5 area around start position
    // This ensures the entire 3x3 starting area will have 0 adjacent mines
    // (since the closest mine will be 2 tiles away from the center)
    const forbidden = new Set<number>();
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const r = startRow + dy;
        const c = startCol + dx;
        if (r >= 0 && r < rows && c >= 0 && c < cols) {
          forbidden.add(r * cols + c);
        }
      }
    }

    // Place mines randomly
    while (positions.size < mineCount && positions.size < total - 1) {
      const idx = Math.floor(Math.random() * total);
      if (!forbidden.has(idx)) {
        positions.add(idx);
      }
    }

    // Set mines in solver
    positions.forEach((idx) => {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      solver.setMine(col, row, true);
    });

    // Check if this board is 100% solvable through logic
    if (solver.isSolvable(startCol, startRow)) {
      console.log(`Found true no-guessing board on attempt ${attempt + 1}`);
      // Build the matrix
      const matrix = new Matrix<Tile>(rows, cols, () => new Tile("tile0"));
      positions.forEach((idx) => {
        const row = Math.floor(idx / cols);
        const col = idx % cols;
        const tile = matrix.get(row, col);
        if (tile) tile.isMine = true;
      });
      return matrix;
    }

    // Log progress every 100 attempts
    if ((attempt + 1) % 100 === 0) {
      console.log(`Still searching... attempt ${attempt + 1}/${maxAttempts}`);
    }
  }

  // Fallback to random generation if no solvable board found
  console.warn(
    "Could not find 100% solvable board after",
    maxAttempts,
    "attempts, using classic"
  );
  return createMatrix(rows, cols, mineCount);
}

export function createMatrix(rows: number, cols: number, mines: number) {
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

export function cloneMatrix(matrix: Matrix<Tile>) {
  return new Matrix<Tile>(matrix.rows, matrix.cols, (r, c) => {
    const t = matrix.get(r, c) ?? new Tile("tile0");
    return new Tile(t.texture, t.isMine, t.isOpen, t.isFlagged);
  });
}

export const numberTexture = (count: number): TileTexture => {
  if (count <= 0) return "tile9";
  if (count >= 8) return "tile8";
  return `tile${count}` as TileTexture;
};
