import { EventEmitter } from "node:events";
import { spawn } from "node:child_process";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDefaultCodexTokenBroker } from "#public/models/openai/chatgpt/token-broker.js";
import type { ChatGptAuthState } from "#public/models/openai/chatgpt/token-broker.js";

import { ensureChatGptAuth } from "./chatgpt-auth.js";

vi.mock("node:child_process", () => ({ spawn: vi.fn() }));
vi.mock("#public/models/openai/chatgpt/token-broker.js", () => ({
  getDefaultCodexTokenBroker: vi.fn(),
}));

const refreshState = vi.fn<() => Promise<ChatGptAuthState>>();

beforeEach(() => {
  vi.clearAllMocks();
  refreshState.mockReset();
  vi.mocked(getDefaultCodexTokenBroker).mockReturnValue({
    refreshState,
    state: () => ({ kind: "checking" }),
    getToken: vi.fn(),
  });
});

describe("ChatGPT setup authentication", () => {
  it("preserves the missing CLI diagnostic instead of attempting login", async () => {
    const reason = "ChatGPT subscription authentication requires the Codex CLI.";
    refreshState.mockResolvedValue({ kind: "unavailable", reason });
    const child = new EventEmitter();
    vi.mocked(spawn).mockImplementation(() => {
      queueMicrotask(() => child.emit("error", new Error("spawn codex ENOENT")));
      return child as ReturnType<typeof spawn>;
    });

    await expect(ensureChatGptAuth()).rejects.toThrow(reason);
    expect(spawn).not.toHaveBeenCalled();
  });

  it("keeps an existing usable login", async () => {
    refreshState.mockResolvedValue({ kind: "ready" });
    await ensureChatGptAuth();
    expect(spawn).not.toHaveBeenCalled();
  });

  it("logs in a signed-out user and verifies the new session", async () => {
    refreshState
      .mockResolvedValueOnce({ kind: "signed-out" })
      .mockResolvedValueOnce({ kind: "ready" });
    const child = new EventEmitter();
    vi.mocked(spawn).mockImplementation(() => {
      queueMicrotask(() => child.emit("exit", 0, null));
      return child as ReturnType<typeof spawn>;
    });

    await ensureChatGptAuth();
    expect(spawn).toHaveBeenCalledWith("codex", ["login"], { stdio: "inherit" });
    expect(refreshState).toHaveBeenCalledTimes(2);
  });

  it("preserves a diagnostic when the post-login probe is unavailable", async () => {
    refreshState
      .mockResolvedValueOnce({ kind: "signed-out" })
      .mockResolvedValueOnce({ kind: "unavailable", reason: "Codex app-server exited" });
    const child = new EventEmitter();
    vi.mocked(spawn).mockImplementation(() => {
      queueMicrotask(() => child.emit("exit", 0, null));
      return child as ReturnType<typeof spawn>;
    });

    await expect(ensureChatGptAuth()).rejects.toThrow("Codex app-server exited");
  });
});
