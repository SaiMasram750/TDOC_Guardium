import React, { useState, useEffect } from "react";
import { loadVault, saveVault } from "../utils/storage";
import { encryptVault, decryptVault } from "../utils/CryptoService";
import { verifyVault, writeVaultHash } from "../utils/web3Service";
import Toast from './Toast';

export default function Login({ onUnlock }) {
  const [password, setPassword] = useState("");
  const [vaultExists, setVaultExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Initializing...");
  const [showPassword, setShowPassword] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("error"); // Add toast type state

  const showToast = (msg, type = "error") => { // Accept type parameter
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 3000);
  };

  useEffect(() => {
    async function init() {
      try {
        const vault = await loadVault();
        setVaultExists(!!vault);
        setStatus(vault ? "Welcome back!" : "Create your first vault");
      } catch (err) {
        console.error(err);
        setStatus("Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleCreateVault = async () => {
    if (!password || password.length < 8) {
      showToast("Password needs 8+ characters", "warning");
      return;
    }
    setProcessing(true);
    setStatus("Setting things up...");
    try {
      const emptyVault = { accounts: [] };
      const encrypted = await encryptVault(emptyVault, password);
      await saveVault(encrypted);
      setStatus("Saving to blockchain...");
      await writeVaultHash(encrypted);
      setStatus("All set! ✨");
      showToast("Vault created successfully!", "success");
      setTimeout(() => onUnlock(emptyVault, password), 1000);
    } catch (err) {
      showToast("Creation failed: " + err.message, "error");
      setStatus("Create Master Password");
    } finally {
      setProcessing(false);
    }
  };

  const handleUnlock = async () => {
    if (!password || password.length < 8) {
      showToast("Password needs 8+ characters", "warning");
      return;
    }
    setProcessing(true);
    setStatus("Verifying...");
    try {
      const encryptedVault = await loadVault();
      if (!encryptedVault) {
        showToast("No vault found", "error");
        setProcessing(false);
        return;
      }
      const verified = await verifyVault(encryptedVault);
      if (!verified) {
        showToast("Integrity check failed", "error");
        setProcessing(false);
        return;
      }
      setStatus("Unlocking...");
      const decrypted = await decryptVault(encryptedVault, password);
      showToast("Vault unlocked!", "success");
      setTimeout(() => onUnlock(decrypted, password), 800);
    } catch (err) {
      showToast("Wrong password", "error");
      setPassword("");
      setStatus("Unlock your Vault");
    } finally {
      setProcessing(false);
    }
  };

  const handleAuth = () => {
    if (vaultExists) {
      handleUnlock();
    } else {
      handleCreateVault();
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <style>{keyframes}</style>
        <div style={styles.spinner}></div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{keyframes}</style>
      
      <div style={styles.bgEffects}>
        <div style={styles.colorBlur}></div>
      </div>

      <div style={styles.content}>
        <h1 style={styles.title}>{vaultExists ? "Welcome back!" : "New Vault"}</h1>
        <p style={styles.status}>{status}</p>
        
        <div style={styles.inputWrapper}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="master password"
            style={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !processing && handleAuth()}
            disabled={processing}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={styles.eyeButton}
          >
            {showPassword ? '❌' : '👁️'}
          </button>
        </div>

        <div style={styles.strengthBar}>
          <div style={{
            ...styles.strengthFill,
            width: `${Math.min((password.length / 8) * 100, 100)}%`,
            background: password.length >= 8 ? '#cde517ff' : '#0f6ae9ff'
          }}></div>
        </div>

        <button
          onClick={handleAuth}
          disabled={processing || password.length < 8}
          style={{
            ...styles.button,
            opacity: (processing || password.length < 8) ? 0.6 : 1,
            cursor: (processing || password.length < 8) ? 'default' : 'pointer'
          }}
        >
          {processing ? "please wait..." : vaultExists ? "unlock" : "create"}
        </button>

        {!processing && (
          <button
            onClick={() => {
              setVaultExists((prev) => !prev);
              setStatus(!vaultExists ? "Unlock your Vault" : "Create Master Password");
              setPassword("");
            }}
            style={styles.toggleButton}
          >
            {vaultExists ? "switch to create" : "already have one?"}
          </button>
        )}
      </div>

      {toastMessage && <Toast message={toastMessage} type={toastType} />}
    </div>
  );
}

const keyframes = `
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.15;    transform: translateX(-50%) scale(1); }
    50% { opacity: 0.25;    transform: translateX(-50%) scale(1.05); }
  }
`;

const styles = {
  container: {
    width: '100vw',
    height: '100%',
    backgroundColor: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box',
    fontFamily: '"Ubuntu","Segoe UI", Roboto, sans-serif'
  },
  bgEffects: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none'
  },
  colorBlur: {
    position: 'absolute',
    top: '20%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '300px',
    height: '300px',
    backgroundColor: '#b0e21aff',
    borderRadius: '50%',
    filter: 'blur(80px)',
    opacity: 0.15,
    animation: 'pulse 4s infinite ease-in-out'
  },
  content: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px'
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    margin: 0,
    color: '#e2e8f0',
    letterSpacing: '-0.02em'
  },
  status: {
    color: '#64748b',
    fontSize: '15px',
    margin: '-8px 0 8px 0',
    textAlign: 'center'
  },
  inputWrapper: {
    position: 'relative',
    width: '100%',
    maxWidth: '280px'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    color: '#e2e8f0',
    border: '1px solid #334155',
    outline: 'none',
    fontSize: '14px',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease',
    textAlign: 'center'
  },
  eyeButton: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px'
  },
  strengthBar: {
    height: '4px',
    width: '100%',
    maxWidth: '200px',
    backgroundColor: '#1e293b',
    borderRadius: '10px',
    overflow: 'hidden'
  },
  strengthFill: {
    height: '100%',
    transition: 'all 0.4s ease'
  },
  button: {
    width: '100%',
    maxWidth: '280px',
    padding: '14px',
    background: '#bdf71cff',
    borderRadius: '16px',
    border: 'none',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '600',
    boxShadow: '0 4px 16px rgba(194, 114, 40, 0.3)',
    transition: 'all 0.3s ease',
    cursor: 'pointer' //Add cursor
  },
  toggleButton: {
    fontSize: '14px',
    color: '#64748b',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    marginTop: '8px',
    fontWeight: '500'
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '4px solid #1e293b',
    borderTop: '3px solid #bbee21ff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  }
};
