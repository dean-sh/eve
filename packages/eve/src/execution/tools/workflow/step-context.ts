import type { SessionContext } from "#context/session-context.js";
import type { AuthorizationResult, AuthorizationSignal } from "#harness/authorization.js";

export interface WorkflowStepContext {
  readonly authorizationSupported: boolean;
  readonly callId: string;
  readonly toolName: string;
  readonly session: SessionContext["session"];
  readonly abortSignal: AbortSignal;
  readonly baseUrl: string;
  readonly token: string;
  readonly authorizationResults: readonly (AuthorizationResult & { readonly name: string })[];
}

export type WorkflowStepResult = { readonly authorized: readonly string[] } & (
  | { readonly kind: "result"; readonly output: unknown }
  | { readonly kind: "authorization-required"; readonly signal: AuthorizationSignal }
);

/** Compiler-owned envelope; authored arguments never select the auth context. */
export interface WorkflowStepInvocation {
  readonly args: readonly unknown[];
  readonly context: WorkflowStepContext;
  readonly contextIndexes: readonly number[];
}
