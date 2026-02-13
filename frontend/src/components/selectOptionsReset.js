// this is an importable config object for the react select/emotion
// to use this, give the select the "usa-select" classname and pass this as
// its style object, its meant to match the USDWS styles
import colors from '../colors'

const selectOptionsReset = {
  container: (provided, state) => {
    // To match the focus indicator provided by uswds
    const outline = state.isFocused ? '0.25rem solid #2491ff;' : ''
    return {
      ...provided,
      outline,
      padding: 0,
      height: 'auto',
    }
  },
  groupHeading: (provided) => ({
    ...provided,
    fontWeight: 'bold',
    textTransform: 'capitalize',
    fontSize: '14px',
    color: colors.smartHubTextInk,
    lineHeight: '22px',
  }),
  control: (provided, state) => {
    const selected = state.getValue()
    return {
      ...provided,
      background: state.isFocused || selected.length ? 'white' : 'transparent',
      border: 'none',
      borderRadius: 0,
      boxShadow: '0',
      // Match uswds disabled style
      opacity: state.isDisabled ? '0.7' : '1',
    }
  },
  indicatorsContainer: (provided, state) => ({
    ...provided,
    display: state.isFocused ? 'inline' : 'none',
    // The arrow dropdown icon is too far to the right, this pushes it back to the left
    marginRight: '4px',
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  menu: (provided) => ({
    ...provided,
    zIndex: 2,
  }),
  multiValue: (provided) => ({ ...provided }),
  multiValueLabel: (provided) => ({ ...provided }),
  valueContainer: (provided) => ({
    ...provided,
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    '&:hover': {
      color: '#1B1B1B',
    },
  }),
}

export default selectOptionsReset
