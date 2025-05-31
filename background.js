'use strict';

importScripts('/static.js');

let resolveInitialization;
const initializationCompletePromise = new Promise((resolve) => {
  resolveInitialization = resolve;
});

var encoding = base2base(source, emoji);
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

  let storeValue = await getDataLocal('store');
  if (!['sync', 'local', 'session'].includes(storeValue)) {
    console.warn(`OriginMarker: Invalid store value '${storeValue}' loaded from storage. Defaulting to 'sync'.`);
    storeValue = 'sync';
    try {
      await setDataLocal('store', storeValue);
    } catch (error) {
      console.error("OriginMarker: Failed to save default store setting:", error);
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
  await setMode(mode);
  resolveInitialization();
  checkOrigin();
}

chrome.tabs.onUpdated.addListener(checkOrigin);
chrome.tabs.onActivated.addListener(checkOrigin);
chrome.windows.onFocusChanged.addListener(checkOrigin);
chrome.bookmarks.onChanged.addListener(onBookmarkChange);
chrome.bookmarks.onRemoved.addListener(onBookmarkRemove);

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
      chrome.action.setBadgeText({ text: '' });
      console.log('OriginMarker: New bookmark ID persisted:', bookmark);
      checkOrigin(); // Update marker immediately after setup for the new bookmark
    }
    // No specific action if newBookmarkId is undefined and not aborted,
    // as onPlaceholder returning undefined means it couldn't get a bookmark.
    // The 'ERR' badge for persistence failure is handled below.
  } catch (error) {
    if (error.name === 'AbortError') {
      aborted = true;
      console.log('OriginMarker: onPlaceholder operation was aborted.', error.message);
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
      chrome.action.setBadgeText({ text: 'ERR' });
      chrome.action.setBadgeBackgroundColor({ color: '#FF0000' }); // Red
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
    chrome.action.setBadgeText({ text: 'ERR' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000' }); // Red
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

  signal.addEventListener('abort', abortListener, { once: true });

  try {
    while (true) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

      const result = await new Promise((resolve, reject) => {
        promiseReject = reject; // Assign reject for the abort listener
        if (signal.aborted) { // Check again, as abort could happen before listeners are set
          return reject(new DOMException('Aborted', 'AbortError'));
        }

        onBookmarkCreatedListener = (id, bookmarkNode) => {
          if (signal.aborted) { // Check before resolving
            resolve(undefined); // Or reject, but resolving undefined signals abort to caller loop
            return;
          }
          cleanupListeners();
          signal.removeEventListener('abort', abortListener); // Crucial: remove abort listener on normal completion path for this promise
          resolve([id, bookmarkNode.title]);
        };

        onBookmarkChangedListener = (id, changeInfo) => {
          if (signal.aborted) { // Check before resolving
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

      if (signal.aborted || result === undefined) { // result undefined if promise resolved due to abort check
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
        if (fetchedSalt !== undefined) {
             console.warn(`OriginMarker: Invalid salt found in storage (type: ${typeof fetchedSalt}, value: '${fetchedSalt}'). Generating new salt.`);
        }
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
    auto = saltSuccessfullyHandled;
  } else if (data === '**') {
    auto = false;
    saltSuccessfullyHandled = true; // No salt operation needed, so considered successful for mode setting
  } else {
    // Not a valid mode string
    return false;
  }

  // If salt handling failed for auto mode, we cannot proceed reliably.
  if (data === '*' && !saltSuccessfullyHandled) {
    auto = false; // Ensure auto is false
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

async function setMarker(origin) {
  if (origin === active_origin) return;
  pending_origin = origin;

  const hash = await sha256(origin);
  const key = '_' + hash;

  var marker = await getData(key);
  if (marker === undefined) {
    if (auto === true && origin !== null) {
      marker = encoding(hash);
    } else {
      marker = unknown;
    }
  }

  // Suffix auto named bookmarks.
  marker += '*';

  // Origin changed during the marker calculation
  if (pending_origin !== origin) return;

  await chrome.bookmarks
    .update(bookmark, {
      title: marker
    })
    .catch((error) => {
      console.error('Error updating bookmark:', error);
    });
  active_origin = origin;
}

async function checkOrigin() {
  await initializationCompletePromise;
  if (bookmark === undefined) return;
  chrome.tabs.query(
    {
      active: true,
      currentWindow: true
    },
    (tab) => {
      if (chrome.runtime.lastError) {
        console.error("OriginMarker: Error querying tabs in checkOrigin:", chrome.runtime.lastError.message);
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

    if (eventTitle === '') {
      try {
        await removeData(key);
      } catch (error) {
        // The removeData function's promise rejection already logs chrome.runtime.lastError.
        // This catch is for any other unexpected errors or if removeData itself throws synchronously (e.g. invalid store).
        console.error('OriginMarker: Failed to remove custom marker for key', key, 'using removeData. Error:', error.message);
      }
      // Only reset active_origin if the cleared marker corresponds to the current active_origin
      // This check might be redundant if checkOrigin() correctly re-evaluates,
      // but it's safer to be explicit.
      if (active_origin === eventOrigin) {
        active_origin = undefined;
      }
      checkOrigin();
    } else {
      await setData(key, eventTitle);
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
      let errorMsg = "OriginMarker: Invalid or uninitialized 'store' type for removeData. Store type: " + store;
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

start();
