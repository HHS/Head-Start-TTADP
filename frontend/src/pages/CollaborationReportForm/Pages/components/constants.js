import PropTypes from 'prop-types';

const reviewPagePropType = {
  hasIncompletePages: PropTypes.bool.isRequired,
  incompletePage: PropTypes.arrayOf(PropTypes.string).isRequired,
};

// eslint-disable-next-line import/prefer-default-export
export { reviewPagePropType };
