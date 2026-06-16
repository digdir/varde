import { Heading, Link, Paragraph } from '@digdir/designsystemet-react';
import { Link as RRLink } from 'react-router';
import { generateMetadata } from '~/_utils/metadata';

export const meta = () => generateMetadata({ title: 'Fant ikke siden' });

export default function NotFound() {
  return (
    <div className='l-content-container'>
      <div style={{ paddingBlock: 'var(--page-spacing-top, 2rem)' }}>
        <Heading level={1} data-size='xl'>
          404
        </Heading>
        <Paragraph data-size='lg'>Vi fant ikke siden du lette etter.</Paragraph>
        <Link asChild>
          <RRLink to='/'>Tilbake til forsiden</RRLink>
        </Link>
      </div>
    </div>
  );
}
