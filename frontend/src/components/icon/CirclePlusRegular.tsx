import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon, type FontAwesomeIconProps } from '@fortawesome/react-fontawesome';
import React from 'react';

// Regular circle-plus from the existing Font Awesome bundle in public/regular.min.js.
const faCirclePlusRegular: IconDefinition = {
  prefix: 'far',
  iconName: 'circle-plus',
  icon: [
    512,
    512,
    ['plus-circle'],
    'f055',
    'M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM232 344c0 13.3 10.7 24 24 24s24-10.7 24-24V280h64c13.3 0 24-10.7 24-24s-10.7-24-24-24H280V168c0-13.3-10.7-24-24-24s-24 10.7-24 24v64H168c-13.3 0-24 10.7-24 24s10.7 24 24 24h64v64z',
  ],
};

export default function CirclePlusRegular(
  props: Omit<FontAwesomeIconProps, 'icon'>
): React.ReactElement {
  return <FontAwesomeIcon {...props} icon={faCirclePlusRegular} />;
}
