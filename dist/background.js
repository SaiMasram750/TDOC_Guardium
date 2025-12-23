// src/background.js

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  
  // ---------------------------------------------------------
  // 1. Handle Auto-fill Requests
  // ---------------------------------------------------------
  // Triggered when you click/focus a password field on a website
  if (message.type === "REQUEST_CREDENTIALS") {
    handleAutofillRequest(message.site, sendResponse);
    return true; // KEEPS THE CHANNEL OPEN for async response
  }

  // ---------------------------------------------------------
  // 2. Handle "Save Password" Requests
  // ---------------------------------------------------------
  // Triggered when you click "Save" on the webpage pop-in
  if (message.type === "QUEUE_CREDENTIALS") {
    console.log("Background: Queueing credentials for", message.data.site);
    
    // Save to LOCAL storage (so it persists until you open the popup)
    chrome.storage.local.set({ pendingLogin: message.data }, () => {
      console.log("Background: Credentials saved to storage.");

      // Add a notification Badge
      chrome.action.setBadgeText({ text: "1" });
      chrome.action.setBadgeBackgroundColor({ color: "#2563eb" }); // Blue
      
      // ✅ Send success confirmation back to content.js
      sendResponse({ success: true });
    });
    
    return true; // KEEPS THE CHANNEL OPEN for async response
  }

  // ---------------------------------------------------------
  // 3. Handle Pings (Optional)
  // ---------------------------------------------------------
  if (message.type === "PING") {
    sendResponse({ status: "Background service active" });
  }
});

/**
 * Looks up credentials in the secure session storage
 * @param {string} siteUrl - The hostname of the site (e.g., "www.netflix.com")
 * @param {function} sendResponse - Callback to send data back to the content script
 */
function handleAutofillRequest(siteUrl, sendResponse) {
  // We use 'session' storage because it is encrypted in RAM and cleared when browser closes.
  // The 'unlockedVault' key is set by Vault.tsx when you log in.
  chrome.storage.session.get("unlockedVault", (data) => {
    const vault = data.unlockedVault || [];
    
    if (vault.length === 0) {
      console.log("Guardium: Vault is locked or empty.");
      sendResponse({ credentials: null });
      return;
    }

    const currentSite = siteUrl.toLowerCase(); 

    // FUZZY MATCHING: Check if the stored site name is part of the URL
    // e.g. Stored "netflix" matches "www.netflix.com"
    const match = vault.find(item => 
      currentSite.includes(item.site.toLowerCase()) || 
      item.site.toLowerCase().includes(currentSite)
    );

    if (match) {
      console.log(`Guardium: Match found for ${siteUrl}`);
      sendResponse({ 
        credentials: { 
          username: match.username, 
          password: match.password 
        } 
      });
    } else {
      console.log(`Guardium: No credentials found for ${siteUrl}`);
      sendResponse({ credentials: null });
    }
  });
}