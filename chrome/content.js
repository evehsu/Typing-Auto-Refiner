let tempElement = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Received message:", request);
  if (request.action === "checkContentScriptLoaded") {
    sendResponse({loaded: true});
  } else if (request.action === "updateText") {
    console.log("Received updateText action");
    if (request.text === undefined) {
      console.error("Error: request.text is undefined");
      sendResponse({success: false, error: "Text is undefined"});
    } else {
      console.log("Received updated text:", request.text);
      // Add your logic here to update the text on the page
      // For example:
      // document.body.innerHTML = request.text;
      sendResponse({success: true});
    }
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
      
      console.log("Received response:", response.result);
      createTempElement(range, response.result);
    });
  }
  return true; // Indicates that the response is sent asynchronously
});

function createTempElement(range, result) {
  console.log("Creating temp element with result:", result);
  if (tempElement) {
    tempElement.remove();
  }
  
  tempElement = document.createElement('div');
  tempElement.style.position = 'fixed'; // Change to fixed
  tempElement.style.zIndex = '2147483647'; // Maximum z-index value
  tempElement.style.backgroundColor = 'white';
  tempElement.style.border = '1px solid black';
  tempElement.style.padding = '10px';
  tempElement.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  
  const textArea = document.createElement('textarea');
  textArea.value = result;
  textArea.style.width = '300px';
  textArea.style.height = '100px';
  textArea.style.marginBottom = '10px';
  tempElement.appendChild(textArea);
  
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.justifyContent = 'space-between';
  
  const applyButton = document.createElement('button');
  applyButton.textContent = 'Apply';
  applyButton.onclick = () => applyChanges(range, textArea.value);
  buttonContainer.appendChild(applyButton);
  
  const rejectButton = document.createElement('button');
  rejectButton.textContent = 'Reject';
  rejectButton.onclick = () => tempElement.remove();
  buttonContainer.appendChild(rejectButton);
  
  tempElement.appendChild(buttonContainer);
  
  const rect = range.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  
  let top = rect.bottom + window.scrollY;
  let left = rect.left + window.scrollX;
  
  // Ensure the element doesn't go off-screen
  if (top + tempElement.offsetHeight > viewportHeight) {
    top = rect.top - tempElement.offsetHeight;
  }
  if (left + tempElement.offsetWidth > viewportWidth) {
    left = viewportWidth - tempElement.offsetWidth;
  }
  
  tempElement.style.left = `${left}px`;
  tempElement.style.top = `${top}px`;
  
  document.body.appendChild(tempElement);
}

function applyChanges(range, newText) {
  range.deleteContents();
  range.insertNode(document.createTextNode(newText));
  tempElement.remove();
}