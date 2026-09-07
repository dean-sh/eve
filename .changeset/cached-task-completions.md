---
"eve": patch
---

Keep changing task status behind conversation history to preserve reusable model prompt prefixes. Combine successful sibling completions already queued for the parent into one turn, retaining every result without waiting for unfinished tasks.
