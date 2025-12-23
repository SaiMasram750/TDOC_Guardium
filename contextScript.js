console.log("Guardium is loaded");

function setNativeValue(element, value) {
    const prototype = Object.getPrototypeOf(element);
    let descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

    if(!descriptor){
        descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
    }
    if (descriptor && descriptor.set) {
        descriptor.set.call(element, value);
    }else{
        element.value = value;
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
}

function isExtentionContextValid() {
    return typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id;
}

function fillCredentials(passwordInput, credentials) {
  if (!credentials) return;

  console.log("Guardium: Filling password");
  setNativeValue(passwordInput, credentials.password);

  // Heuristic: Look for the username field strictly before the password field
  const inputs = Array.from(document.querySelectorAll('input'));
  const passIndex = inputs.indexOf(passwordInput);
  
  if (passIndex > 0) {
    // Search backwards for the nearest visible text/email input
    for (let i = passIndex - 1; i >= 0; i--) {
        const prevInput = inputs[i];
        if (prevInput.type === "text" || prevInput.type === "email") {
            // Check visibility (simple check)
            if (prevInput.offsetParent !== null) { 
                console.log("Guardium: Filling username");
                setNativeValue(prevInput, credentials.username);
                break; // Stop after filling one username
            }
        }
    }
  }
}
function attachlisteners(passwordInput) {
    if(passwordInput.dataset.guardiumAttached) return;
    passwordInput.dataset.guardiumAttached = "true";

    passwordInput.addEventListener("focus", async () => {
        console.log("Guardium: Password field focused");
        try {
            chrome.runtime.sendMessage({type:"REQUEST_CREDEDENTIALS",site: window.location.hostname},
                (response)=>{
                    if(chrome.runtime.lastError){
                        return;
                    }
                    if(response && response.credentials){
                        fillCredentials(passwordInput, response.credentials);
                    }   
                });   
        } catch (error) {
            
        }
    });
}
function detectPasswordInputs() {
    document.querySelectorAll('input[type="password"]').forEach((attachlisteners));
}
const observer = new MutationObserver(detectPasswordInputs);
observer.observe(document.documentElement, { childList: true, subtree: true });

detectPasswordInputs();
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if(message.type === "FILL_CREDENTIALS" && message.credentials){
        if(message.credentials && message.credentials.password){
            const passwordInput=document.querySelector('input[type="password"]');
            if(passwordInput){
                fillCredentials(passwordInput, message.credentials);
                sendResponse({filled: "true"});
            }
        }else{
            console.warn("No passwrod field is found");
            sendResponse({filled: "false"});
        }
    }
});
function findUsernameField(passwordInput) {
    const inputs = Array.from(document.querySelectorAll('input'));
    const passIndex=inputs.indexOf(passwordInput);
       for (let i = passIndex - 1; i >= 0; i--) {
        const prevInput = inputs[i];
        if ((prevInput.type === "text" || prevInput.type === "email")&&prevInput.offsetParent!== null) {
            return prevInput;
            }
        }
        return null;
    }
let typingTimer;
function syncToBackground(passwordInput) {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        if(passwordInput.value.length===0)return;
        const usernameInput=findUsernameField(passwordInput);
        const credentials={
            username:usernameInput?usernameInput.value:"",
            password:passwordInput.value,
            site:window.location.hostname
        };
        console.log("Syncing",credentials.username);
        try {
            chrome.runtime.sendMessage({type:"Queueing_credentials",data:credentials});
        
        } catch (error) {
            console.error("Error syncing credentials",error);
        }
    },500);
}
document.addEventListener("input", (event) => {
    if(event.target.type==="password"){
        syncToBackground(event.target);
    }
},true);
document.addEventListener("change", (event) => {
    if(event.target.type==="password"){
        syncToBackground(event.target);
    }
},true);
