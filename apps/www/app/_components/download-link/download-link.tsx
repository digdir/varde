import { Paragraph } from '@digdir/designsystemet-react';
import {
  DownloadIcon,
  FileCsvIcon,
  FileExcelIcon,
  FileImageIcon,
  FilePdfIcon,
  FileTextIcon,
  FileWordIcon,
} from '@navikt/aksel-icons';
import cl from 'clsx/lite';
import type { ComponentType, SVGProps } from 'react';
import classes from './download-link.module.css';

/** File icon per extension. Anything unknown falls back to a generic document. */
const iconByExtension: Record<
  string,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  csv: FileCsvIcon,
  doc: FileWordIcon,
  docx: FileWordIcon,
  gif: FileImageIcon,
  jpeg: FileImageIcon,
  jpg: FileImageIcon,
  pdf: FilePdfIcon,
  png: FileImageIcon,
  svg: FileImageIcon,
  webp: FileImageIcon,
  xls: FileExcelIcon,
  xlsx: FileExcelIcon,
};

/** Last path segment of the href, with percent-encoding resolved. */
const fileNameFromHref = (href: string) => {
  const name = href.split(/[?#]/)[0].split('/').pop() ?? href;

  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
};

interface DownloadLinkProps {
  /** Path to the file, e.g. `/downloads/logo/Logoarkiv.zip`. */
  href: string;
  /** Visible label. Defaults to the file name in `href`. */
  title?: string;
  /** Optional second line, e.g. file type and size. */
  description?: string;
  className?: string;
}

export const DownloadLink = ({
  href,
  title,
  description,
  className,
}: DownloadLinkProps) => {
  const fileName = fileNameFromHref(href);
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  const FileIcon = iconByExtension[extension] ?? FileTextIcon;

  return (
    <a className={cl(classes.link, 'ds-focus', className)} href={href} download>
      <span className='ds-sr-only'>Last ned</span>
      <span className={classes.fileIcon}>
        <FileIcon aria-hidden />
      </span>
      <span className={classes.body}>
        <span className={classes.text}>
          <Paragraph className={classes.title} asChild>
            <span>{title ?? fileName}</span>
          </Paragraph>
          {description && (
            <Paragraph className={classes.description} data-size='sm' asChild>
              <span>{description}</span>
            </Paragraph>
          )}
        </span>
        <DownloadIcon className={classes.downloadIcon} aria-hidden />
      </span>
    </a>
  );
};

export default DownloadLink;
