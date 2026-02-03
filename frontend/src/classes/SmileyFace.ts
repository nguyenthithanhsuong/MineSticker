/**
 * SmileyFace class - Represents the game status indicator
 */
export class SmileyFace {
  private state: 'happy' | 'nervous' | 'cool' | 'dead';

  constructor() {
    this.state = 'happy';
  }

  /**
   * Get current smiley state
   */
  getState(): string {
    return this.state;
  }

  /**
   * Set smiley to happy state (default/playing)
   */
  setHappy(): void {
    this.state = 'happy';
  }

  /**
   * Set smiley to nervous state (clicking on block)
   */
  setNervous(): void {
    this.state = 'nervous';
  }

  /**
   * Set smiley to cool state (won game)
   */
  setCool(): void {
    this.state = 'cool';
  }

  /**
   * Set smiley to dead state (lost game)
   */
  setDead(): void {
    this.state = 'dead';
  }

  /**
   * Reset smiley to happy state
   */
  reset(): void {
    this.state = 'happy';
  }

  /**
   * Get emoji representation of current state
   */
  getEmoji(): string {
    switch (this.state) {
      case 'happy':
        return '😊';
      case 'nervous':
        return '😮';
      case 'cool':
        return '😎';
      case 'dead':
        return '😵';
      default:
        return '😊';
    }
  }
}
