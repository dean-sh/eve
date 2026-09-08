import { defineEval, type EveEvalSession, type EveEvalTurn } from "eve/evals";
import { satisfies } from "eve/evals/expect";

const COMPLETION = /Background task (task_[a-z0-9]+) \([^)]+\) is completed\./giu;

export default defineEval({
  description:
    "The parent validates and publishes a report after background lookups finish, without another user message.",
  tags: ["real-model"],
  async test(t) {
    const started =
      await t.send(`Alice needs a published inventory report for our first and second sample warehouses. Use two background agents to look up the inventories: ask one to call probe with check=first and the other to call probe with check=second, and have each report its result value. Start both lookups without waiting for either result; delegate the lookups rather than calling probe yourself.

After both agents return, use report to validate their inventories and then publish the report. Give Alice the published report ID when the work is complete.`);
    started.expectOk();
    started.calledSubagent("agent", { count: 2 });
    started.notCalledTool("probe");
    started.notCalledTool("report");

    const taskIds = new Set(
      started.events.flatMap((event) =>
        event.type === "subagent.completed" &&
        event.data.subagentName === "agent" &&
        event.data.backgroundTask !== undefined
          ? [event.data.backgroundTask.taskId]
          : [],
      ),
    );
    await t.require(
      taskIds.size,
      satisfies((count: number) => count === 2, "two background lookups were accepted"),
    );

    let session: EveEvalSession | typeof t = t;
    const completed = new Set<string>();
    let settled: EveEvalTurn | undefined;
    for (let attempt = 0; attempt < 8 && completed.size < taskIds.size; attempt += 1) {
      if (session.state === undefined) throw new Error("Task continuation has no stream index.");
      const live = t.target.watchTurn(started.sessionId, {
        startIndex: session.state.streamIndex,
      });
      const turn = await live.result();
      turn.expectOk();
      turn.noFailedActions();
      for (const event of turn.events) {
        if (event.type !== "message.received") continue;
        const message = JSON.stringify(event.data.message);
        for (const match of message.matchAll(COMPLETION)) {
          if (taskIds.has(match[1]!)) completed.add(match[1]!);
        }
      }
      t.log(`lookups completed: ${completed.size}/${taskIds.size}; reply: ${turn.message}`);
      if (completed.size < taskIds.size) turn.notCalledTool("report");
      else settled = turn;
      session = live.session;
    }

    if (settled === undefined) throw new Error("The parent did not receive both lookup results.");
    settled.calledTool("report", {
      count: 1,
      input: { action: "validate", first: "oranges", second: "pears" },
      output: { validated: true },
    });
    settled.calledTool("report", {
      count: 1,
      input: { action: "publish" },
      output: { published: true, reportId: "inventory-first-second" },
    });
    settled.messageIncludes("inventory-first-second");
    t.noFailedActions();
  },
});
