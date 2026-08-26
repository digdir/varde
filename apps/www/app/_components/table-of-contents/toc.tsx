import { Button, Divider, Link, Paragraph } from '@digdir/designsystemet-react';
import { PencilLineIcon } from '@navikt/aksel-icons';
import cl from 'clsx/lite';
import type { HTMLAttributes } from 'react';
import { useEffect, useState } from 'react';
import { useRouteLoaderData } from 'react-router';
import type { TableOfContentsItem } from '~/_utils/extract-toc';
import classes from './toc.module.css';

export type TableOfContentsProps = {
  items: TableOfContentsItem[];
  level?: number;
} & HTMLAttributes<HTMLDivElement>;

export const TableOfContents = ({
  children,
  items,
  level = 2,
  className,
  ...props
}: TableOfContentsProps) => {
  const [activeItem, setActiveItem] = useState<string>('');

  const filteredItems = items.filter((item) => item.level <= level);

  const { profile, frontmatter } = useRouteLoaderData('profile-page');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveItem(entry.target.id);
          }
        });
      },
      { rootMargin: '0px 0px -60% 0px' },
    );

    const headingElements = filteredItems.map((item) =>
      document.getElementById(item.id),
    );

    headingElements.forEach((element) => {
      if (element) observer.observe(element);
    });

    return () => {
      headingElements.forEach((element) => {
        if (element) observer.unobserve(element);
      });
      observer.disconnect();
    };
  }, [filteredItems]);

  return (
    <aside
      data-color='neutral'
      data-size='md'
      data-toc
      className={cl(classes['table-of-contents'], className)}
      {...props}
    >
      {filteredItems.length > 1 && (
        <>
          <Paragraph data-size='sm' asChild>
            <h2>På denne siden</h2>
          </Paragraph>
          <ol>
            {filteredItems.map((item) => (
              <li key={item.id}>
                <Link
                  data-size='sm'
                  href={`#${item.id}`}
                  data-level={item.level}
                  aria-current={activeItem === item.id}
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}
      <Divider />
      <div className={classes.feedback} data-color={profile?.mainColor}>
        <Paragraph>Har du inspill?</Paragraph>
        <Paragraph>Gi oss tilbakemelding på Github.</Paragraph>
        <Button asChild variant='secondary'>
          <Link
            href={`https://github.com/digdir/varde/issues/new?title=Tilbakemelding%20på%20${profile?.name}%20-%20${frontmatter.title}`}
            target='_blank'
          >
            <PencilLineIcon aria-hidden='true' />
            Send innspill
          </Link>
        </Button>
      </div>
      {children}
    </aside>
  );
};
