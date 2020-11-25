'use strict';
var encoding = base2base(source, emoji);
var focused = false;
var auto = true;
var ignore_change = false;
var mode;
var salt;
var active_origin;
var bookmark;

start();
async function start() {
    bookmark = await getData("bookmark");
    if (bookmark === undefined || await checkBookmark(bookmark) === false) {
        initBookmark();
    }
    mode = await getData("mode");
    setMode(mode);
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
        chrome.bookmarks.onCreated.addListener(async (id, e) => {
            if (await setMode(e.title) === true) resolve(id);
        });
        chrome.bookmarks.onChanged.addListener(async (id, e) => {
            if (await setMode(e.title) === true) resolve(id);
        });
    });
}

async function setMode(data) {
    switch (data) {
        case "*":
            auto = true;
            salt = "";
            break;
        case "**":
            auto = true;
            salt = await getData("salt");
            if (salt === undefined) {
                salt = generateRandom();
                await setData("salt", salt);
            }
            break;
        case "***":
            auto = false;
            break
        default:
            return false
    }
    if (mode !== data) {
        await setData("mode", data);
        mode = data;
    }
    return true;
}

function onUnknown() {
    active_origin = undefined;
    chrome.bookmarks.update(bookmark, {
        title: unknown
    });
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

    if (marker === undefined) {
        if (auto === true) {
            marker = await encodeOrigin();
        } else {
            marker = unknown;
        }
    }

    ignore_change = true;
    chrome.bookmarks.update(bookmark, {
        title: marker
    }, _ => {
        ignore_change = false;
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
    if (id !== bookmark || active_origin === undefined || ignore_change === true) return

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

async function encodeOrigin() {
    let hash = await sha256(active_origin);
    return encoding(hash);
}

async function sha256(data) {
    const msgUint8 = new TextEncoder().encode(data + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

function base2base(srcAlphabet, dstAlphabet) {
    /* Code from github.com/jnvm/zany */
    /* modification of github.com/HarasimowiczKamil/any-base to:
     * support multibyte
     * enforce unique alphabets
     */
    var noDifference = srcAlphabet === dstAlphabet,
        srcAlphabet = Array.from(new Set((srcAlphabet))),
        dstAlphabet = Array.from(new Set((dstAlphabet))),
        fromBase = srcAlphabet.length,
        toBase = dstAlphabet.length

    return number => {
        if (noDifference) return number

        number = (number + '').match(/./gu)

        var i, divide, newlen, length = number.length,
            result = '',
            numberMap = {}

        for (i = 0; i < length; i++)
            numberMap[i] = srcAlphabet.indexOf(number[i])

        do {
            divide = 0
            newlen = 0
            for (i = 0; i < length; i++) {
                divide = divide * fromBase + numberMap[i]
                if (divide >= toBase) {
                    numberMap[newlen++] = parseInt(divide / toBase, 10)
                    divide = divide % toBase
                } else if (newlen)
                    numberMap[newlen++] = 0
            }
            length = newlen
            result = dstAlphabet[divide] + result
        } while (newlen != 0)

        return result
    }
}

function generateRandom(length = 50) {
    let charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    if (window.crypto && window.crypto.getRandomValues) {
        let values = new Uint32Array(length);
        window.crypto.getRandomValues(values);
        for (let i = 0; i < length; i++) {
            result += charset[values[i] % charset.length];
        }
        return result;
    } else {
        for (let i = 0; i < length; i++) {
            result += charset[Math.floor(Math.random() * charset.length)];
        }
        return result;
    }
}

function checkBookmark(id) {
    return new Promise(resolve => {
        chrome.bookmarks.get(id, r => {
            resolve(r !== undefined);
        });
    });
}
