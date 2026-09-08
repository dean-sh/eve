import { describe, expect, it } from "vitest";

import { CONDITIONAL_DELIVERY_INSTRUCTION } from "#shared/empty-delivery.js";
import {
  TASK_DELIVERY_INITIATING_INSTRUCTION,
  TASK_DELIVERY_PENDING_INSTRUCTION,
  TASK_DELIVERY_SETTLED_INSTRUCTION,
} from "#tasks/delivery-context.js";
import { resolveDeliveryPolicy } from "#tasks/delivery-policy.js";

describe("resolveDeliveryPolicy", () => {
  it.each(["pending", "settled"] as const)(
    "lets event-driven parents act on %s results",
    (taskDeliveryPhase) => {
      expect(
        resolveDeliveryPolicy({
          taskEventDelivery: true,
          hasOutputSchema: false,
          isChild: false,
          isFirstTurn: false,
          hasScheduleProvenance: false,
          taskDeliveryPhase,
        }),
      ).toEqual({ allowsEmptyDelivery: true, instruction: CONDITIONAL_DELIVERY_INSTRUCTION });
    },
  );

  it("does not force an event-driven parent to end its launching turn", () => {
    expect(
      resolveDeliveryPolicy({
        taskEventDelivery: true,
        hasOutputSchema: false,
        isChild: false,
        isFirstTurn: true,
        hasScheduleProvenance: false,
        taskDeliveryPhase: "initiating",
      }),
    ).toEqual({ allowsEmptyDelivery: false });
  });
  it.each([
    ["scheduled launch", "initiating", true, true, CONDITIONAL_DELIVERY_INSTRUCTION, true],
    ["user launch", "initiating", true, false, TASK_DELIVERY_INITIATING_INSTRUCTION, false],
    ["pending wake", "pending", false, true, TASK_DELIVERY_PENDING_INSTRUCTION, true],
    ["settled wake", "settled", false, true, TASK_DELIVERY_SETTLED_INSTRUCTION, false],
  ] as const)(
    "resolves %s",
    (
      _name,
      taskDeliveryPhase,
      isFirstTurn,
      hasScheduleProvenance,
      instruction,
      allowsEmptyDelivery,
    ) => {
      expect(
        resolveDeliveryPolicy({
          hasScheduleProvenance,
          hasOutputSchema: false,
          isChild: false,
          isFirstTurn,
          taskDeliveryPhase,
        }),
      ).toEqual({ allowsEmptyDelivery, instruction });
    },
  );

  it.each([
    ["structured output", true, false],
    ["child session", false, true],
  ] as const)("keeps %s mandatory", (_name, hasOutputSchema, isChild) => {
    expect(
      resolveDeliveryPolicy({
        hasScheduleProvenance: true,
        hasOutputSchema,
        isChild,
        isFirstTurn: true,
        taskDeliveryPhase: "initiating",
      }),
    ).toEqual({ allowsEmptyDelivery: false });
  });

  it("acknowledges background work launched on a later turn", () => {
    expect(
      resolveDeliveryPolicy({
        hasOutputSchema: false,
        hasScheduleProvenance: true,
        isChild: false,
        isFirstTurn: false,
        taskDeliveryPhase: "initiating",
      }),
    ).toEqual({
      allowsEmptyDelivery: false,
      instruction: TASK_DELIVERY_INITIATING_INSTRUCTION,
    });
  });
});
