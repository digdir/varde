import { join } from 'node:path';
import { Heading, Paragraph } from '@digdir/designsystemet-react';
import cl from 'clsx/lite';
import { isRouteErrorResponse } from 'react-router';
import { MDXComponents } from '~/_components/mdx-components/mdx-components';
import { TableOfContents } from '~/_components/table-of-contents/toc';
import { getProfile } from '~/_config/profiles';
import { getFileFromContentDir } from '~/_utils/files.server';
import { generateFromMdx } from '~/_utils/generate-from-mdx';
import { generateMetadata } from '~/_utils/metadata';
import type { Route } from './+types/page';
import classes from './page.module.css';

export async function loader({ params }: Route.LoaderArgs) {
  const profile = getProfile(params.profile);
  const file = params['*'];

  if (!profile || !file) {
    throw new Response('Not Found', { status: 404, statusText: 'Not Found' });
  }

  const fileContent = getFileFromContentDir(join(profile.slug, `${file}.mdx`));

  if (!fileContent) {
    throw new Response('Not Found', { status: 404, statusText: 'Not Found' });
  }

  const result = await generateFromMdx(fileContent);

  return {
    code: result.code,
    frontmatter: result.frontmatter,
    toc: result.toc,
  };
}

export const meta = ({ data }: Route.MetaArgs) => {
  if (!data) return [{ title: 'Varde' }];
  return generateMetadata({
    title: data.frontmatter.title ?? 'Varde',
    description: data.frontmatter.description,
  });
};

export default function Page({
  loaderData: { code, frontmatter, toc },
}: Route.ComponentProps) {
  return (
    <article className={classes.page}>
      <header className={classes.header}>
        <Heading level={1} data-size='lg'>
          {frontmatter.title}
        </Heading>
        {frontmatter.description && (
          <Paragraph data-size='lg' className={classes.description}>
            {frontmatter.description}
          </Paragraph>
        )}
      </header>
      <div className={classes.body}>
        <div className={cl(classes.content, 'u-rich-text')}>
          <MDXComponents code={code} />
        </div>
        <TableOfContents items={toc} className={classes.toc} />
      </div>
    </article>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div>
        <Heading level={1} data-size='lg'>
          Fant ikke siden
        </Heading>
        <Paragraph>Vi fant ikke dokumentasjonssiden du lette etter.</Paragraph>
      </div>
    );
  }

  return (
    <div>
      <Heading level={1} data-size='lg'>
        Noe gikk galt
      </Heading>
      <Paragraph>
        {import.meta.env.DEV && error instanceof Error
          ? error.message
          : 'En uventet feil oppstod under lasting av siden.'}
      </Paragraph>
    </div>
  );
}
