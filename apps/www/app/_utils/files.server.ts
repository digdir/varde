import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';

const dirname = cwd();
const CONTENT_BASE_PATH = join(dirname, './app/content');

export const safeReadDir = (path: string): string[] => {
  try {
    return readdirSync(path);
  } catch (_error) {
    console.warn(`Could not read directory: ${path}`);
    return [];
  }
};

const safeReadFile = (path: string): string => {
  try {
    return readFileSync(path, 'utf-8');
  } catch (_error) {
    console.error(`Error reading file: ${path}`);
    return '';
  }
};

/**
 * Recursively collect every `.mdx` file under `app/content/<path>`.
 * Returns absolute paths together with the path relative to `<path>`.
 */
export const getFilesFromContentDir = (
  path: string,
  currentRelativePath = '',
): Array<{ path: string; relativePath: string }> => {
  const currentPath = join(CONTENT_BASE_PATH, path, currentRelativePath);

  try {
    const entries = safeReadDir(currentPath);
    let results: Array<{ path: string; relativePath: string }> = [];

    for (const entry of entries) {
      const entryPath = join(currentPath, entry);
      const entryRelativePath = currentRelativePath
        ? join(currentRelativePath, entry)
        : entry;

      try {
        const stats = statSync(entryPath);
        if (stats.isDirectory()) {
          results = results.concat(
            getFilesFromContentDir(path, entryRelativePath),
          );
        } else if (entry.endsWith('.mdx')) {
          results.push({
            path: entryPath,
            relativePath: entryRelativePath,
          });
        }
      } catch (_error) {
        console.warn(`Could not stat entry: ${entryPath}`);
      }
    }

    return results;
  } catch (_error) {
    console.warn(`Could not read content directory: ${currentPath}`);
    return [];
  }
};

/**
 * Read a single file from the content directory, e.g.
 * `getFileFromContentDir(join("digdir", "getting-started.mdx"))`.
 */
export const getFileFromContentDir = (path: string): string => {
  try {
    return safeReadFile(join(CONTENT_BASE_PATH, path));
  } catch (_error) {
    console.error(`Error reading file from content directory: ${path}`);
    return '';
  }
};

/** List the immediate sub-directories of `app/content/<path>`. */
export const getFoldersInContentDir = (path = ''): string[] => {
  try {
    const entries = safeReadDir(join(CONTENT_BASE_PATH, path));
    return entries.filter((entry) =>
      statSync(join(CONTENT_BASE_PATH, path, entry)).isDirectory(),
    );
  } catch (_error) {
    console.error(`Error reading folders from content directory: ${path}`);
    return [];
  }
};
