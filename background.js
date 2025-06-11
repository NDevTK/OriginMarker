'use strict';

importScripts('/static.js');

let areAlphabetsValid = true; // Default to true
var encoding;

const MIN_ALPHABET_LENGTH = 16; // For source alphabet, expecting full hex set
const MIN_EMOJI_ALPHABET_LENGTH = 64; // For emoji alphabet

let presetMarkers = new Map();
// If I get this wrong I will look so stupid.
// Listed origins MUST be well-known and contain a login page for common places see https://radar.cloudflare.com/domains/#top-100-domains
presetMarkers.set('https://accounts.google.com', 'Google Login'); // https://github.com/google/bughunters/blob/main/domain-tiers/external_domains_google.asciipb
presetMarkers.set('https://login.live.com', 'Microsoft Login'); // https://www.microsoft.com/en-us/msrc/bounty-microsoft-identity
presetMarkers.set('https://login.microsoftonline.com', 'Microsoft Login 2'); // https://www.microsoft.com/en-us/msrc/bounty-microsoft-identity
presetMarkers.set('https://account.proton.me', 'Proton Login'); // https://proton.me/security/vulnerability-disclosure
presetMarkers.set('https://account.apple.com', 'Apple Login');
presetMarkers.set('https://www.icloud.com', 'iCloud Login');
presetMarkers.set('https://www.facebook.com', 'Facebook');
presetMarkers.set('https://www.netflix.com', 'Netflix');
presetMarkers.set('https://store.steampowered.com', 'Steam');
presetMarkers.set('https://www.amazon.com', 'Amazon');
presetMarkers.set('https://github.com', 'Github');
presetMarkers.set('https://identity.bugcrowd.com', 'Bugcrowd Login');
presetMarkers.set('https://x.com', 'Twitter');
presetMarkers.set('https://dash.cloudflare.com', 'Cloudflare');
presetMarkers.set('https://web.whatsapp.com', 'Whatsapp');
presetMarkers.set('https://www.instagram.com','Instagram');
presetMarkers.set('https://www.snapchat.com', 'Snapchat');
presetMarkers.set('https://login.yahoo.com', 'Yahoo Login');
presetMarkers.set('https://accounts.spotify.com', 'Spotify Login');
presetMarkers.set('https://accounts.fastly.com', 'Fastly Login');
presetMarkers.set('https://dash.applovin.com', 'Applovin');
presetMarkers.set('https://login.criteo.com', 'Criteo Login');
presetMarkers.set('https://account.ui.com', 'Ubiquiti Login');
presetMarkers.set('https://account.samsung.com', 'Samsung Login')
presetMarkers.set('https://login.unity.com', 'Unity Login');
presetMarkers.set('https://account.one.com', 'one.com Login');
presetMarkers.set('https://sentry.io', 'Sentry');
presetMarkers.set('https://auth.wikimedia.org', 'Wikipedia Login');
presetMarkers.set('https://www.roblox.com', 'Roblox');
presetMarkers.set('https://www.linkedin.com', 'Linkedin');
presetMarkers.set('https://www.baidu.com', 'Baidu');
presetMarkers.set('https://authentication.taboola.com', 'Taboola Login');
presetMarkers.set('https://www.digicert.com', 'DigiCert');
presetMarkers.set('https://apps.pubmatic.com', 'Pubmatic');
presetMarkers.set('https://auth.openai.com', 'OpenAI Login');
presetMarkers.set('https://auth.services.adobe.com', 'Adobe Login');
presetMarkers.set('https://www.dropbox.com', 'Dropbox');
presetMarkers.set('https://www.zoom.us', 'Zoom');
presetMarkers.set('https://www.reddit.com', 'Reddit');

let sourceAlphabetValid =
  Array.isArray(source) && source.length >= MIN_ALPHABET_LENGTH;
let emojiAlphabetValid =
  Array.isArray(emoji) && emoji.length >= MIN_EMOJI_ALPHABET_LENGTH; // Uses new constant

if (sourceAlphabetValid && emojiAlphabetValid) {
  encoding = base2baseForEmojis([...source], [...emoji]); // Use base2baseForEmojis
} else {
  areAlphabetsValid = false;
  if (!sourceAlphabetValid) {
    console.error(
      'OriginMarker: Source alphabet from static.js is invalid or too short. Expected array with >= ' +
        MIN_ALPHABET_LENGTH +
        ' elements. Value:',
      source
    );
  }
  if (!emojiAlphabetValid) {
    // Uses new constant in message:
    console.error(
      'OriginMarker: Emoji alphabet from static.js is invalid or too short. Expected array with >= ' +
        MIN_EMOJI_ALPHABET_LENGTH +
        ' elements. Value:',
      emoji
    );
  }
  encoding = () => unknown; // Fallback encoding function
}

let resolveInitialization;
const initializationCompletePromise = new Promise((resolve) => {
  resolveInitialization = resolve;
});

// For DoS Protection
const EVENT_RATE_THRESHOLD_COUNT = 30; // Max events before triggering
const EVENT_RATE_THRESHOLD_WINDOW_MS = 3000; // Time window in ms
const DOS_INITIAL_COOLDOWN_MS = 5000; // Cooldown after first detection
const DOS_EXTENDED_COOLDOWN_MS = 10000; // Cooldown if DoS persists after a check

const DOS_STATE_NORMAL = 'NORMAL';
const DOS_STATE_COOLDOWN = 'COOLDOWN';
let currentDosState = DOS_STATE_NORMAL;

let tabEventTimestamps = []; // Array to store timestamps of recent tab events
let dosCooldownTimer = null; // Timer ID for cooldown periods

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

// Initializes or re-initializes the extension's designated bookmark.
// This function handles clearing old bookmark data, waiting for user interaction
// to select a new bookmark (via `onPlaceholder`), and persisting the new bookmark ID.
// It also manages an AbortController to ensure that only one initialization process
// is active at a time.
async function initBookmark() {
  // The global `bookmark` variable will hold the ID of the designated bookmark.
  // It's crucial to ensure this is managed carefully:
  // 1. Clear any existing bookmark ID from local storage to prevent using stale data
  //    if this is a re-initialization (e.g., after user deletes the old marker bookmark).
  // 2. Set the in-memory `bookmark` variable to undefined to reflect that we are in
  //    an initialization phase. It will only be set to a new ID if `onPlaceholder`
  //    is successful AND that ID is successfully persisted to local storage.

  try {
    // Clear the previously stored bookmark ID. This is important for a clean slate,
    // ensuring `onPlaceholder` doesn't operate with potentially stale context if `initBookmark`
    // is called multiple times or if the user is trying to reset the extension.
    await setDataLocal('bookmark', undefined);
    console.log('OriginMarker: Cleared previous bookmark ID from storage.');
  } catch (error) {
    // Log error if clearing fails, but proceed. `onPlaceholder` will attempt to get a new ID.
    // The main risk of failure here is if a very old, invalid ID somehow remains and causes issues,
    // but `onPlaceholder` and subsequent checks should ideally handle getting a valid new one.
    console.error(
      'Error clearing previous bookmark ID from storage (non-critical for new setup):',
      error
    );
  }
  // Ensure in-memory `bookmark` is undefined at the start of the initialization process.
  // This prevents `checkOrigin` or other functions from using a stale ID from a previous session
  // before the new one is fully established and persisted.
  bookmark = undefined;

  // `onPlaceholder` is an async function that waits for the user to designate a new bookmark
  // by naming it '*' (auto mode) or '**' (manual mode).
  // It internally calls `setMode` to validate and persist the mode and salt (if applicable).
  // `onPlaceholder` only returns a bookmark ID if `setMode` was successful for that bookmark.
  // This ensures that `initBookmark` only proceeds with a bookmark ID that corresponds to a valid mode.

  // If `initBookmark` is called while an `onPlaceholder` process is already running (e.g., user rapidly
  // creating/deleting special bookmarks, or a programmatic refresh), abort the previous one.
  if (currentPlaceholderAbortController) {
    currentPlaceholderAbortController.abort(); // Abort any ongoing placeholder process
    console.log(
      'OriginMarker: Aborted previous initBookmark/onPlaceholder call.'
    );
  }
  // Create a new AbortController for the current `onPlaceholder` call.
  // This allows the current call to be aborted if `initBookmark` is called again.
  const localAbortController = new AbortController();
  currentPlaceholderAbortController = localAbortController; // Store globally so it can be aborted by subsequent calls

  let newBookmarkId; // Will store the ID returned by onPlaceholder
  let aborted = false; // Flag to track if this specific initBookmark instance was aborted

  try {
    // Wait for the user to select a bookmark and for its mode to be set.
    // `onPlaceholder` will throw an AbortError if `localAbortController.signal` is aborted.
    newBookmarkId = await onPlaceholder(localAbortController.signal);

    // Check if the `onPlaceholder` call was aborted by a newer `initBookmark` call.
    if (localAbortController.signal.aborted) {
      aborted = true;
      console.log(
        'OriginMarker: Current initBookmark/onPlaceholder call was aborted by a new call.'
      );
      // If aborted, `newBookmarkId` might be undefined or an intermediate value.
      // Do not proceed with persistence.
    } else if (newBookmarkId !== undefined) {
      // `onPlaceholder` returned a valid bookmark ID (and `setMode` was successful).
      // Persist this new bookmark ID to local storage.
      await setDataLocal('bookmark', newBookmarkId);
      // Only update the global in-memory `bookmark` variable if persistence is successful.
      bookmark = newBookmarkId;
      chrome.action.setBadgeText({text: ''}); // Clear any "ERR" badge
      console.log('OriginMarker: New bookmark ID persisted:', bookmark);

      // Reset `active_origin` as the context has changed with the new bookmark.
      active_origin = undefined;
      // Trigger `checkOrigin` to update the marker for the current tab with the new bookmark.
      checkOrigin();
    }
    // If `newBookmarkId` is undefined and not aborted, it means `onPlaceholder` completed
    // but failed to return an ID (e.g., `setMode` failed repeatedly). This case is handled
    // by the `if (!aborted && newBookmarkId === undefined)` block after `finally`.
  } catch (error) {
    if (error.name === 'AbortError') {
      // This catch block handles an AbortError thrown directly by `await onPlaceholder(...)`
      // if its signal was aborted *during* its execution.
      aborted = true;
      console.log(
        'OriginMarker: onPlaceholder operation was aborted during its execution.',
        error.message
      );
      // `newBookmarkId` will likely be undefined. No 'ERR' badge for abort.
    } else {
      // Handle other errors, such as failure to persist `newBookmarkId` (setDataLocal error)
      // or any unexpected error from `onPlaceholder` not caught by its internal try/catch.
      console.error(
        'CRITICAL: Failed to persist new bookmark ID or unexpected error in initBookmark process:',
        newBookmarkId, // This could be undefined if onPlaceholder failed before returning an ID.
        'Error:',
        error
      );
      // Set error badge only if not aborted and there was a critical error.
      chrome.action.setBadgeText({text: 'ERR'});
      chrome.action.setBadgeBackgroundColor({color: '#FF0000'}); // Red
    }
  } finally {
    // Clean up the global AbortController reference if this `initBookmark` instance's
    // controller is still the active one. This prevents aborting a *newer* `initBookmark` call's
    // controller if this one was already superseded.
    if (currentPlaceholderAbortController === localAbortController) {
      currentPlaceholderAbortController = null;
    }
  }

  // After `onPlaceholder` has completed (or been aborted/errored out):
  // Check if the process was *not* aborted, but `onPlaceholder` still failed to return a valid bookmark ID.
  // This indicates a failure within `onPlaceholder`'s logic (e.g., `setMode` consistently failing)
  // rather than an external abort or a direct persistence error for `newBookmarkId`.
  if (!aborted && newBookmarkId === undefined) {
    console.error(
      'OriginMarker: initBookmark completed, but onPlaceholder did not return a bookmark ID (and was not aborted). Extension may not function.'
    );
    // Setting ERR badge because the initialization process finished without a successful outcome.
    chrome.action.setBadgeText({text: 'ERR'});
    chrome.action.setBadgeBackgroundColor({color: '#FF0000'}); // Red
  }
}

// Waits for the user to create or rename a bookmark to '*' (auto mode) or '**' (manual mode).
// It listens for bookmark creation and change events. Once a potential marker bookmark is identified,
// it calls `setMode` to validate and persist the mode and associated salt (if needed).
// If `setMode` is successful, this function resolves with the bookmark's ID.
// This function is designed to be cancellable via the passed `signal` (AbortSignal).
async function onPlaceholder(signal) {
  // Immediately throw if the signal is already aborted when the function is called.
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

  let onBookmarkCreatedListener, onBookmarkChangedListener, promiseReject;

  // Helper to remove bookmark event listeners.
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

  // Handler for when the AbortSignal is triggered.
  // It cleans up listeners and rejects the main promise of `onPlaceholder`.
  const abortListener = () => {
    cleanupListeners();
    if (promiseReject) {
      promiseReject(new DOMException('Aborted', 'AbortError'));
      promiseReject = null; // Ensure reject is not called again if abort is signaled multiple times.
    }
  };

  // Register the abort listener for the provided signal.
  signal.addEventListener('abort', abortListener, {once: true});

  try {
    // Loop indefinitely, waiting for a valid bookmark event that successfully sets the mode.
    // The loop is broken by returning a bookmark ID or by an AbortError.
    while (true) {
      // Check for abort signal at the beginning of each loop iteration.
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

      // Create a new promise that resolves when a relevant bookmark event occurs.
      // This promise can also be rejected by the abortListener.
      const result = await new Promise((resolve, reject) => {
        promiseReject = reject; // Store reject for the abortListener.
        // Double-check signal state, as it might have been aborted between the loop check and now.
        if (signal.aborted) {
          return reject(new DOMException('Aborted', 'AbortError'));
        }

        onBookmarkCreatedListener = (id, bookmarkNode) => {
          if (signal.aborted) {
            // If aborted, resolve with undefined. The outer logic will throw AbortError.
            // This ensures the promise itself doesn't reject here, letting the main abort path handle it.
            resolve(undefined);
            return;
          }
          cleanupListeners();
          // Crucial: Remove the signal's abort listener once this promise path completes successfully.
          // This prevents the abortListener from trying to reject an already settled promise if the
          // signal is aborted later for unrelated reasons *after* a valid bookmark event was processed.
          signal.removeEventListener('abort', abortListener);
          resolve([id, bookmarkNode.title]);
        };

        onBookmarkChangedListener = (id, changeInfo) => {
          if (signal.aborted) {
            resolve(undefined); // Similar to onBookmarkCreatedListener, signal abort to the caller.
            return;
          }
          cleanupListeners();
          signal.removeEventListener('abort', abortListener); // Crucial: remove abort listener.
          resolve([id, changeInfo.title]);
        };

        chrome.bookmarks.onCreated.addListener(onBookmarkCreatedListener);
        chrome.bookmarks.onChanged.addListener(onBookmarkChangedListener);
      });

      promiseReject = null; // Clear stored reject reference once the promise is settled.

      // If the promise resolved with `undefined` (due to an abort check within event handlers)
      // or if the signal was aborted while `await new Promise` was pending.
      if (signal.aborted || result === undefined) {
        throw new DOMException('Aborted', 'AbortError');
      }

      // `result` is an array: [bookmarkId, bookmarkTitle]
      // Attempt to set the mode based on the bookmark title.
      // `setMode` will handle salt generation/validation if title is '*'.
      if (await setMode(result[1] /* bookmark title */)) {
        // If `setMode` returns true, the mode and salt (if applicable) were successfully set.
        // Return the bookmark ID, resolving the `onPlaceholder` promise.
        return result[0]; // Bookmark ID
      }
      // If `setMode` returns false (e.g., title is not '*' or '**', or salt handling failed),
      // the loop continues, and `onPlaceholder` will keep waiting for another bookmark event.
    }
  } finally {
    // Ensure all listeners and the main abort listener are cleaned up when `onPlaceholder` exits,
    // regardless of whether it's due to successful completion, error, or abort.
    cleanupListeners();
    signal.removeEventListener('abort', abortListener);
  }
}

// Sets the extension's operational mode ('auto' or 'manual') based on the provided data (bookmark title).
// For 'auto' mode ('*'), it also handles loading or generating the cryptographic salt.
// Persists the mode to local storage if it changes.
// Returns `true` if the mode was successfully determined and (if necessary) salt handled.
// Returns `false` if the data is not a valid mode string ('*' or '**') or if salt handling fails for auto mode.
async function setMode(data /* bookmark title */) {
  let saltSuccessfullyHandled = false; // Tracks if salt is successfully loaded or generated for auto mode.

  if (data === '*') {
    // Auto mode: requires a salt.
    try {
      const fetchedSalt = await getData('salt'); // Attempt to load salt from configured storage (sync/local/session).
      if (typeof fetchedSalt === 'string' && fetchedSalt.length > 0) {
        // Valid salt found in storage.
        salt = fetchedSalt;
        saltSuccessfullyHandled = true;
      } else {
        // No valid salt found in storage; determine reason and generate a new one.
        if (fetchedSalt === undefined) {
          // Salt not found: This is expected on first run or after a reset. No specific warning needed.
          console.log(
            'OriginMarker: Salt not found in storage. Generating new salt for auto mode.'
          );
        } else if (typeof fetchedSalt !== 'string') {
          // Salt is defined but not a string: Data corruption or unexpected type.
          console.warn(
            `OriginMarker: Salt from storage is not a string (type: ${typeof fetchedSalt}). Will generate new salt.`
          );
        } else {
          // Salt is an empty string: Invalid state.
          console.warn(
            `OriginMarker: Invalid salt (empty string) found in storage. Generating new salt.`
          );
        }

        // Generate a new salt.
        const newSalt = crypto.randomUUID();
        try {
          await setData('salt', newSalt); // Persist new salt to configured storage.
          salt = newSalt; // Update in-memory salt.
          saltSuccessfullyHandled = true;
          console.log(
            'OriginMarker: New salt generated and saved for auto mode.'
          );
        } catch (error) {
          console.error(
            'OriginMarker: Failed to save newly generated salt:',
            error
          );
          saltSuccessfullyHandled = false; // Salt generation/persistence failed.
        }
      }
    } catch (error) {
      // Catch errors from getData('salt') or setData('salt') if not caught by inner try/catch.
      console.error(
        'OriginMarker: Error during salt retrieval or saving process:',
        error
      );
      saltSuccessfullyHandled = false;
    }
    // Auto mode is only truly 'auto' if salt is handled AND encoding alphabets are valid.
    // `areAlphabetsValid` is a global flag set during initial script load.
    auto = saltSuccessfullyHandled && areAlphabetsValid;
  } else if (data === '**') {
    // Manual mode: no salt needed.
    auto = false;
    saltSuccessfullyHandled = true; // Considered successful as no salt operation is required for this mode.
  } else {
    // The provided data (bookmark title) is not a valid mode indicator.
    // `onPlaceholder` will continue listening for a valid bookmark title.
    return false;
  }

  // If attempting to set to auto mode ('*') but salt handling failed,
  // then `setMode` has failed. `auto` would be false due to `saltSuccessfullyHandled` being false.
  // Return false to `onPlaceholder` so it continues waiting.
  if (data === '*' && !saltSuccessfullyHandled) {
    console.warn(
      "OriginMarker: Failed to initialize 'auto' mode due to salt handling issues. Mode not set."
    );
    return false;
  }

  // If the determined mode (based on 'data' and salt handling) is different from the current in-memory `mode`,
  // persist the new mode to local storage.
  if (mode !== data) {
    // Note: 'data' here is the raw input ('*' or '**'), which becomes the new `mode`.
    try {
      await setDataLocal('mode', data);
      mode = data; // Update in-memory mode.
      console.log(`OriginMarker: Mode successfully set to '${mode}'.`);
    } catch (error) {
      console.error(
        'OriginMarker: Failed to save mode to local storage:',
        error
      );
      return false; // Failed to persist mode change.
    }
  }
  return true; // Mode successfully determined and persisted (if changed).
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

  console.warn(
    'OriginMarker: High frequency of tab events detected. Entering cooldown mode and setting marker to default.'
  );

  currentDosState = DOS_STATE_COOLDOWN;
  setMarker(null); // Set to generic/unknown marker
  chrome.action.setBadgeText({text: 'BUSY'});
  chrome.action.setBadgeBackgroundColor({color: '#FFA500'}); // Orange

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
    console.warn('OriginMarker: DoS condition persists. Extending cooldown.');
    // currentDosState remains DOS_STATE_COOLDOWN
    // Restart the timer with the extended cooldown period
    dosCooldownTimer = setTimeout(checkDosRecovery, DOS_EXTENDED_COOLDOWN_MS);
  } else {
    // Event rate has returned to normal
    console.log(
      'OriginMarker: Event rate normal. Recovering from DoS cooldown.'
    );
    currentDosState = DOS_STATE_NORMAL;
    chrome.action.setBadgeText({text: ''}); // Clear the badge
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
    newMarkerTitle = unknown; // Default case for null origin
  } else {
    const fullHash = await sha256(origin); // Hashing is done only for non-null origins
    const key = '_' + fullHash;
    let customMarkerValue = await getData(key);

    if (
      customMarkerValue !== undefined &&
      typeof customMarkerValue !== 'string'
    ) {
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
        newMarkerTitle = presetMarkers.has(origin)
          ? presetMarkers.get(origin)
          : encoding(fullHash); // Auto-generated
      } else {
        newMarkerTitle = unknown; // Manual mode default
      }
    }
  }

  // Always prefix marker we rename, no exceptions.
  newMarkerTitle += '*';

  // If the global pending_origin has changed since we started this async function,
  // it means another call to setMarker for a newer origin has started.
  // We should abort this current, possibly stale, update.
  if (pending_origin !== original_pending_origin) {
    // console.debug("OriginMarker: Stale setMarker call aborted for origin:", original_pending_origin); // Optional
    return;
  }

  try {
    await chrome.bookmarks.update(bookmark, {title: newMarkerTitle});
    active_origin = original_pending_origin; // Set active_origin to the one we successfully processed
  } catch (error) {
    console.error(
      `OriginMarker: Error updating bookmark for origin ${original_pending_origin}:`,
      error.message
    );
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
      if (currentDosState === DOS_STATE_COOLDOWN) return; // Exit early if DoS
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
    const sanitizedEventTitle = eventTitle
      .normalize('NFC')
      .replace(/[\u200B-\u200D\u202A-\u202E\u2066-\u2069\uFEFF]/gu, '');

    if (sanitizedEventTitle === '') {
      // Check if sanitization made it empty
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
  const effectiveSrcAlphabet = [
    ...new Set(
      Array.isArray(srcAlphabetChars)
        ? srcAlphabetChars.join('')
        : String(srcAlphabetChars)
    )
  ];
  const fromBase = effectiveSrcAlphabet.length;

  // 2. Process dstAlphabetTokens
  const effectiveDstAlphabet = dstAlphabetTokens; // Array of emoji strings
  const toBase = effectiveDstAlphabet.length;

  // Initial error handling for alphabet sizes
  if (fromBase < 2 || toBase < 2) {
    console.error(
      'OriginMarker: base2baseForEmojis alphabets must have at least 2 unique tokens. fromBase:',
      fromBase,
      'toBase:',
      toBase
    );
    return (numberStr) => String(unknown); // 'unknown' is globally available
  }

  return (numberStr) => {
    if (typeof numberStr !== 'string') {
      numberStr = String(numberStr);
    }

    if (numberStr === '') {
      // Handle empty input string
      return '';
    }

    const numberArr = [...numberStr]; // Convert input number string to array of its characters

    let numberMap = {}; // Stores the numeric value of each digit in the input number
    // Using object for sparse array like behavior if original numberMap did that.
    // Let's use an array as per refined logic for numberMap.
    let mappedDigits = [];

    for (let i = 0; i < numberArr.length; i++) {
      const digitValue = effectiveSrcAlphabet.indexOf(numberArr[i]);
      if (digitValue === -1) {
        console.error(
          `OriginMarker: Character '${numberArr[i]}' in input '${numberStr}' not found in source alphabet.`
        );
        return String(unknown); // Invalid input character
      }
      mappedDigits[i] = digitValue;
    }

    if (mappedDigits.length === 0) {
      // Should be caught by numberStr === "" earlier, but as a safeguard.
      return '';
    }

    // Handle input "0" (e.g., "0", "00") explicitly to return effectiveDstAlphabet[0]
    let allZeroInput = true;
    for (let i = 0; i < mappedDigits.length; ++i) {
      if (mappedDigits[i] !== 0) {
        allZeroInput = false;
        break;
      }
    }
    if (allZeroInput) {
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
        console.error(
          "OriginMarker: base2baseForEmojis - 'divide' index out of bounds for destination alphabet. Divide:",
          divide,
          'DstLength:',
          effectiveDstAlphabet.length
        );
        return String(unknown);
      }
      result = effectiveDstAlphabet[divide] + result;
    } while (newlen != 0);

    return result;
  };
}

function recordTabEvent() {
  const now = Date.now();
  tabEventTimestamps.push(now);
  // Prune timestamps older than the window to prevent the array from growing indefinitely
  tabEventTimestamps = tabEventTimestamps.filter(
    (timestamp) => now - timestamp < EVENT_RATE_THRESHOLD_WINDOW_MS
  );
}

function checkEventRate() {
  // Assumes recordTabEvent has been called and tabEventTimestamps is up-to-date.
  // This function just checks if the current count in the window exceeds the threshold.
  // No, this needs to filter again to be sure, as recordTabEvent might not be called immediately before.
  const now = Date.now();
  const recentEventsInWindow = tabEventTimestamps.filter(
    (timestamp) => now - timestamp < EVENT_RATE_THRESHOLD_WINDOW_MS
  );
  return recentEventsInWindow.length >= EVENT_RATE_THRESHOLD_COUNT;
}

start();
