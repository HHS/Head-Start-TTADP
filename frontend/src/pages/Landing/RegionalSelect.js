/* eslint-disable react/forbid-prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Select, { components } from 'react-select';
import { Button } from '@trussworks/react-uswds';

import 'uswds/dist/css/uswds.css';
import '@trussworks/react-uswds/lib/index.css';
import './index.css';

import triangleDown from '../../images/triange_down.png';
import check from '../../images/check.svg';

const DropdownIndicator = (props) => (
  <components.DropdownIndicator {...props}>
    <img alt="" style={{ width: '22px' }} src={triangleDown} />
  </components.DropdownIndicator>
);

const Placeholder = (props) => <components.Placeholder {...props} />;

export const getUserOptions = (regions) => regions.map((region) => ({ value: region, label: `Region ${region}` })).sort((a, b) => a.value - b.value);

const styles = {
  container: (provided, state) => {
    // To match the focus indicator provided by uswds
    const outline = state.isFocused ? '0.25rem solid #2491ff;' : '';
    return {
      ...provided,
      outline,
    };
  },
  input: () => ({ display: 'none' }),
  control: (provided) => ({
    ...provided,
    borderColor: '#0166AB',
    backgroundColor: '#0166AB',
    borderRadius: '5px',
    paddingLeft: '5px',
    paddingTop: '4px',
    paddingBottom: '4px',
    whiteSpace: 'nowrap',
    color: 'white',
    minWidth: '140px',
    width: '120px',
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  menu: (provided) => ({
    ...provided,
    width: '200px',
  }),
  option: (provided, state) => ({
    ...provided,
    color: state.isSelected ? '#0166AB' : 'black',
    fontWeight: state.isSelected ? '700' : 'normal',
    backgroundColor: state.isSelected ? '#F8F8F8' : '#FFFFFF',
    padding: 11,
  }),
  singleValue: (provided) => {
    const single = { color: '#FFFFFF', fontWeight: 600 };

    return {
      ...provided, ...single,
    };
  },
  valueContainer: () => ({ padding: '10px 8px' }),
};

function RegionalSelect(props) {
  const {
    regions, onApply, hasCentralOffice,
  } = props;

  const [selectedItem, setSelectedItem] = useState();
  const [menuIsOpen, setMenuIsOpen] = useState(false);

  // const delayedCloseMenu = () => setTimeout(setMenuIsOpen(false), 1000);

  const CustomOption = (customOptionProps) => {
    const {
      data, innerRef, innerProps, isSelected,
    } = customOptionProps;
    return data.custom ? (
      <div ref={innerRef} {...innerProps}>
        <Button
          type="button"
          className="float-left margin-2 smart-hub--filter-button"
          onClick={() => {
            onApply(selectedItem);
            setMenuIsOpen(false);
          }}
        >
          Apply
        </Button>
      </div>
    ) : (
      <components.Option {...customOptionProps}>
        {data.label}
        {isSelected && (
          <img
            className="tta-smarthub--check"
            src={check}
            style={{
              width: 32,
              float: 'right',
              marginTop: '-9px ',
            }}
            alt={data.label}
          />
        )}
      </components.Option>
    );
  };

  CustomOption.propTypes = {
    data: PropTypes.shape({
      value: PropTypes.number,
      label: PropTypes.string,
    }).isRequired,
    innerRef: PropTypes.func.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    innerProps: PropTypes.object.isRequired,
  };

  let options = [...getUserOptions(regions), { custom: true }];

  if (hasCentralOffice) {
    options = [...getUserOptions(regions), { label: 'All Regions', value: 14 }, { custom: true }];
  }

  const getValue = () => {
    if (selectedItem) {
      return {
        value: selectedItem.value,
        label: selectedItem.label,
      };
    }

    if (hasCentralOffice) {
      return { label: 'All Regions', value: 14 };
    }

    return options[0];
  };

  return (
    <Select
      options={options}
      menuIsOpen={menuIsOpen}
      onChange={(value) => { if (value && value.value) setSelectedItem(value); }}
      onMenuOpen={() => setMenuIsOpen(true)}
      onBlur={() => setMenuIsOpen(false)}
      // onBlur={() => delayedCloseMenu()}
      name="RegionalSelect"
      defaultValue={hasCentralOffice ? { label: 'All Regions', value: 14 } : options[0]}
      value={getValue()}
      styles={styles}
      components={{ Placeholder, DropdownIndicator, Option: CustomOption }}
      placeholder="Select Region"
      closeMenuOnSelect={false}
      maxMenuHeight={600}
      className="ttahub-region-select"
    />
  );
}

RegionalSelect.propTypes = {
  regions: PropTypes.arrayOf(PropTypes.number).isRequired,
  onApply: PropTypes.func.isRequired,
  hasCentralOffice: PropTypes.bool,
};

RegionalSelect.defaultProps = {
  hasCentralOffice: false,
};

export default RegionalSelect;
