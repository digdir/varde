import {
  Button,
  Checkbox,
  Fieldset,
  Heading,
  Paragraph,
  Radio,
  Textfield,
  ValidationMessage,
} from '@digdir/designsystemet-react';
import { CheckmarkIcon, FilesIcon } from '@navikt/aksel-icons';
import { useEffect, useId, useMemo, useState } from 'react';
import classes from './email-signatur-generator.module.css';
import {
  getLanguages,
  getOffice,
  type LanguageCode,
  LOGO_PATH,
  languages,
  type OfficeId,
  offices,
} from './signature-config';
import {
  buildSignatureHtml,
  buildSignatureText,
  type SignatureData,
} from './signature-template';

type CopyState = 'idle' | 'copied' | 'error';

const copySignature = async (html: string, text: string) => {
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        }),
      ]);
      return;
    } catch {}
  }

  const holder = document.createElement('div');
  holder.setAttribute('contenteditable', 'true');
  holder.innerHTML = html;
  holder.style.position = 'fixed';
  holder.style.left = '-9999px';
  document.body.appendChild(holder);

  try {
    const range = document.createRange();
    range.selectNodeContents(holder);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    if (!document.execCommand('copy')) {
      throw new Error('execCommand("copy") was rejected');
    }
    selection?.removeAllRanges();
  } finally {
    holder.remove();
  }
};

export const EmailSignatureGenerator = () => {
  const previewId = useId();

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [office, setOffice] = useState<OfficeId>('leikanger');
  const [selectedLanguages, setSelectedLanguages] = useState<LanguageCode[]>([
    'nb',
  ]);
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const noLanguage = selectedLanguages.length === 0;

  const input: SignatureData = useMemo(
    () => ({
      name,
      role,
      phone,
      office: getOffice(office),
      languages: getLanguages(selectedLanguages),
    }),
    [name, role, phone, office, selectedLanguages],
  );

  const previewHtml = useMemo(
    () => buildSignatureHtml({ ...input, logoSrc: LOGO_PATH }),
    [input],
  );

  const toggleLanguage = (code: LanguageCode, checked: boolean) => {
    setSelectedLanguages((current) =>
      checked
        ? [...current, code]
        : current.filter((language) => language !== code),
    );
  };

  const onCopy = async () => {
    const html = buildSignatureHtml({
      ...input,
      logoSrc: new URL(LOGO_PATH, window.location.origin).href,
    });

    try {
      await copySignature(html, buildSignatureText(input));
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  };

  useEffect(() => {
    if (copyState !== 'copied') return;
    const timer = window.setTimeout(() => setCopyState('idle'), 2500);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  if (!mounted) {
    return <div className={classes.container} aria-hidden='true' />;
  }

  return (
    <div className={classes.container}>
      <form
        className={classes.form}
        onSubmit={(event) => event.preventDefault()}
      >
        <Textfield
          label='Navn'
          value={name}
          autoComplete='name'
          onChange={(event) => setName(event.target.value)}
        />
        <Textfield
          label='Rolle'
          description='Stillingstittelen din, slik den står i personalsystemet.'
          value={role}
          autoComplete='organization-title'
          onChange={(event) => setRole(event.target.value)}
        />
        <Textfield
          label='Telefonnummer'
          type='tel'
          value={phone}
          autoComplete='tel'
          onChange={(event) => setPhone(event.target.value)}
        />

        <Fieldset>
          <Fieldset.Legend>Kontorsted</Fieldset.Legend>
          {offices.map((item) => (
            <Radio
              key={item.id}
              name='office'
              label={item.label}
              description={item.address}
              value={item.id}
              checked={office === item.id}
              onChange={() => setOffice(item.id)}
            />
          ))}
        </Fieldset>

        <Fieldset>
          <Fieldset.Legend>Språk</Fieldset.Legend>
          <Fieldset.Description>
            Velg ett eller flere. Signaturen får én bolk per språk.
          </Fieldset.Description>
          {languages.map((language) => (
            <Checkbox
              key={language.code}
              name='language'
              label={language.label}
              value={language.code}
              checked={selectedLanguages.includes(language.code)}
              onChange={(event) =>
                toggleLanguage(language.code, event.target.checked)
              }
            />
          ))}
          {noLanguage && (
            <ValidationMessage>Velg minst ett språk.</ValidationMessage>
          )}
        </Fieldset>
      </form>

      <section
        className={classes.preview}
        aria-labelledby={`${previewId}-heading`}
      >
        <Heading level={2} data-size='2xs' id={`${previewId}-heading`}>
          Forhåndsvisning
        </Heading>

        <div
          className={classes.signature}
          // The markup is built by `signature-template.ts` from escaped input –
          // rendering it here is what keeps preview and clipboard identical.
          // biome-ignore lint/security/noDangerouslySetInnerHtml: see above
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />

        <div className={classes.actions}>
          <Button type='button' onClick={onCopy} disabled={noLanguage}>
            {copyState === 'copied' ? (
              <CheckmarkIcon aria-hidden />
            ) : (
              <FilesIcon aria-hidden />
            )}
            {copyState === 'copied' ? 'Kopiert!' : 'Kopier signatur'}
          </Button>
          {copyState === 'error' && (
            <ValidationMessage>
              Kopieringen feilet. Marker signaturen over og kopier den manuelt.
            </ValidationMessage>
          )}
        </div>
        <Paragraph data-size='sm' aria-live='polite' className={classes.srOnly}>
          {copyState === 'copied' ? 'Signaturen er kopiert.' : ''}
        </Paragraph>
      </section>
    </div>
  );
};
