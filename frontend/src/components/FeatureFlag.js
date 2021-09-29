import PropTypes from 'prop-types';

export default function FeatureFlag({
  user, flag, admin, children,
}) {
  if (!admin && user.flags && !user.flags.includes(flag)) {
    return null;
  }
  return children;
}

FeatureFlag.propTypes = {
  flag: PropTypes.string.isRequired,
  admin: PropTypes.bool.isRequired,
  user: PropTypes.shape({
    flags: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
};
