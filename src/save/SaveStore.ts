// Speichern hinter einer Schnittstelle (F9.1): Heute speichert der Browser, in v2 ein Server.
// Der Rest des Spiels kennt nur SaveStore und merkt vom Wechsel nichts.
import { fitToContent, migrate, type GameContent, type GameState } from "@/engine";

export interface SaveStore {
  load(slot: string): Promise<unknown | null>;
  save(slot: string, state: GameState): Promise<void>;
  clear(slot: string): Promise<void>;
}

const KEY_PREFIX = "toy-to-king:save:";

export class LocalStorageSaveStore implements SaveStore {
  async load(slot: string): Promise<unknown | null> {
    const raw = localStorage.getItem(KEY_PREFIX + slot);
    if (raw === null) return null;
    return JSON.parse(raw) as unknown;
  }
  async save(slot: string, state: GameState): Promise<void> {
    localStorage.setItem(KEY_PREFIX + slot, JSON.stringify(state));
  }
  async clear(slot: string): Promise<void> {
    localStorage.removeItem(KEY_PREFIX + slot);
  }
}

export class MemorySaveStore implements SaveStore {
  readonly data = new Map<string, string>();
  async load(slot: string): Promise<unknown | null> {
    const raw = this.data.get(slot);
    return raw === undefined ? null : (JSON.parse(raw) as unknown);
  }
  async save(slot: string, state: GameState): Promise<void> {
    this.data.set(slot, JSON.stringify(state));
  }
  async clear(slot: string): Promise<void> {
    this.data.delete(slot);
  }
}

export type LoadResult = { state: GameState | null; warning?: string };

// Lädt einen Spielstand. Ist er kaputt oder aus einer unbekannten Version,
// gibt es kein Spiel zum Weiterspielen – aber auch keinen Absturz.
export async function loadGame(store: SaveStore, slot: string, content: GameContent): Promise<LoadResult> {
  try {
    const raw = await store.load(slot);
    if (raw === null) return { state: null };
    return { state: fitToContent(migrate(raw, content), content) };
  } catch (error) {
    const warning = `Spielstand konnte nicht geladen werden und wird ignoriert: ${(error as Error).message}`;
    console.warn(warning);
    return { state: null, warning };
  }
}

// Speichert nach Änderungen, aber höchstens einmal pro Intervall (Standard: 1 Sekunde).
// Der jeweils neueste Stand gewinnt; flush() speichert sofort (z. B. beim Verlassen der Seite).
export function createAutosaver(store: SaveStore, slot: string, intervalMs = 1000) {
  let pending: GameState | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const write = async () => {
    timer = null;
    if (!pending) return;
    const state = pending;
    pending = null;
    try {
      await store.save(slot, state);
    } catch (error) {
      console.warn("Speichern fehlgeschlagen:", error);
    }
  };

  return {
    schedule(state: GameState) {
      pending = state;
      if (timer === null) timer = setTimeout(write, intervalMs);
    },
    async flush() {
      if (timer !== null) clearTimeout(timer);
      await write();
    },
    // Verwirft ungespeicherte Änderungen, z. B. bevor der Spielstand gelöscht wird.
    cancel() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      pending = null;
    },
  };
}
