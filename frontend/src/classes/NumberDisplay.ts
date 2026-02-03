/**
 * Number class - Base class for displaying numeric values
 * Can be utilized by Time and FlagCount classes
 */
export class NumberDisplay {
  private value: number;
  private maxDigits: number;

  constructor(initialValue: number = 0, maxDigits: number = 3) {
    this.value = initialValue;
    this.maxDigits = maxDigits;
  }

  /**
   * Get the current value
   */
  getValue(): number {
    return this.value;
  }

  /**
   * Set a new value
   */
  setValue(newValue: number): void {
    this.value = Math.max(0, Math.min(newValue, Math.pow(10, this.maxDigits) - 1));
  }

  /**
   * Increment the value by a specified amount
   */
  increment(amount: number = 1): void {
    this.setValue(this.value + amount);
  }

  /**
   * Decrement the value by a specified amount
   */
  decrement(amount: number = 1): void {
    this.setValue(this.value - amount);
  }

  /**
   * Reset the value to zero
   */
  reset(): void {
    this.value = 0;
  }

  /**
   * Get formatted string representation with leading zeros
   */
  getFormattedValue(): string {
    return this.value.toString().padStart(this.maxDigits, '0');
  }
}
