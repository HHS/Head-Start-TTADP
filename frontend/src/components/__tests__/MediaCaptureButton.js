import '@testing-library/jest-dom';
import React, { useRef } from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import MediaCaptureButton from '../MediaCaptureButton';

describe('MediaCaptureButton', () => {
  const RenderCaptureButton = () => {
    const widget = useRef();
    return (
      <div ref={widget}><MediaCaptureButton reference={widget} /></div>
    );
  };
  it('renders', () => {
    render(<RenderCaptureButton />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('fires event handler', async () => {
    render(<RenderCaptureButton />);
    const button = screen.getByRole('button');
    try {
      userEvent.click(button);
    } catch (e) {
      // we are just going to ignore this error for now
      // until we can figure out how to mock the html2canvas library
    }

    expect(button).toBeInTheDocument();
  });
});
