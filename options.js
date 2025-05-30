'use strict';

var reset = document.getElementById('reset');
var store = document.getElementById('store');

reset.onclick = async () => {
  reset.innerText = 'Clearing...';
  await chrome.storage[store.value].clear();
  reset.innerText = 'Done but feel free to click again :)';
};

store.onchange = async () => {
  await setDataLocal('store', store.value);
  chrome.runtime.reload();
};

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
        if (chrome.runtime.lastError) {
          console.error(
            'Error in options.js setDataLocal:',
            chrome.runtime.lastError
          );
        }
        resolve(result);
      }
    );
  });
}

function getDataLocal(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, function (result) {
      if (chrome.runtime.lastError) {
        console.error(
          'Error in options.js getDataLocal:',
          chrome.runtime.lastError
        );
      }
      resolve(result[key]);
    });
  });
}

main();
