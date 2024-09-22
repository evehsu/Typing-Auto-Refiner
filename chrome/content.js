// Check if tempElement is already defined in the global scope
if (typeof window.tempElement === 'undefined') {
  window.tempElement = null;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Received message:", request);
  if (request.action === "autoCorrect" || request.action === "tuneTone" || request.action === "updateText") {
    const selectedText = window.getSelection().toString();
    const range = window.getSelection().getRangeAt(0);
    
    console.log("Selected text:", selectedText);
    console.log("Action:", request.action);
    
    if (request.action === "updateText") {
      console.log("Updating text with:", request.text);
      createTempElement(range, request.text);
    } else {
      chrome.runtime.sendMessage({
        action: request.action === "autoCorrect" ? "getAutoCorrection" : "getToneTuning",
        text: selectedText,
        tone: "formal" // You can make this configurable
      }, response => {
        console.log("Received response from background script:", response);
        if (response.error) {
          console.error("Error from background script:", response.error);
          return;
        }
        
        console.log("Creating temp element with result:", response.result);
        createTempElement(range, response.result);
      });
    }
  }
  return true; // Indicates that the response is sent asynchronously
});

function createTempElement(range, result) {
  console.log("Creating temp element with result:", result);
  if (window.tempElement) {
    window.tempElement.remove();
  }
  
  window.tempElement = document.createElement('div');
  window.tempElement.style.position = 'fixed'; // Change to fixed
  window.tempElement.style.zIndex = '2147483647'; // Maximum z-index value
  window.tempElement.style.backgroundColor = 'white';
  window.tempElement.style.border = '1px solid black';
  window.tempElement.style.padding = '10px';
  window.tempElement.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  
  const textArea = document.createElement('textarea');
  textArea.value = result;
  textArea.style.width = '300px';
  textArea.style.height = '100px';
  textArea.style.marginBottom = '10px';
  window.tempElement.appendChild(textArea);
  
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.justifyContent = 'space-between';
  
  const applyButton = document.createElement('button');
  applyButton.textContent = 'Apply';
  applyButton.onclick = () => applyChanges(range, textArea.value);
  buttonContainer.appendChild(applyButton);
  
  const rejectButton = document.createElement('button');
  rejectButton.textContent = 'Reject';
  rejectButton.onclick = () => window.tempElement.remove();
  buttonContainer.appendChild(rejectButton);
  
  window.tempElement.appendChild(buttonContainer);
  
  const rect = range.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  
  let top = rect.bottom + window.scrollY;
  let left = rect.left + window.scrollX;
  
  // Ensure the element doesn't go off-screen
  if (top + window.tempElement.offsetHeight > viewportHeight) {
    top = rect.top - window.tempElement.offsetHeight;
  }
  if (left + window.tempElement.offsetWidth > viewportWidth) {
    left = viewportWidth - window.tempElement.offsetWidth;
  }
  
  window.tempElement.style.left = `${left}px`;
  window.tempElement.style.top = `${top}px`;
  
  document.body.appendChild(window.tempElement);
}

function applyChanges(range, newText) {
  range.deleteContents();
  range.insertNode(document.createTextNode(newText));
  window.tempElement.remove();
}