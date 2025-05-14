/**
 * Sets up the virtual memory manager
 * @param {Object} config - Configuration object
 * @param {number} config.memoryLimit - Memory limit in MB
 * @param {number} config.pageSize - Page size in MB
 * @param {Object} config.eventBus - Event bus for communication
 * @returns {Object} - Memory manager API
 */
export function setupMemoryManager({ memoryLimit = 100, pageSize = 1, eventBus }) {
  // Initialize page table
  // Map: pageId (string) => { data, status, lastAccessed }
  const pageTable = new Map();
  
  // Statistics
  let stats = {
    activePages: 0,
    inactivePages: 0,
    pageHits: 0,
    pageFaults: 0,
    memoryUsage: 0
  };
  
  // Chunk processor function (will be registered by imageProcessor)
  let processChunkFn = null;
  
  /**
   * Register a chunk processor function
   * @param {Function} processor - Chunk processor function
   */
  function registerChunkProcessor(processor) {
    processChunkFn = processor;
  }
  
  /**
   * Store an image in memory chunks
   * @param {ImageData} imageData - Image data to store
   */
  async function storeImage(imageData) {
    if (!imageData) return;
    
    // Clear existing pages
    clearAllPages();
    
    const { width, height, data } = imageData;
    const pixelsPerPage = Math.floor((pageSize * 1024 * 1024) / 4); // 4 bytes per pixel (RGBA)
    const totalPixels = width * height;
    const totalPages = Math.ceil(totalPixels / pixelsPerPage);
    
    // Store image metadata
    stats.totalWidth = width;
    stats.totalHeight = height;
    stats.totalPixels = totalPixels;
    stats.totalPages = totalPages;
    
    // Split image data into chunks and store in page table
    for (let i = 0; i < totalPages; i++) {
      const startPixel = i * pixelsPerPage;
      const endPixel = Math.min((i + 1) * pixelsPerPage, totalPixels);
      const startIndex = startPixel * 4;
      const endIndex = endPixel * 4;
      
      // Create a copy of the chunk data
      const chunkData = new Uint8ClampedArray(data.slice(startIndex, endIndex));
      
      // Store the chunk in the page table
      const pageId = `page_${i}`;
      pageTable.set(pageId, {
        data: chunkData,
        status: 'active',
        lastAccessed: Date.now(),
        startPixel,
        endPixel,
        startIndex,
        endIndex
      });
      
      // Update stats
      stats.activePages++;
      stats.memoryUsage += pageSize;
      
      // Check if we need to swap out pages
      if (stats.memoryUsage > memoryLimit) {
        swapOutLRUPage();
      }
    }
    
    // Emit memory stats update
    updateMemoryStats();
  }
  
  /**
   * Process image chunks with adjustments and filters
   * @param {ImageData} originalImage - Original image data
   * @param {Object} adjustments - Image adjustments
   * @param {string} filter - Filter to apply
   * @param {number} rotation - Rotation angle in degrees
   * @returns {Promise<ImageData>} - Processed image data
   */
  async function processImageChunks(originalImage, adjustments, filter, rotation) {
    if (!originalImage || !processChunkFn) return originalImage;
    
    const { width, height } = originalImage;
    const totalPixels = width * height;
    
    // Create a new rotated canvas if needed
    let newWidth = width;
    let newHeight = height;
    
    // Adjust dimensions for rotation
    if (rotation % 180 !== 0) {
      newWidth = height;
      newHeight = width;
    }
    
    // Create output buffer
    const outputData = new Uint8ClampedArray(newWidth * newHeight * 4);
    
    // Get page IDs for processing
    const pageIds = Array.from(pageTable.keys());
    
    // Process each page
    for (const pageId of pageIds) {
      // Check if the page is in memory, if not, swap it in
      if (!pageTable.has(pageId) || pageTable.get(pageId).status === 'inactive') {
        await swapInPage(pageId);
        stats.pageFaults++;
      } else {
        stats.pageHits++;
      }
      
      const page = pageTable.get(pageId);
      if (!page || !page.data) continue;
      
      // Update last accessed time
      page.lastAccessed = Date.now();
      
      // Process the chunk
      const processedChunkData = processChunkFn(page.data, adjustments, filter);
      
      // Apply the chunk to the output buffer
      applyChunkToOutput(processedChunkData, outputData, page, width, height, rotation);
    }
    
    // Create the output image data
    const outputImageData = new ImageData(outputData, newWidth, newHeight);
    
    // Update memory stats
    updateMemoryStats();
    
    return outputImageData;
  }
  
  /**
   * Apply a processed chunk to the output buffer with rotation
   * @param {Uint8ClampedArray} chunkData - Processed chunk data
   * @param {Uint8ClampedArray} outputData - Output buffer
   * @param {Object} page - Page object
   * @param {number} width - Original image width
   * @param {number} height - Original image height
   * @param {number} rotation - Rotation angle in degrees
   */
  function applyChunkToOutput(chunkData, outputData, page, width, height, rotation) {
    // No rotation
    if (rotation === 0) {
      const startIndex = page.startIndex;
      for (let i = 0; i < chunkData.length; i++) {
        outputData[startIndex + i] = chunkData[i];
      }
      return;
    }
    
    // Calculate the rotated coordinates for each pixel in the chunk
    const pixelsPerRow = width;
    const startPixel = page.startPixel;
    const chunkLength = chunkData.length / 4;
    
    for (let i = 0; i < chunkLength; i++) {
      const pixelIndex = startPixel + i;
      const x = pixelIndex % pixelsPerRow;
      const y = Math.floor(pixelIndex / pixelsPerRow);
      
      let newX, newY;
      
      // Apply rotation
      switch (rotation) {
        case 90:
          newX = height - 1 - y;
          newY = x;
          break;
        case 180:
          newX = width - 1 - x;
          newY = height - 1 - y;
          break;
        case 270:
          newX = y;
          newY = width - 1 - x;
          break;
        default:
          newX = x;
          newY = y;
      }
      
      // Calculate the new index in the output buffer
      let newPixelIndex;
      if (rotation === 90 || rotation === 270) {
        newPixelIndex = newY * height + newX;
      } else {
        newPixelIndex = newY * width + newX;
      }
      
      const newIndex = newPixelIndex * 4;
      const srcIndex = i * 4;
      
      // Copy the pixel data
      outputData[newIndex] = chunkData[srcIndex];
      outputData[newIndex + 1] = chunkData[srcIndex + 1];
      outputData[newIndex + 2] = chunkData[srcIndex + 2];
      outputData[newIndex + 3] = chunkData[srcIndex + 3];
    }
  }
  
  /**
   * Swap out the least recently used page
   */
  function swapOutLRUPage() {
    // Find the least recently used active page
    let oldestTime = Infinity;
    let lruPageId = null;
    
    for (const [pageId, page] of pageTable.entries()) {
      if (page.status === 'active' && page.lastAccessed < oldestTime) {
        oldestTime = page.lastAccessed;
        lruPageId = pageId;
      }
    }
    
    if (lruPageId) {
      // Mark the page as inactive but keep its metadata
      const page = pageTable.get(lruPageId);
      page.status = 'inactive';
      page.data = null; // Free memory
      
      // Update stats
      stats.activePages--;
      stats.inactivePages++;
      stats.memoryUsage -= pageSize;
      
      // Emit page swapped out event
      eventBus.emit('memory:page:swapped-out', { pageId: lruPageId });
    }
  }
  
  /**
   * Swap in a page
   * @param {string} pageId - ID of the page to swap in
   */
  async function swapInPage(pageId) {
    // Check if we need to swap out a page first
    if (stats.memoryUsage + pageSize > memoryLimit) {
      swapOutLRUPage();
    }
    
    // Check if the page exists
    if (!pageTable.has(pageId)) {
      console.error(`Page ${pageId} not found in page table`);
      return;
    }
    
    const page = pageTable.get(pageId);
    
    // If the page is already active, just update the timestamp
    if (page.status === 'active') {
      page.lastAccessed = Date.now();
      return;
    }
    
    // Simulate loading the page from disk
    // In a real system, this would load from storage
    await simulatePageLoad();
    
    // Rebuild the page data (in a real system, this would load from storage)
    // Here we're just creating a placeholder filled with zeros
    const chunkSize = (page.endIndex - page.startIndex);
    page.data = new Uint8ClampedArray(chunkSize);
    
    // Mark the page as active
    page.status = 'active';
    page.lastAccessed = Date.now();
    
    // Update stats
    stats.activePages++;
    stats.inactivePages--;
    stats.memoryUsage += pageSize;
    
    // Emit page swapped in event
    eventBus.emit('memory:page:swapped-in', { pageId });
  }
  
  /**
   * Simulate page loading delay
   * @returns {Promise} - Resolves when page is "loaded"
   */
  function simulatePageLoad() {
    return new Promise(resolve => {
      // Simulate a short delay for loading from "disk"
      setTimeout(resolve, 5);
    });
  }
  
  /**
   * Clear all pages from memory
   */
  function clearAllPages() {
    pageTable.clear();
    
    stats = {
      activePages: 0,
      inactivePages: 0,
      pageHits: 0,
      pageFaults: 0,
      memoryUsage: 0
    };
    
    // Emit memory stats update
    updateMemoryStats();
  }
  
  /**
   * Get memory statistics
   * @returns {Object} - Memory statistics
   */
  function getMemoryStats() {
    return { ...stats };
  }
  
  /**
   * Get page table as an array
   * @returns {Array} - Array of page objects
   */
  function getPageTableArray() {
    return Array.from(pageTable.entries()).map(([pageId, page]) => ({
      pageId,
      status: page.status,
      lastAccessed: page.lastAccessed
    }));
  }
  
  /**
   * Update memory stats
   */
  function updateMemoryStats() {
    eventBus.emit('memory:stats:updated', getMemoryStats());
  }
  
  // Return the memory manager API
  return {
    storeImage,
    processImageChunks,
    registerChunkProcessor,
    getMemoryStats,
    getPageTableArray,
    clearAllPages
  };
}