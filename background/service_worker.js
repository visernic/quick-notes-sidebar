// background/service_worker.js

// --- 1. Context Menu (Right-Click) Setup ---

// Create the context menu when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-to-quick-notes",
    title: "✍️ Save to Quick Notes",
    contexts: ["selection"] // Only show when text is selected
  });
});

// Listen for a click on the context menu
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "save-to-quick-notes" && info.selectionText) {
    const htmlContent = `<p>${info.selectionText}</p>`;
    saveNote(htmlContent);
  }
});

// --- 2. Sidebar & Messaging ---

// Handle the extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Send a message to the content script to toggle the sidebar
  chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_SIDEBAR" });
});

// Listen for messages from sidebar (close) AND content (save)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  if (request.type === "CLOSE_SIDEBAR") {
    // Find the active tab and send it the close message
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "CLOSE_SIDEBAR" });
      }
    });
  }
  
  // RE-ADDED: Handle save message from the popup button
  if (request.type === "SAVE_HIGHLIGHT") {
    const htmlContent = `<p>${request.text}</p>`;
    saveNote(htmlContent).then(() => {
      sendResponse({ status: "success" });
    });
    return true; // Keep channel open for async response
  }
});

// --- 3. Helper Function: Save Note ---

async function saveNote(content) {
  const data = await chrome.storage.local.get(["notes"]);
  const notes = data.notes || [];
  
  const newNote = {
    id: `note_${Date.now()}`, // Unique ID
    content: content, // HTML content
    createdAt: new Date().toISOString()
  };
  
  notes.unshift(newNote); // Add new note to the top
  await chrome.storage.local.set({ notes: notes });
}
