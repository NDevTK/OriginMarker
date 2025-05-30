'use strict';

var reset = document.getElementById('reset');
var store = document.getElementById('store');

reset.onclick = async () => {
  reset.innerText = 'Clearing...';
  await chrome.storage.sync.clear();
  reset.innerText = 'Done but feel free to click again :)';
};

store.onchange = async () => {
  await setDataLocal('store', store.value);
}

async function main() {
  const storeValue = await getDataLocal('store');
  if (storeValue) store.value = storeValue;
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

main();
