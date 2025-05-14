/**
 * Sets up the memory UI
 * @param {Object} config - Configuration object
 * @param {Object} config.memoryManager - Memory manager instance
 * @param {Object} config.eventBus - Event bus for communication
 * @returns {Object} - Memory UI API
 */
export function setupMemoryUI({ memoryManager, eventBus }) {
  // DOM elements
  const memoryUsageEl = document.getElementById('memory-usage');
  const memoryUsageBarEl = document.getElementById('memory-usage-bar');
  const activePagesEl = document.getElementById('active-pages');
  const inactivePagesEl = document.getElementById('inactive-pages');
  const pageHitsEl = document.getElementById('page-hits');
  const pageFaultsEl = document.getElementById('page-faults');
  const pageGridEl = document.getElementById('page-grid');
  
  /**
   * Initialize the memory UI
   */
  function init() {
    // Listen for memory stats updates
    eventBus.on('memory:stats:updated', updateMemoryStats);
    
    // Listen for page swapping events
    eventBus.on('memory:page:swapped-out', ({ pageId }) => {
      animatePageSwap(pageId, 'out');
    });
    
    eventBus.on('memory:page:swapped-in', ({ pageId }) => {
      animatePageSwap(pageId, 'in');
    });
    
    // Initial update
    updateMemoryStats(memoryManager.getMemoryStats());
  }
  
  /**
   * Update the memory stats display
   * @param {Object} stats - Memory statistics
   */
  function updateMemoryStats(stats) {
    // Update numeric stats
    memoryUsageEl.textContent = stats.memoryUsage.toFixed(1);
    activePagesEl.textContent = stats.activePages;
    inactivePagesEl.textContent = stats.inactivePages;
    pageHitsEl.textContent = stats.pageHits;
    pageFaultsEl.textContent = stats.pageFaults;
    
    // Update memory usage bar
    const usagePercent = (stats.memoryUsage / 100) * 100;
    memoryUsageBarEl.style.width = `${usagePercent}%`;
    
    // Color the usage bar based on usage level
    if (usagePercent > 90) {
      memoryUsageBarEl.style.backgroundColor = 'var(--color-error)';
    } else if (usagePercent > 70) {
      memoryUsageBarEl.style.backgroundColor = 'var(--color-warning)';
    } else {
      memoryUsageBarEl.style.backgroundColor = 'var(--color-primary)';
    }
    
    // Update page grid
    updatePageGrid();
  }
  
  /**
   * Update the page grid visualization
   */
  function updatePageGrid() {
    // Get page table as an array
    const pages = memoryManager.getPageTableArray();
    
    // Clear existing grid
    pageGridEl.innerHTML = '';
    
    // Add page elements
    pages.forEach(page => {
      const pageEl = document.createElement('div');
      pageEl.className = `memory-page ${page.status}`;
      pageEl.dataset.pageId = page.pageId;
      pageEl.title = `${page.pageId}: ${page.status}`;
      
      // Extract page number for display
      const pageNumber = page.pageId.split('_')[1];
      pageEl.textContent = pageNumber;
      
      // Add to grid
      pageGridEl.appendChild(pageEl);
      
      // Add event listener for page details
      pageEl.addEventListener('click', () => {
        showPageDetails(page);
      });
    });
  }
  
  /**
   * Animate page swapping
   * @param {string} pageId - ID of the page
   * @param {string} direction - 'in' or 'out'
   */
  function animatePageSwap(pageId, direction) {
    const pageEl = pageGridEl.querySelector(`[data-page-id="${pageId}"]`);
    if (!pageEl) return;
    
    // Add animation class
    pageEl.classList.add(`swap-${direction}`);
    
    // After animation completes, update the page status
    setTimeout(() => {
      pageEl.classList.remove(`swap-${direction}`);
      
      if (direction === 'out') {
        pageEl.classList.remove('active');
        pageEl.classList.add('inactive');
      } else {
        pageEl.classList.remove('inactive');
        pageEl.classList.add('active');
      }
    }, 300); // Match the animation duration
  }
  
  /**
   * Show page details
   * @param {Object} page - Page object
   */
  function showPageDetails(page) {
    const details = `
      <div class="page-details">
        <p><strong>Page ID:</strong> ${page.pageId}</p>
        <p><strong>Status:</strong> ${page.status}</p>
        <p><strong>Last Accessed:</strong> ${new Date(page.lastAccessed).toLocaleTimeString()}</p>
      </div>
    `;
    
    eventBus.emit('modal:show', {
      title: 'Memory Page Details',
      content: details,
      showCancel: false,
      confirmText: 'Close'
    });
  }
  
  return {
    init,
    updateMemoryStats
  };
}