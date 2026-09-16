import {
  Alert,
  Button,
  Field,
  // Experimental in Designsystemet 1.x; drop the alias when it graduates.
  EXPERIMENTAL_FileUpload as FileUpload,
  Label,
  Paragraph,
  Select,
  Textfield,
  ValidationMessage,
} from '@digdir/designsystemet-react';
import {
  ArrowUndoIcon,
  DownloadIcon,
  FilesIcon,
  ImageIcon,
  TrashIcon,
} from '@navikt/aksel-icons';
import cl from 'clsx/lite';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  type ImageTemplateId,
  imageTemplateIds,
  imageTemplates,
} from '~/_assets/templates';
import { readImageFile } from '~/_utils/image-file';
import { copySvgAsImage, rasterizeSvg, saveBlob } from '~/_utils/svg-export';
import { embedInterFont } from '~/_utils/svg-fonts';
import classes from './image-generator.module.css';
import { type ParsedTemplate, parseTemplate } from './svg-template';

const scales = [1, 2] as const;
type Scale = (typeof scales)[number];

interface ImageGeneratorProps {
  /** Template selected initially. Defaults to the first one. */
  template?: ImageTemplateId;
  className?: string;
}

/**
 * Pick an SVG template, edit its texts, upload images into its `[image]`
 * shapes and export the result as a PNG. The preview is the live SVG.
 */
export const ImageGenerator = ({
  template,
  className,
}: ImageGeneratorProps) => {
  const [templateId, setTemplateId] = useState<ImageTemplateId>(
    template ?? imageTemplateIds[0],
  );
  // Designsystemet form fields set ids and sizing on the client, so render the
  // editor after mount to avoid hydration mismatches (as the signature
  // generator does).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const source = imageTemplates[templateId];
  if (!source) {
    return (
      <Alert data-color='warning' className={className}>
        Fant ikke malen «{templateId}».
      </Alert>
    );
  }
  if (!mounted) {
    return <div className={cl(classes.container, className)} aria-hidden />;
  }

  return (
    <div className={cl(classes.generator, className)}>
      {imageTemplateIds.length > 1 && (
        <Field className={classes.templatePicker}>
          <Label>Mal</Label>
          <Select
            value={templateId}
            onChange={(event) =>
              setTemplateId(event.target.value as ImageTemplateId)
            }
          >
            {imageTemplateIds.map((id) => (
              <Select.Option key={id} value={id}>
                {imageTemplates[id].name}
              </Select.Option>
            ))}
          </Select>
        </Field>
      )}
      {/* Keyed so all state starts fresh when the template changes. */}
      <Editor key={templateId} name={source.name} svg={source.svg} />
    </div>
  );
};

const Editor = ({ name, svg: templateSvg }: { name: string; svg: string }) => {
  const parsed = useMemo(() => parseTemplate(templateSvg), [templateSvg]);
  const [values, setValues] = useState(() =>
    parsed.fields.map((field) => field.defaultValue),
  );
  const [scale, setScale] = useState<Scale>(1);
  const [exportError, setExportError] = useState<string | null>(null);

  // Widths of the template's own texts, measured from the first render (which
  // shows the defaults) so `[center]`/`[right]` fields anchor where the
  // designer placed them.
  const previewRef = useRef<HTMLDivElement>(null);
  const [widths, setWidths] = useState<(number | undefined)[]>([]);
  useLayoutEffect(() => {
    const measured: (number | undefined)[] = [];
    for (const text of previewRef.current?.querySelectorAll('text') ?? []) {
      const index = Number(text.dataset.field);
      measured[index] = text.querySelector('tspan')?.getComputedTextLength();
    }
    setWidths(measured);
  }, [parsed]);

  const svg = useMemo(
    () => parsed.render(values, widths),
    [parsed, values, widths],
  );
  const size = { width: parsed.width * scale, height: parsed.height * scale };

  const setValue = (index: number, value: string) =>
    setValues((current) =>
      current.map((existing, i) => (i === index ? value : existing)),
    );

  const run = async (action: 'download' | 'copy') => {
    setExportError(null);
    try {
      const exportSvg = await embedInterFont(svg);
      if (action === 'download') {
        const blob = await rasterizeSvg(exportSvg, {
          ...size,
          mime: 'image/png',
        });
        saveBlob(blob, `${name}.png`);
      } else {
        await copySvgAsImage(exportSvg, size);
      }
    } catch (error) {
      setExportError(
        error instanceof Error
          ? error.message
          : 'Bildet kunne ikke lages. Prøv igjen.',
      );
    }
  };

  return (
    <div className={classes.container} data-color='neutral'>
      <form
        className={classes.form}
        onSubmit={(event) => {
          event.preventDefault();
          run('download');
        }}
      >
        {parsed.fields.map((field, index) =>
          field.kind === 'image' ? (
            <ImageField
              key={field.label}
              label={field.label}
              value={values[index]}
              onChange={(value) => setValue(index, value)}
            />
          ) : (
            <Textfield
              key={field.label}
              multiline
              label={field.label}
              rows={Math.max(field.rows, 1)}
              value={values[index]}
              onChange={(event) => setValue(index, event.target.value)}
            />
          ),
        )}
        <div>
          <Button
            type='button'
            variant='tertiary'
            data-size='sm'
            onClick={() =>
              setValues(parsed.fields.map((field) => field.defaultValue))
            }
          >
            <ArrowUndoIcon aria-hidden />
            Nullstill
          </Button>
        </div>
      </form>

      <div className={classes.preview}>
        <div
          ref={previewRef}
          className={classes.canvas}
          role='img'
          aria-label={`Forhåndsvisning av ${name}`}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: template SVGs are part of this repo; user text is XML-escaped
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className={classes.actions} data-color='accent'>
          <Field className={classes.size}>
            <Label>Størrelse</Label>
            <Select
              data-size='sm'
              value={scale}
              onChange={(event) =>
                setScale(Number(event.target.value) as Scale)
              }
            >
              {scales.map((factor) => (
                <Select.Option key={factor} value={factor}>
                  {sizeLabel(parsed, factor)}
                </Select.Option>
              ))}
            </Select>
          </Field>
          <Button type='button' data-size='sm' onClick={() => run('download')}>
            <DownloadIcon aria-hidden />
            Last ned PNG
          </Button>
          <Button
            type='button'
            variant='secondary'
            data-size='sm'
            onClick={() => run('copy')}
          >
            <FilesIcon aria-hidden />
            Kopier bilde
          </Button>
        </div>
        <div aria-live='polite'>
          {exportError && (
            <Alert data-size='sm' data-color='danger'>
              {exportError}
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
};

const sizeLabel = (parsed: ParsedTemplate, factor: Scale) =>
  `${Math.round(parsed.width * factor)} × ${Math.round(parsed.height * factor)} px`;

/**
 * Upload for an `[image]` shape: Designsystemet drop zone plus the chosen
 * file. A file that can't be used is reported right under the field, with
 * `aria-invalid` on the input, per Designsystemet's error pattern.
 */
const ImageField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (dataUrl: string) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    try {
      onChange(await readImageFile(file));
      setFileName(file.name);
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Bildet kunne ikke leses. Prøv en annen fil.',
      );
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const clear = () => {
    onChange('');
    setFileName(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <Field className={classes.imageField} data-size='sm'>
      <Label htmlFor={inputId}>{label}</Label>
      <FileUpload className={classes.dropZone}>
        <ImageIcon aria-hidden='true' />
        <Field.Description>
          {value ? 'Slipp et nytt bilde her' : 'Slipp et bilde her'}
        </Field.Description>
        <Field.Description>PNG, JPEG eller WebP</Field.Description>
        <Button asChild variant='secondary'>
          <span>{value ? 'Bytt bilde' : 'Velg bilde'}</span>
        </Button>
        <input
          ref={inputRef}
          id={inputId}
          type='file'
          accept='image/*'
          aria-invalid={error ? true : undefined}
          onChange={(event) => pick(event.target.files?.[0])}
        />
      </FileUpload>
      <div aria-live='polite'>
        {error && <ValidationMessage>{error}</ValidationMessage>}
      </div>
      {value && (
        <div className={classes.imageChosen}>
          <img src={value} alt='' className={classes.imageThumbnail} />
          <Paragraph className={classes.imageFileName}>{fileName}</Paragraph>
          <Button type='button' variant='tertiary' onClick={clear}>
            <TrashIcon aria-hidden />
            Fjern
          </Button>
        </div>
      )}
    </Field>
  );
};

export default ImageGenerator;
