import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';

const APP_ROOT = cwd();
const CONTENT_BASE_PATH = join(APP_ROOT, './app/content');

/** Checks if a path exists and is a directory */
function isDirectory(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}

/** Gets all directory names in a given path */
function getDirectories(path: string): string[] {
  if (!isDirectory(path)) return [];
  return readdirSync(path).filter((entry) => isDirectory(join(path, entry)));
}

/** Normalizes a route path to use forward slashes */
function normalizeRoutePath(path: string): string {
  return path.replace(/\\/g, '/');
}

/**
 * Recursively walks a profile's content folder and turns every `.mdx` file
 * into a `/<profile>/<...path>` route.
 */
function processMdxFiles(
  folderPath: string,
  profile: string,
  relativePath = '',
): string[] {
  const routes: string[] = [];

  try {
    const entries = readdirSync(folderPath);

    for (const entry of entries) {
      const entryPath = join(folderPath, entry);
      const entryRelativePath = relativePath
        ? join(relativePath, entry)
        : entry;

      if (statSync(entryPath).isDirectory()) {
        routes.push(...processMdxFiles(entryPath, profile, entryRelativePath));
      } else if (entry.endsWith('.mdx')) {
        const routeWithoutExtension = entryRelativePath.replace(/\.mdx$/, '');
        routes.push(normalizeRoutePath(`/${profile}/${routeWithoutExtension}`));
      }
    }
  } catch (error) {
    console.warn(`Error processing folder: ${folderPath}`, error);
  }

  return routes;
}

/**
 * Generates every static path for the app:
 *   `/`                          – the profile chooser
 *   `/<profile>`                 – each profile's docs index
 *   `/<profile>/<...path>`       – each MDX page
 */
export function generatePrerenderPaths(): string[] {
  try {
    const profiles = getDirectories(CONTENT_BASE_PATH);
    const profileIndexRoutes = profiles.map((profile) => `/${profile}`);
    const fileRoutes = profiles.flatMap((profile) =>
      processMdxFiles(join(CONTENT_BASE_PATH, profile), profile),
    );

    return ['/', ...profileIndexRoutes, ...fileRoutes];
  } catch (error) {
    console.warn(`Error determining prerender paths: ${error}`);
    return ['/'];
  }
}
