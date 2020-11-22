const placeholder = "*";
const unknown = "Marker";
var origin;
var bookmark;

start();
async function start() {
	bookmark = await getData("_bookmark");
	if(bookmark === undefined) {
		initBookmark();
	}
	chrome.tabs.onUpdated.addListener(onChange);
	chrome.tabs.onActivated.addListener(onChange);
	chrome.bookmarks.onChanged.addListener(onBookmarkChange);
	chrome.bookmarks.onRemoved.addListener(onBookmarkRemove);
}

async function initBookmark() {
	bookmark = undefined;
	chrome.storage.sync.remove("_bookmark");
	bookmark = await onPlaceholder();
	setData("_bookmark", bookmark);
	onChange();
}

function onPlaceholder() {
	return new Promise(resolve => {
		chrome.bookmarks.onCreated.addListener((id, e) => {
			if(e.title === placeholder) resolve(id);
		});
	})
}

function onChange() {
  if(bookmark === undefined) return
  chrome.tabs.query({active: true, currentWindow: true}, tab => {
	  let active = new URL(tab[0].url).origin;
	  if(origin === active || active.startsWith("_")) return
	  origin = active;
	  onOrigin();
  });
}

function onBookmarkChange(id, e) {
	if(id !== bookmark) return
	setData(origin, e.title);
}

function onBookmarkRemove(id) {
	if(id === bookmark) {
		initBookmark();
	}
}

async function onOrigin() {
	let marker = await getData(origin);
	if(marker === undefined) marker = unknown;
	chrome.bookmarks.update(bookmark, {title: marker});
}

function setData(key, value) {
	return new Promise(resolve => {
		chrome.storage.sync.set({[key]: value}, function(result) {
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
