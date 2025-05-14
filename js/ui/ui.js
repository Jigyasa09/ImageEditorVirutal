import { setupMemoryUI } from './memoryUI.js';
import { setupToolsUI } from './toolsUI.js';
import { setupModalUI } from './modalUI.js';

/**
 * Sets up the UI components
 * @param {Object} config - Configuration object
 * @param {Object} config.editor - Editor instance
 * @param {Object} config.memoryManager - Memory manager instance
 * @param {Object} config.eventBus - Event bus for communication
 */
export function setupUI({ editor, memoryManager, eventBus }) {
  // Setup UI components
  const memoryUI = setupMemoryUI({ memoryManager, eventBus });
  const toolsUI = setupToolsUI({ editor, eventBus });
  const modalUI = setupModalUI({ eventBus });
  
  // Upload button
  const uploadBtn = document.getElementById('upload-btn');
  const imageUpload = document.getElementById('image-upload');
  
  uploadBtn.addEventListener('click', () => {
    imageUpload.click();
  });
  
  imageUpload.addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.type.match('image/jpeg') && !file.type.match('image/png')) {
        modalUI.showAlert('Invalid file type', 'Please upload a JPEG or PNG image.');
        return;
      }
      
      try {
        // Show loading indicator
        document.getElementById('loading-indicator').classList.remove('hidden');
        
        // Load the image
        await editor.loadImage(file);
        
        // Enable UI controls
        enableControls();
        
        // Hide loading indicator
        document.getElementById('loading-indicator').classList.add('hidden');
      } catch (error) {
        console.error('Error loading image:', error);
        modalUI.showAlert('Error', 'Failed to load image. Please try again.');
        
        // Hide loading indicator
        document.getElementById('loading-indicator').classList.add('hidden');
      }
    }
  });
  
  // Save button
  const saveBtn = document.getElementById('save-btn');
  
  saveBtn.addEventListener('click', async () => {
    if (!editor.hasImage()) return;
    
    const options = [
      { value: 'image/jpeg', label: 'JPEG (.jpg)' },
      { value: 'image/png', label: 'PNG (.png)' },
      { value: 'image/webp', label: 'WebP (.webp)' }
    ];
    
    const qualityOptions = [
      { value: '0.1', label: '10% (lowest quality)' },
      { value: '0.3', label: '30% (low quality)' },
      { value: '0.5', label: '50% (medium quality)' },
      { value: '0.7', label: '70% (high quality)' },
      { value: '0.9', label: '90% (best quality)' },
      { value: '1.0', label: '100% (lossless - PNG only)' }
    ];
    
    modalUI.showOptionsDialog(
      'Save Image',
      'Select format and quality:',
      {
        format: {
          type: 'select',
          label: 'Format',
          options,
          defaultValue: 'image/jpeg'
        },
        quality: {
          type: 'select',
          label: 'Quality',
          options: qualityOptions,
          defaultValue: '0.9'
        }
      },
      async (values) => {
        if (!values) return;
        
        try {
          // Show loading indicator
          document.getElementById('loading-indicator').classList.remove('hidden');
          
          // Get the selected format and quality
          const format = values.format;
          const quality = parseFloat(values.quality);
          
          // Get file extension
          const extensionMap = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp'
          };
          const extension = extensionMap[format] || 'jpg';
          
          // Save the image
          const dataUrl = await editor.saveImage(format, quality);
          
          // Create a download link
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `edited_image.${extension}`;
          
          // Trigger the download
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Hide loading indicator
          document.getElementById('loading-indicator').classList.add('hidden');
        } catch (error) {
          console.error('Error saving image:', error);
          modalUI.showAlert('Error', 'Failed to save image. Please try again.');
          
          // Hide loading indicator
          document.getElementById('loading-indicator').classList.add('hidden');
        }
      }
    );
  });
  
  // Event listeners
  eventBus.on('image:loaded', (imageInfo) => {
    console.log('Image loaded:', imageInfo);
  });
  
  eventBus.on('image:rendering:start', () => {
    document.getElementById('loading-indicator').classList.remove('hidden');
  });
  
  eventBus.on('image:rendering:complete', () => {
    document.getElementById('loading-indicator').classList.add('hidden');
  });
  
  eventBus.on('image:rendering:error', (error) => {
    console.error('Rendering error:', error);
    document.getElementById('loading-indicator').classList.add('hidden');
    modalUI.showAlert('Error', 'Failed to render image. Please try again.');
  });
  
  // Enable controls after image is loaded
  function enableControls() {
    // Enable all disabled buttons
    document.querySelectorAll('button[disabled]').forEach(btn => {
      btn.disabled = false;
    });
    
    // Enable all disabled inputs
    document.querySelectorAll('input[disabled]').forEach(input => {
      input.disabled = false;
    });
  }
  
  // Handle resize functionality
  document.getElementById('resize').addEventListener('click', () => {
    modalUI.showOptionsDialog(
      'Resize Image',
      'Enter new dimensions:',
      {
        width: {
          type: 'number',
          label: 'Width (px)',
          min: 1,
          max: 4000,
          defaultValue: stats.totalWidth || 800
        },
        height: {
          type: 'number',
          label: 'Height (px)',
          min: 1,
          max: 4000,
          defaultValue: stats.totalHeight || 600
        },
        maintainAspectRatio: {
          type: 'checkbox',
          label: 'Maintain aspect ratio',
          defaultValue: true
        }
      },
      async (values) => {
        if (!values) return;
        
        try {
          const width = parseInt(values.width, 10);
          const height = parseInt(values.height, 10);
          
          // Resize the image
          await editor.resizeImage(width, height);
        } catch (error) {
          console.error('Error resizing image:', error);
          modalUI.showAlert('Error', 'Failed to resize image. Please try again.');
        }
      }
    );
  });
  
  // Handle crop functionality
  // Note: For a real implementation, this would involve drawing a crop rectangle on the canvas,
  // but for this example, we'll use a simple dialog for dimensions
  document.getElementById('crop').addEventListener('click', () => {
    modalUI.showOptionsDialog(
      'Crop Image',
      'Enter crop dimensions:',
      {
        x: {
          type: 'number',
          label: 'X position (px)',
          min: 0,
          defaultValue: 0
        },
        y: {
          type: 'number',
          label: 'Y position (px)',
          min: 0,
          defaultValue: 0
        },
        width: {
          type: 'number',
          label: 'Width (px)',
          min: 1,
          defaultValue: stats.totalWidth || 400
        },
        height: {
          type: 'number',
          label: 'Height (px)',
          min: 1,
          defaultValue: stats.totalHeight || 300
        }
      },
      async (values) => {
        if (!values) return;
        
        try {
          const x = parseInt(values.x, 10);
          const y = parseInt(values.y, 10);
          const width = parseInt(values.width, 10);
          const height = parseInt(values.height, 10);
          
          // Crop the image
          await editor.cropImage(x, y, width, height);
        } catch (error) {
          console.error('Error cropping image:', error);
          modalUI.showAlert('Error', 'Failed to crop image. Please try again.');
        }
      }
    );
  });
  
  // Keep track of memory stats
  let stats = {};
  
  eventBus.on('memory:stats:updated', (newStats) => {
    stats = newStats;
  });
  
  // Initialize UI
  toolsUI.init();
  memoryUI.init();
}