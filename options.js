'use strict';

var reset = document.getElementById('reset');

reset.onclick = async () => {
  reset.innerText = 'Clearing...';
  await chrome.storage.sync.clear();
  await chrome.storage.local.clear();
  await chrome.storage.session.clear();
  reset.innerText = 'Done but feel free to click again :)';
};
