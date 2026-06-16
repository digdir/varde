import { join } from 'node:path';
import { Heading, Paragraph } from '@digdir/designsystemet-react';
import { isRouteErrorResponse, Outlet } from 'react-router';
import { Sidebar, type SidebarGroups } from '~/_components/sidebar/sidebar';
import { getProfile } from '~/_config/profiles';
import {
  getFileFromContentDir,
  getFilesFromContentDir,
} from '~/_utils/files.server';
import { generateFromMdx } from '~/_utils/generate-from-mdx';
import type { Route } from './+types/layout';
import classes from './layout.module.css';

export const loader = async ({ params }: Route.LoaderArgs) => {
  const profile = getProfile(params.profile);
  if (!profile) {
    throw new Response('Not Found', { status: 404, statusText: 'Not Found' });
  }

  const mdxFiles = getFilesFromContentDir(profile.slug);

  type NavItem = { title: string; url: string; order: number };
  const grouped: Record<string, NavItem[]> = {};

  // Read each file's frontmatter to build the sidebar navigation.
  for (const file of mdxFiles) {
    const fileContent = getFileFromContentDir(
      join(profile.slug, file.relativePath),
    );
    const { frontmatter } = await generateFromMdx(fileContent);

    if (frontmatter.published === false) continue;

    const slug = file.relativePath.replace(/\.mdx$/, '').replace(/\\/g, '/');
    const title = frontmatter.sidebar_title || frontmatter.title || slug;
    const category = frontmatter.category || '';

    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push({
      title,
      url: `/${profile.slug}/${slug}`,
      order: frontmatter.order ?? 0,
    });
  }

  // Sort each category by the `order` frontmatter field.
  for (const category in grouped) {
    grouped[category].sort((a, b) => a.order - b.order);
  }

  return { profile, groups: grouped as SidebarGroups };
};

export default function ProfileLayout({
  loaderData: { profile, groups },
}: Route.ComponentProps) {
  const hasCategories = Object.keys(groups).some((category) => category !== '');

  return (
    <div className='l-content-container' data-profile={profile.slug}>
      <Sidebar
        title={profile.name}
        groups={groups}
        hideGroupTitle={!hasCategories}
      />
      <div className={classes.content} id='content'>
        <Outlet />
      </div>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div className='l-content-container'>
        <div className={classes.content}>
          <Heading level={1} data-size='lg'>
            Fant ikke siden
          </Heading>
          <Paragraph>Denne profilen finnes ikke.</Paragraph>
        </div>
      </div>
    );
  }

  return (
    <div className='l-content-container'>
      <div className={classes.content}>
        <Heading level={1} data-size='lg'>
          Noe gikk galt
        </Heading>
        <Paragraph>
          {import.meta.env.DEV && error instanceof Error
            ? error.message
            : 'En uventet feil oppstod.'}
        </Paragraph>
      </div>
    </div>
  );
}
