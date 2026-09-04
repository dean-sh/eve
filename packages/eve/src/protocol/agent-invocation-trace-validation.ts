import { z } from "#compiled/zod/index.js";

import type { SessionParent } from "#channel/types.js";

export const sessionParentSchema: z.ZodType<SessionParent> = z.strictObject({
  callId: z.string().min(1),
  rootSessionId: z.string().min(1),
  sessionId: z.string().min(1),
  turn: z.strictObject({ id: z.string().min(1), sequence: z.number().int().min(0) }),
});

export const createSessionAcceptedResponseSchema = z.object({
  ok: z.literal(true),
  sessionId: z.string().min(1),
  status: z.literal("accepted"),
});
