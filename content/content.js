// content/content.js

let sidebarIframe;
const SIDEBAR_ID = "quick-notes-sidebar-iframe";

// RE-ADDED: Popup variables
let highlightPopup;
const POPUP_ID = "quick-notes-highlight-popup";

// 1. Get or create the sidebar iframe
function getOrCreateSidebar() {
  sidebarIframe = document.getElementById(SIDEBAR_ID);
  if (!sidebarIframe) {
    sidebarIframe = document.createElement("iframe");
    sidebarIframe.id = SIDEBAR_ID;
    sidebarIframe.src = chrome.runtime.getURL("sidebar/sidebar.html");
    sidebarIframe.classList.add("hidden"); // Hidden by default
    document.body.appendChild(sidebarIframe);
  }
  return sidebarIframe;
}

// 2. RE-ADDED: Get or create the "Save" popup
function getOrCreatePopup() {
  highlightPopup = document.getElementById(POPUP_ID);
  if (!highlightPopup) {
    highlightPopup = document.createElement("div");
    highlightPopup.id = POPUP_ID;
    highlightPopup.innerText = "✍️ Save to Notes";
    highlightPopup.style.display = "none";
    document.body.appendChild(highlightPopup);

    // Click event for the popup
    highlightPopup.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const selectedText = window.getSelection().toString().trim();
      if (selectedText) {
        chrome.runtime.sendMessage(
          { type: "SAVE_HIGHLIGHT", text: selectedText },
          (response) => {
            if (response && response.status === "success") {
              highlightPopup.style.display = "none";
            }
          }
        );
      }
    });
  }
  return highlightPopup;
}

// 3. RE-ADDED: Show popup on text selection
document.addEventListener("mouseup", (e) => {
  // Don't show if clicking inside sidebar or popup
  if (e.target.id === SIDEBAR_ID || e.target.id === POPUP_ID) return;
  
  const popup = getOrCreatePopup();
  const selectedText = window.getSelection().toString().trim();

  if (selectedText) {
    popup.style.top = `${e.pageY - 40}px`;
    popup.style.left = `${e.pageX}px`;
    popup.style.display = "block";
  } else {
    popup.style.display = "none";
  }
});

// 4. RE-ADDED: Hide popup on any other click
document.addEventListener("mousedown", (e) => {
  if (highlightPopup && e.target.id !== POPUP_ID) {
    highlightPopup.style.display = "none";
  }
});

// 5. Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  if (request.type === "TOGGLE_SIDEBAR") {
    const sidebar = getOrCreateSidebar();
    const isOpen = !sidebar.classList.contains("hidden");
    if (isOpen) {
      sidebar.classList.add("hidden");
    } else {
      sidebar.classList.remove("hidden");
    }
  }
  
  if (request.type === "CLOSE_SIDEBAR") {
    const sidebar = getOrCreateSidebar();
    if (sidebar) {
      sidebar.classList.add("hidden");
    }
  }
  
  return true; // Keep channel open
});
