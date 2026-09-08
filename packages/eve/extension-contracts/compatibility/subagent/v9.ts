import { defineAgent } from "#public/definitions/agent.js";

export default defineAgent({
  model: "openai/gpt-5.5",
  description: "Inspect a report.",
});
