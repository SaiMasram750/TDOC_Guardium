import React, { useEffect, useState } from "react";
import { encryptVault } from "../utils/CryptoService";
import { saveVault } from "../utils/storage";
import { writeVaultHash } from "../utils/web3Service";
import Toast from './Toast';
import { getCurrentDomain } from "../utils/Tabs";

export default function AddPassword({ vault, masterPassword, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [site, setSite] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("error"); // Add toast type state
  const [status, setStatus] = useState("Fill in the details");
  
  useEffect(() => {
    getCurrentDomain().then(setSite);
  }, [])
  
  const showToast = (msg, type = "error") => { // Accept type parameter
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const save = async () => {
    if (!site.trim() || !password.trim()) {
      showToast('Website and Password are required.', 'warning');
      return;
    }
    setSaving(true);
    setStatus("Encrypting...");
    try {
      const updated = {
        ...vault,
        accounts: [...vault.accounts, { site, username, password }]
      };
      const encrypted = await encryptVault(updated, masterPassword);
      await saveVault(encrypted);
      setStatus("Saving to blockchain...");
      await writeVaultHash(encrypted);
      onUpdate(updated);
      setStatus("All set! ✨");
      showToast('Password saved successfully!', 'success');
      setTimeout(() => {
        setOpen(false);
        setSite("");
        setUsername("");
        setPassword("");
        setStatus("Fill in the details");
      }, 1000);
    } catch (err) {
      console.error(err);
      showToast('Failed to save. Please try again.', 'error');
      setStatus("Fill in the details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <style>{keyframes}</style>
      
      {!open && (
        <button 
          className="secondary" 
          onClick={() => setOpen(true)}
          style={styles.openButton}
        >
          ➕ Add Password
        </button>
      )}
      
      {open && (
        <div style={styles.container}>
          <div style={styles.bgEffects}>
            <div style={styles.colorBlur}></div>
          </div>

          <div style={styles.content}>
            <h1 style={styles.title}>Add Password</h1>
            <p style={styles.status}>{status}</p>

            <div style={styles.inputGroup}>
              <input
                placeholder="website (e.g. github.com)"
                style={styles.input}
                value={site}
                onChange={(e) => setSite(e.target.value)}
                disabled={saving}
              />
            </div>

            <div style={styles.inputGroup}>
              <input
                placeholder="username (optional)"
                style={styles.input}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={saving}
              />
            </div>

            <div style={styles.inputWrapper}>
              <input
                placeholder="password"
                type={showPassword ? "text" : "password"}
                style={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !saving && site.trim() && password.trim() && save()}
                disabled={saving}
              />
              <button>
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              
                {showPassword ? '❌' : '👁️'}
              </button>
            </div>

            <div style={styles.strengthBar}>
              <div style={{
                ...styles.strengthFill,
                width: `${Math.min((password.length / 12) * 100, 100)}%`,
                background: password.length >= 12 ? '#b6b910ff' : '#334155'
              }}></div>
            </div>

            <button
              onClick={save}
              disabled={saving || !site.trim() || !password.trim()}
              style={{
                ...styles.button,
                opacity: (saving || !site.trim() || !password.trim()) ? 0.6 : 1,
                cursor: (saving || !site.trim() || !password.trim()) ? 'default' : 'pointer'
              }}
            >
              {saving ? "please wait..." : "save password"}
            </button>

            {!saving && (
              <button
                onClick={() => {
                  setOpen(false);
                  setSite("");
                  setUsername("");
                  setPassword("");
                  setStatus("Fill in the details");
                }}
                style={styles.toggleButton}
              >
                cancel
              </button>
            )}
          </div>

          {toastMessage && <Toast message={toastMessage} type={toastType} />}
        </div>
      )}
    </>
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
    0%, 100% { opacity: 0.15; }
    50% { opacity: 0.25; }
  }
`;

const styles = {
  openButton: {
    position: 'relative',
    zIndex: 1
  },
  container: {
    width: '100%',
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
    backgroundColor: '#10b981',
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
  inputGroup: {
    width: '100%',
    maxWidth: '280px'
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
    background: '#10b981',
    borderRadius: '16px',
    border: 'none',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '600',
    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
    transition: 'all 0.3s ease'
  },
  toggleButton: {
    fontSize: '14px',
    color: '#64748b',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    marginTop: '8px',
    fontWeight: '500'
  }
};
