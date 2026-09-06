---
"eve": patch
---

Workflow tools can use the same requester-scoped `ctx.getToken` and `ctx.requireAuth` as ordinary tools inside step helpers, automatically waiting for sign-in and retrying the interrupted step. In background workflows, these APIs require a supporting session driver; older conversations fail before calling the auth provider with an instruction to start a new session.
