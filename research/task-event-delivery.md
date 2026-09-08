---
issue: https://github.com/vercel/eve/pull/3127
status: prototype
last_updated: "2026-09-07"
---

# Task event delivery

An orchestrator should be able to continue useful work while children run and
decide when the user's task is complete. Mutable cohort context also changes the
prompt prefix. Moving that inventory later, as in #3127, still repeatedly sends
the inventory and retains the cohort reporting policy.

Opt in with `experimental: { taskEventDelivery: true }`. Keep existing durable
admission receipts and task notifications in chronological history. Omit the
ephemeral inventory and launch/pending/settled reporting instructions. Ordinary
user turns, child results, and structured outputs still require delivery;
background notifications can use existing conditional delivery.

Compaction adds a safe task identity/status snapshot once. The existing summary
retains relevant results and artifact paths. A snapshot is not a fresh task
result: later notifications win. Do not create another task store, modify
notification deduplication, bypass approval boundaries, or change batching here.

This prototype does not guarantee cache hits or autonomous completion. Verify
model request prefixes, manual/automatic compaction, default compatibility,
and a live parent resuming after multiple children without user input before
considering publication.
