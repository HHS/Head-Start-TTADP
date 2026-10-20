import PropTypes from 'prop-types';
import React from 'react';
import { useLocation } from 'react-router-dom';
import BackLink from '../../components/BackLink';
import WhatsNew from './components/WhatsNew';

// Defensively decode a referrer query param and allow only in-app paths.
// Returns the decoded string when it is a safe relative path (starts with `/`
// but not `//` or `/\`, which browsers/routers may treat as protocol-relative
// or absolute URLs), otherwise returns null.
function getSafeReferrer(rawReferrer) {
  if (typeof rawReferrer !== 'string' || rawReferrer.length === 0) {
    return null;
  }

  let decoded;
  try {
    decoded = decodeURIComponent(rawReferrer);
  } catch (e) {
    return null;
  }

  if (decoded.length < 2 || decoded.charAt(0) !== '/') {
    return null;
  }

  const second = decoded.charAt(1);
  if (second === '/' || second === '\\') {
    return null;
  }

  return decoded;
}

export default function WhatsNewPage({ notifications }) {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const referrer = getSafeReferrer(params.get('referrer'));

  return (
    <div>
      {referrer && <BackLink to={referrer}>Back</BackLink>}
      <h1 className="landing margin-top-0 margin-bottom-3">What's New</h1>
      <WhatsNew data={notifications?.whatsNew ?? null} />
    </div>
  );
}

WhatsNewPage.propTypes = {
  notifications: PropTypes.shape({
    whatsNew: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  }),
};

WhatsNewPage.defaultProps = {
  notifications: { whatsNew: null },
};
