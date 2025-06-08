'use strict';

// Original global variables for UI elements
var reset = document.getElementById('reset');
var store = document.getElementById('store');

// Modal DOM element variables - these will be initialized in main()
var customConfirmModal;
var confirmModalTextElement; // Renamed to avoid conflict
var confirmModalConfirmButton;
var cancelModalCancelButton;

let currentOnConfirmAction = null;
let lastConfirmedStorageValue; // To store the last saved storage preference

// --- Modal Helper Functions ---
function showCustomConfirmModal(message, isConfirmation, onConfirmAction) {
  currentOnConfirmAction = onConfirmAction || null; // Store the callback
  if (confirmModalTextElement && customConfirmModal) {
    confirmModalTextElement.textContent = message;
    customConfirmModal.style.display = 'block';
    if (cancelModalCancelButton) {
      cancelModalCancelButton.style.display = isConfirmation
        ? 'inline-block'
        : 'none';
    }
  }
  // Removed fallback to window.confirm
  // If modal elements are not found, an error will be logged in the console.
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
      showCustomConfirmModal(
        'OriginMarker Options: Store select element (store) is missing. Cannot proceed with reset.',
        false,
        null
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
      showCustomConfirmModal(
        'OriginMarker Options: Reset button is missing. Cannot proceed with reset.',
        false,
        null
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
    chrome.runtime.sendMessage('refresh');
    main();
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
      lastConfirmedStorageValue = store.value; // Initialize with the loaded or default value
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
    if (store) {
      store.value = 'sync'; // Fallback default
      lastConfirmedStorageValue = store.value; // Initialize with the fallback default value
    }
  }

  // Event listener for the main "Reset" button
  if (reset) {
    reset.onclick = () => {
      if (!store || !store.value) {
        showCustomConfirmModal(
          'Storage area setting is missing. Please refresh or select a storage area.',
          false,
          null
        );
        return;
      }
      const confirmationMessage =
        'Are you sure you want to clear all extension data for the selected storage area (' +
        store.value +
        ")?\n\nThis is irreversible and will clear all settings, custom markers, and the unique salt.\nThis means all automatic markers will change, and if you were using a specific bookmark as a placeholder, you might need to reconfigure it by creating/renaming a bookmark with '*' or '**' as its title.\n\nDo you want to proceed?";
      showCustomConfirmModal(confirmationMessage, true, proceedWithReset);
    };
  } else {
    console.error("Reset button (id='reset') not found.");
  }

  // Event listener for the storage area select dropdown
  if (store) {
    store.onchange = async () => {
      try {
        // First dialog: Confirms saving and initial extension reload
        showCustomConfirmModal(
          "Your storage preference will be saved to '" +
            store.value +
            "'. Click Confirm to proceed.",
          true, // Show Confirm and Cancel buttons
          async () => {
            // Action for the dialog's "Confirm"
            const newStoreValue = store.value; // Capture before potential async ops
            await setDataLocal('store', newStoreValue); // Save the preference
            lastConfirmedStorageValue = newStoreValue; // Update on successful save
            chrome.runtime.sendMessage('refresh');
          }
        );
      } catch (error) {
        showCustomConfirmModal(
          'Failed to save storage preference. Please try again.',
          false, // Show only "Confirm" (acting as "OK") for error messages
          null // No action on confirm for the error message itself
        );
      }
    };
  } else {
    // Already logged error if store element is not found during main init
  }

  // Event listeners for custom modal buttons
  if (confirmModalConfirmButton) {
    confirmModalConfirmButton.onclick = async () => {
      hideCustomConfirmModal();
      if (typeof currentOnConfirmAction === 'function') {
        await currentOnConfirmAction(); // Await if it's an async function like proceedWithReset
        currentOnConfirmAction = null; // Clear after execution
      }
    };
  } else {
    console.error("Modal Confirm button (id='confirmModalButton') not found.");
  }

  if (cancelModalCancelButton) {
    cancelModalCancelButton.onclick = () => {
      // Check if the modal was for the store change confirmation
      // This can be inferred if currentOnConfirmAction is not the reset action
      // A more robust way would be to have specific flags or check the message content if needed.
      // For now, we assume any cancel during options page might need to revert store.value if it changed.
      if (store && store.value !== lastConfirmedStorageValue) {
        // Check if the current store.value is different from the last confirmed one
        // This implies the user changed the dropdown but hasn't confirmed yet.
        const previousValue = store.value; // Value before reverting
        store.value = lastConfirmedStorageValue; // Revert to the last saved value
        console.log(
          `Store selection reverted from ${previousValue} to ${lastConfirmedStorageValue} due to cancel.`
        );
      }
      hideCustomConfirmModal();
    };
  } else {
    console.error("Modal Cancel button (id='cancelModalButton') not found.");
  }
}

// Run the main initialization logic
main().catch((error) => {
  console.error('Critical error during options page initialization:', error);
  showCustomConfirmModal(
    'The options page encountered a critical error during startup. Some features may not work correctly. Please try refreshing the page or contacting support if the issue persists.',
    false,
    null
  );
});
