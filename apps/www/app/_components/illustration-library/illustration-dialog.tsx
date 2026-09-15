import {
  Button,
  Dialog,
  Dropdown,
  Heading,
  Paragraph,
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

  // Reset transient state whenever another illustration is opened.
  useEffect(() => {
    setCopied(null);
    setDownloadError(null);
  }, [item]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const svg = item ? (library.svgs[item.exportName] ?? '') : '';

  const variants = useMemo(
    () => ({
      light: applyColorScheme(svg, library.colors, 'light'),
      dark: applyColorScheme(svg, library.colors, 'dark'),
    }),
    [svg, library.colors],
  );

  const reactSnippet = item
    ? [
        `import { ${item.componentName} } from '@digdir/varde/illustrations/${library.profile}/react';`,
        '',
        `<${item.componentName} aria-hidden />`,
      ].join('\n')
    : '';

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
