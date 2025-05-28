'use strict';

importScripts('/static.js');

var encoding = base2base(source, emoji);
var auto = true;
var mode;
var salt;
var active_origin;
var bookmark;
const allowedProtocols = new Set(['https:', 'http:']);

async function start() {
  bookmark = await getDataLocal('bookmark');
  if (
    bookmark === undefined ||
    (await chrome.bookmarks.get(bookmark)) === undefined
  ) {
    await initBookmark();
  }
  mode = await getDataLocal('mode');
  setMode(mode);
  chrome.tabs.onUpdated.addListener(checkOrigin);
  chrome.windows.onFocusChanged.addListener(checkOrigin);
  chrome.windows.tabs.addListener(checkOrigin);
  chrome.bookmarks.onChanged.addListener(onBookmarkChange);
  chrome.bookmarks.onRemoved.addListener(onBookmarkRemove);
}

// On install display the options page to guide the user
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
});

async function initBookmark() {
  bookmark = undefined;
  await chrome.storage.sync.remove('bookmark');
  bookmark = await onPlaceholder();
  await setDataLocal('bookmark', bookmark);
}

async function onPlaceholder() {
  while (true) {
    let result = await new Promise((resolve) => {
      chrome.bookmarks.onCreated.addListener((id, e) => {
        resolve([id, e.title]);
      });
      chrome.bookmarks.onChanged.addListener((id, e) => {
        resolve([id, e.title]);
      });
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

  const hash = await sha256(origin);
  const key = '_' + hash;

  var marker = await getData(key);
  if (marker === undefined) {
    if (auto === true && origin !== null) {
      marker = encoding(hash);
    } else {
      marker = unknown;
    }

    // Suffix auto generated bookmarks.
    marker += '*';
  }

  await chrome.bookmarks.update(bookmark, {
    title: marker
  });
  active_origin = origin;
}

function checkOrigin() {
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
    await chrome.storage.sync.remove(key);
    active_origin = undefined;
  } else {
    await setData(key, e.title);
  }
}

async function onBookmarkRemove(id) {
  if (id === bookmark) {
    active_origin = undefined;
    await initBookmark();
  }
}

function setDataLocal(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set(
      {
        [key]: value
      },
      function (result) {
        resolve(result);
      }
    );
  });
}

function getDataLocal(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, function (result) {
      resolve(result[key]);
    });
  });
}

function setData(key, value) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(
      {
        [key]: value
      },
      function (result) {
        resolve(result);
      }
    );
  });
}

function getData(key) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(key, function (result) {
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
