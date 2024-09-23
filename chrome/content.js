// Check if variables are already defined in the global scope
if (typeof window.tempElement === 'undefined') {
  window.tempElement = null;
}
if (typeof window.isDisplayingTempElement === 'undefined') {
  window.isDisplayingTempElement = false;
}
if (typeof window.debounceTimer === 'undefined') {
  window.debounceTimer = null;
}
if (typeof window.lastProcessedRange === 'undefined') {
  window.lastProcessedRange = null;
}
if (typeof window.debouncedCreateTempElement === 'undefined') {
  window.debouncedCreateTempElement = null;
}

// Add a new variable to track if a request is in progress
if (typeof window.isRequestInProgress === 'undefined') {
  window.isRequestInProgress = false;
}

function debounce(func, delay) {
  return function() {
    clearTimeout(window.debounceTimer);
    window.debounceTimer = setTimeout(() => func.apply(this, arguments), delay);
  };
}

window.debouncedCreateTempElement = debounce((range, result) => {
  // Check if this range has already been processed
  if (window.lastProcessedRange && 
      window.lastProcessedRange.startContainer === range.startContainer &&
      window.lastProcessedRange.startOffset === range.startOffset &&
      window.lastProcessedRange.endContainer === range.endContainer &&
      window.lastProcessedRange.endOffset === range.endOffset) {
    console.log("This range has already been processed. Skipping.");
    return;
  }

  // Update the last processed range
  window.lastProcessedRange = range.cloneRange();

  createTempElement(range, result);
}, 300);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Received message:", request);
  if (request.action === "autoCorrect" || request.action === "tuneTone" || request.action === "updateText") {
    // Check if a request is already in progress
    if (window.isRequestInProgress) {
      console.log("A request is already in progress. Skipping.");
      return true;
    }

    const selection = window.getSelection();
    if (selection.rangeCount === 0) {
      console.log("No range selected. Skipping.");
      return true;
    }

    const selectedText = selection.toString();
    const range = selection.getRangeAt(0);
    
    console.log("Selected text:", selectedText);
    console.log("Action:", request.action);
    
    // Set the flag to indicate a request is in progress
    window.isRequestInProgress = true;

    if (request.action === "updateText") {
      console.log("Updating text with:", request.text);
      window.debouncedCreateTempElement(range, request.text);
    } else if (request.action === "tuneTone") {
      promptForTone(selectedText, range);
    } else {
      sendRequest(request.action, selectedText, "professional", range);
    }
  }
  return true; // Indicates that the response is sent asynchronously
});

function promptForTone(selectedText, range) {
  const tonePrompt = document.createElement('div');
  tonePrompt.style.position = 'fixed';
  tonePrompt.style.zIndex = '2147483647';
  tonePrompt.style.backgroundColor = 'white';
  tonePrompt.style.border = '1px solid black';
  tonePrompt.style.padding = '10px';
  tonePrompt.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  
  const toneInput = document.createElement('input');
  toneInput.type = 'text';
  toneInput.placeholder = 'Enter desired tone (default: professional)';
  toneInput.style.marginRight = '10px';
  tonePrompt.appendChild(toneInput);
  
  const submitButton = document.createElement('button');
  submitButton.textContent = 'Submit';
  submitButton.onclick = () => {
    const tone = toneInput.value.trim() || 'professional';
    tonePrompt.remove();
    sendRequest('getToneTuning', selectedText, tone, range);
  };
  tonePrompt.appendChild(submitButton);
  
  const rect = range.getBoundingClientRect();
  tonePrompt.style.left = `${rect.left + window.scrollX}px`;
  tonePrompt.style.top = `${rect.bottom + window.scrollY}px`;
  
  document.body.appendChild(tonePrompt);
  toneInput.focus();
}

function sendRequest(action, text, tone, range) {
  chrome.runtime.sendMessage({
    action: action,
    text: text,
    tone: tone
  }, response => {
    console.log("Received response from background script:", response);
    if (response.error) {
      console.error("Error from background script:", response.error);
    } else {
      console.log("Creating temp element with result:", response.result);
      createTempElement(range, response.result);
    }
    // Reset the flag after the request is complete
    window.isRequestInProgress = false;
  });
}

function createTempElement(range, result) {
  console.log("Creating temp element with result:", result);
  
  // Remove existing temp element if it exists
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
  applyButton.onclick = () => {
    applyChanges(range, textArea.value);
    window.lastProcessedRange = null;  // Reset the last processed range
    window.isRequestInProgress = false;
  };
  buttonContainer.appendChild(applyButton);
  
  const rejectButton = document.createElement('button');
  rejectButton.textContent = 'Reject';
  rejectButton.onclick = () => {
    window.tempElement.remove();
    window.lastProcessedRange = null;  // Reset the last processed range
    window.isRequestInProgress = false;
  };
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