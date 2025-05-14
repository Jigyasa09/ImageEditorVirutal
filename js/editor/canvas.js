/**
 * Creates and manages a canvas element
 * @param {string} canvasId - ID of the canvas element
 * @returns {Object} - Canvas utilities
 */
export function createCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  // Set initial canvas size
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  
  /**
   * Set canvas dimensions
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   */
  function setCanvasSize(width, height) {
    // Don't resize if dimensions are the same (prevents flickering)
    if (canvas.width === width && canvas.height === height) return;
    
    canvas.width = width;
    canvas.height = height;
  }
  
  /**
   * Clear the canvas
   */
  function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  
  /**
   * Draw image data on the canvas
   * @param {ImageData} imageData - The image data to draw
   */
  function drawImage(imageData) {
    if (!imageData) return;
    clearCanvas();
    ctx.putImageData(imageData, 0, 0);
  }
  
  /**
   * Resize canvas to fit container
   * @param {HTMLElement} container - Container element
   * @param {number} aspectRatio - Aspect ratio to maintain (width/height)
   */
  function resizeToFit(container, aspectRatio) {
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    let width, height;
    
    if (containerWidth / containerHeight > aspectRatio) {
      // Container is wider than the image
      height = containerHeight;
      width = height * aspectRatio;
    } else {
      // Container is taller than the image
      width = containerWidth;
      height = width / aspectRatio;
    }
    
    setCanvasSize(width, height);
  }
  
  return {
    canvas,
    ctx,
    setCanvasSize,
    clearCanvas,
    drawImage,
    resizeToFit
  };
}