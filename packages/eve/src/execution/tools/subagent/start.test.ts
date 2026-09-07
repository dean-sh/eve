import { beforeEach, describe, expect, it, vi } from "vitest";

import { startSubagent } from "#execution/tools/subagent/start.js";
import { startLocalSubagent } from "#subagents/start-local.js";
import { startRemoteSubagent } from "#subagents/start-remote.js";
import { readAgentChildTrace, withAgentChildTrace } from "#tracing/agent-child-trace.js";

vi.mock("#subagents/start-local.js", () => ({ startLocalSubagent: vi.fn() }));
vi.mock("#subagents/start-remote.js", () => ({ startRemoteSubagent: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(startRemoteSubagent).mockResolvedValue({ kind: "error" } as never);
});

describe("startSubagent", () => {
  it("makes caller context available at the transport without drilling it through starters", async () => {
    const parentTraceContext = {
      spanId: "2".repeat(16),
      traceFlags: 1,
      traceId: "1".repeat(32),
    };
    const trace = { originAudience: "private" as const, parentTraceContext };
    vi.mocked(startRemoteSubagent).mockImplementation(async () => {
      expect(readAgentChildTrace()).toBe(trace);
      return { kind: "error" } as never;
    });
    await withAgentChildTrace(trace, () =>
      startSubagent({
        auth: null,
        batchEvent: { sequence: 1, turnId: "turn-1" },
        bundle: {} as never,
        callbackBaseUrl: "https://parent.example",
        capabilities: undefined,
        channelMetadata: undefined,
        currentSession: {} as never,
        fanoutSize: 1,
        initiatorAuth: null,
        parentContinuationToken: "parent-token",
        sandboxSessionId: "parent-session",
        session: { sessionId: "parent-session" } as never,
        target: {
          action: { callId: "child-action" } as never,
          kind: "remote",
        },
      }),
    );

    expect(startRemoteSubagent).toHaveBeenCalledOnce();
    expect(vi.mocked(startRemoteSubagent).mock.calls[0]?.[0]).not.toHaveProperty("traceDispatch");
    expect(readAgentChildTrace()).toBeUndefined();
    expect(startLocalSubagent).not.toHaveBeenCalled();
  });
});
