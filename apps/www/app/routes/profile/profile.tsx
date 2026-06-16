import { Heading, Paragraph } from '@digdir/designsystemet-react';
import { Link as RRLink, useRouteLoaderData } from 'react-router';
import { getProfile } from '~/_config/profiles';
import { generateMetadata } from '~/_utils/metadata';
import type { Route as LayoutRoute } from '../../layouts/profile/+types/layout';
import type { Route } from './+types/profile';
import classes from './profile.module.css';

export const meta = ({ params }: Route.MetaArgs) => {
  const profile = getProfile(params.profile);
  return generateMetadata({
    title: profile?.name ?? 'Profil',
    description: profile?.description,
  });
};

export default function ProfileIndex() {
  const data = useRouteLoaderData(
    'layouts/profile/layout',
  ) as LayoutRoute.ComponentProps['loaderData'];

  const { profile, groups } = data;

  return (
    <>
      <div className={classes.header}>
        <Heading level={1} data-size='lg'>
          {profile.name}
        </Heading>
        <Paragraph data-size='lg'>{profile.description}</Paragraph>
      </div>
      {Object.entries(groups).map(([category, links]) => (
        <section key={category} className={classes.section}>
          {category && (
            <Heading level={2} data-size='sm' className={classes.categoryTitle}>
              {category}
            </Heading>
          )}
          <ul className={classes.grid}>
            {links.map((link) => (
              <li key={link.url}>
                <RRLink to={link.url} className={classes.card}>
                  <Heading level={3} data-size='xs'>
                    {link.title}
                  </Heading>
                </RRLink>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
