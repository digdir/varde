/**
 * Turns an Illustrator-exported SVG into an editable template and renders it
 * back with new content. Pure string processing, so it runs on both server
 * and client.
 *
 * - Every `<text>` becomes a text field. Illustrator exports kerned text as
 *   one `<tspan>` per glyph run with absolute `x` positions; those are
 *   collapsed into one line per distinct `y`, and on render each line is a
 *   single `<tspan>` anchored at the original line start so the browser does
 *   the kerning. All other attributes on `<text>` are kept as exported.
 *   Illustrator does not export text alignment, so a layer name ending in
 *   `[center]` or `[right]` marks the anchor; unmarked text is left-aligned.
 *   Centring needs the original text's rendered width, which only a browser
 *   can measure – pass it to `render` via `widths` (see `data-field`).
 * - Every shape whose layer name ends in `[image]` becomes an image field.
 *   An uploaded image fills the shape through an SVG pattern sized to the
 *   shape's bounding box, so any shape works without measuring it.
 *
 * Field labels come from the layer name (`data-name`, falling back to `id`).
 * Fields are listed top-to-bottom, regardless of drawing order.
 */
export type TextAlign = 'start' | 'middle' | 'end';

export type TemplateField =
  | {
      kind: 'text';
      label: string;
      /** Line breaks separate lines, as in the template. */
      defaultValue: string;
      /** Number of lines in the template, used to size the editor. */
      rows: number;
      /** From a `[center]`/`[right]` marker in the layer name. */
      align: TextAlign;
    }
  | {
      kind: 'image';
      label: string;
      /** Image fields start empty and take a data URL. */
      defaultValue: '';
    };

export type ParsedTemplate = {
  width: number;
  height: number;
  fields: TemplateField[];
  /**
   * Values in the same order as `fields`. `widths` (same order) are the
   * rendered widths of each text field's first line in the *template*, used
   * to anchor centred and right-aligned text; without them text is
   * left-aligned. Every `<text>` in the output carries `data-field="<index>"`
   * so they can be measured.
   */
  render: (values: string[], widths?: (number | undefined)[]) => string;
};

type Node =
  | {
      kind: 'text';
      attributes: string;
      x: number;
      y: number;
      lineHeight: number;
    }
  | { kind: 'image'; tag: string; attributes: string; original: string };

const IMAGE_MARKER = /\s*\[image\]\s*$/i;
const ALIGN_MARKER = /\s*\[(center|right|left)\]\s*$/i;
const alignments: Record<string, TextAlign> = {
  center: 'middle',
  right: 'end',
  left: 'start',
};
const PLACEHOLDER = /<!--field:(\d+)-->/g;

const attribute = (attributes: string, name: string) =>
  attributes.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

const stripAttributes = (attributes: string, names: string[]) =>
  attributes
    .replace(new RegExp(`\\s(?:${names.join('|')})="[^"]*"`, 'g'), '')
    .trimEnd();

const decodeEntities = (text: string) =>
  text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&amp;/g, '&');

const escapeXml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Vertical position used to order fields for editing. */
const verticalPosition = (attributes: string) => {
  const translate = attribute(attributes, 'transform')?.match(
    /translate\(\s*[-\d.]+[\s,]+([-\d.]+)/,
  );
  return Number(
    translate?.[1] ??
      attribute(attributes, 'cy') ??
      attribute(attributes, 'y') ??
      0,
  );
};

/** Collapse a `<text>` body into lines: one per distinct tspan `y`. */
const linesOf = (body: string) => {
  const lines = new Map<number, { x: number; text: string }>();
  const tspan = /<tspan\b([^>]*)>([\s\S]*?)<\/tspan>/g;
  let match = tspan.exec(body);
  if (!match) {
    return [{ x: 0, y: 0, text: decodeEntities(body.trim()) }];
  }
  while (match) {
    const y = Number(attribute(match[1], 'y') ?? 0);
    const x = Number(attribute(match[1], 'x') ?? 0);
    const text = decodeEntities(match[2]);
    const line = lines.get(y);
    if (line) line.text += text;
    else lines.set(y, { x, text });
    match = tspan.exec(body);
  }
  return [...lines.entries()]
    .sort(([a], [b]) => a - b)
    .map(([y, line]) => ({ y, ...line }));
};

export const parseTemplate = (svg: string): ParsedTemplate => {
  const root = svg.match(/<svg\b[^>]*>/)?.[0] ?? '';
  const [, , width = 0, height = 0] = (attribute(root, 'viewBox') ?? '')
    .split(/[\s,]+/)
    .map(Number);

  // Collected in document order; `fields` is later sorted top-to-bottom.
  const entries: { field: TemplateField; node: Node; position: number }[] = [];
  const placeholder = () => `<!--field:${entries.length - 1}-->`;

  let skeleton = svg.replace(/<\?xml[^>]*\?>\s*/, '');

  skeleton = skeleton.replace(
    /<text\b([^>]*)>([\s\S]*?)<\/text>/g,
    (_, attributes: string, body: string) => {
      const lines = linesOf(body);
      const fontSize = Number(attribute(attributes, 'font-size') ?? 16);
      const layerName =
        attribute(attributes, 'data-name') ??
        attribute(attributes, 'id') ??
        `Tekst ${entries.length + 1}`;
      const marker = layerName.match(ALIGN_MARKER);
      entries.push({
        field: {
          kind: 'text',
          label: layerName.replace(ALIGN_MARKER, '').trim() || layerName,
          defaultValue: lines.map((line) => line.text).join('\n'),
          rows: lines.length,
          align: marker ? alignments[marker[1].toLowerCase()] : 'start',
        },
        node: {
          kind: 'text',
          attributes: stripAttributes(attributes, [
            'id',
            'data-name',
            'xml:space',
          ]),
          x: lines[0].x,
          y: lines[0].y,
          lineHeight:
            lines.length > 1 ? lines[1].y - lines[0].y : fontSize * 1.2,
        },
        position: verticalPosition(attributes),
      });
      return placeholder();
    },
  );

  skeleton = skeleton.replace(
    /<(circle|rect|ellipse|path|polygon|polyline)\b([^>]*?)\/>/g,
    (original, tag: string, attributes: string) => {
      const layerName = attribute(attributes, 'data-name') ?? '';
      if (!IMAGE_MARKER.test(layerName)) return original;
      entries.push({
        field: {
          kind: 'image',
          label: layerName.replace(IMAGE_MARKER, '').trim() || 'Bilde',
          defaultValue: '',
        },
        node: {
          kind: 'image',
          tag,
          attributes: stripAttributes(attributes, ['id', 'data-name', 'fill']),
          original,
        },
        position: verticalPosition(attributes),
      });
      return placeholder();
    },
  );

  // Editing order: top to bottom. `order[fieldIndex]` is the node index.
  const order = entries
    .map((entry, index) => ({ index, position: entry.position }))
    .sort((a, b) => a.position - b.position)
    .map(({ index }) => index);
  const fields = order.map((index) => entries[index].field);

  const render = (values: string[], widths?: (number | undefined)[]) => {
    const fieldIndexOf = new Map(
      order.map((nodeIndex, fieldIndex) => [nodeIndex, fieldIndex]),
    );
    return skeleton.replace(PLACEHOLDER, (_, index: string) => {
      const nodeIndex = Number(index);
      const fieldIndex = fieldIndexOf.get(nodeIndex) ?? 0;
      const { field, node } = entries[nodeIndex];
      const value = values[fieldIndex] ?? '';

      if (node.kind === 'image') {
        if (!value) return node.original;
        const id = `template-image-${nodeIndex}`;
        return (
          `<pattern id="${id}" width="1" height="1" patternContentUnits="objectBoundingBox">` +
          `<image href="${escapeXml(value)}" width="1" height="1" preserveAspectRatio="xMidYMid slice"/>` +
          `</pattern>` +
          `<${node.tag}${node.attributes} fill="url(#${id})"/>`
        );
      }

      // Anchor centred/right-aligned text where the template's text was
      // centred/ended; falls back to the left edge until widths are known.
      const width = widths?.[fieldIndex];
      const align = field.kind === 'text' && width ? field.align : 'start';
      const x =
        align === 'middle'
          ? node.x + (width ?? 0) / 2
          : align === 'end'
            ? node.x + (width ?? 0)
            : node.x;
      const anchor = align === 'start' ? '' : ` text-anchor="${align}"`;
      const tspans = value
        .split('\n')
        .map(
          (line, i) =>
            `<tspan x="${x}" y="${node.y + i * node.lineHeight}">${escapeXml(line)}</tspan>`,
        )
        .join('');
      return `<text${node.attributes}${anchor} data-field="${fieldIndex}" xml:space="preserve">${tspans}</text>`;
    });
  };

  return { width, height, fields, render };
};
