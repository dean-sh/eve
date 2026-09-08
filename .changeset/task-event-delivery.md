---
"eve": patch
---

Add opt-in `experimental.taskEventDelivery` for agents that orchestrate background work. Task notifications remain chronological instead of reinjecting mutable cohort state; the agent decides when to continue or report, with task identities restored after compaction.
