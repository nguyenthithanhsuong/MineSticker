/**
 * Block class - Represents a single minesweeper cell/block
 */
export class Block {
  private row: number;
  private col: number;
  private isMine: boolean;
  private isRevealed: boolean;
  private isFlagged: boolean;
  private neighborMines: number;

  constructor(row: number, col: number) {
    this.row = row;
    this.col = col;
    this.isMine = false;
    this.isRevealed = false;
    this.isFlagged = false;
    this.neighborMines = 0;
  }

  /**
   * Get block position
   */
  getPosition(): { row: number; col: number } {
    return { row: this.row, col: this.col };
  }

  /**
   * Set block as mine
   */
  setMine(isMine: boolean): void {
    this.isMine = isMine;
  }

  /**
   * Check if block is a mine
   */
  getIsMine(): boolean {
    return this.isMine;
  }

  /**
   * Reveal the block
   */
  reveal(): void {
    if (!this.isFlagged) {
      this.isRevealed = true;
    }
  }

  /**
   * Check if block is revealed
   */
  getIsRevealed(): boolean {
    return this.isRevealed;
  }

  /**
   * Toggle flag on block
   */
  toggleFlag(): boolean {
    if (!this.isRevealed) {
      this.isFlagged = !this.isFlagged;
      return true;
    }
    return false;
  }

  /**
   * Check if block is flagged
   */
  getIsFlagged(): boolean {
    return this.isFlagged;
  }

  /**
   * Set number of neighboring mines
   */
  setNeighborMines(count: number): void {
    this.neighborMines = count;
  }

  /**
   * Get number of neighboring mines
   */
  getNeighborMines(): number {
    return this.neighborMines;
  }

  /**
   * Reset block to initial state
   */
  reset(): void {
    this.isMine = false;
    this.isRevealed = false;
    this.isFlagged = false;
    this.neighborMines = 0;
  }

  /**
   * Get the texture/display state of the block
   */
  getDisplayState(): string {
    if (!this.isRevealed) {
      return this.isFlagged ? 'flagged' : 'hidden';
    }
    if (this.isMine) {
      return 'mine';
    }
    return this.neighborMines > 0 ? `number-${this.neighborMines}` : 'empty';
  }
}
