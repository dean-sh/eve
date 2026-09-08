---
"eve": patch
---

Expose the current parent tool call as `ctx.session.turn.parentCallId` in delegated turns, including after continuation or steering. The original `ctx.session.parent` ancestry stays unchanged.

If a task finishes before steering is accepted, the tool asks the parent to start a fresh task instead of continuing the finished child.
