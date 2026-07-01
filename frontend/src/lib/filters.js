// Each filter is a canvas-compatible CSS filter string. Using ctx.filter
// means the same definition works for live <img>/<video> previews (as a
// style) and for baking real pixels into the exported PNG.
export const FILTERS = [
  { id: 'original', label: 'Original', css: 'none' },
  { id: 'mono', label: 'Mono', css: 'grayscale(1) contrast(1.05)' },
  { id: 'retro', label: 'Retro', css: 'sepia(0.45) saturate(1.4) contrast(1.1) hue-rotate(-8deg)' },
  { id: 'film', label: 'Film', css: 'contrast(1.15) saturate(0.85) brightness(0.96) sepia(0.12)' },
  { id: 'cool', label: 'Cool', css: 'saturate(1.05) hue-rotate(16deg) brightness(1.03)' },
  { id: 'peach', label: 'Peach', css: 'sepia(0.22) saturate(1.25) hue-rotate(-10deg) brightness(1.05)' },
];

export function getFilter(id) {
  return FILTERS.find((f) => f.id === id) || FILTERS[0];
}
