const placeholder = "*";
const unknown = "Marker";
var origin;
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
    setData("bookmark", bookmark);
    onChange();
}

function onPlaceholder() {
    return new Promise(resolve => {
        chrome.bookmarks.onCreated.addListener((id, e) => {
            if (e.title === placeholder) resolve(id);
        });
    })
}

function onChange() {
    if (bookmark === undefined) return
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, tab => {
        try {
            var active = new URL(tab[0].url).origin;
        } catch {
            chrome.bookmarks.update(bookmark, {
                title: unknown
            });
            return
        }
        if (origin === active) return
        origin = active;
        onOrigin();
    });
}

function onBookmarkChange(id, e) {
    if (id !== bookmark) return
    if (e.title === unknown) {
        chrome.storage.sync.remove("_" + origin);
    } else {
        setData("_" + origin, e.title);
    }
}

function onBookmarkRemove(id) {
    if (id === bookmark) {
        initBookmark();
    }
}

async function onOrigin() {
    let marker = await getData("_" + origin);
    if (marker === undefined) marker = unknown;
    chrome.bookmarks.update(bookmark, {
        title: marker
    });
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
        chrome.storage.sync.get([key], function(result) {
            resolve(result[key]);
        });
    });
}
