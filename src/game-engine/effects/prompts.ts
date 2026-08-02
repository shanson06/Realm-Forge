/**
 * Prompt resolvers.
 *
 * A typed effect that needs a player decision parks a Prompt on the state and
 * registers the continuation here, keyed by the prompt's effectId prefix.
 * The reducer looks the continuation up — it never guesses.
 */
import type { MatchDraft } from "../types";

export type PromptResolver = (draft: MatchDraft, chosenIds: readonly string[], selfId: string) => void;

const RESOLVERS = new Map<string, PromptResolver>();

export function registerPromptResolver(key: string, resolver: PromptResolver): void {
  RESOLVERS.set(key, resolver);
}

export function getPromptResolver(effectId: string): PromptResolver | undefined {
  return RESOLVERS.get(effectId.split("#")[0]);
}

/** effectId format: `<resolverKey>#<selfInstanceId>`. */
export function promptEffectId(resolverKey: string, selfId: string): string {
  return `${resolverKey}#${selfId}`;
}

export function selfIdFromEffectId(effectId: string): string {
  return effectId.split("#")[1] ?? "";
}