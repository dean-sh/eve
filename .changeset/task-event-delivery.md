---
"eve": patch
---

Add opt-in `experimental.taskEventDelivery` for agents that orchestrate background work. Task notifications remain chronological, compaction restores task identities, and queued child requests are serviced between parent steps without requiring the parent to end its turn.
