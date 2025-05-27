var reset = document.getElementById('reset');

reset.onclick = async () => {
  if (!confirm('Are you sure?')) return;
  await chrome.storage.sync.clear();
  await chrome.storage.local.clear();
  await chrome.storage.session.clear();
  alert('Any extension data has been removed.');
};
