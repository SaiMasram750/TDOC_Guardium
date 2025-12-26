export function isMetaMaskInstalled() {
  return typeof window.ethereum !== "undefined" && window.ethereum.isMetaMask;
}
