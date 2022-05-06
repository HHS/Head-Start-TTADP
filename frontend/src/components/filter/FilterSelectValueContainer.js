/* eslint-disable no-console */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/prop-types */
import React from 'react';
// import PropTypes from 'prop-types';
import { ClassNames } from '@emotion/react';

const Svg = ({ size, ...props }) => (
  <svg
    height={size}
    width={size}
    viewBox="0 0 20 20"
    aria-hidden="true"
    focusable="false"
    css={{
      display: 'inline-block',
      fill: 'currentColor',
      lineHeight: 1,
      stroke: 'currentColor',
      strokeWidth: 0,
    }}
    {...props}
  />
);

export const CrossIcon = (props) => (
  <Svg size={20} {...props}>
    <path d="M14.348 14.849c-0.469 0.469-1.229 0.469-1.697 0l-2.651-3.030-2.651 3.029c-0.469 0.469-1.229 0.469-1.697 0-0.469-0.469-0.469-1.229 0-1.697l2.758-3.15-2.759-3.152c-0.469-0.469-0.469-1.228 0-1.697s1.228-0.469 1.697 0l2.652 3.031 2.651-3.031c0.469-0.469 1.228-0.469 1.697 0s0.469 1.229 0 1.697l-2.758 3.152 2.758 3.15c0.469 0.469 0.469 1.229 0 1.698z" />
  </Svg>
);

export const multiValueCSS = ({
  theme: { spacing, borderRadius, colors },
}) => ({
  label: 'multiValue',
  backgroundColor: colors.neutral10,
  borderRadius: borderRadius / 2,
  display: 'flex',
  margin: spacing.baseUnit / 2,
  minWidth: 0, // resolves flex/text-overflow bug
});

export const multiValueLabelCSS = ({
  theme: { borderRadius, colors },
  cropWithEllipsis,
}) => ({
  borderRadius: borderRadius / 2,
  color: colors.neutral80,
  fontSize: '85%',
  overflow: 'hidden',
  padding: 3,
  paddingLeft: 6,
  textOverflow: cropWithEllipsis ? 'ellipsis' : null,
  whiteSpace: 'nowrap',
});

export const multiValueRemoveCSS = ({
  theme: { spacing, borderRadius, colors },
  isFocused,
}) => ({
  alignItems: 'center',
  borderRadius: borderRadius / 2,
  backgroundColor: isFocused && colors.dangerLight,
  display: 'flex',
  paddingLeft: spacing.baseUnit,
  paddingRight: spacing.baseUnit,
  ':hover': {
    backgroundColor: colors.dangerLight,
    color: colors.danger,
  },
});

export function MultiValueRemove({
  children,
  innerProps,
}) {
  return <div {...innerProps}>{children}</div>;
}

const FilterSelectValueContainer = (props) => {
  const {
    children,
    className,
    components,
    cx,
    data,
    getStyles,
    innerProps,
    isFocused,
    isDisabled,
    removeProps,
    selectProps,
  } = props;

  const { Container, Label, Remove } = components;

  // start here
  console.log(isFocused);
  console.log(selectProps.value);

  return (
    <ClassNames>
      {({ css, cx: emotionCx }) => (
        <Container
          data={data}
          innerProps={{
            className: emotionCx(
              css(getStyles('multiValue', props)),
              cx(
                {
                  'multi-value': true,
                  'multi-value--is-disabled': isDisabled,
                },
                className,
              ),
            ),
            ...innerProps,
          }}
          selectProps={selectProps}
        >
          <Label
            data={data}
            innerProps={{
              className: emotionCx(
                css(getStyles('multiValueLabel', props)),
                cx(
                  {
                    'multi-value__label': true,
                  },
                  className,
                ),
              ),
            }}
            selectProps={selectProps}
          >
            {children}
          </Label>
          <Remove
            data={data}
            innerProps={{
              className: emotionCx(
                css(getStyles('multiValueRemove', props)),
                cx(
                  {
                    'multi-value__remove': true,
                  },
                  className,
                ),
              ),
              ...removeProps,
            }}
            selectProps={selectProps}
          />
        </Container>
      )}

    </ClassNames>
  );
};

FilterSelectValueContainer.defaultProps = {
  cropWithEllipsis: false,
};

export default FilterSelectValueContainer;
