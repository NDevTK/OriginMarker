'use strict';

// Original global variables for UI elements
var reset = document.getElementById('reset');
var store = document.getElementById('store');

// Modal DOM element variables - these will be initialized in main()
var customConfirmModal;
var confirmModalTextElement; // Renamed to avoid conflict
var confirmModalConfirmButton;
var cancelModalCancelButton;

// --- Modal Helper Functions ---
function showCustomConfirmModal(message) {
  if (confirmModalTextElement && customConfirmModal) {
    confirmModalTextElement.textContent = message;
    customConfirmModal.style.display = 'block';
  } else {
    console.error(
      'Custom modal interactive elements (text display or main container) not found. Check IDs in options.html and options.js.'
    );
    // Fallback to window.confirm if modal elements are not found, as a last resort.
    if (
      window.confirm(
        message +
          '\n\n(Critical: Custom modal UI failed to display. Falling back to browser confirmation.)'
      )
    ) {
      proceedWithReset().catch((err) =>
        console.error('Error during fallback reset:', err)
      );
    }
  }
}

function hideCustomConfirmModal() {
  if (customConfirmModal) {
    customConfirmModal.style.display = 'none';
  }
}

// --- Core Logic for Reset Operation ---
async function proceedWithReset() {
  // Explicitly check for the store element first
  if (!store) {
    console.error(
      'OriginMarker Options: Store select element (store) is missing. Cannot proceed with reset.'
    );
    if (reset) {
      reset.innerText = 'Error: Store select missing.';
      setTimeout(() => {
        if (reset)
          reset.innerText = 'Clear All Extension Data (Resets Markers & Salt)';
      }, 3000);
    } else {
      alert(
        'OriginMarker Options: Store select element (store) is missing. Cannot proceed with reset.'
      );
    }
    return;
  }

  // Check for reset button or store value (store existence is confirmed)
  if (!reset || !store.value) {
    console.error(
      'OriginMarker Options: Reset button or store value is missing. Cannot proceed with reset.'
    );
    if (reset) {
      reset.innerText = 'Error: Reset/Store value missing.';
      setTimeout(() => {
        if (reset)
          reset.innerText = 'Clear All Extension Data (Resets Markers & Salt)';
      }, 3000);
    } else {
      // This case implies reset is null
      alert(
        'OriginMarker Options: Reset button is missing. Cannot proceed with reset.'
      );
    }
    return;
  }

  reset.disabled = true;
  reset.innerText = 'Clearing...';
  try {
    await new Promise((resolve, reject) => {
      chrome.storage[store.value].clear(function () {
        if (chrome.runtime.lastError) {
          console.error(
            'OriginMarker Options: Error clearing storage (area: ' +
              store.value +
              '):',
            chrome.runtime.lastError.message
          );
          return reject(chrome.runtime.lastError);
        }
        resolve();
      });
    });
    reset.innerText =
      'All data for the ' + store.value + ' storage area has been cleared.';
  } catch (error) {
    console.error(
      'OriginMarker Options: Error clearing storage (area: ' +
        store.value +
        '):',
      error
    );
    if (reset) {
      reset.innerText = 'Error clearing data. See console.';
    }
  } finally {
    setTimeout(() => {
      if (reset) {
        reset.innerText = 'Clear All Extension Data (Resets Markers & Salt)';
        reset.disabled = false;
      }
    }, 3000); // Re-enable button and restore text after 3 seconds
  }
}

// --- Chrome Storage Utility Functions (Promise-based) ---
function setDataLocal(key, value) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({[key]: value}, function () {
      if (chrome.runtime.lastError) {
        console.error(
          'Error in setDataLocal for key "' + key + '":',
          chrome.runtime.lastError.message
        );
        return reject(chrome.runtime.lastError);
      }
      resolve();
    });
  });
}

function getDataLocal(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, function (result) {
      if (chrome.runtime.lastError) {
        console.error(
          'Error in getDataLocal for key "' + key + '":',
          chrome.runtime.lastError.message
        );
        return reject(chrome.runtime.lastError);
      }
      resolve(result[key]);
    });
  });
}

// --- Main Initialization Function ---
async function main() {
  // Initialize references to modal DOM elements
  customConfirmModal = document.getElementById('customConfirmModal');
  confirmModalTextElement = document.getElementById('confirmModalText');
  confirmModalConfirmButton = document.getElementById('confirmModalButton');
  cancelModalCancelButton = document.getElementById('cancelModalButton');

  // Load and apply stored preference for storage area
  try {
    const storedValue = await getDataLocal('store');
    if (store) {
      // Ensure store select element exists
      if (storedValue) {
        store.value = storedValue;
      } else {
        // Default to 'sync' if nothing stored, and save this default.
        store.value = 'sync';
        await setDataLocal('store', 'sync');
      }
    } else {
      console.error(
        "Store select element (id='store') not found during main init."
      );
    }
  } catch (error) {
    console.error(
      'Failed to initialize storage preference from local storage:',
      error
    );
    if (store) store.value = 'sync'; // Fallback default
  }

  // Event listener for the main "Reset" button
  if (reset) {
    reset.onclick = () => {
      if (!store || !store.value) {
        alert(
          'Storage area setting is missing. Please refresh or select a storage area.'
        );
        return;
      }
      const confirmationMessage =
        'Are you sure you want to clear all extension data for the selected storage area (' +
        store.value +
        ")?\n\nThis is irreversible and will clear all settings, custom markers, and the unique salt.\nThis means all automatic markers will change, and if you were using a specific bookmark as a placeholder, you might need to reconfigure it by creating/renaming a bookmark with '*' or '**' as its title.\n\nDo you want to proceed?";
      showCustomConfirmModal(confirmationMessage);
    };
  } else {
    console.error("Reset button (id='reset') not found.");
  }

  // Event listener for the storage area select dropdown
  if (store) {
    store.onchange = async () => {
      try {
        await setDataLocal('store', store.value);
        alert(
          "Storage area preference saved to '" +
            store.value +
            "'. This will be used for future operations. A full extension reload might be needed for all parts to reflect this change immediately."
        );
        // Consider if chrome.runtime.reload() is desired here.
        // For now, an alert is used as it's less disruptive.
        // chrome.runtime.reload();
      } catch (error) {
        alert('Failed to save storage preference. Please try again.');
      }
    };
  } else {
    // Already logged error if store element is not found during main init
  }

  // Event listeners for custom modal buttons
  if (confirmModalConfirmButton) {
    confirmModalConfirmButton.onclick = async () => {
      hideCustomConfirmModal();
      await proceedWithReset();
    };
  } else {
    console.error("Modal Confirm button (id='confirmModalButton') not found.");
  }

  if (cancelModalCancelButton) {
    cancelModalCancelButton.onclick = () => {
      hideCustomConfirmModal();
    };
  } else {
    console.error("Modal Cancel button (id='cancelModalButton') not found.");
  }
}

// Run the main initialization logic
main().catch((error) => {
  console.error('Critical error during options page initialization:', error);
  alert(
    'The options page encountered a critical error during startup. Some features may not work correctly. Please try refreshing the page or contacting support if the issue persists.'
  );
});
