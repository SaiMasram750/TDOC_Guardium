import React, { useState, useEffect } from "react";
// import Header from "./components/Header";
import Login from "./components/Login";
import Vault from "./components/Vault";
import AddPassword from "./components/AddPassword";
import "./App.css";

export default function App() {
  const [isLoading, setIsLoading] = useState(true); // Wait while we check storage
  const [showIntro, setShowIntro] = useState(false);
  const [vault, setVault] = useState(null);
  const [masterPassword, setMasterPassword] = useState(null);

  // 1. Check if user has seen the intro before
  useEffect(() => {
    // Check Chrome Storage (Production)
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get("introCompleted", (result) => {
        // If flag is missing or false, show Intro
        if (!result.introCompleted) {
          setShowIntro(true);
        }
        setIsLoading(false);
      });
    } else {
      // Fallback for Localhost/Dev
      const hasSeen = localStorage.getItem("introCompleted");
      if (!hasSeen) setShowIntro(true);
      setIsLoading(false);
    }
  }, []);


  // 3. Show a blank screen or spinner while checking storage (prevents flickering)
  if (isLoading) {
    return <div style={{width: '100%', height: '100vh', background: '#0f172a'}} />;
  }

  // // 4. Show Intro only if flag wasn't found
  // if (showIntro) {
  //   return <Intro onComplete={finishIntro} />;
  // }

  // 5. Main App Flow
  return (
    <>
      <div className="content">
        {!vault ? (
          <Login
            onUnlock={(v, m) => {
              setVault(v);
              setMasterPassword(m);
            }}
          />
        ) : (
          <>
            <Vault 
              vault={vault} 
              masterKey={masterPassword} 
              onUpdate={setVault} 
            />
            <AddPassword
              vault={vault}
              masterPassword={masterPassword}
              onUpdate={setVault}
            />
          </>
        )}
      </div>
    </>
  );
}