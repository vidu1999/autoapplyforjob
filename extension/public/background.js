chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
});

chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
});

async function sendScanMessage(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: 'AUTOAPPLY_SCAN_PAGE' });
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    return chrome.tabs.sendMessage(tabId, { type: 'AUTOAPPLY_SCAN_PAGE' });
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'AUTOAPPLY_SCAN_ACTIVE_TAB') return false;
  (async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url || !/^https?:/i.test(tab.url)) {
      throw new Error('Open a public job vacancy page before scanning.');
    }
    return sendScanMessage(tab.id);
  })()
    .then(sendResponse)
    .catch((error) => sendResponse({ error: error.message || 'This page could not be scanned.' }));
  return true;
});
