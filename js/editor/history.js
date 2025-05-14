/**
 * Manages editing history for undo/redo functionality
 */
export class HistoryManager {
  /**
   * Create a new history manager
   * @param {number} maxStates - Maximum number of states to keep
   */
  constructor(maxStates = 20) {
    this.states = [];
    this.currentIndex = -1;
    this.maxStates = maxStates;
  }
  
  /**
   * Add a new state to the history
   * @param {Object} state - State to add
   */
  addState(state) {
    // If we're not at the end of the history, remove future states
    if (this.currentIndex < this.states.length - 1) {
      this.states = this.states.slice(0, this.currentIndex + 1);
    }
    
    // Add the new state
    this.states.push(this.deepClone(state));
    this.currentIndex = this.states.length - 1;
    
    // Limit the number of states
    if (this.states.length > this.maxStates) {
      this.states.shift();
      this.currentIndex--;
    }
  }
  
  /**
   * Undo the last action
   * @returns {Object|null} - Previous state or null if can't undo
   */
  undo() {
    if (!this.canUndo()) return null;
    
    this.currentIndex--;
    return this.deepClone(this.states[this.currentIndex]);
  }
  
  /**
   * Redo the last undone action
   * @returns {Object|null} - Next state or null if can't redo
   */
  redo() {
    if (!this.canRedo()) return null;
    
    this.currentIndex++;
    return this.deepClone(this.states[this.currentIndex]);
  }
  
  /**
   * Check if undo is possible
   * @returns {boolean} - True if undo is possible
   */
  canUndo() {
    return this.currentIndex > 0;
  }
  
  /**
   * Check if redo is possible
   * @returns {boolean} - True if redo is possible
   */
  canRedo() {
    return this.currentIndex < this.states.length - 1;
  }
  
  /**
   * Clear all history
   */
  clear() {
    this.states = [];
    this.currentIndex = -1;
  }
  
  /**
   * Deep clone an object to prevent reference issues
   * @param {Object} obj - Object to clone
   * @returns {Object} - Cloned object
   */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
  
  /**
   * Get the current state
   * @returns {Object|null} - Current state or null if no history
   */
  getCurrentState() {
    if (this.currentIndex < 0) return null;
    return this.deepClone(this.states[this.currentIndex]);
  }
  
  /**
   * Get number of states in history
   * @returns {number} - Number of states
   */
  getStateCount() {
    return this.states.length;
  }
}