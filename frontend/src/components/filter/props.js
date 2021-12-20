import PropTypes from 'prop-types';

export const filterSelectProps = {
  query: PropTypes.arrayOf(PropTypes.string),
  inputId: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
};

// save this to cut down on repeated boilerplate in PropTypes
export const filterProp = PropTypes.shape({
  topic: PropTypes.string,
  condition: PropTypes.string,
  query: PropTypes.oneOfType([
    PropTypes.string, PropTypes.arrayOf(PropTypes.string), PropTypes.number,
  ]),
  id: PropTypes.string,
});
