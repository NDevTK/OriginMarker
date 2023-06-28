'use strict';
var encoding = base2base(source, emoji);
var focused = false;
var auto = true;
var mode;
var salt;
var active_origin;
var bookmark;
var ignore_change;

start();
async function start() {
    bookmark = await getDataLocal("bookmark");
    if (bookmark === undefined || await checkBookmark(bookmark) === false) {
        await initBookmark();
    }
    mode = await getData("mode");
    setMode(mode);
    checkOrigin();
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
    await setDataLocal("bookmark", bookmark);
    onUnknown();
}

async function onPlaceholder() {
    while (true) {
        let result = await new Promise(resolve => {
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
    updateMarker();
}

async function changeOrigin(url) {
    try {
        var active = new URL(url).origin;
    } catch {
        return onUnknown();
    }
    if (active_origin === active) return
    active_origin = active;
    updateMarker();
}

async function updateMarker() {
    var marker = await getData("_" + await sha256(active_origin));

    if (marker === undefined) {
        if (auto === true) {
            marker = await encodeOrigin();
        } else {
            marker = unknown;
        }
	// Suffix auto generated bookmarks.
	marker += '*';    
    }

    chrome.bookmarks.update(bookmark, {
        title: marker,
        url: "about:blank"
    });
}

function onChange(tabId, changeInfo, tab) {
    if (focused !== tab.windowId || changeInfo.url === undefined || bookmark === undefined || tab.active === false) return
    if (tab.url === undefined || changeInfo.status !== "complete") return onUnknown();
    changeOrigin(tab.url);
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
    if (id !== bookmark || active_origin === undefined || !e.title || e.title.endsWith("*")) return
    
    if (e.title === unknown) {
        await removeData("_" + await sha256(active_origin));
        updateMarker();
    } else {
        await setData("_" + await sha256(active_origin), e.title);
    }
}

async function onBookmarkRemove(id) {
    if (id === bookmark) {
        await initBookmark();
        checkOrigin();
    }
}

function setDataLocal(key, value) {
    return new Promise(resolve => {
        chrome.storage.local.set({
            [key]: value
        }, function(result) {
            resolve(result);
        });
    });
}

function getDataLocal(key) {
    return new Promise(resolve => {
        chrome.storage.local.get(key, function(result) {
		resolve(result[key]);
        });
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
    /* modification of github.com/HarasimowiczKamil/any-base to:
		* support multibyte
		* enforce unique alphabets
	*/	
	var  noDifference = srcAlphabet === dstAlphabet
		,srcAlphabet = [...new Set([...srcAlphabet].join(""))]
		,dstAlphabet = [...new Set([...dstAlphabet].join(""))]
		,fromBase = srcAlphabet.length
		,toBase = dstAlphabet.length
		
	return number=>{
		if(noDifference) return number

		number = [...number];
		
		var i, divide, newlen
			,length = number.length
			,result = ''
			,numberMap = {}
		
		for(i = 0; i < length; i++)
			numberMap[i] = srcAlphabet.indexOf(number[i])
				
		do {
			divide = 0
			newlen = 0
			for(i = 0; i < length; i++) {
				divide = divide * fromBase + numberMap[i]
				if(divide >= toBase) {
					numberMap[newlen++] = parseInt(divide / toBase, 10)
					divide = divide % toBase
				}
				else if(newlen)
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
