import React, { useEffect, useState } from "react";
import { encryptVault } from "../utils/CryptoService";
import { writeVaultHash } from "../utils/web3Service"; // Ensure this imports correctly
import Toast from './Toast';
import { getCurrentDomain } from "../utils/Tabs";

export default function Vault({ vault, masterKey, onUpdate }) {
  const [domain, setDomain] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingData, setPendingData] = useState(null); 
  const [localAccounts, setLocalAccounts] = useState([]);
  const [isSaving, setIsSaving] = useState(false); // New state to track saving progress
// 1. Initialize Accounts & Sync to Session
  useEffect(() => {
    const initialAccounts = Array.isArray(vault) ? vault : (vault?.accounts || []);
    setLocalAccounts(initialAccounts);
    
    // ✅ FIX: Push unlocked vault to Session Storage so Background Script can see it!
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.session) {
      chrome.storage.session.set({ unlockedVault: initialAccounts });
      console.log("Vault synced to background session.");
    }
  }, [vault]);
  // Toast State
  const [toast, setToast] = useState({ msg: "", type: "" });
  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 3000);
  };

  // 1. Initialize Accounts from Props
  useEffect(() => {
    const initialAccounts = Array.isArray(vault) ? vault : (vault?.accounts || []);
    setLocalAccounts(initialAccounts);
  }, [vault]);

  // 2. Load Domain & Check for Pending Logins
  // useEffect(() => {
  //   getCurrentDomain().then(d => setDomain(d || ""));

  //   if (typeof chrome !== "undefined" && chrome.storage) {
  //     chrome.storage.local.get("pendingLogin", (result) => {
  //       if (result.pendingLogin) {
  //         console.log("✅ Pending Login Found:", result.pendingLogin);
  //         setPendingData(result.pendingLogin);
  //       }
  //     });
  //   }
  // }, []);

  // 🔒 THE FIXED SAVE FUNCTION (Integrity + Storage)
  // const handleSave = async () => {
  //   if (!pendingData) return;
    
  //   setIsSaving(true);
  //   showToast("Encrypting...", "info");

  //   try {
  //     // A. Prepare New Data Structure
  //     const newItem = {
  //       id: Date.now().toString(),
  //       site: pendingData.site,
  //       username: pendingData.username,
  //       password: pendingData.password
  //     };

  //     // Construct the full vault object (assuming standard structure)
  //     const updatedAccounts = [...localAccounts, newItem];
  //     const fullVaultData = { ...vault, accounts: updatedAccounts };

  //     // B. Encrypt
  //     // Note: We use the full object structure for encryption to match your other files
  //     const encrypted = await encryptVault(fullVaultData, masterKey);

  //     // C. Save to Local Storage (Browser)
  //     if (typeof chrome !== "undefined" && chrome.storage) {
  //       await chrome.storage.local.set({ vault: encrypted });
  //       // Update session so autofill works immediately without unlock
  //       await chrome.storage.session.set({ unlockedVault: updatedAccounts });
  //     }

  //     // D. 🛡️ Save to Blockchain (Integrity)
  //     showToast("Syncing to Blockchain...", "info");
  //     await writeVaultHash(encrypted);

  //     // E. Update UI & Cleanup
  //     setLocalAccounts(updatedAccounts);
  //     if (onUpdate) onUpdate(fullVaultData);
      
  //     showToast("Saved & Verified on Chain!", "success");
      
  //     // Remove from queue
  //     setPendingData(null);
  //     chrome.storage.local.remove("pendingLogin");
  //     chrome.action.setBadgeText({ text: "" });

  //   } catch (err) {
  //     console.error("Save Error:", err);
  //     showToast("Failed to save. See console.", "error");
  //   } finally {
  //     setIsSaving(false);
  //   }
  // };

  // const handleDiscard = () => {
  //   setPendingData(null);
  //   if (typeof chrome !== "undefined") {
  //     chrome.storage.local.remove("pendingLogin");
  //     chrome.action.setBadgeText({ text: "" });
  //   }
  // };

  // --- FILTERING & ACTIONS ---
  
  const visibleAccounts = localAccounts.filter(account => {
    const searchLower = searchQuery.toLowerCase();
    if (searchQuery) {
      return (
        account.site.toLowerCase().includes(searchLower) ||
        (account.username && account.username.toLowerCase().includes(searchLower))
      );
    }
    if (!domain) return true;
    return domain.toLowerCase().includes(account.site.toLowerCase()) || 
           account.site.toLowerCase().includes(domain.toLowerCase());
  });

  const autofill = (username, password, site) => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (!tabs[0]?.id || tabs[0].url?.startsWith("chrome://")) return;

      chrome.tabs.sendMessage(
        tabs[0].id,
        { type: "FILL_CREDENTIALS", credentials: { username, password } },
        (response) => {
          if (chrome.runtime.lastError) return;
          if (!response?.filled) showToast("No login fields found", "warning");
          else showToast(`Filled ${site}`, "success");
        }
      );
    });
  };

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    showToast(`${type} copied!`, "success");
  };

  return (
    <div style={styles.container}>
      <style>{keyframes}</style>
      <div style={styles.bgEffects}><div style={styles.colorBlur}></div></div>

      <div style={styles.content}>
        <h1 style={styles.title}>Your Vault</h1>

        {/* 🔔 PENDING SAVE CARD */}
        {pendingData && (
          <div style={styles.pendingCard}>
            <div style={styles.pendingHeader}>
              <span style={styles.pendingIcon}>🔔</span>
              <div>
                <p style={styles.pendingTitle}>New Login Detected</p>
                <p style={styles.pendingSite}>{pendingData.site}</p>
              </div>
            </div>
            <div style={styles.pendingActions}>
              <button 
                onClick={handleDiscard} 
                style={styles.discardButton}
                disabled={isSaving}
              >
                Discard
              </button>
              <button 
                onClick={handleSave} 
                style={{...styles.saveButton, opacity: isSaving ? 0.7 : 1}}
                disabled={isSaving}
              >
                {isSaving ? "Syncing..." : "Save to Vault"}
              </button>
            </div>
          </div>
        )}

        {/* STATUS & SEARCH */}
        <p style={styles.status}>
          {visibleAccounts.length > 0 
            ? `${visibleAccounts.length} login${visibleAccounts.length !== 1 ? 's' : ''} found`
            : "No logins found"}
        </p>

        <div style={styles.searchWrapper}>
          <input
            type="text"
            placeholder="Search vault..."
            style={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} style={styles.clearButton}>×</button>
          )}
        </div>

        {/* LIST */}
        <div style={styles.vaultList}>
          {visibleAccounts.map((account, index) => (
            <div key={index} style={styles.vaultItem}>
              <div style={styles.itemTop}>
                <div style={styles.siteInfo}>
                  <p style={styles.siteName}>{account.site}</p>
                  <p style={styles.username}>{account.username}</p>
                </div>
              </div>
              <div style={styles.actionButtons}>
                <button onClick={() => handleCopy(account.username, "User")} style={styles.actionButton}>User</button>
                <button onClick={() => autofill(account.username, account.password, account.site)} style={styles.primaryButton}>Auto-Fill</button>
                <button onClick={() => handleCopy(account.password, "Pass")} style={styles.actionButton}>Pass</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {toast.msg && <Toast message={toast.msg} type={toast.type} />}
    </div>
  );
}

const styles = {
  container: {
    width: '100vw',
    height: '100%',
    backgroundColor: '#0f172a',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px',
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box',
    fontFamily: '"Ubuntu","Segoe UI", Roboto, sans-serif'
  },
  bgEffects: { position: 'absolute', inset: 0, pointerEvents: 'none' },
  colorBlur: {
    position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
    width: '300px', height: '300px', backgroundColor: '#10b981', borderRadius: '50%',
    filter: 'blur(80px)', opacity: 0.15, animation: 'pulse 4s infinite ease-in-out'
  },
  content: {
    position: 'relative', zIndex: 10, width: '100%', maxWidth: '400px',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '16px', maxHeight: '100%', overflow: 'hidden'
  },
  title: { fontSize: '32px', fontWeight: '700', margin: 0, color: '#e2e8f0' },
  status: { color: '#64748b', fontSize: '15px', margin: '-8px 0 8px 0', textAlign: 'center' },
  searchWrapper: { position: 'relative', width: '100%', maxWidth: '280px' },
  searchInput: {
    width: '100%', padding: '12px 36px 12px 16px', backgroundColor: '#1e293b',
    borderRadius: '16px', color: '#e2e8f0', border: '1px solid #334155', outline: 'none',
    textAlign: 'center',boxSizing: 'border-box'
  },
  clearButton: {
    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', color: '#64748b', fontSize: '20px', cursor: 'pointer',padding :'4px'
  },//Added padding 4px for better click area
  vaultList: {
    width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column',
    gap: '12px', overflowY: 'auto', maxHeight: 'calc(100vh - 300px)', paddingRight: '4px'
  },//add calc(100vh - 300px) for more responsivness
  vaultItem: {
    backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155',
    padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px',
    animation: 'slideUp 0.3s ease-out'
  },
  itemTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  siteInfo: { flex: 1, minWidth: 0 },
  siteName: { color: '#e2e8f0', fontSize: '15px', fontWeight: '600', margin: 0 },
  username: { color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' },
  actionButtons: { display: 'flex', gap: '6px', width: '100%' },
  actionButton: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '8px', backgroundColor: 'rgba(15, 23, 42, 0.5)', border: '1px solid #334155',
    borderRadius: '10px', color: '#64748b', fontSize: '12px', cursor: 'pointer',transition :'all 0.2s ease'
  },
  primaryButton: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '8px', background: '#10b981', border: 'none', borderRadius: '10px',
    color: '#ffffff', fontSize: '12px', fontWeight: '600', cursor: 'pointer',transition: 'all 0.2s ease'
  },
  // PENDING CARD STYLES
  pendingCard: {
    width: '100%', maxWidth: '320px', backgroundColor: '#1e293b', borderRadius: '12px',
    padding: '12px', border: '1px solid #3b82f6', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
    marginBottom: '8px', animation: 'slideIn 0.3s ease-out'
  },
  pendingHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' },
  pendingIcon: { fontSize: '20px' },
  pendingTitle: { color: '#3b82f6', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', margin: 0 },
  pendingSite: { color: '#ffffff', fontSize: '14px', fontWeight: '600', margin: 0 },
  pendingActions: { display: 'flex', gap: '8px' },
  saveButton: {
    flex: 1, background: '#3b82f6', color: 'white', border: 'none', padding: '8px',
    borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '12px',transition: 'all 0.2s ease'
  },
  discardButton: {
    flex: 1, background: 'transparent', color: '#94a3b8', border: '1px solid #475569',
    padding: '8px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '12px',transition: 'all 0.2s ease'
  }
};

const keyframes = `
  @keyframes pulse { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.25; } }
  @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes slideIn { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`;
