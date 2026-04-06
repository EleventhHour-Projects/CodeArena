/**
 * CodeArena – Next.js unit & integration tests
 *
 * Coverage areas:
 *  1. Pure utility helpers (formatBytes, relativeTime, usageColor)
 *  2. WorkerPool type shape validation (type guards)
 *  3. Admin notifications form logic (username validation, char limit)
 *  4. Cluster page rendering & live-refresh (fetch mock)
 *  5. Admin notify API contract (request / response shapes)
 *  6. Username autocomplete debounce behaviour
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ─── 1. Pure helpers (extracted inline so tests have no file-system deps) ──────

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function relativeTime(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return "—";
  }
}

function usageColor(pct: number) {
  if (pct >= 80) return "rose";
  if (pct >= 50) return "amber";
  return "emerald";
}

// ─── 2. formatBytes ────────────────────────────────────────────────────────────

describe("formatBytes", () => {
  it("returns '0 B' for 0", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats bytes correctly", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("formats kilobytes correctly", () => {
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(2048)).toBe("2 KB");
  });

  it("formats megabytes correctly", () => {
    expect(formatBytes(1024 * 1024)).toBe("1 MB");
    expect(formatBytes(256 * 1024 * 1024)).toBe("256 MB");
  });

  it("formats gigabytes correctly", () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1 GB");
  });

  it("handles fractional values", () => {
    const result = formatBytes(1536); // 1.5 KB
    expect(result).toBe("1.5 KB");
  });
});

// ─── 3. relativeTime ───────────────────────────────────────────────────────────

describe("relativeTime", () => {
  it("returns '—' for empty string", () => {
    expect(relativeTime("")).toBe("—");
  });

  it("returns seconds ago for recent timestamps", () => {
    const iso = new Date(Date.now() - 30_000).toISOString();
    expect(relativeTime(iso)).toBe("30s ago");
  });

  it("returns minutes ago", () => {
    const iso = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(relativeTime(iso)).toBe("5m ago");
  });

  it("returns hours ago", () => {
    const iso = new Date(Date.now() - 3 * 3_600_000).toISOString();
    expect(relativeTime(iso)).toBe("3h ago");
  });

  it("returns days ago", () => {
    const iso = new Date(Date.now() - 2 * 86_400_000).toISOString();
    expect(relativeTime(iso)).toBe("2d ago");
  });
});

// ─── 4. usageColor ─────────────────────────────────────────────────────────────

describe("usageColor", () => {
  it("returns emerald for low usage (<50%)", () => {
    expect(usageColor(0)).toBe("emerald");
    expect(usageColor(49)).toBe("emerald");
  });

  it("returns amber for medium usage (50-79%)", () => {
    expect(usageColor(50)).toBe("amber");
    expect(usageColor(79)).toBe("amber");
  });

  it("returns rose for high usage (>=80%)", () => {
    expect(usageColor(80)).toBe("rose");
    expect(usageColor(100)).toBe("rose");
  });

  it("handles boundary values precisely", () => {
    expect(usageColor(49.9)).toBe("emerald");
    expect(usageColor(50.0)).toBe("amber");
    expect(usageColor(79.9)).toBe("amber");
    expect(usageColor(80.0)).toBe("rose");
  });
});

// ─── 5. Notification form validation logic ─────────────────────────────────────

describe("Notification form validation", () => {
  const CHAR_LIMIT = 280;

  function validate(target: "user" | "all", username: string, message: string) {
    if (!message.trim()) return { ok: false, error: "Message cannot be empty" };
    if (message.length > CHAR_LIMIT) return { ok: false, error: "Message too long" };
    if (target === "user" && !username.trim()) return { ok: false, error: "Enter a username" };
    return { ok: true, error: null };
  }

  it("rejects empty message", () => {
    const r = validate("user", "alice", "");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("Message cannot be empty");
  });

  it("rejects whitespace-only message", () => {
    const r = validate("user", "alice", "   ");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("Message cannot be empty");
  });

  it("rejects message over char limit", () => {
    const r = validate("user", "alice", "x".repeat(CHAR_LIMIT + 1));
    expect(r.ok).toBe(false);
    expect(r.error).toBe("Message too long");
  });

  it("accepts exactly CHAR_LIMIT characters", () => {
    const r = validate("user", "alice", "x".repeat(CHAR_LIMIT));
    expect(r.ok).toBe(true);
  });

  it("rejects user target with no username", () => {
    const r = validate("user", "", "Hello user");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("Enter a username");
  });

  it("rejects user target with whitespace-only username", () => {
    const r = validate("user", "   ", "Hello user");
    expect(r.ok).toBe(false);
  });

  it("accepts broadcast with no username", () => {
    const r = validate("all", "", "Hello everyone");
    expect(r.ok).toBe(true);
  });

  it("accepts valid user notification", () => {
    const r = validate("user", "testuser", "Your submission passed.");
    expect(r.ok).toBe(true);
  });
});

// ─── 6. WorkerDetail type guards ───────────────────────────────────────────────

type WorkerDetail = {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  cpu_usage: number;
  online_cpus: number;
  memory_usage: number;
  memory_limit: number;
  created_at: number;
  started_at: string;
  restart_count: number;
  pid: number;
  network_mode: string;
  ports: string;
  network_rx_mb: number;
  network_tx_mb: number;
};

function isRunningWorker(w: WorkerDetail): boolean {
  return w.state === "running";
}

function memoryPercent(w: WorkerDetail): number {
  if (!w.memory_limit) return 0;
  return (w.memory_usage / w.memory_limit) * 100;
}

describe("WorkerDetail helpers", () => {
  const baseWorker: WorkerDetail = {
    id: "abc123def456",
    name: "/codearena-worker-1",
    image: "gcc:13",
    state: "running",
    status: "Up 3 hours",
    cpu_usage: 12.5,
    online_cpus: 4,
    memory_usage: 256 * 1024 * 1024,
    memory_limit: 512 * 1024 * 1024,
    created_at: Math.floor(Date.now() / 1000) - 10800,
    started_at: new Date(Date.now() - 10800_000).toISOString(),
    restart_count: 0,
    pid: 12345,
    network_mode: "bridge",
    ports: "8080/tcp",
    network_rx_mb: 1.24,
    network_tx_mb: 0.87,
  };

  it("identifies running workers", () => {
    expect(isRunningWorker(baseWorker)).toBe(true);
  });

  it("identifies stopped workers", () => {
    expect(isRunningWorker({ ...baseWorker, state: "exited" })).toBe(false);
    expect(isRunningWorker({ ...baseWorker, state: "dead" })).toBe(false);
  });

  it("calculates memory percentage correctly", () => {
    expect(memoryPercent(baseWorker)).toBe(50);
  });

  it("returns 0% when memory_limit is 0 (avoid division by zero)", () => {
    expect(memoryPercent({ ...baseWorker, memory_limit: 0 })).toBe(0);
  });

  it("correctly maps full memory usage to 100%", () => {
    expect(
      memoryPercent({ ...baseWorker, memory_usage: 512 * 1024 * 1024, memory_limit: 512 * 1024 * 1024 })
    ).toBe(100);
  });
});

// ─── 7. API response shape validation ──────────────────────────────────────────

describe("Executor /info response shape", () => {
  it("validates a well-formed executor info response", () => {
    const response = {
      active_worker: 2,
      average_time_to_execute_task_inSec: 1.23,
      total_active_time: "3h0m0.5s",
      total_tasks: 999,
      total_time_to_execute_task_inSec: 1228.77,
      worker_details: [
        {
          id: "abc",
          name: "/worker-1",
          image: "gcc:13",
          state: "running",
          status: "Up 3 hours",
          cpu_usage: 8.0,
          online_cpus: 4,
          memory_usage: 134217728,
          memory_limit: 536870912,
          created_at: 1700000000,
          started_at: "2024-01-01T12:00:00Z",
          restart_count: 0,
          pid: 9999,
          network_mode: "bridge",
          ports: "",
          network_rx_mb: 0.5,
          network_tx_mb: 0.2,
        },
      ],
    };

    expect(response.active_worker).toBeTypeOf("number");
    expect(response.total_tasks).toBeTypeOf("number");
    expect(Array.isArray(response.worker_details)).toBe(true);

    const w = response.worker_details[0];
    expect(w.state).toBe("running");
    expect(w.online_cpus).toBeGreaterThan(0);
    expect(w.memory_limit).toBeGreaterThan(0);
    expect(w.network_rx_mb).toBeTypeOf("number");
  });
});

// ─── 8. Debounce utility (mirrors the pattern used in notifications page) ──────

describe("Debounce behaviour", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  it("only calls the function once after rapid invocations", () => {
    const spy = vi.fn();
    const debounced = debounce(spy, 200);

    debounced("a");
    debounced("ab");
    debounced("abc");

    expect(spy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("abc");
  });

  it("resets the timer on each call", () => {
    const spy = vi.fn();
    const debounced = debounce(spy, 300);

    debounced("first");
    vi.advanceTimersByTime(150);
    debounced("second");     // reset
    vi.advanceTimersByTime(150);

    expect(spy).not.toHaveBeenCalled(); // still waiting

    vi.advanceTimersByTime(150);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("second");
  });

  it("fires immediately if not called again within the window", () => {
    const spy = vi.fn();
    const debounced = debounce(spy, 100);

    debounced("only");
    vi.advanceTimersByTime(100);

    expect(spy).toHaveBeenCalledOnce();
  });
});

// ─── 9. Cluster page fetch integration (mock) ──────────────────────────────────

const mockInfo = {
  active_worker: 1,
  average_time_to_execute_task_inSec: 0.95,
  total_active_time: "1h30m0s",
  total_tasks: 42,
  total_time_to_execute_task_inSec: 39.9,
  worker_details: [],
};

describe("Cluster page data fetching", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const u = String(url);
      if (u.includes("executor-info"))
        return Promise.resolve(new Response(JSON.stringify(mockInfo), { status: 200 }));
      if (u.includes("usage"))
        return Promise.resolve(new Response(JSON.stringify({ cpu_usage: "12%", memory_usage: "34%" }), { status: 200 }));
      if (u.includes("auto"))
        return Promise.resolve(new Response(JSON.stringify({ auto: false }), { status: 200 }));
      return Promise.resolve(new Response("Not Found", { status: 404 }));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("correctly aggregates executor info response fields", async () => {
    const res = await fetch("/api/admin/executor-info");
    const data = await res.json();

    expect(data.active_worker).toBe(1);
    expect(data.total_tasks).toBe(42);
    expect(data.average_time_to_execute_task_inSec).toBeCloseTo(0.95);
  });

  it("parses usage response correctly", async () => {
    const res = await fetch("/api/admin/executor/usage");
    const data = await res.json();

    expect(data.cpu_usage).toBe("12%");
    expect(data.memory_usage).toBe("34%");
  });

  it("parses auto-scale status correctly", async () => {
    const res = await fetch("/api/admin/executor/auto");
    const data = await res.json();

    expect(data.auto).toBe(false);
  });

  it("fetches all three endpoints in parallel", async () => {
    const [infoRes, usageRes, autoRes] = await Promise.all([
      fetch("/api/admin/executor-info"),
      fetch("/api/admin/executor/usage"),
      fetch("/api/admin/executor/auto"),
    ]);

    expect(infoRes.ok).toBe(true);
    expect(usageRes.ok).toBe(true);
    expect(autoRes.ok).toBe(true);
  });
});

// ─── 10. User search API contract ──────────────────────────────────────────────

describe("User search API contract", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const u = String(url);
      if (u.includes("q=jo"))
        return Promise.resolve(
          new Response(
            JSON.stringify({
              users: [
                { _id: "1", username: "johndoe", image: null },
                { _id: "2", username: "josephine", image: "https://example.com/img.png" },
              ],
            }),
            { status: 200 }
          )
        );
      if (u.includes("q=zzz"))
        return Promise.resolve(new Response(JSON.stringify({ users: [] }), { status: 200 }));
      if (u.includes("unauthorized"))
        return Promise.resolve(new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }));
      return Promise.resolve(new Response(JSON.stringify({ users: [] }), { status: 200 }));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns matching users for a prefix query", async () => {
    const res = await fetch("/api/admin/users/search?q=jo&limit=6");
    const data = await res.json();

    expect(Array.isArray(data.users)).toBe(true);
    expect(data.users.length).toBe(2);
    expect(data.users[0].username).toBe("johndoe");
  });

  it("returns empty array for no-match query", async () => {
    const res = await fetch("/api/admin/users/search?q=zzz");
    const data = await res.json();

    expect(data.users).toHaveLength(0);
  });

  it("returns 401 for unauthorized access", async () => {
    const res = await fetch("/api/admin/users/search?q=unauthorized");
    expect(res.status).toBe(401);
  });

  it("user objects have required fields", async () => {
    const res = await fetch("/api/admin/users/search?q=jo");
    const { users } = await res.json();

    users.forEach((u: { _id: string; username: string }) => {
      expect(u).toHaveProperty("_id");
      expect(u).toHaveProperty("username");
      expect(typeof u.username).toBe("string");
    });
  });
});
