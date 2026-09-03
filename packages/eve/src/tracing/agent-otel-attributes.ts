import { AGENT_TRACE_SCHEMA_VERSION } from "#tracing/agent-span-contract.js";

export const AGENT_INVOCATION_ROLES = {
  caller: "caller",
} as const;

export const AGENT_TRACE_ATTRIBUTES = {
  invocationRole: "agent.invocation.role",
  principalCurrentId: "agent.principal.current.id",
  principalCurrentType: "agent.principal.current.type",
  principalInitiatorId: "agent.principal.initiator.id",
  principalInitiatorType: "agent.principal.initiator.type",
  sessionId: "agent.session.id",
  vercelSessionId: "vercel.session_id",
} as const;

export function agentTraceIdentityAttributes(input: {
  readonly rootSessionId: string;
  readonly sessionId: string;
}): Record<string, string | number> {
  return {
    "agent.trace.schema.version": AGENT_TRACE_SCHEMA_VERSION,
    [AGENT_TRACE_ATTRIBUTES.sessionId]: input.sessionId,
    [AGENT_TRACE_ATTRIBUTES.vercelSessionId]: input.sessionId,
    "gen_ai.conversation.id": input.rootSessionId,
  };
}
