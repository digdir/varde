import {
  Alert,
  Chip,
  Field,
  Label,
  Paragraph,
  Search,
  Spinner,
} from '@digdir/designsystemet-react';
import type { IllustrationMeta } from '@digdir/varde/illustrations';
import cl from 'clsx/lite';
import { Suspense, use, useId, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import {
  getIllustrationLibrary,
  hasIllustrationLibrary,
  type IllustrationLibrary as IllustrationLibraryData,
} from '~/_config/illustrations';
import { IllustrationDialog } from './illustration-dialog';
import classes from './illustration-library.module.css';

interface IllustrationLibraryProps {
  /**
   * Profile whose illustrations to show. Defaults to the profile of the page
   * the component is rendered on, so the same `<IllustrationLibrary />` works
   * in every profile's docs.
   */
  profile?: string;
  className?: string;
}

/** Searchable, filterable gallery of a profile's illustrations. */
export const IllustrationLibrary = ({
  profile: profileProp,
  className,
}: IllustrationLibraryProps) => {
  const params = useParams();
  const profile = profileProp ?? params.profile;

  if (!hasIllustrationLibrary(profile)) {
    return (
      <Alert data-color='info' className={className}>
        Det finnes ingen illustrasjoner for denne profilen enda.
      </Alert>
    );
  }

  return (
    <div className={cl(classes.library, className)}>
      <Suspense
        fallback={
          <div className={classes.loading}>
            <Spinner aria-label='Laster illustrasjoner' />
          </div>
        }
      >
        <Gallery profile={profile} />
      </Suspense>
    </div>
  );
};

const matchesQuery = (item: IllustrationMeta, query: string) => {
  if (!query) return true;
  const haystack = [
    item.title,
    item.name,
    item.componentName,
    item.description ?? '',
    ...item.tags,
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
};

const Gallery = ({ profile }: { profile: string }) => {
  const library: IllustrationLibraryData = use(getIllustrationLibrary(profile));
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selected, setSelected] = useState<IllustrationMeta | null>(null);
  const tagsId = useId();

  const allTags = useMemo(
    () =>
      [...new Set(library.illustrations.flatMap((item) => item.tags))].sort(
        (a, b) => a.localeCompare(b, 'no'),
      ),
    [library],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return library.illustrations.filter(
      (item) =>
        matchesQuery(item, normalized) &&
        selectedTags.every((tag) => item.tags.includes(tag)),
    );
  }, [library, query, selectedTags]);

  const toggleTag = (tag: string) =>
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((value) => value !== tag)
        : [...current, tag],
    );

  const total = library.illustrations.length;
  const isFiltering = query.trim() !== '' || selectedTags.length > 0;
  const countText = isFiltering
    ? `Viser ${filtered.length} av ${total} illustrasjoner`
    : `${total} illustrasjoner`;

  return (
    <>
      <div className={classes.controls}>
        <Field className={classes.search}>
          <Label>Søk i illustrasjoner</Label>
          <Search>
            <Search.Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder='Tittel eller emne'
            />
            <Search.Clear onClick={() => setQuery('')} />
          </Search>
        </Field>

        {allTags.length > 0 && (
          <fieldset className={classes.tags}>
            <Label asChild>
              <legend id={tagsId}>Filtrer på emne</legend>
            </Label>
            <div className={classes.chips}>
              {allTags.map((tag) => (
                <Chip.Checkbox
                  key={tag}
                  name='tags'
                  value={tag}
                  data-size='sm'
                  checked={selectedTags.includes(tag)}
                  onChange={() => toggleTag(tag)}
                >
                  {tag}
                </Chip.Checkbox>
              ))}
            </div>
          </fieldset>
        )}
      </div>

      <Paragraph
        data-size='sm'
        className={classes.count}
        aria-live='polite'
        aria-atomic='true'
      >
        {countText}
      </Paragraph>

      {filtered.length === 0 ? (
        <Paragraph className={classes.empty}>
          Ingen illustrasjoner passer til søket. Prøv et annet ord, eller fjern
          filtrene.
        </Paragraph>
      ) : (
        <ul className={classes.grid} aria-label='Illustrasjoner'>
          {filtered.map((item) => (
            <li key={item.name}>
              <button
                type='button'
                className={cl(classes.tile, 'ds-focus')}
                aria-haspopup='dialog'
                onClick={() => setSelected(item)}
              >
                <span
                  className={classes.tilePreview}
                  aria-hidden='true'
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG strings are generated from our own repo at build time
                  dangerouslySetInnerHTML={{
                    __html: library.svgs[item.exportName] ?? '',
                  }}
                />
                <span className={classes.tileTitle}>{item.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <IllustrationDialog
        item={selected}
        library={library}
        onClose={() => setSelected(null)}
      />
    </>
  );
};

export default IllustrationLibrary;
