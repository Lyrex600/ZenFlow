import { parseVaultFile, type VaultFile } from "./crypto";

/** One encrypted vault per account and device. */
const vaultKey = (userId: string) => `zenflow.vault.v1:${userId}`;

export function readVaultFile(userId: string): VaultFile | null {
  try {
    const raw = localStorage.getItem(vaultKey(userId));
    if (!raw) return null;
    return parseVaultFile(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function hasVault(userId: string): boolean {
  try {
    return localStorage.getItem(vaultKey(userId)) !== null;
  } catch {
    return false;
  }
}

export function writeVaultFile(userId: string, file: VaultFile): void {
  localStorage.setItem(vaultKey(userId), JSON.stringify(file));
}

export function clearVaultFile(userId: string): void {
  localStorage.removeItem(vaultKey(userId));
}

export function downloadFile(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
