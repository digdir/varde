/**
 * Data that drives the e-mail signature generator.
 *
 * Everything a signature can say lives here – the component only reads from
 * these lists, so adding an office or a language is a one-object change.
 */

export type LanguageCode = 'nb' | 'nn' | 'en';
export type OfficeId = 'leikanger' | 'oslo' | 'bronnoysund';

export type Office = {
  id: OfficeId;
  /** Label shown in the radio group. */
  label: string;
  /** Visiting address, printed verbatim in the signature. */
  address: string;
};

export type Language = {
  code: LanguageCode;
  /** Label shown in the checkbox group. */
  label: string;
  /** `lang` attribute on the language block. */
  htmlLang: string;
  greeting: string;
  phoneLabel: string;
};

// TODO: bekreft besøksadressene før siden publiseres.
export const offices: Office[] = [
  {
    id: 'leikanger',
    label: 'Leikanger',
    address: 'Askedalen 4, 6863 Leikanger, NO',
  },
  {
    id: 'oslo',
    label: 'Oslo',
    address: 'Lørenfaret 1 C, 0585 Oslo, NO',
  },
  {
    id: 'bronnoysund',
    label: 'Brønnøysund',
    address: 'Havnegata 48, 8900 Brønnøysund, NO',
  },
];

export const languages: Language[] = [
  {
    code: 'nb',
    label: 'Bokmål',
    htmlLang: 'nb-NO',
    greeting: 'Vennlig hilsen',
    phoneLabel: 'Mob',
  },
  {
    code: 'nn',
    label: 'Nynorsk',
    htmlLang: 'nn-NO',
    greeting: 'Venleg helsing',
    phoneLabel: 'Mob',
  },
  {
    code: 'en',
    label: 'Engelsk',
    htmlLang: 'en',
    greeting: 'Kind regards',
    phoneLabel: 'Phone',
  },
];

export const getOffice = (id: OfficeId): Office =>
  offices.find((office) => office.id === id) ?? offices[0];

/** Languages in the order they are declared above, not the order they were ticked. */
export const getLanguages = (codes: LanguageCode[]): Language[] =>
  languages.filter((language) => codes.includes(language.code));

/** Printed once, under the logo – the same for every office and language. */
export const POSTAL_ADDRESS = 'Postboks 1382 Vika, 0114 Oslo, NO';

export const WEBSITE = { label: 'digdir.no', href: 'https://www.digdir.no' };

/** Path to the logo used in the signature, relative to the site root. */
export const LOGO_PATH = '/images/digdir-epost.png';
export const LOGO_ALT = 'Digdir';
export const LOGO_WIDTH = 130;
