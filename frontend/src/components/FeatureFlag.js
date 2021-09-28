import PropTypes from 'prop-types';

export default function FeatureFlag({ user, flag, children }) {
  if (user.flags && !user.flags.includes(flag)) {
    return null;
  }
  return children;
}

FeatureFlag.propTypes = {
  flag: PropTypes.string.isRequired,
  user: PropTypes.shape({
    flags: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
};
