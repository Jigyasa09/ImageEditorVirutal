import { createCanvas } from './canvas.js';
import { setupImageProcessor } from './imageProcessor.js';
import { HistoryManager } from './history.js';

/**
 * Sets up the image editor
 * @param {Object} config - Configuration object
 * @param {string} config.canvasId - ID of the canvas element
 * @param {Object} config.memoryManager - Virtual memory manager instance
 * @param {Object} config.eventBus - Event bus for communication
 * @returns {Object} - Editor API
 */
export function setupEditor({ canvasId, memoryManager, eventBus }) {
  // Initialize the canvas with context
  const { canvas, ctx, setCanvasSize, clearCanvas, drawImage } = createCanvas(canvasId);
  
  // Initialize the image processor
  const imageProcessor = setupImageProcessor({ memoryManager, eventBus });
  
  // Initialize history manager
  const historyManager = new HistoryManager(10); // Keep 10 history states
  
  // Current image data
  let currentImage = null;
  let originalImage = null;
  let originalWidth = 0;
  let originalHeight = 0;
  
  // Current adjustments and filters
  let currentAdjustments = {
    brightness: 0,
    contrast: 0
  };
  
  let currentFilter = 'none';
  let currentRotation = 0;
  
  // Load image from file
  async function loadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const img = new Image();
          img.onload = async () => {
            originalWidth = img.width;
            originalHeight = img.height;
            
            // Create original image
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = originalWidth;
            tempCanvas.height = originalHeight;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(img, 0, 0);
            
            originalImage = tempCtx.getImageData(0, 0, originalWidth, originalHeight);
            
            // Store the image in memory chunks
            await memoryManager.storeImage(originalImage);
            
            // Reset adjustments
            currentAdjustments = {
              brightness: 0,
              contrast: 0
            };
            currentFilter = 'none';
            currentRotation = 0;
            
            // Clear history
            historyManager.clear();
            
            // Save initial state
            saveToHistory();
            
            // Render the image
            await renderImage();
            
            // Notify that image is loaded
            eventBus.emit('image:loaded', {
              width: originalWidth,
              height: originalHeight,
              size: file.size
            });
            
            resolve();
          };
          
          img.onerror = () => {
            reject(new Error('Failed to load image'));
          };
          
          img.src = e.target.result;
        } catch (err) {
          reject(err);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  }
  
  // Render the current image with adjustments and filters
  async function renderImage() {
    if (!originalImage) return;
    
    eventBus.emit('image:rendering:start');
    
    try {
      // Process the image with current adjustments and filters
      currentImage = await imageProcessor.processImage(
        originalImage,
        currentAdjustments,
        currentFilter,
        currentRotation
      );
      
      // Adjust canvas size based on rotation
      const isRotated90or270 = currentRotation % 180 !== 0;
      const displayWidth = isRotated90or270 ? originalHeight : originalWidth;
      const displayHeight = isRotated90or270 ? originalWidth : originalHeight;
      
      // Set canvas size
      setCanvasSize(displayWidth, displayHeight);
      
      // Draw the processed image
      drawImage(currentImage);
      
      eventBus.emit('image:rendering:complete');
    } catch (error) {
      console.error('Error rendering image:', error);
      eventBus.emit('image:rendering:error', error);
    }
  }
  
  // Update adjustments
  async function updateAdjustments(adjustments) {
    // Update only the provided adjustments
    currentAdjustments = {
      ...currentAdjustments,
      ...adjustments
    };
    
    await renderImage();
  }
  
  // Apply filter
  async function applyFilter(filter) {
    currentFilter = filter;
    await renderImage();
  }
  
  // Rotate image
  async function rotateImage(direction) {
    // Add 90 for right, subtract 90 for left
    currentRotation = (currentRotation + (direction === 'right' ? 90 : -90)) % 360;
    // Normalize negative rotation
    if (currentRotation < 0) currentRotation += 360;
    
    await renderImage();
  }
  
  // Save current state to history
  function saveToHistory() {
    const state = {
      adjustments: { ...currentAdjustments },
      filter: currentFilter,
      rotation: currentRotation
    };
    
    historyManager.addState(state);
    eventBus.emit('history:updated', {
      canUndo: historyManager.canUndo(),
      canRedo: historyManager.canRedo()
    });
  }
  
  // Undo last action
  async function undo() {
    if (!historyManager.canUndo()) return;
    
    const prevState = historyManager.undo();
    if (prevState) {
      currentAdjustments = { ...prevState.adjustments };
      currentFilter = prevState.filter;
      currentRotation = prevState.rotation;
      
      await renderImage();
      
      eventBus.emit('history:updated', {
        canUndo: historyManager.canUndo(),
        canRedo: historyManager.canRedo()
      });
    }
  }
  
  // Redo last undone action
  async function redo() {
    if (!historyManager.canRedo()) return;
    
    const nextState = historyManager.redo();
    if (nextState) {
      currentAdjustments = { ...nextState.adjustments };
      currentFilter = nextState.filter;
      currentRotation = nextState.rotation;
      
      await renderImage();
      
      eventBus.emit('history:updated', {
        canUndo: historyManager.canUndo(),
        canRedo: historyManager.canRedo()
      });
    }
  }
  
  // Save the edited image
  function saveImage(format = 'image/jpeg', quality = 0.9) {
    return new Promise((resolve) => {
      // Create a copy of the canvas for saving
      const saveCanvas = document.createElement('canvas');
      const isRotated90or270 = currentRotation % 180 !== 0;
      
      saveCanvas.width = isRotated90or270 ? originalHeight : originalWidth;
      saveCanvas.height = isRotated90or270 ? originalWidth : originalHeight;
      
      const saveCtx = saveCanvas.getContext('2d');
      saveCtx.putImageData(currentImage, 0, 0);
      
      // Convert to data URL
      const dataUrl = saveCanvas.toDataURL(format, quality);
      resolve(dataUrl);
    });
  }
  
  // Crop the image
  async function cropImage(x, y, width, height) {
    if (!currentImage) return;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(currentImage, -x, -y);
    
    const croppedImage = tempCtx.getImageData(0, 0, width, height);
    
    // Update the original image with the cropped version
    originalImage = croppedImage;
    originalWidth = width;
    originalHeight = height;
    
    // Reset rotation as it complicates cropping
    currentRotation = 0;
    
    // Save this state to history
    saveToHistory();
    
    // Store the cropped image in memory chunks
    await memoryManager.storeImage(originalImage);
    
    // Render the cropped image
    await renderImage();
  }
  
  // Resize the image
  async function resizeImage(width, height) {
    if (!originalImage) return;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    
    // Draw the original image scaled to the new dimensions
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    
    // Create a temporary canvas with the original image
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = originalWidth;
    srcCanvas.height = originalHeight;
    const srcCtx = srcCanvas.getContext('2d');
    srcCtx.putImageData(originalImage, 0, 0);
    
    // Draw the resized version
    tempCtx.drawImage(srcCanvas, 0, 0, originalWidth, originalHeight, 0, 0, width, height);
    
    // Get the resized image data
    const resizedImage = tempCtx.getImageData(0, 0, width, height);
    
    // Update the original image with the resized version
    originalImage = resizedImage;
    originalWidth = width;
    originalHeight = height;
    
    // Save this state to history
    saveToHistory();
    
    // Store the resized image in memory chunks
    await memoryManager.storeImage(originalImage);
    
    // Render the resized image
    await renderImage();
  }
  
  // Event listener for image modifications
  eventBus.on('image:modify', async ({ type, data }) => {
    switch (type) {
      case 'adjustments':
        await updateAdjustments(data);
        break;
      case 'filter':
        await applyFilter(data);
        break;
      case 'rotation':
        await rotateImage(data);
        break;
      case 'saveState':
        saveToHistory();
        break;
      default:
        console.warn('Unknown modification type:', type);
    }
  });
  
  // Return the editor API
  return {
    loadImage,
    updateAdjustments,
    applyFilter,
    rotateImage,
    cropImage,
    resizeImage,
    undo,
    redo,
    saveImage,
    saveToHistory,
    getCurrentImage: () => currentImage,
    hasImage: () => !!originalImage
  };
}