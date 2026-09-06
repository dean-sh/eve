import { defineAgent } from "#public/index.js";

export default defineAgent({
  description: "Delegate research with only authored tools.",
  defaultTools: false,
  model: "anthropic/claude-sonnet-5",
  experimental: { workflow: { world: "@workflow/world-postgres" } },
});
