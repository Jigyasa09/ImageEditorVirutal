import './style.css';
import { setupEditor } from './js/editor/editor.js';
import { setupMemoryManager } from './js/memory/memoryManager.js';
import { setupUI } from './js/ui/ui.js';
import { EventBus } from './js/utils/eventBus.js';

// Initialize the event bus for communication between components
const eventBus = new EventBus();

// Initialize the memory manager with a 100MB limit and 1MB page size
const memoryManager = setupMemoryManager({
  memoryLimit: 100,
  pageSize: 1,
  eventBus
});

// Initialize the image editor with the memory manager and event bus
const editor = setupEditor({
  canvasId: 'preview-canvas',
  memoryManager,
  eventBus
});

// Initialize the UI with the editor, memory manager, and event bus
setupUI({
  editor,
  memoryManager,
  eventBus
});

// Check if the user prefers dark mode
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.body.classList.add('dark-theme');
}

// Handle dark mode toggle
document.getElementById('theme-toggle').addEventListener('click', () => {
  document.body.classList.toggle('dark-theme');
});

// Log startup message
console.log('MemoryEdit initialized with 100MB virtual memory and 1MB page size');