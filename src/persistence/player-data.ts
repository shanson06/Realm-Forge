/**
 * Versioned local player data.
 *
 * Everything here is device-local and account-free. The store is deliberately
 * schema-versioned: every load runs the migration chain, so a valid save is
 * never discarded merely because the app shipped a new version.
 */
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  listMatches,
  saveMatch,
  type AppSettings,
  type StoredMatch,
} from "@/persistence/local-store";

export const PLAYER_DATA_KEY = "realmforge.player.v1";
/** Bump this whenever the shape changes, and add a migration below. */
export const PLAYER_DATA_VERSION = 2;

export interface PlayerStats {
  coopWins: number;
  coopLosses: number;
  trialsWins: number;
  trialsLosses: number;
  matchesStarted: number;
  /** Boss id → times defeated. */
  bossVictories: Record<string, number>;
  /** Oathguard Order → matches played / won. */
  orderPlays: Record<string, number>;
  orderWins: Record<string, number>;
}

export interface PlayerData {
  version: number;
  createdAt: string;
  updatedAt: string;
  profile: { displayName: string; badgeId: string | null };
  tutorial: { completedLessonIds: string[]; lastLessonId: string | null };
  stats: PlayerStats;
  /** Achievement id → ISO unlock timestamp. */
  achievements: Record<string, string>;
  cosmetics: {
    unlocked: string[];
    selectedCardBack: string;
    selectedTheme: string;
  };
}

export const DEFAULT_STATS: PlayerStats = {
  coopWins: 0,
  coopLosses: 0,
  trialsWins: 0,
  trialsLosses: 0,
  matchesStarted: 0,
  bossVictories: {},
  orderPlays: {},
  orderWins: {},
};

export function createPlayerData(now = new Date().toISOString()): PlayerData {
  return {
    version: PLAYER_DATA_VERSION,
    createdAt: now,
    updatedAt: now,
    profile: { displayName: "Guest Oathguard", badgeId: null },
    tutorial: { completedLessonIds: [], lastLessonId: null },
    stats: { ...DEFAULT_STATS, bossVictories: {}, orderPlays: {}, orderWins: {} },
    achievements: {},
    cosmetics: {
      unlocked: ["cardback-oathguard-standard", "theme-oathguard"],
      selectedCardBack: "cardback-oathguard-standard",
      selectedTheme: "theme-oathguard",
    },
  };
}

/* ------------------------------------------------------------------ */
/* Migrations                                                          */
/* ------------------------------------------------------------------ */

type Migration = (input: Record<string, unknown>) => Record<string, unknown>;

/**
 * `MIGRATIONS[n]` upgrades a save at version `n` to version `n + 1`.
 * Migrations must be pure and must never throw on partial data.
 */
export const MIGRATIONS: Record<number, Migration> = {
  // v0 → v1: the earliest builds stored only a flat progress blob with no
  // version marker. Absorb whatever is recognisable, default the rest.
  0: (input) => {
    const base = createPlayerData() as unknown as Record<string, unknown>;
    return {
      ...base,
      ...input,
      version: 1,
      createdAt: typeof input.createdAt === "string" ? input.createdAt : base.createdAt,
    };
  },
  // v1 → v2: cosmetics were introduced, and boss victories moved from a plain
  // count to a per-boss record.
  1: (input) => {
    const cosmetics = (input.cosmetics as PlayerData["cosmetics"] | undefined) ?? {
      unlocked: ["cardback-oathguard-standard", "theme-oathguard"],
      selectedCardBack: "cardback-oathguard-standard",
      selectedTheme: "theme-oathguard",
    };
    const stats = (input.stats ?? {}) as Record<string, unknown>;
    const legacyBossCount = typeof stats.bossVictories === "number" ? stats.bossVictories : null;
    return {
      ...input,
      version: 2,
      cosmetics,
      stats: {
        ...DEFAULT_STATS,
        ...stats,
        bossVictories:
          legacyBossCount === null
            ? ((stats.bossVictories as Record<string, number>) ?? {})
            : { legacy: legacyBossCount },
        orderPlays: (stats.orderPlays as Record<string, number>) ?? {},
        orderWins: (stats.orderWins as Record<string, number>) ?? {},
      },
    };
  },
};

export interface MigrationResult {
  data: PlayerData;
  /** Version the save was found at, before migration. */
  fromVersion: number;
  migrated: boolean;
  /** True when the payload was unusable and defaults were substituted. */
  recovered: boolean;
}

/** Runs the migration chain. Never throws; falls back to a fresh profile. */
export function migratePlayerData(raw: unknown): MigrationResult {
  if (raw === null || typeof raw !== "object") {
    return { data: createPlayerData(), fromVersion: -1, migrated: false, recovered: true };
  }
  let current = { ...(raw as Record<string, unknown>) };
  const found = typeof current.version === "number" ? current.version : 0;
  let version = found;

  try {
    while (version < PLAYER_DATA_VERSION) {
      const step = MIGRATIONS[version];
      if (!step) break;
      current = step(current);
      version = typeof current.version === "number" ? current.version : version + 1;
    }
  } catch {
    return { data: createPlayerData(), fromVersion: found, migrated: false, recovered: true };
  }

  // A save from a NEWER app version is kept as-is rather than destroyed.
  const merged = { ...createPlayerData(), ...current } as PlayerData;
  merged.stats = { ...DEFAULT_STATS, ...(merged.stats ?? DEFAULT_STATS) };
  merged.tutorial = {
    completedLessonIds: merged.tutorial?.completedLessonIds ?? [],
    lastLessonId: merged.tutorial?.lastLessonId ?? null,
  };
  merged.achievements = merged.achievements ?? {};
  merged.version = Math.max(version, PLAYER_DATA_VERSION);

  return { data: merged, fromVersion: found, migrated: found !== merged.version, recovered: false };
}

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

const hasWindow = () => typeof window !== "undefined";

export function loadPlayerData(): PlayerData {
  if (!hasWindow()) return createPlayerData();
  let raw: unknown = null;
  try {
    const text = window.localStorage.getItem(PLAYER_DATA_KEY);
    raw = text ? JSON.parse(text) : null;
  } catch {
    raw = null;
  }
  if (raw === null) return createPlayerData();
  const result = migratePlayerData(raw);
  if (result.migrated) savePlayerData(result.data);
  return result.data;
}

export function savePlayerData(data: PlayerData): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(
      PLAYER_DATA_KEY,
      JSON.stringify({ ...data, updatedAt: new Date().toISOString() }),
    );
  } catch {
    /* storage blocked — progress stays in memory for this session */
  }
}

/* ------------------------------------------------------------------ */
/* Export / import                                                     */
/* ------------------------------------------------------------------ */

export const BACKUP_KIND = "realmforge.backup";
export const BACKUP_VERSION = 1;

export interface BackupBundle {
  kind: typeof BACKUP_KIND;
  backupVersion: number;
  exportedAt: string;
  player: PlayerData;
  settings: AppSettings;
  matches: StoredMatch[];
}

export async function exportBackup(): Promise<BackupBundle> {
  let matches: StoredMatch[] = [];
  try {
    matches = await listMatches();
  } catch {
    matches = [];
  }
  return {
    kind: BACKUP_KIND,
    backupVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    player: loadPlayerData(),
    settings: loadSettings(),
    matches,
  };
}

export interface ImportReport {
  ok: boolean;
  message: string;
  restoredMatches: number;
  migratedFrom?: number;
}

/** Validates and restores a backup. A malformed file is rejected, not applied. */
export async function importBackup(text: string): Promise<ImportReport> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: "That file is not valid JSON.", restoredMatches: 0 };
  }
  if (parsed === null || typeof parsed !== "object") {
    return { ok: false, message: "That file is not a Realmforge backup.", restoredMatches: 0 };
  }
  const bundle = parsed as Partial<BackupBundle>;
  if (bundle.kind !== BACKUP_KIND || typeof bundle.player !== "object") {
    return { ok: false, message: "That file is not a Realmforge backup.", restoredMatches: 0 };
  }

  const result = migratePlayerData(bundle.player);
  if (result.recovered) {
    return { ok: false, message: "The backup's player record is unreadable.", restoredMatches: 0 };
  }
  savePlayerData(result.data);
  if (bundle.settings) saveSettings({ ...DEFAULT_SETTINGS, ...bundle.settings });

  let restored = 0;
  for (const match of bundle.matches ?? []) {
    try {
      await saveMatch(match);
      restored += 1;
    } catch {
      /* one bad match must not abort the whole restore */
    }
  }
  return {
    ok: true,
    message: "Backup restored.",
    restoredMatches: restored,
    migratedFrom: result.fromVersion,
  };
}

export function clearPlayerData(): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(PLAYER_DATA_KEY);
  } catch {
    /* nothing else to do */
  }
}