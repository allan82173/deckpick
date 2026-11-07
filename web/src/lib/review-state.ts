import type { Deck } from "./model";
import { draftSlide } from "./draft-workflow";
export function invalidateStaleReview(previous: Deck | null, next: Deck | null): Deck | null {
  if (!previous?.review || !next || previous.review !== next.review) return next;
  const visible = (deck: Deck) => JSON.stringify({ input: deck.input, outline: deck.outline, evidence: deck.researchRecord, slides: deck.outline.map((_, index) => draftSlide(deck, index)), design: deck.designSystem });
  return visible(previous) === visible(next) ? next : { ...next, review: undefined };
}
