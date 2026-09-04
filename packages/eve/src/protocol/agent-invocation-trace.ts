import type { SessionParent } from "#channel/types.js";

export function buildAgentInvocationParent(input: {
  readonly callId: string;
  readonly rootSessionId: string;
  readonly sessionId: string;
  readonly turnId: string;
  readonly turnSequence: number;
}): SessionParent {
  return {
    callId: input.callId,
    rootSessionId: input.rootSessionId,
    sessionId: input.sessionId,
    turn: { id: input.turnId, sequence: input.turnSequence },
  };
}

export type AgentInvocationBindingError = "call-id-mismatch";

export function validateAgentInvocationBinding(input: {
  readonly callbackCallId?: string;
  readonly invocation?: SessionParent;
}): AgentInvocationBindingError | undefined {
  if (
    input.invocation !== undefined &&
    (input.callbackCallId === undefined || input.invocation.callId !== input.callbackCallId)
  ) {
    return "call-id-mismatch";
  }
  return undefined;
}

export function isTraceId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{32}$/u.test(value) && !/^0+$/u.test(value);
}

export function isSpanId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{16}$/u.test(value) && !/^0+$/u.test(value);
}
