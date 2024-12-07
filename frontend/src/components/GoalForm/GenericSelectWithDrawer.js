import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup, Label,
} from '@trussworks/react-uswds';
import Select from 'react-select';
import selectOptionsReset from '../selectOptionsReset';
import Drawer from '../Drawer';
import Req from '../Req';
import ContentFromFeedByTag from '../ContentFromFeedByTag';
import DrawerTriggerButton from '../DrawerTriggerButton';

export default function GenericSelectWithDrawer({
  error,
  name,
  options,
  validateValues,
  values,
  onChangeValues,
  inputName,
  isLoading,
}) {
  const drawerTriggerRef = useRef(null);
  if (options && options.length > 0) {
    options.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }
  const nameToLower = name ? name.toLowerCase() : '';

  return (
    <>
      <Drawer
        triggerRef={drawerTriggerRef}
        stickyHeader
        stickyFooter
        title={`${name} guidance`}
      >
        <ContentFromFeedByTag className={`ttahub-drawer--objective-${nameToLower}s-guidance`} tagName={`ttahub-${nameToLower}`} contentSelector="table" />
      </Drawer>
      <FormGroup error={error.props.children}>
        <div className="display-flex">
          <Label htmlFor={inputName}>
            <>
              {name}
              s
              {' '}
              <Req />
            </>
          </Label>
          <DrawerTriggerButton drawerTriggerRef={drawerTriggerRef}>
            Get help choosing
            {' '}
            {name}
            s
          </DrawerTriggerButton>
        </div>
        {error}
        <Select
          inputName={inputName}
          inputId={inputName}
          name={inputName}
          styles={selectOptionsReset}
          components={{
            DropdownIndicator: null,
          }}
          className="usa-select"
          isMulti
          options={options}
          onBlur={validateValues}
          value={values}
          onChange={onChangeValues}
          closeMenuOnSelect={false}
          isDisabled={isLoading}
          getOptionLabel={(option) => option.name}
          getOptionValue={(option) => option.id}
          required
        />
      </FormGroup>
    </>
  );
}

GenericSelectWithDrawer.propTypes = {
  name: PropTypes.string.isRequired,
  error: PropTypes.node.isRequired,
  options: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.number,
  })).isRequired,
  validateValues: PropTypes.func.isRequired,
  values: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.number,
  })).isRequired,
  onChangeValues: PropTypes.func.isRequired,
  inputName: PropTypes.string.isRequired,
  isLoading: PropTypes.bool,
};

GenericSelectWithDrawer.defaultProps = {
  isLoading: false,
};
