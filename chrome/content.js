let tempElement = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkContentScriptLoaded") {
    sendResponse({loaded: true});
  } else if (request.action === "updateText") {
    // Implement the logic to update the text on the page
    console.log("Received updated text:", request.text);
    // Add your logic here to update the text on the page
    sendResponse({success: true});
  } else if (request.action === "autoCorrect" || request.action === "tuneTone") {
    const selectedText = window.getSelection().toString();
    const range = window.getSelection().getRangeAt(0);
    
    chrome.runtime.sendMessage({
      action: request.action === "autoCorrect" ? "getAutoCorrection" : "getToneTuning",
      text: selectedText,
      tone: "formal" // You can make this configurable
    }, response => {
      if (response.error) {
        console.error(response.error);
        return;
      }
      
      createTempElement(range, response.result);
    });
  }
  return true; // Indicates that the response is sent asynchronously
});

function createTempElement(range, result) {
  if (tempElement) {
    tempElement.remove();
  }
  
  tempElement = document.createElement('div');
  tempElement.style.position = 'absolute';
  tempElement.style.zIndex = '9999';
  tempElement.style.backgroundColor = 'white';
  tempElement.style.border = '1px solid black';
  tempElement.style.padding = '10px';
  
  const textArea = document.createElement('textarea');
  textArea.value = result;
  textArea.style.width = '100%';
  textArea.style.height = '100px';
  tempElement.appendChild(textArea);
  
  const applyButton = document.createElement('button');
  applyButton.textContent = 'Apply';
  applyButton.onclick = () => applyChanges(range, textArea.value);
  tempElement.appendChild(applyButton);
  
  const rejectButton = document.createElement('button');
  rejectButton.textContent = 'Reject';
  rejectButton.onclick = () => tempElement.remove();
  tempElement.appendChild(rejectButton);
  
  const rect = range.getBoundingClientRect();
  tempElement.style.left = `${rect.left + window.scrollX}px`;
  tempElement.style.top = `${rect.bottom + window.scrollY}px`;
  
  document.body.appendChild(tempElement);
}

function applyChanges(range, newText) {
  range.deleteContents();
  range.insertNode(document.createTextNode(newText));
  tempElement.remove();
}