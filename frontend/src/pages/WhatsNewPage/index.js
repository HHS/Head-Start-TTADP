import PropTypes from 'prop-types';
import React from 'react';
import { useLocation } from 'react-router-dom';
import BackLink from '../../components/BackLink';
import WhatsNew from './components/WhatsNew';

export default function WhatsNewPage({ notifications }) {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const referrer = params.get('referrer');

  return (
    <div>
      {referrer && <BackLink to={decodeURIComponent(referrer)}>Back</BackLink>}
      <h1 className="landing margin-top-0 margin-bottom-3">What's New</h1>
      <WhatsNew data={notifications?.whatsNew ?? null} />
    </div>
  );
}

WhatsNewPage.propTypes = {
  notifications: PropTypes.shape({
    whatsNew: PropTypes.string,
  }),
};

WhatsNewPage.defaultProps = {
  notifications: { whatsNew: null },
};
