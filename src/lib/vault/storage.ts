import { parseVaultFile, type VaultFile } from "./crypto";

const VAULT_KEY = "zenflow.vault.v1";

export function readVaultFile(): VaultFile | null {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return null;
    return parseVaultFile(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function hasVault(): boolean {
  try {
    return localStorage.getItem(VAULT_KEY) !== null;
  } catch {
    return false;
  }
}

export function writeVaultFile(file: VaultFile): void {
  localStorage.setItem(VAULT_KEY, JSON.stringify(file));
}

export function clearVaultFile(): void {
  localStorage.removeItem(VAULT_KEY);
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
