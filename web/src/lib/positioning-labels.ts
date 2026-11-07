type Point = { x: number; y: number };
export function placePositionLabels(items: Point[]) {
  const placed: { x: number; y: number; w: number; h: number; anchorX: number; anchorY: number }[] = [];
  for (const item of items) {
    const original = { x: 1.02 + item.x * 5.05, y: 5.03 - item.y * 2.78 };
    const choices = [original, ...Array.from({ length: 24 }, (_, i) => ({ x: .92 + i % 4 * 1.74, y: 2.14 + Math.floor(i / 4) * .57 }))];
    choices.sort((a, b) => (a.x - original.x) ** 2 + (a.y - original.y) ** 2 - (b.x - original.x) ** 2 - (b.y - original.y) ** 2);
    const position = choices.find(p => placed.every(q => p.x + 1.76 <= q.x || q.x + q.w + .08 <= p.x || p.y + .58 <= q.y || q.y + q.h + .08 <= p.y)) ?? original;
    placed.push({ ...position, w: 1.68, h: .5, anchorX: original.x + .84, anchorY: original.y + .25 });
  }
  return placed;
}
