export function getCurrentDomain() {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      try {
        const url = new URL(tabs[0].url);
        resolve(url.hostname);
      } catch {
        resolve(null);
      }
    });
  });
}
