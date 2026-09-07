import { describe, expect, it } from "vitest";

import { createCurrentMessages } from "#harness/current-messages.js";

describe("createCurrentMessages", () => {
  it.each([0, 1])(
    "preserves the history prefix when task status changes in turn %i",
    (sequence) => {
      const request = { role: "user" as const, content: "Investigate these sessions" };
      const history = [request, { role: "assistant" as const, content: "Work started" }];
      const before = createCurrentMessages(history, { currentTurnMessages: [request] });
      const after = createCurrentMessages(history, { currentTurnMessages: [request] });
      before.add(sequence, "Three tasks pending", { placement: "tail" });
      after.add(sequence, "Two tasks pending", { placement: "tail" });
      expect(before.systemMessages).toEqual(after.systemMessages);
      expect(after.systemMessages).toEqual([]);
      expect(before.nonSystemMessages.slice(0, history.length)).toEqual(history);
      expect(after.nonSystemMessages.slice(0, history.length)).toEqual(history);
      expect(after.nonSystemMessages.at(-1)?.content).toBe("Two tasks pending");
    },
  );

  it("keeps an approval response at the tail when adding task status", () => {
    const approval = {
      role: "tool" as const,
      content: [
        {
          type: "tool-approval-response" as const,
          approvalId: "approval",
          approved: true,
        },
      ],
    };
    const current = createCurrentMessages([approval]);
    current.add(0, "Task status", { placement: "tail" });
    expect(current.nonSystemMessages.at(-1)).toBe(approval);
    expect(current.systemMessages).toEqual([{ role: "system", content: "Task status" }]);
  });
  it("partitions existing history by role", () => {
    const current = createCurrentMessages([
      { role: "system", content: "system" },
      { role: "user", content: "user" },
    ]);
    const directMutationIsRejected = () => {
      // @ts-expect-error current-message placement must go through add/addSystem.
      current.systemMessages.push({ role: "system", content: "bypass" });
    };

    expect(current.systemMessages).toEqual([{ role: "system", content: "system" }]);
    expect(current.nonSystemMessages).toEqual([{ role: "user", content: "user" }]);
    expect(directMutationIsRejected).toBeTypeOf("function");
  });

  it("returns snapshots instead of exposing its backing arrays", () => {
    const current = createCurrentMessages([{ role: "system", content: "system" }]);
    const exposed = current.systemMessages as Array<{ role: "system"; content: string }>;

    exposed.push({ role: "system", content: "bypass" });

    expect(current.systemMessages).toEqual([{ role: "system", content: "system" }]);
  });

  it("keeps first-turn context in instructions and routes later context as user messages", () => {
    const current = createCurrentMessages([]);

    current.add(0, "first");
    current.add(1, "later");

    expect(current.systemMessages).toEqual([{ role: "system", content: "first" }]);
    expect(current.nonSystemMessages).toEqual([{ role: "user", content: "later" }]);
  });

  it("inserts later context before the current turn input", () => {
    const currentTurnMessages = [
      { role: "user" as const, content: "channel context" },
      { role: "user" as const, content: "current request" },
    ];
    const current = createCurrentMessages(
      [{ role: "user", content: "history" }, ...currentTurnMessages],
      { currentTurnMessages },
    );

    current.add(1, "task state");
    current.add(1, "delivery guidance");

    expect(current.nonSystemMessages).toEqual([
      { role: "user", content: "history" },
      { role: "user", content: "task state" },
      { role: "user", content: "delivery guidance" },
      { role: "user", content: "channel context" },
      { role: "user", content: "current request" },
    ]);
  });

  it("keeps later context out of the tail when history ends with an approval response", () => {
    const approvalTail = {
      role: "tool" as const,
      content: [
        {
          approvalId: "approval-1",
          approved: true,
          type: "tool-approval-response" as const,
        },
      ],
    };
    const current = createCurrentMessages([
      { role: "user", content: "history" },
      {
        role: "assistant",
        content: [
          { type: "tool-call", toolCallId: "call-1", toolName: "bash", input: {} },
          { type: "tool-approval-request", approvalId: "approval-1", toolCallId: "call-1" },
        ],
      },
      approvalTail,
    ]);

    current.add(1, "task state");

    expect(current.systemMessages).toEqual([{ role: "system", content: "task state" }]);
    expect(current.nonSystemMessages.at(-1)).toBe(approvalTail);
  });

  it("keeps hierarchy-sensitive context in instructions when requested", () => {
    const current = createCurrentMessages([]);

    current.add(1, "authoritative", { cacheFriendly: false });

    expect(current.systemMessages).toEqual([{ role: "system", content: "authoritative" }]);
    expect(current.nonSystemMessages).toEqual([]);
  });

  it("adds prebuilt system messages only through the system API", () => {
    const current = createCurrentMessages([]);

    current.addSystem([
      { role: "system", content: "one" },
      { role: "system", content: "two" },
    ]);

    expect(current.systemMessages).toEqual([
      { role: "system", content: "one" },
      { role: "system", content: "two" },
    ]);
    expect(current.nonSystemMessages).toEqual([]);
  });
});
