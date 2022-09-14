import '@testing-library/jest-dom';
import {
  render,
  screen,
} from '@testing-library/react';
import React from 'react';
import ObjectiveSelect from '../ObjectiveSelect';

const RenderObjectiveSelect = ({
  // eslint-disable-next-line react/prop-types
  selectedObjectives, options, onRemove = () => {},
}) => (
  <ObjectiveSelect
    onChange={() => {}}
    selectedObjectives={selectedObjectives}
    options={options}
    onRemove={onRemove}
  />
);

describe('ObjectiveSelect', () => {
  it('renders', async () => {
    render(<RenderObjectiveSelect
      options={[]}
      selectedObjectives={[]}
    />);
    expect(screen.getByText('Objective summary')).toBeInTheDocument();
  });

  it('renders the remove button', async () => {
    render(<RenderObjectiveSelect
      options={[]}
      selectedObjectives={[]}
      onRemove={() => {}}
    />);
    expect(screen.getByText('Remove this objective')).toBeInTheDocument();
  });

  it('clicking the remove button shows a modal', async () => {
    render(<RenderObjectiveSelect
      options={[]}
      selectedObjectives={[]}
      onRemove={() => {}}
    />);
    expect(screen.getByTestId('modalOverlay').parentElement).toHaveClass('is-hidden');
    screen.getByText('Remove this objective').click();
    expect(screen.getByTestId('modalOverlay').parentElement).not.toHaveClass('is-hidden');
  });
});
