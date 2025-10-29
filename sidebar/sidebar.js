// sidebar/sidebar.js

document.addEventListener("DOMContentLoaded", () => {
  // --- Global State ---
  let allNotes = [];
  let allTrash = [];
  
  // --- Editor Setup ---
  const quill = new Quill('#editor', {
    theme: 'snow',
    modules: {
      toolbar: '#toolbar'
    },
    placeholder: 'Write a new note...'
  });

  // --- Element Selectors ---
  const saveNoteBtn = document.getElementById("save-note-btn");
  const notesListContainer = document.getElementById("notes-list-container");
  const trashListContainer = document.getElementById("trash-list-container");
  const searchBar = document.getElementById("search-bar");
  const tabs = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  
  // NEW: Select the close button
  const closeBtn = document.getElementById("close-btn");
  
  // --- Initial Load ---
  loadData();

  // --- Event Listeners ---

  // 1. Save New Note
  saveNoteBtn.addEventListener("click", () => {
    // (Same as before)
    const content = quill.root.innerHTML;
    if (content.trim() !== "" && content.trim() !== "<p><br></p>") {
      addNewNote(content);
      quill.root.innerHTML = "";
    }
  });
  
  // NEW: 2. Close Button Click
  closeBtn.addEventListener("click", () => {
    // Send message to content.js to hide the iframe
    chrome.runtime.sendMessage({ type: "CLOSE_SIDEBAR" });
  });

  // 3. Tab Switching
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      // (Same as before)
      const targetTab = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      tabContents.forEach(c => {
        c.classList.remove("active");
        if (c.dataset.content === targetTab) {
          c.classList.add("active");
        }
      });
      filterAndRender(); 
    });
  });

  // 4. Search Bar
  searchBar.addEventListener("input", filterAndRender);
  
  // 5. Storage Change Listener
  chrome.storage.onChanged.addListener((changes, area) => {
    // (Same as before, with error checking)
    if (!chrome.runtime?.id) {
      return; // Context is invalidated
    }
    if (area === "local" && (changes.notes || changes.trash)) {
      loadData();
    }
  });
  
  // --- (Rest of the file is the same) ---
  // --- (Copy all Data Functions, Render Functions, and Button Helpers from previous step) ---


  // --- Helper: Check for Invalidated Context ---
  function handleStorageError(error) {
    if (error.message.includes("Extension context invalidated")) {
      console.warn("Context invalidated. Please refresh the page.");
      alert("Extension was reloaded. Please refresh this page to continue.");
    } else {
      console.error("Storage error:", error);
    }
  }

  // --- Data Functions ---
  async function loadData() {
    try {
      if (!chrome.runtime?.id) return;
      const data = await chrome.storage.local.get(["notes", "trash"]);
      if (!chrome.runtime?.id) return;
      allNotes = data.notes || [];
      allTrash = data.trash || [];
      filterAndRender();
    } catch (error) {
      handleStorageError(error);
    }
  }

  async function addNewNote(content) {
    try {
      const newNote = {
        id: `note_${Date.now()}`,
        content: content,
        createdAt: new Date().toISOString()
      };
      allNotes.unshift(newNote);
      await chrome.storage.local.set({ notes: allNotes });
    } catch (error) {
      handleStorageError(error);
    }
  }

  async function moveToTrash(noteId) {
    try {
      const noteToMove = allNotes.find(n => n.id === noteId);
      if (!noteToMove) return;
      allNotes = allNotes.filter(n => n.id !== noteId);
      allTrash.unshift(noteToMove);
      await chrome.storage.local.set({ notes: allNotes, trash: allTrash });
    } catch (error) {
      handleStorageError(error);
    }
  }

  async function restoreFromTrash(noteId) {
    try {
      const noteToRestore = allTrash.find(n => n.id === noteId);
      if (!noteToRestore) return;
      allTrash = allTrash.filter(n => n.id !== noteId);
      allNotes.unshift(noteToRestore);
      await chrome.storage.local.set({ notes: allNotes, trash: allTrash });
    } catch (error) {
      handleStorageError(error);
    }
  }

  async function deletePermanently(noteId) {
    try {
      allTrash = allTrash.filter(n => n.id !== noteId);
      await chrome.storage.local.set({ trash: allTrash });
    } catch (error) {
      handleStorageError(error);
    }
  }

  // --- Render Functions ---
  function getPlainText(html) {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    return tempDiv.innerText || tempDiv.textContent || "";
  }

  function filterAndRender() {
    const searchTerm = searchBar.value.toLowerCase();
    const filteredNotes = allNotes.filter(note => getPlainText(note.content).toLowerCase().includes(searchTerm));
    renderNotesList(filteredNotes, notesListContainer);
    const filteredTrash = allTrash.filter(note => getPlainText(note.content).toLowerCase().includes(searchTerm));
    renderNotesList(filteredTrash, trashListContainer);
  }

  function renderNotesList(notes, container) {
    container.innerHTML = "";
    if (notes.length === 0) {
      const type = container.id.includes("trash") ? "trash" : "notes";
      container.innerHTML = `<p class='empty-msg'>No ${type} found.</p>`;
      return;
    }

    notes.forEach(note => {
      const noteCard = document.createElement("div");
      noteCard.className = "note-card";
      const content = document.createElement("div");
      content.className = "note-content";
      content.innerHTML = note.content;
      const footer = document.createElement("div");
      footer.className = "note-footer";
      const date = document.createElement("span");
      date.className = "note-date";
      date.textContent = new Date(note.createdAt).toLocaleDateString();
      const actions = document.createElement("div");
      actions.className = "note-actions";

      if (container.id === "notes-list-container") {
        actions.appendChild(createButton("Copy Text", "📋", (btn) => copyNoteText(content, btn)));
        actions.appendChild(createButton("Download (.txt)", "💾", () => downloadNote(content)));
        actions.appendChild(createButton("Move to Trash", "🗑️", () => moveToTrash(note.id), "delete-btn"));
      } else {
        actions.appendChild(createButton("Restore Note", "♻️", () => restoreFromTrash(note.id), "restore-btn"));
        actions.appendChild(createButton("Delete Permanently", "❌", () => deletePermanently(note.id), "delete-btn"));
      }
      
      footer.appendChild(date);
      footer.appendChild(actions);
      noteCard.appendChild(content);
      noteCard.appendChild(footer);
      container.appendChild(noteCard);
    });
  }
  
  // --- Button/Action Helpers ---
  function createButton(title, icon, onClick, ...classes) {
    const btn = document.createElement("button");
    btn.title = title;
    btn.innerHTML = icon;
    btn.classList.add(...classes);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick(btn);
    });
    return btn;
  }

  function copyNoteText(contentElement, buttonElement) {
    const textToCopy = contentElement.innerText || contentElement.textContent;
    const textArea = document.createElement("textarea");
    textArea.value = textToCopy.trim();
    textArea.style.position = "fixed";
    textArea.style.top = 0;
    textArea.style.left = 0;
    textArea.style.opacity = 0;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    let success = false;
    try {
      success = document.execCommand('copy');
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
    
    document.body.removeChild(textArea);

    if (success) {
      const originalIcon = buttonElement.innerHTML;
      buttonElement.innerHTML = "Copied! ✅";
      buttonElement.disabled = true;
      
      setTimeout(() => {
        buttonElement.innerHTML = originalIcon;
        buttonElement.disabled = false;
      }, 2000);
    } else {
      alert("Failed to copy. Please try again.");
    }
  }

  function downloadNote(contentElement) {
    const text = contentElement.innerText || contentElement.textContent;
    const filename = `note_${new Date().toISOString().split('T')[0]}.txt`;
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }
});
