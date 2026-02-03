export class Matrix<T> {
  rows: number;
  cols: number;
  data: T[][];

  constructor(rows: number, cols: number, fill: (row: number, col: number) => T) {
    this.rows = rows;
    this.cols = cols;
    this.data = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => fill(r, c))
    );
  }

  inBounds(row: number, col: number) {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
  }

  get(row: number, col: number) {
    if (!this.inBounds(row, col)) return undefined;
    return this.data[row][col];
  }

  set(row: number, col: number, value: T) {
    if (!this.inBounds(row, col)) return false;
    this.data[row][col] = value;
    return true;
  }

  neighbors(row: number, col: number) {
    const positions: Array<[number, number]> = [];
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr;
        const c = col + dc;
        if (this.inBounds(r, c)) positions.push([r, c]);
      }
    }
    return positions;
  }
}
