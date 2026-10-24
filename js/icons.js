// Resource icons (M1d §1.3): the single definition shared by the HUD resource panel and the
// drop items on the canvas, so the two always match. Each is SVG source on a 24×24 viewBox.
// The HUD inserts the markup; the canvas draws the same source through an Image.

export const RESOURCE_ICON_SVG = {
  pits: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">'
    + '<ellipse cx="12" cy="12" rx="7" ry="9.5" fill="#b06a3c"/>'
    + '<path d="M12 3.5 Q8.5 12 12 20.5" stroke="#6b3a1f" stroke-width="1.8" fill="none"/></svg>',
  reeds: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">'
    + '<path d="M12 23 L12 3" stroke="#86a845" stroke-width="2.2"/>'
    + '<path d="M12 19 Q7 15 5.5 10" stroke="#86a845" stroke-width="1.8" fill="none"/>'
    + '<rect x="9.3" y="4" width="5.4" height="10" rx="2.7" fill="#7a4c2c"/></svg>',
  feathers: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">'
    + '<path d="M6 20 Q7 7 20 3 Q18 15 6 20 Z" fill="#ece6da"/>'
    + '<path d="M4.5 21.5 L16 7.5" stroke="#8f897f" stroke-width="1.4"/></svg>',
  // Mossy Bough (M1i §1.1): a short, slightly crooked branch with a twig and green moss patches.
  boughs: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">'
    + '<path d="M3 18.5 L9 14.5 L13.5 15 L21 8" stroke="#6e4a2a" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
    + '<path d="M13.5 15 L15.5 19.5" stroke="#6e4a2a" stroke-width="2.2" stroke-linecap="round"/>'
    + '<ellipse cx="7.5" cy="14.6" rx="2.9" ry="1.9" fill="#6fa13a"/>'
    + '<ellipse cx="16.8" cy="11.2" rx="2.6" ry="1.7" fill="#7fb446"/>'
    + '<circle cx="12.2" cy="14.2" r="1.3" fill="#5c8f2f"/></svg>',
};

// Canvas images built from the same SVG source, created on first use. An image that has not
// finished loading yet is simply not drawn that frame.
const images = {};

export function resourceIconImage(resource) {
  if (!images[resource]) {
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(RESOURCE_ICON_SVG[resource])}`;
    images[resource] = img;
  }
  return images[resource];
}
