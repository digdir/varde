import { Heading, Link } from '@digdir/designsystemet-react';
import cl from 'clsx/lite';
import { NavLink } from 'react-router';
import classes from './sidebar.module.css';

export type SidebarLink = { title: string; url: string };
export type SidebarGroups = Record<string, SidebarLink[]>;

export type SidebarProps = {
  title: string;
  groups: SidebarGroups;
  /** Hide category headings when content isn't grouped into named categories. */
  hideGroupTitle?: boolean;
};

export const Sidebar = ({ title, groups, hideGroupTitle }: SidebarProps) => {
  return (
    <aside className={cl(classes.sidebar, 'l-sidebar-left')}>
      <Heading level={2} data-size='xs' className={classes.title}>
        {title}
      </Heading>
      <nav aria-label={title}>
        {Object.entries(groups).map(([category, links]) => (
          <div key={category} className={classes.group}>
            {!hideGroupTitle && category && (
              <Heading level={3} data-size='2xs' className={classes.groupTitle}>
                {category}
              </Heading>
            )}
            <ul>
              {links.map((link) => (
                <li key={link.url}>
                  <Link data-size='sm' asChild>
                    <NavLink to={link.url} end className={classes.link}>
                      {link.title}
                    </NavLink>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
};
