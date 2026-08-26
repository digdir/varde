import {
  type Language,
  LOGO_ALT,
  LOGO_WIDTH,
  type Office,
  POSTAL_ADDRESS,
  WEBSITE,
} from './signature-config';

/** Everything the signature says, except how to reach the logo. */
export type SignatureData = {
  name: string;
  role: string;
  phone: string;
  office: Office;
  /** One block is rendered per language, in the order given. */
  languages: Language[];
};

export type SignatureInput = SignatureData & {
  /**
   * `src` for the logo. The preview passes a root-relative path; the copy
   * passes an absolute URL, since a relative one cannot resolve in a mail client.
   */
  logoSrc: string;
};

const FONT_STACK =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";
const TEXT_COLOR = '#1E2B3C';
const RULE_COLOR = '#D3D9E1';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Placeholders keep the preview readable before the form is filled in. */
const or = (value: string, fallback: string) => value.trim() || fallback;

const line = `margin:0;font-family:${FONT_STACK};font-size:14px;line-height:20px;color:${TEXT_COLOR};`;
const digdir_hex = '#C2132C';
/** Closes a group – the blank line the format calls for. */
const gap = 'margin:0 0 20px;';

const buildLanguageBlock = (
  language: Language,
  { name, role, phone, office }: SignatureData,
) => `<div lang="${language.htmlLang}" style="${line}">
  <p style="${line}${gap}">${escapeHtml(language.greeting)}</p>
  <p style="${line}"><strong>${escapeHtml(or(name, 'Navn Navnesen'))}</strong></p>
  <p style="${line}${gap}"><em style="font-style:italic;">${escapeHtml(or(role, 'stilling'))}</em></p>
  <p style="${line}${gap}">${escapeHtml(language.phoneLabel)}: ${escapeHtml(or(phone, 'XXX XX XXX'))}</p>
  <p style="${line}${gap}">${escapeHtml(office.address)}</p>
</div>`;

export const buildSignatureHtml = (input: SignatureInput): string => {
  const separator = `<div style="border-top:1px solid ${RULE_COLOR};margin:0 0 20px;font-size:0;line-height:0;">&nbsp;</div>`;

  const blocks = input.languages
    .map((language) => buildLanguageBlock(language, input))
    .join(`\n  ${separator}\n  `);

  return `<div style="${line}">
  ${blocks}
  <img src="${input.logoSrc}" alt="${LOGO_ALT}" width="${LOGO_WIDTH}" style="display:block;border:0;margin:0 0 20px;width:${LOGO_WIDTH}px;height:auto;" />
  <p style="${line}">${escapeHtml(POSTAL_ADDRESS)}</p>
  <p style="${line}"><a href="${WEBSITE.href}" style="color:${digdir_hex};text-decoration:underline;">${escapeHtml(WEBSITE.label)}</a></p>
</div>`;
};

/** Plain-text flavour, for clients and paste targets that reject HTML. */
export const buildSignatureText = (input: SignatureData): string =>
  [
    ...input.languages.map((language) =>
      [
        language.greeting,
        '',
        or(input.name, 'Navn Navnesen'),
        or(input.role, 'stilling'),
        '',
        `${language.phoneLabel}: ${or(input.phone, 'XXX XX XXX')}`,
        '',
        input.office.address,
      ].join('\n'),
    ),
    [POSTAL_ADDRESS, WEBSITE.href].join('\n'),
  ].join('\n\n');
