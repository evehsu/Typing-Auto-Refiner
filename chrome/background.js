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
    if (info.menuItemId === "autoCorrection") {
      chrome.tabs.sendMessage(tab.id, {action: "autoCorrect", text: info.selectionText});
    } else if (info.menuItemId === "toneTuning") {
      chrome.tabs.sendMessage(tab.id, {action: "tuneTone", text: info.selectionText});
    }
  });
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getAutoCorrection") {
      // Call your backend API here
      fetch('http://localhost:8000/auto-correct', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({text: request.text})
      })
      .then(response => response.json())
      .then(data => sendResponse({result: data.correctedText}))
      .catch(error => sendResponse({error: error.toString()}));
      return true; // Indicates an asynchronous response
    } else if (request.action === "getToneTuning") {
      // Call your backend API here
      fetch('http://localhost:8000/tune-text', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({text: request.text, tone: request.tone})
      })
      .then(response => response.json())
      .then(data => sendResponse({result: data.tunedText}))
      .catch(error => sendResponse({error: error.toString()}));
      return true; // Indicates an asynchronous response
    }
  });