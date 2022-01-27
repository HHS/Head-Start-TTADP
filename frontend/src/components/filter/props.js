import PropTypes from 'prop-types';

export const filterSelectProps = {
  query: PropTypes.arrayOf(PropTypes.string),
  inputId: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
};

export const filterConfigProp = PropTypes.shape({
  id: PropTypes.string,
  display: PropTypes.string,
  conditions: PropTypes.shape({
    Is: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.arrayOf(PropTypes.string),
    ]),
    'Is not': PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.arrayOf(PropTypes.string),
    ]),
    Contains: PropTypes.string,
    'Does not contain': PropTypes.string,
  }),
  defaultValues: {
    'Is within': PropTypes.string,
    'Is after': PropTypes.string,
    'Is before': PropTypes.string,
    In: PropTypes.string,
  },
  displayQuery: PropTypes.func,
  renderInput: PropTypes.func,
});

// save this to cut down on repeated boilerplate in PropTypes
export const filterProp = PropTypes.shape({
  topic: PropTypes.string,
  condition: PropTypes.string,
  query: PropTypes.oneOfType([
    PropTypes.string, PropTypes.arrayOf(PropTypes.string), PropTypes.number,
  ]),
  id: PropTypes.string,
});
