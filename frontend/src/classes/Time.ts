import { NumberDisplay } from './NumberDisplay';

/**
 * Time class - Manages game timer
 * Extends NumberDisplay for displaying elapsed time
 */
export class Time extends NumberDisplay {
  private intervalId: number | null = null;
  private isRunning: boolean = false;

  constructor() {
    super(0, 3); // 3 digits for time display (max 999 seconds)
  }

  /**
   * Start the timer
   */
  start(): void {
    if (!this.isRunning) {
      this.isRunning = true;
      this.intervalId = window.setInterval(() => {
        this.increment();
      }, 1000);
    }
  }

  /**
   * Stop the timer
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
    }
  }

  /**
   * Reset the timer
   */
  reset(): void {
    this.stop();
    super.reset();
  }

  /**
   * Check if timer is running
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }
}
