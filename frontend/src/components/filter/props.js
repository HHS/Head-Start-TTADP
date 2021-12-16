/* eslint-disable import/prefer-default-export */
import PropTypes from 'prop-types';

export const filterSelectProps = {
  query: PropTypes.arrayOf(PropTypes.string),
  inputId: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
};
