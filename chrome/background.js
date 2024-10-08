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
      contexts: ["selection"]
    });

    const tones = ["Professional", "Friendly", "Strong", "Humorous", "Aggressive"];

    tones.forEach(tone => {
      chrome.contextMenus.create({
        id: `tone_${tone.toLowerCase()}`,
        parentId: "toneTuning",
        title: tone,
        contexts: ["selection"]
      });
    });
  });
  
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "autoCorrection" || info.menuItemId.startsWith("tone_")) {
      const endpoint = info.menuItemId === "autoCorrection" ? 'auto-correct' : 'tune-text';
      const body = info.menuItemId === "autoCorrection" 
        ? {text: info.selectionText}
        : {text: info.selectionText, tone: info.menuItemId.split("_")[1]};

      fetch(`http://localhost:8000/${endpoint}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
      })
      .then(response => response.json())
      .then(data => {
        const text = info.menuItemId === "autoCorrection" ? data.corrected_text : data.tuned_text;
        if (text) {
          sendMessageToContentScript(tab.id, {action: "updateText", text: text});
        } else {
          console.error('Error: Received empty text from server');
        }
      })
      .catch(error => console.error('Error:', error));
    }
    
    // Removed the tone tuning block as per the instructions
  });

  function sendMessageToContentScript(tabId, message) {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError.message);
        // If the content script is not loaded, inject it and try again
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error injecting content script:', chrome.runtime.lastError.message);
          } else {
            // Retry sending the message immediately after injection
            chrome.tabs.sendMessage(tabId, message);
          }
        });
      } else {
        console.log('Message sent successfully');
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