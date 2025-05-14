/**
 * Sets up the tools UI
 * @param {Object} config - Configuration object
 * @param {Object} config.editor - Editor instance
 * @param {Object} config.eventBus - Event bus for communication
 * @returns {Object} - Tools UI API
 */
export function setupToolsUI({ editor, eventBus }) {
  // Adjustment sliders
  const brightnessSlider = document.getElementById('brightness');
  const contrastSlider = document.getElementById('contrast');
  
  // Filter buttons
  const filterButtons = document.querySelectorAll('.filter-btn');
  
  // Tool buttons
  const rotateLeftBtn = document.getElementById('rotate-left');
  const rotateRightBtn = document.getElementById('rotate-right');
  
  // History buttons
  const undoBtn = document.getElementById('undo');
  const redoBtn = document.getElementById('redo');
  
  // Debounce timer for sliders
  let sliderTimer = null;
  const DEBOUNCE_DELAY = 100; // ms
  
  /**
   * Initialize the tools UI
   */
  function init() {
    // Set up sliders
    setupSliders();
    
    // Set up filter buttons
    setupFilterButtons();
    
    // Set up tool buttons
    setupToolButtons();
    
    // Set up history buttons
    setupHistoryButtons();
    
    // Listen for history updates
    listenForHistoryUpdates();
  }
  
  /**
   * Set up adjustment sliders
   */
  function setupSliders() {
    // Helper function to update slider value display
    function updateSliderValue(slider, value) {
      const valueEl = slider.nextElementSibling;
      valueEl.textContent = value;
    }
    
    // Brightness slider
    brightnessSlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value, 10);
      updateSliderValue(brightnessSlider, value);
      
      // Debounce the actual processing
      clearTimeout(sliderTimer);
      sliderTimer = setTimeout(() => {
        eventBus.emit('image:modify', {
          type: 'adjustments',
          data: { brightness: value }
        });
      }, DEBOUNCE_DELAY);
    });
    
    // Contrast slider
    contrastSlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value, 10);
      updateSliderValue(contrastSlider, value);
      
      // Debounce the actual processing
      clearTimeout(sliderTimer);
      sliderTimer = setTimeout(() => {
        eventBus.emit('image:modify', {
          type: 'adjustments',
          data: { contrast: value }
        });
      }, DEBOUNCE_DELAY);
    });
    
    // Save adjustments when sliders are released
    brightnessSlider.addEventListener('change', () => {
      eventBus.emit('image:modify', { type: 'saveState' });
    });
    
    contrastSlider.addEventListener('change', () => {
      eventBus.emit('image:modify', { type: 'saveState' });
    });
  }
  
  /**
   * Set up filter buttons
   */
  function setupFilterButtons() {
    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Remove active class from all filter buttons
        filterButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Get the filter name from the button ID
        const filterId = button.id;
        const filterName = filterId.replace('filter-', '');
        
        // Apply the filter
        eventBus.emit('image:modify', {
          type: 'filter',
          data: filterName
        });
        
        // Save state
        eventBus.emit('image:modify', { type: 'saveState' });
      });
    });
  }
  
  /**
   * Set up tool buttons
   */
  function setupToolButtons() {
    // Rotate left
    rotateLeftBtn.addEventListener('click', () => {
      eventBus.emit('image:modify', {
        type: 'rotation',
        data: 'left'
      });
      
      // Save state
      eventBus.emit('image:modify', { type: 'saveState' });
    });
    
    // Rotate right
    rotateRightBtn.addEventListener('click', () => {
      eventBus.emit('image:modify', {
        type: 'rotation',
        data: 'right'
      });
      
      // Save state
      eventBus.emit('image:modify', { type: 'saveState' });
    });
  }
  
  /**
   * Set up history buttons
   */
  function setupHistoryButtons() {
    // Undo button
    undoBtn.addEventListener('click', async () => {
      await editor.undo();
    });
    
    // Redo button
    redoBtn.addEventListener('click', async () => {
      await editor.redo();
    });
  }
  
  /**
   * Listen for history updates
   */
  function listenForHistoryUpdates() {
    eventBus.on('history:updated', ({ canUndo, canRedo }) => {
      undoBtn.disabled = !canUndo;
      redoBtn.disabled = !canRedo;
    });
  }
  
  /**
   * Reset all tools to default state
   */
  function resetTools() {
    // Reset sliders
    brightnessSlider.value = 0;
    contrastSlider.value = 0;
    
    // Update slider value displays
    brightnessSlider.nextElementSibling.textContent = '0';
    contrastSlider.nextElementSibling.textContent = '0';
    
    // Reset filter buttons
    filterButtons.forEach(btn => btn.classList.remove('active'));
    document.getElementById('filter-none').classList.add('active');
  }
  
  return {
    init,
    resetTools
  };
}