import {
  Button,
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
import type { IllustrationMeta } from '@digdir/varde/illustrations';
import { CheckmarkIcon, DownloadIcon, FilesIcon } from '@navikt/aksel-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  applyColorScheme,
  type IllustrationLibrary,
} from '~/_config/illustrations';
import {
  type DownloadFormat,
  downloadFormats,
  downloadIllustration,
} from './download-illustration';
import classes from './illustration-library.module.css';

type Scheme = 'light' | 'dark';

const schemeLabels: Record<Scheme, string> = {
  light: 'Lys modus',
  dark: 'Mørk modus',
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

interface IllustrationDialogProps {
  item: IllustrationMeta | null;
  library: IllustrationLibrary;
  onClose: () => void;
}

/**
 * Details for one illustration: light/dark previews with copy and download,
 * plus the React import snippet.
 */
export const IllustrationDialog = ({
  item,
  library,
  onClose,
}: IllustrationDialogProps) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  /** Chosen palette colour per slot, keyed by the slot's CSS variable. */
  const [slotValues, setSlotValues] = useState<Record<string, string>>({});

  // Reset transient state whenever another illustration is opened.
  useEffect(() => {
    setCopied(null);
    setDownloadError(null);
    setSlotValues(
      Object.fromEntries(
        (item?.slots ?? []).map((slot) => [slot.variable, slot.default]),
      ),
    );
  }, [item]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const svg = item ? (library.svgs[item.exportName] ?? '') : '';

  const variants = useMemo(
    () => ({
      light: applyColorScheme(svg, library.colors, 'light', slotValues),
      dark: applyColorScheme(svg, library.colors, 'dark', slotValues),
    }),
    [svg, library.colors, slotValues],
  );

  // Slots set to something other than the drawn colour become props.
  const slotProps = (item?.slots ?? [])
    .filter((slot) => slotValues[slot.variable] !== slot.default)
    .map((slot) => ` ${slot.prop}="${slotValues[slot.variable]}"`)
    .join('');

  const reactSnippet = item
    ? [
        `import { ${item.componentName} } from '@digdir/varde/illustrations/${library.profile}/react';`,
        '',
        `<${item.componentName}${slotProps} aria-hidden />`,
      ].join('\n')
    : '';

  const colorLabel = (name: string) =>
    library.colors.find((color) => color.name === name)?.label ?? name;

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
    } catch {
      setCopied(null);
    }
  };

  const download = async (scheme: Scheme, format: DownloadFormat) => {
    if (!item) return;
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
    <Dialog
      open={item !== null}
      onClose={onClose}
      closedby='any'
      closeButton='Lukk'
      className={classes.dialog}
    >
      {item && (
        <>
          <div className='ds-sr-only' aria-live='polite' aria-atomic='true'>
            {copied ? 'Kopiert til utklippstavlen' : ''}
          </div>

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
                    value={slotValues[slot.variable] ?? slot.default}
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
            {(['light', 'dark'] as const).map((scheme) => (
              <section
                key={scheme}
                className={classes.preview}
                data-color-scheme={scheme}
                aria-label={schemeLabels[scheme]}
              >
                <Paragraph
                  data-size='xs'
                  className={classes.previewLabel}
                  asChild
                >
                  <span>{schemeLabels[scheme]}</span>
                </Paragraph>
                <div
                  className={classes.previewImage}
                  role='img'
                  aria-label={`${item.title}, ${schemeLabels[scheme].toLowerCase()}`}
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG strings are generated from our own repo at build time
                  dangerouslySetInnerHTML={{ __html: variants[scheme] }}
                />
                <div className={classes.previewActions}>
                  <Button
                    variant='secondary'
                    data-size='sm'
                    onClick={() => copy(variants[scheme], scheme)}
                  >
                    {copied === scheme ? (
                      <CheckmarkIcon aria-hidden />
                    ) : (
                      <FilesIcon aria-hidden />
                    )}
                    {copied === scheme ? 'Kopiert' : 'Kopier SVG'}
                  </Button>
                  <DownloadMenu
                    onSelect={(format) => download(scheme, format)}
                  />
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
              <Button
                variant='tertiary'
                data-size='sm'
                onClick={() => copy(reactSnippet, 'react')}
              >
                {copied === 'react' ? (
                  <CheckmarkIcon aria-hidden />
                ) : (
                  <FilesIcon aria-hidden />
                )}
                {copied === 'react' ? 'Kopiert' : 'Kopier'}
              </Button>
            </div>
            <pre className={classes.code}>
              <code>{reactSnippet}</code>
            </pre>
          </Dialog.Block>
        </>
      )}
    </Dialog>
  );
};
