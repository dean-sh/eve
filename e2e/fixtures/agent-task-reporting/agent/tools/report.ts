import { defineState } from "eve/context";
import { defineTool } from "eve/tools";
import { z } from "zod";

const validated = defineState("task-reporting.inventory-validated", () => false);

export default defineTool({
  description: "Validate the two warehouse inventories or publish their validated report.",
  inputSchema: z.discriminatedUnion("action", [
    z.strictObject({
      action: z.literal("validate"),
      first: z.string(),
      second: z.string(),
    }),
    z.strictObject({ action: z.literal("publish") }),
  ]),
  execute(input) {
    if (input.action === "validate") {
      if (input.first !== "oranges" || input.second !== "pears") {
        throw new Error("The report must contain the inventory returned by both warehouses.");
      }
      validated.update(() => true);
      return { validated: true };
    }
    if (!validated.get()) throw new Error("The inventory report has not been validated.");
    return { published: true, reportId: "inventory-first-second" };
  },
});
