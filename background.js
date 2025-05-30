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

async function start() {
  bookmark = await getDataLocal('bookmark');

  const storeValue = await getDataLocal('store');
  store = storeValue ? storeValue : 'sync';

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
  const newBookmarkId = await onPlaceholder(); // This now resolves with the ID directly

  if (newBookmarkId !== undefined) {
    try {
      await setDataLocal('bookmark', newBookmarkId);
      // Only update in-memory `bookmark` if persistence is successful.
      bookmark = newBookmarkId;
      console.log('OriginMarker: New bookmark ID persisted:', bookmark);
      checkOrigin(); // Update marker immediately after setup for the new bookmark
    } catch (error) {
      console.error(
        'CRITICAL: Failed to persist new bookmark ID:',
        newBookmarkId,
        'Error:',
        error
      );
      // In-memory `bookmark` remains `undefined` (or its value before this attempt if clearing failed and an old value was loaded by `start`).
      // This is a critical failure; the extension will not function correctly.
      // `start()` might need to check `bookmark` status after `initBookmark` completes.
    }
  } else {
    // This case might occur if onPlaceholder somehow exits its loop without a valid ID,
    // or if `setMode` within `onPlaceholder` returns false indefinitely (e.g., storage issues).
    console.error(
      'OriginMarker: initBookmark did not receive a valid bookmark ID from onPlaceholder. Extension may not function.'
    );
  }
}

async function onPlaceholder() {
  let onBookmarkCreated, onBookmarkChanged;

  while (true) {
    const result = await new Promise((resolve) => {
      onBookmarkCreated = (id, bookmarkNode) => {
        chrome.bookmarks.onCreated.removeListener(onBookmarkCreated);
        chrome.bookmarks.onChanged.removeListener(onBookmarkChanged);
        resolve([id, bookmarkNode.title]);
      };

      onBookmarkChanged = (id, changeInfo) => {
        chrome.bookmarks.onCreated.removeListener(onBookmarkCreated);
        chrome.bookmarks.onChanged.removeListener(onBookmarkChanged);
        resolve([id, changeInfo.title]);
      };

      chrome.bookmarks.onCreated.addListener(onBookmarkCreated);
      chrome.bookmarks.onChanged.addListener(onBookmarkChanged);
    });

    if (await setMode(result[1])) {
      // Listeners are removed inside the new Promise's resolve callbacks
      return result[0]; // Resolve with the bookmark ID
    }
    // If setMode returns false, the loop continues
  }
}

async function setMode(data) {
  let saltSuccessfullyHandled = false; // Flag to track salt operations

  if (data === '*') {
    try {
      const fetchedSalt = await getData('salt');
      if (fetchedSalt === undefined) {
        const newSalt = crypto.randomUUID();
        try {
          await setData('salt', newSalt);
          salt = newSalt; // Update in-memory salt
          saltSuccessfullyHandled = true;
        } catch (error) {
          console.error('Failed to set new salt:', error);
          // salt remains undefined or its previous value
          saltSuccessfullyHandled = false;
        }
      } else {
        salt = fetchedSalt; // Update in-memory salt
        saltSuccessfullyHandled = true;
      }
    } catch (error) {
      console.error('Failed to get salt:', error);
      saltSuccessfullyHandled = false;
    }
    auto = saltSuccessfullyHandled; // auto is true only if salt is ok
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
      await chrome.storage.sync.remove(key).catch((error) => {
        console.error('Error removing storage key:', error);
      });
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
