/**
 * Sets up the modal UI
 * @param {Object} config - Configuration object
 * @param {Object} config.eventBus - Event bus for communication
 * @returns {Object} - Modal UI API
 */
export function setupModalUI({ eventBus }) {
  // DOM elements
  const modalContainer = document.getElementById('modal-container');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  const modalClose = document.getElementById('modal-close');
  const modalCancel = document.getElementById('modal-cancel');
  const modalConfirm = document.getElementById('modal-confirm');
  
  /**
   * Show a modal dialog
   * @param {Object} options - Modal options
   * @param {string} options.title - Modal title
   * @param {string} options.content - Modal content (HTML)
   * @param {boolean} options.showCancel - Whether to show the cancel button
   * @param {string} options.confirmText - Text for the confirm button
   * @param {string} options.cancelText - Text for the cancel button
   * @param {Function} options.onConfirm - Callback for confirm button
   * @param {Function} options.onCancel - Callback for cancel button
   */
  function showModal(options) {
    // Set modal content
    modalTitle.textContent = options.title || 'Modal';
    modalBody.innerHTML = options.content || '';
    
    // Set button text
    modalConfirm.textContent = options.confirmText || 'OK';
    modalCancel.textContent = options.cancelText || 'Cancel';
    
    // Show/hide cancel button
    if (options.showCancel === false) {
      modalCancel.style.display = 'none';
    } else {
      modalCancel.style.display = 'block';
    }
    
    // Button click handlers
    const confirmHandler = () => {
      hideModal();
      if (typeof options.onConfirm === 'function') {
        options.onConfirm();
      }
    };
    
    const cancelHandler = () => {
      hideModal();
      if (typeof options.onCancel === 'function') {
        options.onCancel();
      }
    };
    
    // Remove existing event listeners
    modalConfirm.removeEventListener('click', confirmHandler);
    modalCancel.removeEventListener('click', cancelHandler);
    modalClose.removeEventListener('click', cancelHandler);
    
    // Add new event listeners
    modalConfirm.addEventListener('click', confirmHandler);
    modalCancel.addEventListener('click', cancelHandler);
    modalClose.addEventListener('click', cancelHandler);
    
    // Show the modal
    modalContainer.classList.remove('hidden');
    modalContainer.classList.add('fade-in');
  }
  
  /**
   * Hide the modal
   */
  function hideModal() {
    modalContainer.classList.add('hidden');
  }
  
  /**
   * Show an alert dialog
   * @param {string} title - Alert title
   * @param {string} message - Alert message
   * @param {Function} callback - Callback when alert is closed
   */
  function showAlert(title, message, callback) {
    showModal({
      title,
      content: `<p>${message}</p>`,
      showCancel: false,
      confirmText: 'OK',
      onConfirm: callback
    });
  }
  
  /**
   * Show a confirmation dialog
   * @param {string} title - Confirmation title
   * @param {string} message - Confirmation message
   * @param {Function} onConfirm - Callback for confirm button
   * @param {Function} onCancel - Callback for cancel button
   */
  function showConfirm(title, message, onConfirm, onCancel) {
    showModal({
      title,
      content: `<p>${message}</p>`,
      confirmText: 'Yes',
      cancelText: 'No',
      onConfirm,
      onCancel
    });
  }
  
  /**
   * Show a dialog with form options
   * @param {string} title - Dialog title
   * @param {string} message - Dialog message
   * @param {Object} options - Form options
   * @param {Function} callback - Callback with form values
   */
  function showOptionsDialog(title, message, options, callback) {
    let formHtml = `<p>${message}</p><form id="modal-form">`;
    
    // Create form elements for each option
    for (const [key, option] of Object.entries(options)) {
      const id = `option-${key}`;
      formHtml += `<div class="form-group">`;
      formHtml += `<label for="${id}">${option.label}</label>`;
      
      switch (option.type) {
        case 'text':
          formHtml += `
            <input type="text" id="${id}" name="${key}" 
              value="${option.defaultValue || ''}"
              ${option.placeholder ? `placeholder="${option.placeholder}"` : ''}
              ${option.required ? 'required' : ''}
            >
          `;
          break;
          
        case 'number':
          formHtml += `
            <input type="number" id="${id}" name="${key}" 
              value="${option.defaultValue || ''}"
              ${option.min !== undefined ? `min="${option.min}"` : ''}
              ${option.max !== undefined ? `max="${option.max}"` : ''}
              ${option.step ? `step="${option.step}"` : ''}
              ${option.required ? 'required' : ''}
            >
          `;
          break;
          
        case 'select':
          formHtml += `<select id="${id}" name="${key}">`;
          for (const opt of option.options) {
            const selected = opt.value === option.defaultValue ? 'selected' : '';
            formHtml += `<option value="${opt.value}" ${selected}>${opt.label}</option>`;
          }
          formHtml += `</select>`;
          break;
          
        case 'checkbox':
          formHtml += `
            <div class="checkbox-wrapper">
              <input type="checkbox" id="${id}" name="${key}" 
                ${option.defaultValue ? 'checked' : ''}>
            </div>
          `;
          break;
          
        case 'radio':
          for (const opt of option.options) {
            const radioId = `${id}-${opt.value}`;
            const checked = opt.value === option.defaultValue ? 'checked' : '';
            formHtml += `
              <div class="radio-wrapper">
                <input type="radio" id="${radioId}" name="${key}" 
                  value="${opt.value}" ${checked}>
                <label for="${radioId}">${opt.label}</label>
              </div>
            `;
          }
          break;
          
        default:
          formHtml += `
            <input type="text" id="${id}" name="${key}" 
              value="${option.defaultValue || ''}">
          `;
      }
      
      formHtml += `</div>`;
    }
    
    formHtml += `</form>`;
    
    showModal({
      title,
      content: formHtml,
      confirmText: 'Apply',
      cancelText: 'Cancel',
      onConfirm: () => {
        const form = document.getElementById('modal-form');
        const formData = new FormData(form);
        const values = {};
        
        // Process form values
        for (const [key, option] of Object.entries(options)) {
          if (option.type === 'checkbox') {
            values[key] = form.elements[key].checked;
          } else {
            values[key] = formData.get(key);
          }
        }
        
        callback(values);
      },
      onCancel: () => {
        callback(null);
      }
    });
    
    // Add styles for form elements
    const style = document.createElement('style');
    style.textContent = `
      .form-group {
        margin-bottom: 16px;
      }
      
      .form-group label {
        display: block;
        margin-bottom: 4px;
        font-weight: 500;
      }
      
      .form-group input[type="text"],
      .form-group input[type="number"],
      .form-group select {
        width: 100%;
        padding: 8px;
        border: 1px solid var(--color-border);
        border-radius: var(--border-radius-sm);
        background-color: var(--color-bg);
        color: var(--color-text-primary);
      }
      
      .checkbox-wrapper,
      .radio-wrapper {
        display: flex;
        align-items: center;
        margin-bottom: 4px;
      }
      
      .checkbox-wrapper label,
      .radio-wrapper label {
        margin-left: 8px;
        margin-bottom: 0;
      }
    `;
    
    document.head.appendChild(style);
    
    // Remove the style element when the modal is closed
    const removeStyle = () => {
      document.head.removeChild(style);
      modalConfirm.removeEventListener('click', removeStyle);
      modalCancel.removeEventListener('click', removeStyle);
      modalClose.removeEventListener('click', removeStyle);
    };
    
    modalConfirm.addEventListener('click', removeStyle);
    modalCancel.addEventListener('click', removeStyle);
    modalClose.addEventListener('click', removeStyle);
  }
  
  // Listen for modal events
  eventBus.on('modal:show', showModal);
  eventBus.on('modal:hide', hideModal);
  eventBus.on('modal:alert', (options) => {
    showAlert(options.title, options.message, options.callback);
  });
  eventBus.on('modal:confirm', (options) => {
    showConfirm(options.title, options.message, options.onConfirm, options.onCancel);
  });
  
  return {
    showModal,
    hideModal,
    showAlert,
    showConfirm,
    showOptionsDialog
  };
}