import { Heading, Link, Paragraph } from '@digdir/designsystemet-react';
import type { CSSProperties } from 'react';
import { Link as RRLink } from 'react-router';
import { IdentityIllustration } from '~/_components/identity-illustration/identity-illustration';
import { profiles } from '~/_config/profiles';
import { generateMetadata } from '~/_utils/metadata';
import classes from './home.module.css';

export const meta = () =>
  generateMetadata({
    title: 'Velg identitet',
    description: 'Velg hvilken identitet du vil se dokumentasjonen for.',
  });

const ArrowRight = () => (
  <svg viewBox='0 0 20 20' width='1.1em' height='1.1em' aria-hidden='true'>
    <path
      d='M4 10h12M11 5l5 5-5 5'
      stroke='currentColor'
      strokeWidth='1.8'
      fill='none'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

export default function Home() {
  return (
    <div className={classes.page}>
      <div className={classes.intro}>
        <Heading level={1} data-size='xl'>
          Velg identitet
        </Heading>
        <Paragraph data-size='lg' className={classes.lead}>
          Velg hvilken identitet du vil se dokumentasjonen for. Hver identitet
          har egne profiler, komponenter og veiledning.
        </Paragraph>
      </div>

      <ul className={classes.grid}>
        {profiles.map((profile) => {
          const randId = Math.random().toString(36).slice(2, 7);
          return (
            <li key={profile.slug}>
              <div
                className={classes.card}
                style={{ '--identity-color': profile.color } as CSSProperties}
                data-clickdelegatefor={randId}
              >
                <div className={classes.cardBody}>
                  <div className={classes.cardText}>
                    <Heading level={2} data-size='sm'>
                      <RRLink to={`/${profile.slug}`} id={randId}>
                        {profile.name}
                      </RRLink>
                    </Heading>
                    <Paragraph
                      data-size='sm'
                      className={classes.cardDescription}
                    >
                      {profile.description}
                    </Paragraph>
                  </div>
                  <span className={classes.cta}>
                    Velg identiteten
                    <ArrowRight />
                  </span>
                </div>
                <IdentityIllustration
                  color={profile.color}
                  className={classes.illustration}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className={classes.help}>
        <Link asChild>
          <RRLink to='/digdir/getting-started'>
            Usikker på hvilken du skal velge?
          </RRLink>
        </Link>
      </div>
    </div>
  );
}
