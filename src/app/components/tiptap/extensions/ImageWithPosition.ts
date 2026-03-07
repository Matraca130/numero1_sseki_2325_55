// ============================================================
// Axon — TipTap ImageWithPosition Extension
//
// Custom Image node that adds a `position` attribute:
//   - "left"   → float left, text wraps right
//   - "right"  → float right, text wraps left
//   - "center" → display block, centered, no float
//
// The position is rendered as inline styles so the HTML
// output is self-contained (no external CSS needed for rendering).
// ============================================================
import Image from '@tiptap/extension-image';

export type ImagePosition = 'left' | 'center' | 'right';

// Map position → inline styles (preserved in HTML output)
const positionStyles: Record<ImagePosition, Record<string, string>> = {
  left: {
    float: 'left',
    'margin-right': '1rem',
    'margin-bottom': '0.5rem',
    'max-width': '50%',
  },
  center: {
    display: 'block',
    'margin-left': 'auto',
    'margin-right': 'auto',
    'margin-bottom': '0.5rem',
    'max-width': '80%',
    float: 'none',
  },
  right: {
    float: 'right',
    'margin-left': '1rem',
    'margin-bottom': '0.5rem',
    'max-width': '50%',
  },
};

function stylesToString(styles: Record<string, string>): string {
  return Object.entries(styles)
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ');
}

function parsePositionFromStyle(style: string | null): ImagePosition {
  if (!style) return 'center';
  if (style.includes('float: left') || style.includes('float:left')) return 'left';
  if (style.includes('float: right') || style.includes('float:right')) return 'right';
  return 'center';
}

export const ImageWithPosition = Image.extend({
  name: 'image',

  // Enable native TipTap drag-and-drop for images
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      position: {
        default: 'center' as ImagePosition,
        parseHTML: (element: HTMLElement) => {
          // Try data attribute first, fall back to parsing style
          return (
            element.getAttribute('data-position') ||
            parsePositionFromStyle(element.getAttribute('style'))
          );
        },
        renderHTML: (attributes: Record<string, any>) => {
          const pos = (attributes.position || 'center') as ImagePosition;
          const styles = positionStyles[pos] || positionStyles.center;
          return {
            'data-position': pos,
            style: stylesToString(styles),
          };
        },
      },
    };
  },
});

export default ImageWithPosition;