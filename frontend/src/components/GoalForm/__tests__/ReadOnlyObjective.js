import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import ReadOnlyObjective from '../ReadOnlyObjective';

describe('ReadOnlyObjective', () => {
  const renderReadOnlyObjective = (objective) => {
    render(<ReadOnlyObjective objective={objective} />);
  };

  it('doesnt fail no matter what', async () => {
    const objective = {
      title: 'Objective 1',
      topics: [],
      resources: [],
      ttaProvided: 'This is TTA provided',
      files: [
        {
          originalFileName: 'file1.pdf',
          url: {
            url: 'https://www.google.com',
            error: null,
          },
        },
        {
          originalFileName: 'file2.pdf',
          url: {
            url: 'https://www.google.com',
            error: true,
          },
        },
      ],
    };

    renderReadOnlyObjective(objective);
    expect(await screen.findByText('This is TTA provided')).toBeInTheDocument();
    expect(await screen.findByText('file1.pdf')).toBeInTheDocument();
    expect(await screen.findByText('Objective 1')).toBeInTheDocument();
  });
});
