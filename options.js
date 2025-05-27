'use strict';

var reset = document.getElementById('reset');

reset.onclick = async () => {
  reset.innerText = 'Clearing...';
  await chrome.storage.sync.clear();
  reset.innerText = 'Done but feel free to click again :)';
};
