/**
 * Sets up the image processor
 * @param {Object} config - Configuration object
 * @param {Object} config.memoryManager - Virtual memory manager
 * @param {Object} config.eventBus - Event bus for communication
 * @returns {Object} - Image processor API
 */
export function setupImageProcessor({ memoryManager, eventBus }) {
  
  /**
   * Process image with the given adjustments, filter, and rotation
   * @param {ImageData} originalImage - Original image data
   * @param {Object} adjustments - Image adjustments
   * @param {string} filter - Filter to apply
   * @param {number} rotation - Rotation angle in degrees
   * @returns {Promise<ImageData>} - Processed image data
   */
  async function processImage(originalImage, adjustments, filter, rotation) {
    if (!originalImage) return null;
    
    // Get image dimensions
    const { width, height } = originalImage;
    
    // Create a new canvas for processing
    const tempCanvas = document.createElement('canvas');
    const isRotated90or270 = rotation % 180 !== 0;
    
    // Set canvas size based on rotation
    tempCanvas.width = isRotated90or270 ? height : width;
    tempCanvas.height = isRotated90or270 ? width : height;
    
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    
    // Get processed image data through the memory manager
    const processedData = await memoryManager.processImageChunks(
      originalImage,
      adjustments,
      filter,
      rotation
    );
    
    // Draw processed image data
    tempCtx.putImageData(processedData, 0, 0);
    
    // Return the processed image data
    return tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  }
  
  /**
   * Apply brightness adjustment to an image chunk
   * @param {Uint8ClampedArray} data - Pixel data
   * @param {number} brightness - Brightness adjustment (-100 to 100)
   */
  function applyBrightness(data, brightness) {
    const factor = brightness / 100 * 255;
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = clamp(data[i] + factor); // R
      data[i + 1] = clamp(data[i + 1] + factor); // G
      data[i + 2] = clamp(data[i + 2] + factor); // B
      // Alpha channel (i + 3) remains unchanged
    }
  }
  
  /**
   * Apply contrast adjustment to an image chunk
   * @param {Uint8ClampedArray} data - Pixel data
   * @param {number} contrast - Contrast adjustment (-100 to 100)
   */
  function applyContrast(data, contrast) {
    const factor = (259 * (contrast + 100)) / (255 * (259 - contrast));
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = clamp(factor * (data[i] - 128) + 128); // R
      data[i + 1] = clamp(factor * (data[i + 1] - 128) + 128); // G
      data[i + 2] = clamp(factor * (data[i + 2] - 128) + 128); // B
      // Alpha channel (i + 3) remains unchanged
    }
  }
  
  /**
   * Apply grayscale filter to an image chunk
   * @param {Uint8ClampedArray} data - Pixel data
   */
  function applyGrayscale(data) {
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i] = avg; // R
      data[i + 1] = avg; // G
      data[i + 2] = avg; // B
      // Alpha channel (i + 3) remains unchanged
    }
  }
  
  /**
   * Apply sepia filter to an image chunk
   * @param {Uint8ClampedArray} data - Pixel data
   */
  function applySepia(data) {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      data[i] = clamp(r * 0.393 + g * 0.769 + b * 0.189); // R
      data[i + 1] = clamp(r * 0.349 + g * 0.686 + b * 0.168); // G
      data[i + 2] = clamp(r * 0.272 + g * 0.534 + b * 0.131); // B
      // Alpha channel (i + 3) remains unchanged
    }
  }
  
  /**
   * Apply invert filter to an image chunk
   * @param {Uint8ClampedArray} data - Pixel data
   */
  function applyInvert(data) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i]; // R
      data[i + 1] = 255 - data[i + 1]; // G
      data[i + 2] = 255 - data[i + 2]; // B
      // Alpha channel (i + 3) remains unchanged
    }
  }
  
  /**
   * Process an image chunk with the given adjustments and filter
   * @param {Uint8ClampedArray} chunkData - Chunk pixel data
   * @param {Object} adjustments - Image adjustments
   * @param {string} filter - Filter to apply
   * @returns {Uint8ClampedArray} - Processed chunk data
   */
  function processChunk(chunkData, adjustments, filter) {
    // Create a copy of the chunk data
    const processedData = new Uint8ClampedArray(chunkData);
    
    // Apply adjustments
    if (adjustments.brightness !== 0) {
      applyBrightness(processedData, adjustments.brightness);
    }
    
    if (adjustments.contrast !== 0) {
      applyContrast(processedData, adjustments.contrast);
    }
    
    // Apply filter
    switch (filter) {
      case 'grayscale':
        applyGrayscale(processedData);
        break;
      case 'sepia':
        applySepia(processedData);
        break;
      case 'invert':
        applyInvert(processedData);
        break;
      default:
        // No filter or 'none'
        break;
    }
    
    return processedData;
  }
  
  /**
   * Helper function to clamp a value between 0 and 255
   * @param {number} value - Value to clamp
   * @returns {number} - Clamped value
   */
  function clamp(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
  }
  
  // Register chunk processor with memory manager
  memoryManager.registerChunkProcessor(processChunk);
  
  return {
    processImage,
    applyBrightness,
    applyContrast,
    applyGrayscale,
    applySepia,
    applyInvert
  };
}