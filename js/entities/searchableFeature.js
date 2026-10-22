// Searchable feature state (spec §8). Position and type come from this run's layout
// (M1c §3); only `exhausted` changes, and it resets on Restart.

export function createFeatures(layout) {
  return layout.features.map((f, index) => ({ index, type: f.type, x: f.x, y: f.y, candidate: f.candidate, exhausted: false }));
}
