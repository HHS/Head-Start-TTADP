import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import ReadOnlyObjective from '../ReadOnlyObjective';

const createdObjective = {
  title: 'Sample Objective',
  topics: [],
  resources: [],
  files: [{ originalFileName: 'test1.txt' },
    { originalFileName: 'test2.txt' }],
  roles: [],
  ttaProvided: '<p>sample tta provided</p>',
  status: '',
};

// eslint-disable-next-line react/prop-types
const RenderReadOnlyObjective = () => (
  <ReadOnlyObjective objective={createdObjective} />
);

describe('ReadOnlyObjective', () => {
  it('can render with a objective', async () => {
    render(<RenderReadOnlyObjective />);
    expect(await screen.findByRole('heading', { name: /objective summary/i })).toBeVisible();
    expect(await screen.findByText('Sample Objective')).toBeVisible();
    expect(await screen.findByText('test1.txt')).toBeVisible();
    expect(await screen.findByText('test2.txt')).toBeVisible();
    expect(await screen.findByText('sample tta provided')).toBeVisible();
  });
});
