import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import WidgetContainerSubtitle from '../WidgetContainerSubtitle';

describe('WidgetContainerSubtitle', () => {
  it('applies the default margin-y class when customCss is not provided', () => {
    render(
      <WidgetContainerSubtitle marginY={2}>
        Default subtitle
      </WidgetContainerSubtitle>,
    );

    const subtitle = screen.getByText('Default subtitle');
    expect(subtitle).toHaveClass('smart-hub-widget--subtitle');
    expect(subtitle).toHaveClass('margin-y-2');
  });

  it('does not apply the default margin-y class when customCss is provided', () => {
    render(
      <WidgetContainerSubtitle marginY={2} customCss="margin-bottom-1 margin-top-0">
        Custom subtitle
      </WidgetContainerSubtitle>,
    );

    const subtitle = screen.getByText('Custom subtitle');
    expect(subtitle).toHaveClass('smart-hub-widget--subtitle');
    expect(subtitle).toHaveClass('margin-bottom-1');
    expect(subtitle).toHaveClass('margin-top-0');
    expect(subtitle).not.toHaveClass('margin-y-2');
  });
});
