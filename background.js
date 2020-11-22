'use strict';
const placeholder = "*";
const unknown = "Marker";
var active_origin;
var bookmark;

start();
async function start() {
    bookmark = await getData("bookmark");
    if (bookmark === undefined) {
        initBookmark();
    }
    chrome.tabs.onUpdated.addListener(onChange);
    chrome.tabs.onActivated.addListener(onChange);
    chrome.bookmarks.onChanged.addListener(onBookmarkChange);
    chrome.bookmarks.onRemoved.addListener(onBookmarkRemove);
}

async function initBookmark() {
    bookmark = undefined;
    chrome.storage.sync.remove("bookmark");
    bookmark = await onPlaceholder();
    await setData("bookmark", bookmark);
    onChange();
}

function onPlaceholder() {
    return new Promise(resolve => {
        chrome.bookmarks.onCreated.addListener((id, e) => {
            if (e.title === placeholder) resolve(id);
        });
    });
}

function onUnknown() {
    if (active_origin === undefined) return
    chrome.bookmarks.update(bookmark, {
        title: unknown
    });
    active_origin = undefined;
}

function onChange() {
    if (bookmark === undefined) return
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, async tab => {
        if (tab[0] === undefined) return onUnknown();
        try {
            var active = new URL(tab[0].url).origin;
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
