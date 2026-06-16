/**
 * Identities are the top-level sections of the site (shown as cards on the
 * landing page). Each identity owns a folder under `app/content/<slug>/`
 * containing its `.mdx` docs pages, and maps to a Designsystemet theme built
 * into `design-tokens-build/<theme>.css`.
 *
 * This module is safe to import on both the client and the server – it must not
 * pull in any Node-only APIs.
 */
export type Profile = {
  /** Folder name under `app/content/` and the `:profile` route param. */
  slug: string;
  /** Display name shown in the chooser and sidebar. */
  name: string;
  /** Short blurb for the identity card. */
  description: string;
  /** Brand colour used to tint the landing-page card and its illustration. */
  color: string;
  /**
   * Designsystemet theme this identity maps to. A matching
   * `design-tokens-build/<theme>.css` should exist (run `pnpm tokens`).
   */
  theme: string;
};

export const profiles: Profile[] = [
  {
    slug: 'digdir',
    name: 'Digdir.no',
    description:
      'Profilbibliotek og dokumentasjon for Digitaliseringsdirektoratet sine tjenester.',
    color: '#F45F63',
    theme: 'digdir',
  },
  {
    slug: 'norgeno',
    name: 'Norge.no',
    description:
      'Designdokumentasjon for Norge.no og de felles innbyggertjenestene.',
    color: '#0C8444',
    theme: 'norge',
  },
  {
    slug: 'dodsfall-og-arv',
    name: 'Dødsfall og arv',
    description:
      'Mønstre og veiledning for tjenester knyttet til dødsfall og arv.',
    color: '#1E88E5',
    theme: 'altinn',
  },
  {
    slug: 'tilsynet',
    name: 'Tilsynet',
    description: 'Profil og komponenter for tilsynstjenester.',
    color: '#5B60D1',
    theme: 'uutilsynet',
  },
];

export const profileSlugs = profiles.map((profile) => profile.slug);

export const getProfile = (slug?: string): Profile | undefined =>
  profiles.find((profile) => profile.slug === slug);
