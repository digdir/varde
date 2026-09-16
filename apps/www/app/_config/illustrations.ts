/**
 * Illustration libraries per profile, from the `@digdir/varde` package.
 *
 * The package ships one lazy loader per profile, so the docs bundle does not
 * grow with every illustration added. This module only memoises the promises
 * so they can be handed straight to React's `use()`.
 *
 * Safe to import on both client and server.
 */
import {
  type IllustrationLibrary,
  type IllustrationProfile,
  illustrationLoaders,
} from '@digdir/varde/illustrations';

export type { IllustrationLibrary };

const cache = new Map<IllustrationProfile, Promise<IllustrationLibrary>>();

export const hasIllustrationLibrary = (
  profile?: string,
): profile is IllustrationProfile =>
  profile !== undefined && profile in illustrationLoaders;

/** Load (and memoise) a profile's illustration library. */
export const getIllustrationLibrary = (
  profile: IllustrationProfile,
): Promise<IllustrationLibrary> => {
  let promise = cache.get(profile);
  if (!promise) {
    promise = illustrationLoaders[profile]();
    cache.set(profile, promise);
  }
  return promise;
};
