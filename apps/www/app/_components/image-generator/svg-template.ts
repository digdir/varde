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
 * Illustrator writes the name on the object itself, or on a wrapping `<g>`
 * when the object is alone in its own layer – in that case the group's name
 * (and any marker in it) is inherited by the single text/shape inside.
 * Fields are listed top-to-bottom, then left-to-right, regardless of drawing
 * order.
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

/** Position used to order fields for editing (rows, then columns). */
const positionOf = (attributes: string) => {
  const translate = attribute(attributes, 'transform')?.match(
    /translate\(\s*([-\d.]+)[\s,]+([-\d.]+)/,
  );
  return {
    x: Number(
      translate?.[1] ??
        attribute(attributes, 'cx') ??
        attribute(attributes, 'x') ??
        0,
    ),
    y: Number(
      translate?.[2] ??
        attribute(attributes, 'cy') ??
        attribute(attributes, 'y') ??
        0,
    ),
  };
};

const SHAPES = 'circle|rect|ellipse|path|polygon|polyline';

/**
 * For every `<text>` and shape, the `data-name` of the nearest ancestor `<g>`
 * that has one – but only when that group contains exactly one element of
 * that kind, so a layer name applies to the object it wraps and nothing else.
 * Keyed by the element's offset in `svg`.
 */
const inheritedNames = (svg: string) => {
  type Group = { name?: string; texts: number; shapes: number };
  const groups: Group[] = [];
  const owners = new Map<number, Group>();
  const result = new Map<number, string>();

  const tag = new RegExp(`<(/?)(g|text|${SHAPES})\\b([^>]*?)(/?)>`, 'g');
  let match = tag.exec(svg);
  while (match) {
    const [, closing, name, attributes, selfClosing] = match;
    if (name === 'g') {
      if (closing) groups.pop();
      else if (!selfClosing) {
        groups.push({
          name: attribute(attributes, 'data-name'),
          texts: 0,
          shapes: 0,
        });
      }
    } else if (!closing) {
      const named = [...groups].reverse().find((group) => group.name);
      if (named) {
        if (name === 'text') named.texts += 1;
        else named.shapes += 1;
        owners.set(match.index, named);
      }
      if (name === 'text') {
        // Skip the body so tspans etc. are not tokenised.
        tag.lastIndex = svg.indexOf('</text>', match.index) + 1;
      }
    }
    match = tag.exec(svg);
  }

  for (const [offset, group] of owners) {
    const isText = svg.startsWith('<text', offset);
    const sole = isText ? group.texts === 1 : group.shapes === 1;
    if (sole && group.name) result.set(offset, group.name);
  }
  return result;
};

/** Make duplicate labels unique: "Navn", "Navn" → "Navn 1", "Navn 2". */
const uniqueLabels = (labels: string[]) => {
  const counts = new Map<string, number>();
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  const seen = new Map<string, number>();
  return labels.map((label) => {
    if ((counts.get(label) ?? 0) < 2) return label;
    const n = (seen.get(label) ?? 0) + 1;
    seen.set(label, n);
    return `${label} ${n}`;
  });
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

  // Collected in document order; `fields` is later sorted by position.
  const entries: {
    field: TemplateField;
    node: Node;
    position: { x: number; y: number };
  }[] = [];
  const placeholder = () => `<!--field:${entries.length - 1}-->`;

  const body = svg.replace(/<\?xml[^>]*\?>\s*/, '');
  const inherited = inheritedNames(body);

  const skeleton = body.replace(
    new RegExp(
      `<text\\b([^>]*)>([\\s\\S]*?)</text>|<(${SHAPES})\\b([^>]*?)/>`,
      'g',
    ),
    (
      original: string,
      textAttributes: string | undefined,
      textBody: string | undefined,
      shapeTag: string | undefined,
      shapeAttributes: string | undefined,
      offset: number,
    ) => {
      if (textAttributes !== undefined && textBody !== undefined) {
        const lines = linesOf(textBody);
        const fontSize = Number(attribute(textAttributes, 'font-size') ?? 16);
        const layerName =
          attribute(textAttributes, 'data-name') ??
          inherited.get(offset) ??
          attribute(textAttributes, 'id') ??
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
            attributes: stripAttributes(textAttributes, [
              'id',
              'data-name',
              'xml:space',
            ]),
            x: lines[0].x,
            y: lines[0].y,
            lineHeight:
              lines.length > 1 ? lines[1].y - lines[0].y : fontSize * 1.2,
          },
          position: positionOf(textAttributes),
        });
        return placeholder();
      }

      if (shapeTag === undefined || shapeAttributes === undefined) {
        return original;
      }
      const layerName =
        attribute(shapeAttributes, 'data-name') ?? inherited.get(offset) ?? '';
      if (!IMAGE_MARKER.test(layerName)) return original;
      entries.push({
        field: {
          kind: 'image',
          label: layerName.replace(IMAGE_MARKER, '').trim() || 'Bilde',
          defaultValue: '',
        },
        node: {
          kind: 'image',
          tag: shapeTag,
          attributes: stripAttributes(shapeAttributes, [
            'id',
            'data-name',
            'fill',
          ]),
          original,
        },
        position: positionOf(shapeAttributes),
      });
      return placeholder();
    },
  );

  // Editing order: rows top to bottom, then left to right (a few px of
  // baseline jitter counts as the same row). `order[fieldIndex]` is the
  // node index.
  const ROW_TOLERANCE = 8;
  const order = entries
    .map((entry, index) => ({ index, ...entry.position }))
    .sort((a, b) =>
      Math.abs(a.y - b.y) > ROW_TOLERANCE ? a.y - b.y : a.x - b.x,
    )
    .map(({ index }) => index);
  const labels = uniqueLabels(order.map((index) => entries[index].field.label));
  const fields = order.map((index, fieldIndex) => ({
    ...entries[index].field,
    label: labels[fieldIndex],
  }));

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
