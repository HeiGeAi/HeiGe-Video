type RectRecord = {x: number; y: number; width: number; height: number; right: number; bottom: number};
const rectangle = (rect: DOMRect): RectRecord => ({x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom});

function isVisible(node: Element, root: Element) {
  let cursor: Element | null = node;
  while (cursor && cursor !== root.parentElement) {
    const style = window.getComputedStyle(cursor);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < .015) return false;
    cursor = cursor.parentElement;
  }
  const rect = node.getBoundingClientRect();
  return rect.width > .5 && rect.height > .5;
}

export function inspectLayout(root: HTMLElement, frame: number, width: number, height: number) {
  const errors: {kind: string; id: string; text?: string; bounds?: RectRecord; parent?: string; otherId?: string; otherText?: string; intersection?: {width: number; height: number}}[] = [];
  const rootRect = root.getBoundingClientRect();
  // Coordinates remain valid in Studio/Player, which may scale the preview.
  const scaleX = rootRect.width / width;
  const scaleY = rootRect.height / height;
  const toleranceX = Math.max(.75, scaleX * 1.5);
  const toleranceY = Math.max(.75, scaleY * 1.5);
  const textNodes = Array.from(root.querySelectorAll<HTMLElement>('[data-heige-text]')).filter(node => isVisible(node, root));
  const texts = textNodes.map((node, index) => {
    const bounds = node.getBoundingClientRect();
    const style = window.getComputedStyle(node);
    const id = node.dataset.heigeTextId || `text-${index}`;
    const text = node.dataset.heigeText || '';
    if (bounds.left < rootRect.left - toleranceX || bounds.right > rootRect.right + toleranceX || bounds.top < rootRect.top - toleranceY || bounds.bottom > rootRect.bottom + toleranceY) errors.push({kind: 'screen-overflow', id, text, bounds: rectangle(bounds)});
    if (node.scrollWidth > node.clientWidth + 2) errors.push({kind: 'text-width-overflow', id, text, bounds: rectangle(bounds)});
    if (node.scrollHeight > node.clientHeight + 2) errors.push({kind: 'text-height-overflow', id, text, bounds: rectangle(bounds)});
    if ((node.textContent || '') !== text) errors.push({kind: 'text-content-mismatch', id, text});
    let parent: HTMLElement | null = node.parentElement;
    while (parent && parent !== root) {
      const parentStyle = window.getComputedStyle(parent);
      const parentBounds = parent.getBoundingClientRect();
      const clipsX = /hidden|clip|scroll|auto/u.test(parentStyle.overflowX);
      const clipsY = /hidden|clip|scroll|auto/u.test(parentStyle.overflowY);
      if ((clipsX && (bounds.left < parentBounds.left - toleranceX || bounds.right > parentBounds.right + toleranceX)) || (clipsY && (bounds.top < parentBounds.top - toleranceY || bounds.bottom > parentBounds.bottom + toleranceY))) {
        errors.push({kind: 'parent-clipping', id, text, parent: parent.dataset.heigeBlock || parent.className, bounds: rectangle(bounds)});
        break;
      }
      parent = parent.parentElement;
    }
    return {id, text, bounds: rectangle(bounds), scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, scrollHeight: node.scrollHeight, clientHeight: node.clientHeight, font: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight};
  });
  // Compare text alone. Graphical layers can deliberately overlap, but two
  // independent visible text boxes must not occupy the same reading space.
  // Normalize to authored pixels so a scaled Studio preview cannot hide faults.
  for (let first = 0; first < texts.length; first++) {
    for (let second = first + 1; second < texts.length; second++) {
      if (textNodes[first].contains(textNodes[second]) || textNodes[second].contains(textNodes[first])) continue;
      const a = texts[first];
      const b = texts[second];
      const intersectionWidth = (Math.min(a.bounds.right, b.bounds.right) - Math.max(a.bounds.x, b.bounds.x)) / Math.max(.0001, scaleX);
      const intersectionHeight = (Math.min(a.bounds.bottom, b.bounds.bottom) - Math.max(a.bounds.y, b.bounds.y)) / Math.max(.0001, scaleY);
      if (intersectionWidth > 1 && intersectionHeight > 1) errors.push({
        kind: 'text-overlap', id: a.id, text: a.text, otherId: b.id, otherText: b.text,
        intersection: {width: intersectionWidth, height: intersectionHeight},
      });
    }
  }
  const blocks = Array.from(root.querySelectorAll<HTMLElement>('[data-heige-block]')).filter(node => isVisible(node, root)).map(node => {
    const bounds = node.getBoundingClientRect();
    const id = node.dataset.heigeBlock!;
    if (bounds.left < rootRect.left - toleranceX || bounds.right > rootRect.right + toleranceX || bounds.top < rootRect.top - toleranceY || bounds.bottom > rootRect.bottom + toleranceY) errors.push({kind: 'block-screen-overflow', id, bounds: rectangle(bounds)});
    if (node.scrollHeight > node.clientHeight + 2 && node.clientHeight > 0) errors.push({kind: 'block-height-overflow', id, bounds: rectangle(bounds)});
    return {id, bounds: rectangle(bounds)};
  });
  return {frame, width, height, texts, blocks, errors};
}
