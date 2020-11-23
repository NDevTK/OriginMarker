'use strict';
const placeholder = "*";
const unknown = "Marker";
var focused = false;
var active_origin;
var bookmark;

start();
async function start() {
    bookmark = await getData("bookmark");
    if (bookmark === undefined) {
        initBookmark();
    }
    chrome.tabs.onUpdated.addListener(onChange);
    chrome.tabs.onActivated.addListener(checkOrigin);
    chrome.windows.onFocusChanged.addListener(onfocusChanged);
    chrome.bookmarks.onChanged.addListener(onBookmarkChange);
    chrome.bookmarks.onRemoved.addListener(onBookmarkRemove);
}

function onfocusChanged(windowId) {
    if (windowId !== chrome.windows.WINDOW_ID_NONE) focused = windowId;
    checkOrigin();
}

async function initBookmark() {
    bookmark = undefined;
    await removeData("bookmark");
    bookmark = await onPlaceholder();
    await setData("bookmark", bookmark);
    onUnknown();
    checkOrigin();
}

function onPlaceholder() {
    return new Promise(resolve => {
        chrome.bookmarks.onCreated.addListener((id, e) => {
            if (e.title === placeholder) resolve(id);
        });
    });
}

function onUnknown() {
    chrome.bookmarks.update(bookmark, {
        title: unknown
    });
    active_origin = undefined;
}

async function changeOrigin(url) {
    try {
        var active = new URL(url).origin;
    } catch {
        return onUnknown();
    }
    if (active_origin === active) return
    active_origin = active;

    var marker = await getData("_" + active_origin);
    if (marker === undefined) marker = unknown;
    chrome.bookmarks.update(bookmark, {
        title: marker
    });
}

function onChange(tabId, changeInfo, tab) {
    if (changeInfo.url === undefined || bookmark === undefined) return
    if (focused !== tab.windowId) return
    if (tab.active) changeOrigin(tab.url);
}

function checkOrigin() {
    if (bookmark === undefined) return
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, tab => {
        if (tab.length !== 1) return onUnknown();
        if (tab[0].active === false) return
        focused = tab[0].windowId;
        changeOrigin(tab[0].url);
    });
}

async function onBookmarkChange(id, e) {
    if (id !== bookmark || active_origin === undefined) return
    if (e.title === unknown) {
        await removeData("_" + active_origin);
    } else {
        await setData("_" + active_origin, e.title);
    }
}

function onBookmarkRemove(id) {
    if (id === bookmark) {
        initBookmark();
    }
}

function setData(key, value) {
    return new Promise(resolve => {
        chrome.storage.sync.set({
            [key]: value
        }, function(result) {
            resolve(result);
        });
    });
}

function getData(key) {
    return new Promise(resolve => {
        chrome.storage.sync.get(key, function(result) {
            resolve(result[key]);
        });
    });
}

function removeData(key) {
    return new Promise(resolve => {
        chrome.storage.sync.remove(key, function(result) {
            resolve(result);
        });
    });
}
