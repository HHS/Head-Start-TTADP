import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import UserFeatureFlags from '../UserFeatureFlags';

describe('UserPermissions', () => {
  it('properly renders and calls the correct function', async () => {
    const features = [
      {
        value: 'first_feature',
        label: 'First feature',
      },
      {
        value: 'second_feature',
        label: 'Second feature',
      },
    ];

    const flags = ['First feature'];

    const onFeaturesChange = jest.fn();

    render(<UserFeatureFlags
      flags={flags}
      features={features}
      onFeaturesChange={onFeaturesChange}
    />);

    expect(screen.getByText(/advanced features/i)).toBeVisible();
    const firstCheck = await screen.findByRole('checkbox', { name: /first feature/i });
    expect(firstCheck).toBeVisible();
    const secondCheck = await screen.findByRole('checkbox', { name: /second feature/i });
    fireEvent.click(secondCheck);
    expect(onFeaturesChange).toHaveBeenCalled();
  });
});
