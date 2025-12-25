s

export function isMetaMaskInstalled() {
  return typeof window.ethereum !== "undefined" && window.ethereum.isMetaMask;
}

export async function requestMetaMaskAccounts() {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask is not installed");
  }
  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    return accounts;
  } catch (err) {
    console.error("MetaMask account request failed:", err);
    throw err;
  }
}
