import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup, Label,
} from '@trussworks/react-uswds';
import Select from 'react-select';
import selectOptionsReset from '../selectOptionsReset';
import Drawer from '../Drawer';
import Req from '../Req';
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
  hint,

  // drawer props
  drawerButtonText,
  drawerContent,
  drawerTitle,
}) {
  const drawerTriggerRef = useRef(null);
  if (options && options.length > 0) {
    options.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  return (
    <>
      <Drawer
        triggerRef={drawerTriggerRef}
        stickyHeader
        stickyFooter
        title={drawerTitle}
      >
        {drawerContent}
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
            {drawerButtonText}
          </DrawerTriggerButton>
        </div>
        {hint && (
          <>
            <span className="usa-hint">{hint}</span>
            <br />
          </>
        )}
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
  hint: PropTypes.string,
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
  drawerButtonText: PropTypes.string.isRequired,
  drawerContent: PropTypes.node.isRequired,
  drawerTitle: PropTypes.string.isRequired,
};

GenericSelectWithDrawer.defaultProps = {
  isLoading: false,
  hint: '',
};
