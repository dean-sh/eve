import { describe, expect, it } from "vitest";

import { validateAgentInvocationBinding } from "#protocol/agent-invocation-trace.js";

const invocation = {
  callId: "call-1",
  rootSessionId: "root-session",
  sessionId: "parent-session",
  turn: { id: "parent-turn", sequence: 1 },
};
describe("validateAgentInvocationBinding", () => {
  it("accepts matching callback lineage", () => {
    expect(
      validateAgentInvocationBinding({
        callbackCallId: invocation.callId,
        invocation,
      }),
    ).toBeUndefined();
  });

  it("rejects lineage bound to a different callback", () => {
    expect(
      validateAgentInvocationBinding({
        callbackCallId: "other-call",
        invocation,
      }),
    ).toBe("call-id-mismatch");
  });
});
