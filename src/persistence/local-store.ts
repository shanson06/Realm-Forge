/**
 * Local persistence.
 *
 * Settings live in localStorage (small, synchronous, read at boot).
 * Match saves live in IndexedDB (larger, structured, survives reloads).
 * All browser access is guarded so SSR never touches it.
 */
import type { MatchState } from "@/game-engine/types";
import type { TrialsMatchState } from "@/game-engine/trials/types";

/** Either edition's match state; both are keyed by `matchId`. */
export type StoredMatch = MatchState | TrialsMatchState;

export const SETTINGS_KEY = "realmforge.settings.v1";
export const DB_NAME = "realmforge";
export const DB_VERSION = 1;
export const MATCH_STORE = "matches";

export interface AppSettings {
  animationSpeed: "off" | "reduced" | "normal" | "fast";
  reducedMotion: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  /** 0–100 sliders. Master scales the other three. */
  masterVolume: number;
  musicVolume: number;
  effectsVolume: number;
  ambienceVolume: number;
  screenShake: boolean;
  soundCaptions: boolean;
  highContrast: boolean;
  largeText: boolean;
  nonColorIndicators: boolean;
  confirmSurrender: boolean;
  showActionHistory: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  animationSpeed: "normal",
  reducedMotion: false,
  soundEnabled: true,
  musicEnabled: true,
  masterVolume: 70,
  musicVolume: 50,
  effectsVolume: 80,
  ambienceVolume: 40,
  screenShake: true,
  soundCaptions: false,
  highContrast: false,
  largeText: false,
  nonColorIndicators: true,
  confirmSurrender: true,
  showActionHistory: true,
};

const hasWindow = () => typeof window !== "undefined";

export function loadSettings(): AppSettings {
  if (!hasWindow()) return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage full or blocked — settings stay in memory for this session */
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasWindow() || !("indexedDB" in window)) {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MATCH_STORE)) {
        db.createObjectStore(MATCH_STORE, { keyPath: "matchId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open Realmforge database."));
  });
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(MATCH_STORE, mode);
        const request = run(transaction.objectStore(MATCH_STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Realmforge storage error."));
        transaction.oncomplete = () => db.close();
      }),
  );
}

export async function saveMatch(state: StoredMatch): Promise<void> {
  await tx("readwrite", (store) => store.put({ ...state, savedAt: new Date().toISOString() }));
}

export async function loadMatch<T extends StoredMatch = MatchState>(
  matchId: string,
): Promise<T | undefined> {
  return tx<T | undefined>("readonly", (store) => store.get(matchId));
}

export async function listMatches(): Promise<StoredMatch[]> {
  return tx<StoredMatch[]>("readonly", (store) => store.getAll());
}

export async function deleteMatch(matchId: string): Promise<void> {
  await tx("readwrite", (store) => store.delete(matchId));
}

export async function storageAvailable(): Promise<boolean> {
  try {
    await openDb();
    return true;
  } catch {
    return false;
  }
}
