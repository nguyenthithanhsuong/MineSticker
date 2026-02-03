import { NumberDisplay } from './NumberDisplay';

/**
 * FlagCount class - Manages remaining flag count
 * Extends NumberDisplay for displaying number of flags left
 */
export class FlagCount extends NumberDisplay {
  private totalMines: number;

  constructor(totalMines: number = 10) {
    super(totalMines, 3); // 3 digits for flag count display
    this.totalMines = totalMines;
  }

  /**
   * Place a flag (decrease count)
   */
  placeFlag(): void {
    this.decrement();
  }

  /**
   * Remove a flag (increase count)
   */
  removeFlag(): void {
    this.increment();
  }

  /**
   * Reset flag count to initial value
   */
  reset(): void {
    this.setValue(this.totalMines);
  }

  /**
   * Set total number of mines and reset count
   */
  setTotalMines(total: number): void {
    this.totalMines = total;
    this.reset();
  }

  /**
   * Get the total number of mines
   */
  getTotalMines(): number {
    return this.totalMines;
  }

  /**
   * Check if all flags have been used
   */
  hasNoFlagsLeft(): boolean {
    return this.getValue() === 0;
  }
}
