import { faCirclePlus, faCircleQuestion, faClock, faUser } from '@fortawesome/free-solid-svg-icons';
import React, { useContext } from 'react';
import { Helmet } from 'react-helmet';
import { SUPPORT_LINK } from '../../Constants';
import UserContext from '../../UserContext';
import HomePageLink, { type HomePageLinkProps } from './components/HomePageLink';

const USER_GUIDE_LINK = 'https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/';

const HOME_PAGE_LINKS: HomePageLinkProps[] = [
  {
    title: 'Manage account',
    description: 'View profile and My Groups',
    linkLabel: 'Manage account',
    destination: '/account',
    icon: faUser,
  },
  {
    title: 'Notifications',
    description: 'Set up and take action on TTA Hub tasks and messages.',
    linkLabel: 'View notifications',
    destination: '/notifications',
    icon: faClock,
  },
  {
    title: "What's new",
    description: 'Stay up to date with new TTA Hub features.',
    linkLabel: 'View updates',
    destination: '/whats-new',
    icon: faCirclePlus,
  },
  {
    title: 'User guide',
    description: 'Technical documents and help articles.',
    linkLabel: 'View user guide',
    destination: USER_GUIDE_LINK,
    icon: faUser,
    external: true,
  },
  {
    title: 'Contact support',
    description: 'Request support for the TTA Hub.',
    linkLabel: 'Contact support',
    destination: SUPPORT_LINK,
    icon: faCircleQuestion,
    external: true,
  },
];

interface HomeUserContext {
  user?: {
    name?: string | null;
  };
}

export default function NewHome(): React.ReactElement {
  const { user } = (useContext(UserContext) || {}) as HomeUserContext;
  const name = typeof user?.name === 'string' ? user.name.trim() : '';
  const heading = name ? `Welcome to the TTA Hub, ${name}` : 'Welcome to the TTA Hub';

  return (
    <>
      <Helmet>
        <title>Home</title>
      </Helmet>
      <h1
        className="page-heading text-wrap margin-top-0 margin-bottom-4 maxw-full"
        style={{ overflowWrap: 'anywhere' }}
      >
        {heading}
      </h1>
      <section
        aria-label="TTA Hub shortcuts"
        className="grid-row grid-gap-3"
        data-testid="home-page-links"
      >
        {HOME_PAGE_LINKS.map((link) => (
          <div className="grid-col-12 desktop:grid-col-6 margin-bottom-3" key={link.title}>
            <HomePageLink {...link} />
          </div>
        ))}
      </section>
    </>
  );
}
