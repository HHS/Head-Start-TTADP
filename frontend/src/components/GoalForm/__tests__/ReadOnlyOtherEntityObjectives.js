import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReadOnlyOtherEntityObjectives from '../ReadOnlyOtherEntityObjectives';

const createdObjectives = [{
  title: 'Sample Objective 1',
  topics: [],
  resources: [],
  files: [{ originalFileName: 'test1.txt' },
    { originalFileName: 'test2.txt' }],
  ttaProvided: '<p>sample tta provided</p>',
  status: '',
},
{
  title: 'Sample Objective 2',
  topics: [],
  resources: [],
  files: [],
  ttaProvided: '<p>sample 2 tta provided</p>',
  status: '',
},
];

// eslint-disable-next-line react/prop-types
const RenderReadOnlyObjective = (onEdit = jest.fn(), hideEdit = false) => (
  render(<ReadOnlyOtherEntityObjectives
    onEdit={onEdit}
    objectives={createdObjectives}
    hideEdit={hideEdit}
  />)
);

describe('ReadOnlyObjective', () => {
  it('can render with objectives', async () => {
    RenderReadOnlyObjective();
    expect(screen.queryAllByRole('heading', { name: /objective summary/i }).length).toBe(2);
    expect(await screen.findByText('Sample Objective 1')).toBeVisible();
    expect(await screen.findByText('test1.txt')).toBeVisible();
    expect(await screen.findByText('test2.txt')).toBeVisible();
    expect(await screen.findByText('sample tta provided')).toBeVisible();
    expect(await screen.findByText('Sample Objective 2')).toBeVisible();
    expect(await screen.findByText('sample 2 tta provided')).toBeVisible();
  });

  it('hides the context menu', async () => {
    RenderReadOnlyObjective(jest.fn(), true);
    expect(screen.queryAllByRole('button', { name: /actions for objectives/i }).length).toBe(0);
  });

  it('edits the objective', async () => {
    const editObjective = jest.fn();
    RenderReadOnlyObjective(editObjective);
    const context = await screen.findByRole('button', { name: /actions for objectives/i });
    userEvent.click(context);
    const [button] = await screen.findAllByRole('button', { name: 'Edit' });
    act(() => userEvent.click(button));
    expect(editObjective).toHaveBeenCalled();
  });
});
