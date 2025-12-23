import { ethers } from "ethers";
import createMetaMaskProvider from "metamask-extension-provider";

// -----------------------------------
// CONFIG
// -----------------------------------
export const VAULT_REGISTRY_ADDRESS =
  "0x12e913CE401F854A6e43A84F4417e347e2788663";

export const VAULT_REGISTRY_ABI = [
  "function updateVaultHash(bytes32 vaultHash)",
  "function getVaultHash(address user) view returns (bytes32)",
];

// -----------------------------------
// PROVIDER (EXTENSION SAFE)
// -----------------------------------
let cachedProvider = null;

async function getProvider() {
  if (cachedProvider) return cachedProvider;

  let injected = window.ethereum;

  if (injected) {
    await injected.request({ method: "eth_requestAccounts" });
    cachedProvider = new ethers.providers.Web3Provider(injected);
    return cachedProvider;
  }

  // MetaMask extension provider (popup-safe)
  const mm = createMetaMaskProvider();
  if (!mm) throw new Error("MetaMask not found");

  await mm.request({ method: "eth_requestAccounts" });
  cachedProvider = new ethers.providers.Web3Provider(mm);
  return cachedProvider;
}

// -----------------------------------
// CONTRACT
// -----------------------------------
async function getContract(withSigner = false) {
  const provider = await getProvider();

  if (withSigner) {
    return new ethers.Contract(
      VAULT_REGISTRY_ADDRESS,
      VAULT_REGISTRY_ABI,
      provider.getSigner()
    );
  }

  return new ethers.Contract(
    VAULT_REGISTRY_ADDRESS,
    VAULT_REGISTRY_ABI,
    provider
  );
}

// -----------------------------------
// WALLET
// -----------------------------------
export async function getUserAddress() {
  const provider = await getProvider();
  const signer = provider.getSigner();
  return signer.getAddress();
}

// -----------------------------------
// VAULT HASH HELPERS
// -----------------------------------
export function computeVaultHash(vault) {
  // vault = { ciphertext, iv, salt }
  return ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes(
      vault.ciphertext + vault.iv.join(",") + vault.salt.join(",")
    )
  );
}

// -----------------------------------
// BLOCKCHAIN ACTIONS
// -----------------------------------
export async function writeVaultHash(vault) {
  const hash = computeVaultHash(vault);
  const contract = await getContract(true);

  const tx = await contract.updateVaultHash(hash);
  await tx.wait();

  return hash;
}

export async function readVaultHash(address) {
  const contract = await getContract();
  return contract.getVaultHash(address);
}

export async function verifyVault(vault) {
  const address = await getUserAddress();
  const localHash = computeVaultHash(vault);
  const onChainHash = await readVaultHash(address);

  return localHash === onChainHash;
}
