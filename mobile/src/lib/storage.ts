import * as SecureStore from "expo-secure-store";

const isWeb = typeof window !== "undefined";

export async function getStorageItem(
  key: string
): Promise<string | null> {
  if (isWeb) {
    return window.localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

export async function setStorageItem(
  key: string,
  value: string
): Promise<void> {
  if (isWeb) {
    window.localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

export async function deleteStorageItem(
  key: string
): Promise<void> {
  if (isWeb) {
    window.localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}