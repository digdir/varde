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
   * The theme's *main* colour, given as a Designsystemet `data-color` value.
   * Setting `data-color={mainColor}` on a subtree lets it use the unnamed
   * `--ds-color-*` variables instead of hard-coding a colour name like
   * `--ds-color-brand1-*`, so each profile can name its main colour whatever it
   * likes. `neutral` is the only colour every theme is guaranteed to have.
   */
  mainColor: string;
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
    mainColor: 'brand1',
    theme: 'digdir',
  },
  {
    slug: 'uutilsynet',
    name: 'uutilsynet',
    description: 'Profil og komponenter for uutilsynet.',
    color: '#5B60D1',
    mainColor: 'brand1',
    theme: 'uutilsynet',
  },
];

export const profileSlugs = profiles.map((profile) => profile.slug);

export const getProfile = (slug?: string): Profile | undefined =>
  profiles.find((profile) => profile.slug === slug);
