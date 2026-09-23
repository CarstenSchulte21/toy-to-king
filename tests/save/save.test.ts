import { afterEach, describe, expect, it, vi } from "vitest";
import { createNewGame, type GameContent } from "@/engine";
import { MemorySaveStore, createAutosaver, loadGame } from "@/save/SaveStore";

const content: GameContent = {
  config: { start_room: "hof" },
  rooms: { hof: { id: "hof", name: "Hof", hotspots: [] } },
  npcs: {},
  facts: {},
  items: {},
  spray: null,
  spots: {},
  map: null,
  progress: null,
  risk: null,
  economy: null,
};
const state = createNewGame(content, "KRAZE", "2026-01-01T00:00:00.000Z");

afterEach(() => vi.useRealTimers());

describe("loadGame", () => {
  it("lädt, was gespeichert wurde", async () => {
    const store = new MemorySaveStore();
    await store.save("main", state);
    expect((await loadGame(store, "main", content)).state).toEqual(state);
  });

  it("ohne Spielstand gibt es nichts zum Weiterspielen", async () => {
    expect(await loadGame(new MemorySaveStore(), "main", content)).toEqual({ state: null });
  });

  it("kaputter Spielstand: kein Absturz, sondern Warnung", async () => {
    const store = new MemorySaveStore();
    store.data.set("main", "{kaputt");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = await loadGame(store, "main", content);
    expect(r.state).toBeNull();
    expect(r.warning).toContain("ignoriert");
    warn.mockRestore();
  });

  it("unbekannte Version wird ignoriert", async () => {
    const store = new MemorySaveStore();
    store.data.set("main", JSON.stringify({ ...state, schemaVersion: 99 }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await loadGame(store, "main", content)).warning).toContain("Version 99");
    warn.mockRestore();
  });

  it("Room, den es nicht mehr gibt → Start-Room", async () => {
    const store = new MemorySaveStore();
    await store.save("main", { ...state, room: "abgerissen" });
    expect((await loadGame(store, "main", content)).state?.room).toBe("hof");
  });

  it("clear löscht den Spielstand", async () => {
    const store = new MemorySaveStore();
    await store.save("main", state);
    await store.clear("main");
    expect((await loadGame(store, "main", content)).state).toBeNull();
  });
});

describe("createAutosaver", () => {
  it("speichert höchstens einmal pro Sekunde, und zwar den neuesten Stand", async () => {
    vi.useFakeTimers();
    const store = new MemorySaveStore();
    const save = vi.spyOn(store, "save");
    const auto = createAutosaver(store, "main", 1000);
    auto.schedule({ ...state, room: "a" });
    auto.schedule({ ...state, room: "b" });
    auto.schedule({ ...state, room: "c" });
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]?.[1].room).toBe("c");
  });

  it("flush speichert sofort", async () => {
    vi.useFakeTimers();
    const store = new MemorySaveStore();
    const auto = createAutosaver(store, "main", 1000);
    auto.schedule(state);
    await auto.flush();
    expect(store.data.has("main")).toBe(true);
  });
});

describe("createAutosaver.cancel", () => {
  it("verwirft ungespeicherte Änderungen", async () => {
    vi.useFakeTimers();
    const store = new MemorySaveStore();
    const auto = createAutosaver(store, "main", 1000);
    auto.schedule(state);
    auto.cancel();
    await vi.advanceTimersByTimeAsync(2000);
    await auto.flush();
    expect(store.data.has("main")).toBe(false);
  });
});
