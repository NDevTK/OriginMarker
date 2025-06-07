'use strict';

importScripts('/static.js');

let areAlphabetsValid = true; // Default to true
var encoding;

const MIN_ALPHABET_LENGTH = 16; // For source alphabet, expecting full hex set
const MIN_EMOJI_ALPHABET_LENGTH = 64; // For emoji alphabet

let sourceAlphabetValid = Array.isArray(source) && source.length >= MIN_ALPHABET_LENGTH;
let emojiAlphabetValid = Array.isArray(emoji) && emoji.length >= MIN_EMOJI_ALPHABET_LENGTH; // Uses new constant

if (sourceAlphabetValid && emojiAlphabetValid) {
  encoding = base2baseForEmojis([...source], [...emoji]); // Use base2baseForEmojis
} else {
  areAlphabetsValid = false;
  if (!sourceAlphabetValid) {
    console.error('OriginMarker: Source alphabet from static.js is invalid or too short. Expected array with >= ' + MIN_ALPHABET_LENGTH + ' elements. Value:', source);
  }
  if (!emojiAlphabetValid) {
    // Uses new constant in message:
    console.error('OriginMarker: Emoji alphabet from static.js is invalid or too short. Expected array with >= ' + MIN_EMOJI_ALPHABET_LENGTH + ' elements. Value:', emoji);
  }
  encoding = () => unknown; // Fallback encoding function
}

let resolveInitialization;
const initializationCompletePromise = new Promise((resolve) => {
  resolveInitialization = resolve;
});

// For DoS Protection
const EVENT_RATE_THRESHOLD_COUNT = 10; // Max events before triggering
const EVENT_RATE_THRESHOLD_WINDOW_MS = 3000; // Time window in ms
const DOS_INITIAL_COOLDOWN_MS = 5000;    // Cooldown after first detection
const DOS_EXTENDED_COOLDOWN_MS = 10000;  // Cooldown if DoS persists after a check

const DOS_STATE_NORMAL = 'NORMAL';
const DOS_STATE_COOLDOWN = 'COOLDOWN';
let currentDosState = DOS_STATE_NORMAL;

let tabEventTimestamps = []; // Array to store timestamps of recent tab events
let dosCooldownTimer = null;   // Timer ID for cooldown periods

var auto;
var store;
var mode;
var salt;
var active_origin;
var pending_origin;
var bookmark;
const allowedProtocols = new Set(['https:', 'http:']);

let bookmarkChangeDebounceTimer = null;
const BOOKMARK_CHANGE_DEBOUNCE_DELAY = 1000;

let currentPlaceholderAbortController = null;

async function start() {
  bookmark = await getDataLocal('bookmark');
  if (bookmark !== undefined && typeof bookmark !== 'string') {
    console.warn(
      'OriginMarker: Bookmark ID from storage is not a string. Resetting.'
    );
    bookmark = undefined;
  }

  let storeValue = await getDataLocal('store');
  if (!['sync', 'local', 'session'].includes(storeValue)) {
    console.warn(
      `OriginMarker: Invalid store value '${storeValue}' loaded from storage. Defaulting to 'sync'.`
    );
    storeValue = 'sync';
    try {
      await setDataLocal('store', storeValue);
    } catch (error) {
      console.error(
        'OriginMarker: Failed to save default store setting:',
        error
      );
    }
  }
  store = storeValue;

  if (bookmark !== undefined) {
    try {
      await chrome.bookmarks.get(bookmark);
    } catch (error) {
      console.error('Error fetching bookmark in start():', error);
      bookmark = undefined;
    }
  }
  if (bookmark === undefined) {
    await initBookmark();
  }
  mode = await getDataLocal('mode');
  if (mode !== undefined && typeof mode !== 'string') {
    console.warn('OriginMarker: Mode from storage is not a string. Resetting.');
    mode = undefined;
  }
  await setMode(mode);
  resolveInitialization();
  checkOrigin();
}

chrome.tabs.onUpdated.addListener(handleTabEventThrottled);
chrome.tabs.onActivated.addListener(handleTabEventThrottled);
chrome.windows.onFocusChanged.addListener(handleTabEventThrottled);
chrome.bookmarks.onChanged.addListener(onBookmarkChange);
chrome.bookmarks.onRemoved.addListener(onBookmarkRemove);

chrome.runtime.onMessage.addListener((message, sender) => {
  if (sender.origin !== location.origin) return;
  if (message === 'refresh') {
    start();
  }
});

// On install display the options page to guide the user
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
});

async function initBookmark() {
  // bookmark = undefined; // Initialize/clear in-memory bookmark at the start of the process.
  // This will be set only if new ID is persisted.

  try {
    // Clear any old bookmark ID from storage first.
    // This ensures that if the user is re-initializing, we don't leave stale data.
    await setDataLocal('bookmark', undefined);
    console.log('OriginMarker: Cleared previous bookmark ID from storage.');
    // Explicitly set in-memory bookmark to undefined after successful clear.
    bookmark = undefined;
  } catch (error) {
    console.error(
      'Error clearing previous bookmark ID from storage (non-critical for new setup):',
      error
    );
    // If clearing fails, the old bookmark ID might still be in storage.
    // `onPlaceholder` will proceed to get a new one.
    // The main concern is persisting the *new* ID correctly later.
    // For the purpose of this function, `bookmark` should ideally be undefined now,
    // as we are trying to initialize a *new* or *reset* setup.
    // If `start()` previously loaded a value into `bookmark`, and clearing fails,
    // that old value would persist in-memory until a new one is successfully set.
    // To ensure `initBookmark` attempts a fresh setup, we set `bookmark` to undefined here
    // regardless of clearing success, as `onPlaceholder` is meant to find/set a new one.
    bookmark = undefined;
  }

  // `onPlaceholder` waits for user to designate a bookmark by naming it '*' or '**'.
  // `setMode` (called within `onPlaceholder`) is now robust and handles its own state/storage.
  // `onPlaceholder` will only return a bookmark ID if `setMode` was successful for that bookmark.

  if (currentPlaceholderAbortController) {
    currentPlaceholderAbortController.abort(); // Abort any ongoing placeholder process
  }
  const localAbortController = new AbortController();
  currentPlaceholderAbortController = localAbortController;
  let newBookmarkId;
  let aborted = false;

  try {
    newBookmarkId = await onPlaceholder(localAbortController.signal);

    if (localAbortController.signal.aborted) {
      aborted = true;
      console.log('OriginMarker: initBookmark aborted by new call.');
      // newBookmarkId will be undefined, skip persistence
    } else if (newBookmarkId !== undefined) {
      await setDataLocal('bookmark', newBookmarkId);
      // Only update in-memory `bookmark` if persistence is successful.
      bookmark = newBookmarkId;
      chrome.action.setBadgeText({text: ''});
      console.log('OriginMarker: New bookmark ID persisted:', bookmark);
      active_origin = undefined; // Reset active_origin before check
      checkOrigin(); // Update marker immediately after setup for the new bookmark
    }
    // No specific action if newBookmarkId is undefined and not aborted,
    // as onPlaceholder returning undefined means it couldn't get a bookmark.
    // The 'ERR' badge for persistence failure is handled below.
  } catch (error) {
    if (error.name === 'AbortError') {
      aborted = true;
      console.log(
        'OriginMarker: onPlaceholder operation was aborted.',
        error.message
      );
      // newBookmarkId remains undefined, no 'ERR' badge for abort.
    } else {
      console.error(
        'CRITICAL: Failed to persist new bookmark ID or unexpected error in initBookmark:',
        newBookmarkId, // could be undefined if onPlaceholder failed before persistence
        'Error:',
        error
      );
      // Set error badge only if not aborted and there was a critical error
      // (e.g. setDataLocal failed, or onPlaceholder threw other than AbortError)
      chrome.action.setBadgeText({text: 'ERR'});
      chrome.action.setBadgeBackgroundColor({color: '#FF0000'}); // Red
    }
  } finally {
    if (currentPlaceholderAbortController === localAbortController) {
      currentPlaceholderAbortController = null;
    }
  }

  if (!aborted && newBookmarkId === undefined) {
    // This case means onPlaceholder completed (was not aborted) but failed to return a bookmark ID.
    // This could be due to setMode failing repeatedly or some other logic flaw in onPlaceholder.
    // It's a failure state for initialization distinct from an abort or setDataLocal failure.
    console.error(
      'OriginMarker: initBookmark completed without a valid bookmark ID and was not aborted. Extension may not function.'
    );
    // Setting ERR badge here because the process finished without success and wasn't aborted.
    // If onPlaceholder itself was supposed to set an error state or retry, that's internal to it.
    // From initBookmark's perspective, it just didn't get an ID.
    chrome.action.setBadgeText({text: 'ERR'});
    chrome.action.setBadgeBackgroundColor({color: '#FF0000'}); // Red
  }
}

async function onPlaceholder(signal) {
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

  let onBookmarkCreatedListener, onBookmarkChangedListener, promiseReject;

  const cleanupListeners = () => {
    if (onBookmarkCreatedListener) {
      chrome.bookmarks.onCreated.removeListener(onBookmarkCreatedListener);
      onBookmarkCreatedListener = null;
    }
    if (onBookmarkChangedListener) {
      chrome.bookmarks.onChanged.removeListener(onBookmarkChangedListener);
      onBookmarkChangedListener = null;
    }
  };

  const abortListener = () => {
    cleanupListeners();
    if (promiseReject) {
      promiseReject(new DOMException('Aborted', 'AbortError'));
      promiseReject = null; // Ensure it's not called again
    }
  };

  signal.addEventListener('abort', abortListener, {once: true});

  try {
    while (true) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

      const result = await new Promise((resolve, reject) => {
        promiseReject = reject; // Assign reject for the abort listener
        if (signal.aborted) {
          // Check again, as abort could happen before listeners are set
          return reject(new DOMException('Aborted', 'AbortError'));
        }

        onBookmarkCreatedListener = (id, bookmarkNode) => {
          if (signal.aborted) {
            // Check before resolving
            resolve(undefined); // Or reject, but resolving undefined signals abort to caller loop
            return;
          }
          cleanupListeners();
          signal.removeEventListener('abort', abortListener); // Crucial: remove abort listener on normal completion path for this promise
          resolve([id, bookmarkNode.title]);
        };

        onBookmarkChangedListener = (id, changeInfo) => {
          if (signal.aborted) {
            // Check before resolving
            resolve(undefined);
            return;
          }
          cleanupListeners();
          signal.removeEventListener('abort', abortListener); // Crucial: remove abort listener
          resolve([id, changeInfo.title]);
        };

        chrome.bookmarks.onCreated.addListener(onBookmarkCreatedListener);
        chrome.bookmarks.onChanged.addListener(onBookmarkChangedListener);
      });

      promiseReject = null; // Clear promiseReject after promise settles

      if (signal.aborted || result === undefined) {
        // result undefined if promise resolved due to abort check
        throw new DOMException('Aborted', 'AbortError');
      }

      if (await setMode(result[1])) {
        // Successfully set mode with a valid bookmark
        return result[0]; // Resolve with the bookmark ID
      }
      // If setMode returns false, the loop continues, re-waiting for bookmark events.
      // Ensure signal.aborted is checked at the start of the loop.
    }
  } finally {
    cleanupListeners(); // Ensure listeners are cleaned up on any exit (normal, error, abort)
    signal.removeEventListener('abort', abortListener); // Clean up the main abort listener for onPlaceholder
  }
}

async function setMode(data) {
  let saltSuccessfullyHandled = false; // Flag to track salt operations

  if (data === '*') {
    try {
      const fetchedSalt = await getData('salt');
      if (typeof fetchedSalt === 'string' && fetchedSalt.length > 0) {
        salt = fetchedSalt;
        saltSuccessfullyHandled = true;
      } else {
        // Salt is not a valid non-empty string. Determine why.
        if (fetchedSalt === undefined) {
          // Salt not found, no specific warning before generation.
        } else if (typeof fetchedSalt !== 'string') {
          // Salt is defined but not a string
          console.warn(
            `OriginMarker: Salt from storage is not a string (type: ${typeof fetchedSalt}). Will attempt to generate new salt.`
          );
        } else {
          // Salt is an empty string
          console.warn(
            `OriginMarker: Invalid salt found in storage (type: ${typeof fetchedSalt}, value: '${fetchedSalt}'). Generating new salt.`
          );
        }

        // Common path for generating new salt
        const newSalt = crypto.randomUUID();
        try {
          await setData('salt', newSalt);
          salt = newSalt;
          saltSuccessfullyHandled = true;
        } catch (error) {
          console.error('OriginMarker: Failed to set new salt:', error);
          saltSuccessfullyHandled = false;
        }
      }
    } catch (error) {
      console.error('OriginMarker: Failed to get or set salt:', error);
      saltSuccessfullyHandled = false;
    }
    auto = saltSuccessfullyHandled && areAlphabetsValid;
  } else if (data === '**') {
    auto = false;
    saltSuccessfullyHandled = true; // No salt operation needed, so considered successful for mode setting
  } else {
    // Not a valid mode string
    return false;
  }

  // If salt handling failed for auto mode (data === '*'), we cannot proceed reliably.
  // 'auto' would already be false from 'auto = saltSuccessfullyHandled;' earlier in the function.
  // Simply return false to indicate failure.
  if (data === '*' && !saltSuccessfullyHandled) {
    // Do not change persisted mode if we intended to go to auto but couldn't.
    // Caller might need to know this failed.
    return false;
  }

  if (mode !== data) {
    try {
      await setDataLocal('mode', data);
      mode = data; // Update in-memory mode
    } catch (error) {
      console.error('Failed to set mode locally:', error);
      return false; // Failed to persist mode change
    }
  }
  return true;
}

function handleTabEventThrottled() {
  recordTabEvent(); // Record every event timestamp and prune old ones

  if (currentDosState === DOS_STATE_COOLDOWN) {
    // Currently in cooldown, ignore this event to prevent further processing
    // console.log("OriginMarker: In DoS cooldown, tab event ignored."); // Optional: for debugging
    return;
  }

  // Check if the event rate is now exceeded
  if (checkEventRate()) {
    // console.log("OriginMarker: Event rate exceeded."); // Optional: for debugging
    // If we were in a NORMAL state, this is a new detection.
    // enterDosCooldownMode() will handle the transition to COOLDOWN state and side effects.
    if (currentDosState === DOS_STATE_NORMAL) {
      enterDosCooldownMode();
    }
  } else {
    // Event rate is normal AND we are not in a cooldown period.
    // Proceed with normal operation if the state is normal.
    // (If we had a SUSPECTED state, we might transition from SUSPECTED to NORMAL here if rate drops)
    if (currentDosState === DOS_STATE_NORMAL) {
      checkOrigin();
    }
  }
}

function enterDosCooldownMode() {
  // Only proceed if not already in cooldown; this check might be redundant
  // if callers (handleTabEventThrottled) already ensure they only call this
  // when currentDosState is NORMAL, but it's a safe guard.
  if (currentDosState === DOS_STATE_COOLDOWN && dosCooldownTimer !== null) {
    // console.log("OriginMarker: Already in DoS cooldown mode or cooldown timer active."); // Optional debug
    return;
  }

  console.warn("OriginMarker: High frequency of tab events detected. Entering cooldown mode and setting marker to default.");

  currentDosState = DOS_STATE_COOLDOWN;
  setMarker(null); // Set to generic/unknown marker

  // Clear any existing timer to ensure only one recovery path is active
  if (dosCooldownTimer) {
    clearTimeout(dosCooldownTimer);
  }

  dosCooldownTimer = setTimeout(checkDosRecovery, DOS_INITIAL_COOLDOWN_MS);
}

function checkDosRecovery() {
  // Clear the timer reference that called this function
  dosCooldownTimer = null;

  if (checkEventRate()) {
    // Event rate is still high
    console.warn("OriginMarker: DoS condition persists. Extending cooldown.");
    // currentDosState remains DOS_STATE_COOLDOWN
    // Restart the timer with the extended cooldown period
    dosCooldownTimer = setTimeout(checkDosRecovery, DOS_EXTENDED_COOLDOWN_MS);
  } else {
    // Event rate has returned to normal
    console.log("OriginMarker: Event rate normal. Recovering from DoS cooldown.");
    currentDosState = DOS_STATE_NORMAL;
    // Attempt to set the correct marker for the current tab immediately
    checkOrigin();
  }
}

async function setMarker(origin) {
  // If the new origin is the same as the currently active one, no update needed.
  if (origin === active_origin) {
    return;
  }

  const original_pending_origin = origin; // Capture the origin this function call is for
  pending_origin = origin; // Update global pending_origin

  let newMarkerTitle;

  if (origin === null) {
    newMarkerTitle = unknown + '*'; // Default case for null origin
  } else {
    const fullHash = await sha256(origin); // Hashing is done only for non-null origins
    const key = '_' + fullHash;
    let customMarkerValue = await getData(key);

    if (customMarkerValue !== undefined && typeof customMarkerValue !== 'string') {
      console.warn(
        `OriginMarker: Custom marker for key ${key} (origin: ${origin}) is not a string. Defaulting to auto-marker.`
      );
      customMarkerValue = undefined; // Treat invalid custom marker as if none was found
    }

    if (customMarkerValue !== undefined) {
      newMarkerTitle = customMarkerValue; // Use custom marker as is (no '*' suffix here)
    } else {
      // No valid custom marker found, generate one
      if (auto === true) {
        newMarkerTitle = encoding(fullHash) + '*'; // Auto-generated gets '*'
      } else {
        newMarkerTitle = unknown + '*'; // Manual mode default (or other fallback) gets '*'
      }
    }
  }

  // If the global pending_origin has changed since we started this async function,
  // it means another call to setMarker for a newer origin has started.
  // We should abort this current, possibly stale, update.
  if (pending_origin !== original_pending_origin) {
    // console.debug("OriginMarker: Stale setMarker call aborted for origin:", original_pending_origin); // Optional
    return;
  }

  try {
    await chrome.bookmarks.update(bookmark, { title: newMarkerTitle });
    active_origin = original_pending_origin; // Set active_origin to the one we successfully processed
  } catch (error) {
    console.error(`OriginMarker: Error updating bookmark for origin ${original_pending_origin}:`, error.message);
    // Do not update active_origin if the bookmark update failed, to allow retry if appropriate.
  }
}

async function checkOrigin() {
  if (currentDosState === DOS_STATE_COOLDOWN) {
    // console.debug("OriginMarker: checkOrigin() called during DoS cooldown state. Execution halted."); // Optional: for debugging
    return;
  }

  await initializationCompletePromise;
  if (bookmark === undefined) return;

  chrome.tabs.query(
    {
      active: true,
      currentWindow: true
    },
    (tab) => {
      if (chrome.runtime.lastError) {
        console.error(
          'OriginMarker: Error querying tabs in checkOrigin:',
          chrome.runtime.lastError.message
        );
        return setMarker(null); // Exit early if tabs query failed
      }
      if (tab.length !== 1) return setMarker(null);
      if (tab[0].active === false) return;
      try {
        var url = new URL(tab[0].url);
      } catch {
        return setMarker(null);
      }
      // about:blank could be anyone.
      if (!allowedProtocols.has(url.protocol)) return setMarker(null);
      setMarker(url.origin);
    }
  );
}

async function onBookmarkChange(id, e) {
  await initializationCompletePromise;
  // active_origin is captured globally, not passed as arg
  if (
    id !== bookmark ||
    active_origin === undefined ||
    active_origin === null ||
    e.title === undefined ||
    e.title.endsWith('*')
  )
    return;

  const eventOrigin = active_origin; // Capture current active_origin
  const eventTitle = e.title; // Capture current event title

  if (bookmarkChangeDebounceTimer) {
    clearTimeout(bookmarkChangeDebounceTimer);
  }

  bookmarkChangeDebounceTimer = setTimeout(async () => {
    const key = '_' + (await sha256(eventOrigin));

    // Sanitize the eventTitle
    const sanitizedEventTitle = eventTitle.normalize('NFC').replace(/[\u200B-\u200D\u202A-\u202E\u2066-\u2069\uFEFF]/gu, '');

    if (sanitizedEventTitle === '') { // Check if sanitization made it empty
      try {
        await removeData(key);
      } catch (error) {
        console.error(
          'OriginMarker: Failed to remove custom marker for key',
          key,
          'after title sanitized to empty. Error:',
          error.message
        );
      }
      if (active_origin === eventOrigin) {
        active_origin = undefined;
      }
      checkOrigin();
    } else {
      await setData(key, sanitizedEventTitle); // Use the sanitized title
    }
    bookmarkChangeDebounceTimer = null;
  }, BOOKMARK_CHANGE_DEBOUNCE_DELAY);
}

async function onBookmarkRemove(id) {
  await initializationCompletePromise;
  if (id === bookmark) {
    active_origin = undefined;
    await initBookmark();
  }
}

function setDataLocal(key, value) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(
      {
        [key]: value
      },
      function () {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        resolve();
      }
    );
  });
}

function removeData(key) {
  return new Promise((resolve, reject) => {
    if (!store || !chrome.storage[store]) {
      let errorMsg =
        "OriginMarker: Invalid or uninitialized 'store' type for removeData. Store type: " +
        store;
      console.error(errorMsg);
      return reject(new Error(errorMsg));
    }
    chrome.storage[store].remove(key, function () {
      if (chrome.runtime.lastError) {
        // Error is logged by the promise wrapper convention in other storage functions too.
        // console.error("OriginMarker: Error in removeData for key '" + key + "':", chrome.runtime.lastError.message);
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
        return reject(chrome.runtime.lastError);
      }
      resolve(result[key]);
    });
  });
}

function setData(key, value) {
  return new Promise((resolve, reject) => {
    chrome.storage[store].set(
      {
        [key]: value
      },
      function () {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        resolve();
      }
    );
  });
}

function getData(key) {
  return new Promise((resolve, reject) => {
    chrome.storage[store].get(key, function (result) {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(result[key]);
    });
  });
}

async function sha256(data) {
  const msgUint8 = new TextEncoder().encode(data + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
}

function base2baseForEmojis(srcAlphabetChars, dstAlphabetTokens) {
  // 1. Process srcAlphabetChars
  const effectiveSrcAlphabet = [...new Set(
    Array.isArray(srcAlphabetChars) ? srcAlphabetChars.join('') : String(srcAlphabetChars)
  )];
  const fromBase = effectiveSrcAlphabet.length;

  // 2. Process dstAlphabetTokens
  const effectiveDstAlphabet = dstAlphabetTokens; // Array of emoji strings
  const toBase = effectiveDstAlphabet.length;

  // Initial error handling for alphabet sizes
  if (fromBase < 2 || toBase < 2) {
    console.error("OriginMarker: base2baseForEmojis alphabets must have at least 2 unique tokens. fromBase:", fromBase, "toBase:", toBase);
    return (numberStr) => String(unknown); // 'unknown' is globally available
  }

  return (numberStr) => {
    if (typeof numberStr !== 'string') {
      numberStr = String(numberStr);
    }

    if (numberStr === "") { // Handle empty input string
        return "";
    }

    const numberArr = [...numberStr]; // Convert input number string to array of its characters

    let numberMap = {}; // Stores the numeric value of each digit in the input number
                         // Using object for sparse array like behavior if original numberMap did that.
                         // Let's use an array as per refined logic for numberMap.
    let mappedDigits = [];


    for (let i = 0; i < numberArr.length; i++) {
      const digitValue = effectiveSrcAlphabet.indexOf(numberArr[i]);
      if (digitValue === -1) {
        console.error(`OriginMarker: Character '${numberArr[i]}' in input '${numberStr}' not found in source alphabet.`);
        return String(unknown); // Invalid input character
      }
      mappedDigits[i] = digitValue;
    }

    if (mappedDigits.length === 0) { // Should be caught by numberStr === "" earlier, but as a safeguard.
        return "";
    }

    // Handle input "0" (e.g., "0", "00") explicitly to return effectiveDstAlphabet[0]
    let allZeroInput = true;
    for(let i = 0; i < mappedDigits.length; ++i) {
      if(mappedDigits[i] !== 0) {
        allZeroInput = false;
        break;
      }
    }
    if(allZeroInput) {
      // Ensure toBase is not 0 before accessing effectiveDstAlphabet[0]
      // This was already checked by toBase < 2, which implies toBase can't be 0.
      return effectiveDstAlphabet[0];
    }

    // Original loop structure
    var i, divide, newlen;
    var currentLength = mappedDigits.length; // Use currentLength instead of 'length' to avoid conflict
    var result = '';
    // Make a mutable copy of mappedDigits for the loop, similar to original numberMap
    var currentNumberMap = [...mappedDigits];

    do {
      divide = 0;
      newlen = 0;
      for (i = 0; i < currentLength; i++) {
        divide = divide * fromBase + currentNumberMap[i];
        if (divide >= toBase) {
          currentNumberMap[newlen++] = Math.floor(divide / toBase); // Use Math.floor for safety
          divide = divide % toBase;
        } else if (newlen > 0) {
          // Only push 0 if it's not a leading zero for the new numberMap
          // This means the new number being formed in currentNumberMap will not have leading zeros
          // unless the number itself is 0.
          currentNumberMap[newlen++] = 0;
        }
      }
      currentLength = newlen;
      // Ensure divide is a valid index for effectiveDstAlphabet
      if (divide < 0 || divide >= effectiveDstAlphabet.length) {
          console.error("OriginMarker: base2baseForEmojis - 'divide' index out of bounds for destination alphabet. Divide:", divide, "DstLength:", effectiveDstAlphabet.length);
          return String(unknown);
      }
      result = effectiveDstAlphabet[divide] + result;
    } while (newlen != 0);

    return result;
  };
}

function base2base(srcAlphabet, dstAlphabet) {
  /* modification of github.com/HarasimowiczKamil/any-base to:
   * support multibyte
   * enforce unique alphabets
   */
  var noDifference = srcAlphabet === dstAlphabet,
    srcAlphabet = [...new Set([...srcAlphabet].join(''))],
    dstAlphabet = [...new Set([...dstAlphabet].join(''))],
    fromBase = srcAlphabet.length,
    toBase = dstAlphabet.length;

  return (number) => {
    if (noDifference) return number;

    number = [...number];

    var i,
      divide,
      newlen,
      length = number.length,
      result = '',
      numberMap = {};

    for (i = 0; i < length; i++) numberMap[i] = srcAlphabet.indexOf(number[i]);

    do {
      divide = 0;
      newlen = 0;
      for (i = 0; i < length; i++) {
        divide = divide * fromBase + numberMap[i];
        if (divide >= toBase) {
          numberMap[newlen++] = parseInt(divide / toBase, 10);
          divide = divide % toBase;
        } else if (newlen) numberMap[newlen++] = 0;
      }
      length = newlen;
      result = dstAlphabet[divide] + result;
    } while (newlen != 0);

    return result;
  };
}

function recordTabEvent() {
  const now = Date.now();
  tabEventTimestamps.push(now);
  // Prune timestamps older than the window to prevent the array from growing indefinitely
  tabEventTimestamps = tabEventTimestamps.filter(timestamp => (now - timestamp) < EVENT_RATE_THRESHOLD_WINDOW_MS);
}

function checkEventRate() {
  // Assumes recordTabEvent has been called and tabEventTimestamps is up-to-date.
  // This function just checks if the current count in the window exceeds the threshold.
  // No, this needs to filter again to be sure, as recordTabEvent might not be called immediately before.
  const now = Date.now();
  const recentEventsInWindow = tabEventTimestamps.filter(timestamp => (now - timestamp) < EVENT_RATE_THRESHOLD_WINDOW_MS);
  return recentEventsInWindow.length >= EVENT_RATE_THRESHOLD_COUNT;
}

start();
