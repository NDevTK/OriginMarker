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

async function start() {
  bookmark = await getDataLocal('bookmark');

  const storeValue = await getDataLocal('store');
  store = storeValue ? storeValue : 'sync';

  if (bookmark !== undefined) {
    try {
      await chrome.bookmarks.get(bookmark);
    } catch {
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
  bookmark = undefined;
  await chrome.storage.sync.remove('bookmark').catch((error) => {
    console.error('Error removing bookmark from storage:', error);
  });
  bookmark = await onPlaceholder();
  await setDataLocal('bookmark', bookmark);
  checkOrigin();
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

    if (await setMode(result[1])) return result[0];
  }
}

async function setMode(data) {
  switch (data) {
    case '*':
      auto = true;
      salt = await getData('salt');
      if (salt === undefined) {
        salt = crypto.randomUUID();
        await setData('salt', salt);
      }
      break;
    case '**':
      auto = false;
      break;
    default:
      return false;
  }
  if (mode !== data) {
    await setDataLocal('mode', data);
    mode = data;
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
  const origin = active_origin;
  if (
    id !== bookmark ||
    origin === undefined ||
    origin === null ||
    e.title === undefined ||
    e.title.endsWith('*')
  )
    return;

  const key = '_' + (await sha256(origin));

  if (e.title === '') {
    await chrome.storage.sync.remove(key).catch((error) => {
      console.error('Error removing storage key:', error);
    });
    active_origin = undefined;
    checkOrigin();
  } else {
    await setData(key, e.title);
  }
}

async function onBookmarkRemove(id) {
  await initializationCompletePromise;
  if (id === bookmark) {
    active_origin = undefined;
    await initBookmark();
  }
}

function setDataLocal(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local
      .set(
        {
          [key]: value
        },
        function (result) {
          resolve(result);
        }
      )
      .catch((error) => {
        console.error('Error in setDataLocal:', error);
      });
  });
}

function getDataLocal(key) {
  return new Promise((resolve) => {
    chrome.storage.local
      .get(key, function (result) {
        resolve(result[key]);
      })
      .catch((error) => {
        console.error('Error in getDataLocal:', error);
      });
  });
}

function setData(key, value) {
  return new Promise((resolve) => {
    chrome.storage[store]
      .set(
        {
          [key]: value
        },
        function (result) {
          resolve(result);
        }
      )
      .catch((error) => {
        console.error('Error in setData:', error);
      });
  });
}

function getData(key) {
  return new Promise((resolve) => {
    chrome.storage[store]
      .get(key, function (result) {
        resolve(result[key]);
      })
      .catch((error) => {
        console.error('Error in getData:', error);
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
