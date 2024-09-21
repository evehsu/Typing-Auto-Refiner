chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: "textCorrection",
      title: "Text Correction",
      contexts: ["selection"]
    });
    
    chrome.contextMenus.create({
      id: "autoCorrection",
      title: "Auto-Correction",
      parentId: "textCorrection",
      contexts: ["selection"]
    });
    
    chrome.contextMenus.create({
      id: "toneTuning",
      title: "Tone Tuning",
      parentId: "textCorrection",
      contexts: ["selection"]
    });
  });
  
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "autoCorrection" || info.menuItemId === "toneTuning") {
      const endpoint = info.menuItemId === "autoCorrection" ? 'auto-correct' : 'tune-text';
      const body = info.menuItemId === "autoCorrection" 
        ? {text: info.selectionText}
        : {text: info.selectionText, tone: 'default'};

      fetch(`http://localhost:8000/${endpoint}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
      })
      .then(response => response.json())
      .then(data => {
        const text = info.menuItemId === "autoCorrection" ? data.correctedText : data.tunedText;
        injectContentScriptAndSendMessage(tab.id, {action: "updateText", text: text});
      })
      .catch(error => console.error('Error:', error));
    }
  });

  function injectContentScriptAndSendMessage(tabId, message) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error injecting content script:', chrome.runtime.lastError.message);
      } else {
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, message, (response) => {
            if (chrome.runtime.lastError) {
              console.error('Error sending message:', chrome.runtime.lastError.message);
            } else {
              console.log('Message sent successfully');
            }
          });
        }, 100); // Small delay to ensure content script is fully loaded
      }
    });
  }

  // Add this listener to ensure the content script is ready
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
      chrome.tabs.sendMessage(tabId, {action: "checkContentScriptLoaded"}, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Content script not ready yet for tab:', tabId);
        } else {
          console.log('Content script is ready for tab:', tabId);
        }
      });
    }
  });