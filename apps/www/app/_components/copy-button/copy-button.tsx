import { Button, type ButtonProps } from '@digdir/designsystemet-react';
import { CheckmarkIcon, FilesIcon } from '@navikt/aksel-icons';
import { useEffect, useState } from 'react';

interface CopyButtonProps extends Omit<ButtonProps, 'onClick' | 'children'> {
  /** Text to put on the clipboard. */
  text: string;
  /** Idle label. */
  children: React.ReactNode;
  /** Label shown briefly after copying. */
  copiedLabel?: string;
}

/**
 * Button that copies `text` to the clipboard, swaps to a checkmark for a
 * moment and announces the result to screen readers.
 */
export const CopyButton = ({
  text,
  children,
  copiedLabel = 'Kopiert',
  ...props
}: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <Button {...props} onClick={copy}>
        {copied ? <CheckmarkIcon aria-hidden /> : <FilesIcon aria-hidden />}
        {copied ? copiedLabel : children}
      </Button>
      <span className='ds-sr-only' aria-live='polite' aria-atomic='true'>
        {copied ? 'Kopiert til utklippstavlen' : ''}
      </span>
    </>
  );
};
