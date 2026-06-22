import { Dropdown, Heading, Link } from '@digdir/designsystemet-react';
import { ChevronDownIcon } from '@navikt/aksel-icons';
import cl from 'clsx/lite';
import { NavLink, Link as RRLink } from 'react-router';
import { type Profile, profiles } from '~/_config/profiles';
import classes from './sidebar.module.css';

export type SidebarLink = { title: string; url: string };
export type SidebarGroups = Record<string, SidebarLink[]>;

export type SidebarProps = {
  /** The currently active profile, used for the theme switcher trigger. */
  profile: Profile;
  groups: SidebarGroups;
  /** Hide category headings when content isn't grouped into named categories. */
  hideGroupTitle?: boolean;
};

export const Sidebar = ({ profile, groups, hideGroupTitle }: SidebarProps) => {
  return (
    <aside className={cl(classes.sidebar, 'l-sidebar-left')}>
      <Dropdown.TriggerContext>
        <Dropdown.Trigger
          variant='secondary'
          data-color='neutral'
          className={classes.switcher}
        >
          <span
            className={classes.dot}
            style={{ background: profile.color }}
            aria-hidden
          />
          <span className={classes.switcherName}>{profile.name}</span>
          <ChevronDownIcon
            className={classes.chevron}
            fontSize='1.25rem'
            aria-hidden
          />
        </Dropdown.Trigger>
        <Dropdown>
          <Dropdown.List>
            {profiles.map((item) => (
              <Dropdown.Item key={item.slug}>
                <Dropdown.Button asChild>
                  <RRLink
                    to={`/${item.slug}`}
                    className={classes.switcherOption}
                  >
                    <span
                      className={classes.dot}
                      style={{ background: item.color }}
                      aria-hidden
                    />
                    {item.name}
                  </RRLink>
                </Dropdown.Button>
              </Dropdown.Item>
            ))}
          </Dropdown.List>
        </Dropdown>
      </Dropdown.TriggerContext>

      <nav aria-label={profile.name} data-color='brand1'>
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
                  <Link asChild>
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
