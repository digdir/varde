import {
  Dialog,
  Dropdown,
  Field,
  Heading,
  Label,
  Paragraph,
  Select,
  Tag,
  ValidationMessage,
} from '@digdir/designsystemet-react';
import {
  type ColorScheme,
  type IllustrationLibrary,
  type IllustrationMeta,
  resolveColorScheme,
} from '@digdir/varde/illustrations';
import { DownloadIcon } from '@navikt/aksel-icons';
import { useMemo, useRef, useState } from 'react';
import { CopyButton } from '../copy-button/copy-button';
import {
  type DownloadFormat,
  downloadFormats,
  downloadIllustration,
} from './download-illustration';
import classes from './illustration-library.module.css';

const schemes: { scheme: ColorScheme; label: string }[] = [
  { scheme: 'light', label: 'Lys modus' },
  { scheme: 'dark', label: 'Mørk modus' },
];

interface IllustrationDialogProps {
  item: IllustrationMeta | null;
  library: IllustrationLibrary;
  onClose: () => void;
}

/**
 * Details for one illustration: colour choices for its slots, light/dark
 * previews with copy and download, plus the React import snippet.
 */
export const IllustrationDialog = ({
  item,
  library,
  onClose,
}: IllustrationDialogProps) => (
  <Dialog
    open={item !== null}
    onClose={onClose}
    onToggle={(event) => {
      if (event.newState === 'closed') onClose();
    }}
    closedby='any'
    closeButton='Lukk'
    className={classes.dialog}
  >
    {/* Keyed so all per-illustration state starts fresh for each item. */}
    {item && <DialogContent key={item.name} item={item} library={library} />}
  </Dialog>
);

const DialogContent = ({
  item,
  library,
}: {
  item: IllustrationMeta;
  library: IllustrationLibrary;
}) => {
  const [downloadError, setDownloadError] = useState<string | null>(null);
  /** Chosen palette colour per slot, keyed by the slot's CSS variable. */
  const [slotValues, setSlotValues] = useState(() =>
    Object.fromEntries(item.slots.map((slot) => [slot.variable, slot.default])),
  );

  const svg = library.svgs[item.exportName] ?? '';
  const variants = useMemo(
    () => ({
      light: resolveColorScheme(svg, library.colors, 'light', slotValues),
      dark: resolveColorScheme(svg, library.colors, 'dark', slotValues),
    }),
    [svg, library.colors, slotValues],
  );

  // Slots set to something other than the drawn colour become props.
  const slotProps = item.slots
    .filter((slot) => slotValues[slot.variable] !== slot.default)
    .map((slot) => ` ${slot.prop}="${slotValues[slot.variable]}"`)
    .join('');
  const reactSnippet = [
    `import { ${item.componentName} } from '@digdir/varde/illustrations/${library.profile}/react';`,
    '',
    `<${item.componentName}${slotProps} aria-hidden />`,
  ].join('\n');

  const colorLabel = (name: string) =>
    library.colors.find((color) => color.name === name)?.label ?? name;

  const download = async (scheme: ColorScheme, format: DownloadFormat) => {
    setDownloadError(null);
    try {
      await downloadIllustration({
        svg: variants[scheme],
        viewBox: item.viewBox,
        fileName: `${item.name}-${scheme}`,
        format,
      });
    } catch (error) {
      setDownloadError(
        error instanceof Error ? error.message : 'Nedlastingen feilet.',
      );
    }
  };

  return (
    <>
      <Dialog.Block>
        <Heading level={2} data-size='sm'>
          {item.title}
        </Heading>
        {item.description && (
          <Paragraph className={classes.dialogDescription}>
            {item.description}
          </Paragraph>
        )}
        {item.tags.length > 0 && (
          <ul className={classes.tagList} aria-label='Emner'>
            {item.tags.map((tag) => (
              <li key={tag}>
                <Tag data-size='sm' data-color='neutral'>
                  {tag}
                </Tag>
              </li>
            ))}
          </ul>
        )}
      </Dialog.Block>

      {item.slots.length > 0 && (
        <Dialog.Block className={classes.slots}>
          {item.slots.map((slot) => (
            <Field key={slot.name} className={classes.slot}>
              <Label>Farge på {slot.label.toLowerCase()}</Label>
              <Select
                data-size='sm'
                value={slotValues[slot.variable]}
                onChange={(event) =>
                  setSlotValues((current) => ({
                    ...current,
                    [slot.variable]: event.target.value,
                  }))
                }
              >
                {slot.colors.map((color) => (
                  <Select.Option key={color} value={color}>
                    {colorLabel(color)}
                    {color === slot.default ? ' (standard)' : ''}
                  </Select.Option>
                ))}
              </Select>
            </Field>
          ))}
        </Dialog.Block>
      )}

      <Dialog.Block className={classes.previews}>
        {schemes.map(({ scheme, label }) => (
          <section
            key={scheme}
            className={classes.preview}
            data-color-scheme={scheme}
            aria-label={label}
          >
            <Paragraph data-size='xs' className={classes.previewLabel} asChild>
              <span>{label}</span>
            </Paragraph>
            <div
              className={classes.previewImage}
              role='img'
              aria-label={`${item.title}, ${label.toLowerCase()}`}
              // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG strings are generated from our own repo at build time
              dangerouslySetInnerHTML={{ __html: variants[scheme] }}
            />
            <div className={classes.previewActions}>
              <CopyButton
                text={variants[scheme]}
                variant='secondary'
                data-size='sm'
              >
                Kopier SVG
              </CopyButton>
              <DownloadMenu onSelect={(format) => download(scheme, format)} />
            </div>
          </section>
        ))}
        {downloadError && (
          <ValidationMessage className={classes.downloadError}>
            {downloadError}
          </ValidationMessage>
        )}
      </Dialog.Block>

      <Dialog.Block>
        <div className={classes.codeHeader}>
          <Heading level={3} data-size='2xs'>
            Bruk i React
          </Heading>
          <CopyButton text={reactSnippet} variant='tertiary' data-size='sm'>
            Kopier
          </CopyButton>
        </div>
        <pre className={classes.code}>
          <code>{reactSnippet}</code>
        </pre>
      </Dialog.Block>
    </>
  );
};

/** "Last ned" button that opens a format picker (SVG, PNG, WebP). */
const DownloadMenu = ({
  onSelect,
}: {
  onSelect: (format: DownloadFormat) => void;
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  const select = (format: DownloadFormat) => {
    // Picking a format is a one-shot action – close the menu (focus returns
    // to the trigger) before starting the download.
    try {
      menuRef.current?.hidePopover();
    } catch {
      // Already closed.
    }
    onSelect(format);
  };

  return (
    <Dropdown.TriggerContext>
      <Dropdown.Trigger variant='tertiary' data-size='sm'>
        <DownloadIcon aria-hidden />
        Last ned
      </Dropdown.Trigger>
      <Dropdown ref={menuRef} data-size='sm' placement='bottom-start'>
        <Dropdown.Heading>Velg format</Dropdown.Heading>
        <Dropdown.List>
          {downloadFormats.map(({ format, label }) => (
            <Dropdown.Item key={format}>
              <Dropdown.Button onClick={() => select(format)}>
                {label}
              </Dropdown.Button>
            </Dropdown.Item>
          ))}
        </Dropdown.List>
      </Dropdown>
    </Dropdown.TriggerContext>
  );
};
