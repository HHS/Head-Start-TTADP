import '@testing-library/jest-dom';
import React from 'react';
import PropTypes from 'prop-types';
import { render, screen, waitFor } from '@testing-library/react';
import useFetch from '../useFetch';
import AppLoadingContext from '../../AppLoadingContext';

const TestComponent = ({
  fetcher, dependencies, initialValue, errorMessage, useAppLoading,
}) => {
  const {
    data, error, loading, statusCode,
  } = useFetch(initialValue, fetcher, dependencies, errorMessage, useAppLoading);

  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="data">{JSON.stringify(data)}</div>
      <div data-testid="error">{error}</div>
      <div data-testid="statusCode">{statusCode}</div>
    </div>
  );
};

TestComponent.propTypes = {
  fetcher: PropTypes.func.isRequired,
  dependencies: PropTypes.arrayOf(
    PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.object]),
  ).isRequired,
  initialValue: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.array,
    PropTypes.string,
    PropTypes.number,
  ]),
  errorMessage: PropTypes.string,
  useAppLoading: PropTypes.bool,
};

TestComponent.defaultProps = {
  initialValue: null,
  errorMessage: undefined,
  useAppLoading: false,
};

describe('useFetch', () => {
  const renderWithContext = (component, setIsAppLoading = jest.fn()) => render(
    <AppLoadingContext.Provider value={{ isAppLoading: false, setIsAppLoading }}>
      {component}
    </AppLoadingContext.Provider>,
  );

  it('loading starts as true', () => {
    const fetcher = jest.fn(() => Promise.resolve({ result: 'success' }));
    renderWithContext(<TestComponent fetcher={fetcher} initialValue={null} dependencies={[]} />);

    const loading = screen.getByTestId('loading');
    expect(loading).toHaveTextContent('loading');
  });

  it('loading becomes false after successful fetch', async () => {
    const fetcher = jest.fn(() => Promise.resolve({ result: 'success' }));
    renderWithContext(<TestComponent fetcher={fetcher} initialValue={null} dependencies={[]} />);

    await waitFor(() => {
      const loading = screen.getByTestId('loading');
      expect(loading).toHaveTextContent('not-loading');
    });
  });

  it('loading becomes false after failed fetch', async () => {
    const fetcher = jest.fn(() => Promise.reject(new Error('Failed')));
    renderWithContext(<TestComponent fetcher={fetcher} initialValue={null} dependencies={[]} />);

    await waitFor(() => {
      const loading = screen.getByTestId('loading');
      expect(loading).toHaveTextContent('not-loading');
    });
  });

  it('sets data correctly on successful fetch', async () => {
    const mockData = { result: 'success', count: 42 };
    const fetcher = jest.fn(() => Promise.resolve(mockData));
    renderWithContext(<TestComponent fetcher={fetcher} initialValue={null} dependencies={[]} />);

    await waitFor(() => {
      const data = screen.getByTestId('data');
      expect(data).toHaveTextContent(JSON.stringify(mockData));
    });
  });

  it('sets statusCode to 200 on successful fetch', async () => {
    const fetcher = jest.fn(() => Promise.resolve({ result: 'success' }));
    renderWithContext(<TestComponent fetcher={fetcher} initialValue={null} dependencies={[]} />);

    await waitFor(() => {
      const statusCode = screen.getByTestId('statusCode');
      expect(statusCode).toHaveTextContent('200');
    });
  });

  it('sets error message on failed fetch', async () => {
    const fetcher = jest.fn(() => Promise.reject(new Error('Failed')));
    const errorMessage = 'Custom error message';
    renderWithContext(
      <TestComponent
        fetcher={fetcher}
        initialValue={null}
        dependencies={[]}
        errorMessage={errorMessage}
      />,
    );

    await waitFor(() => {
      const error = screen.getByTestId('error');
      expect(error).toHaveTextContent(errorMessage);
    });
  });

  it('sets statusCode to error.status on failed fetch with status', async () => {
    const errorWithStatus = new Error('Not Found');
    errorWithStatus.status = 404;
    const fetcher = jest.fn(() => Promise.reject(errorWithStatus));
    renderWithContext(<TestComponent fetcher={fetcher} initialValue={null} dependencies={[]} />);

    await waitFor(() => {
      const statusCode = screen.getByTestId('statusCode');
      expect(statusCode).toHaveTextContent('404');
    });
  });

  it('sets statusCode to 500 on failed fetch without status', async () => {
    const fetcher = jest.fn(() => Promise.reject(new Error('Server error')));
    renderWithContext(<TestComponent fetcher={fetcher} initialValue={null} dependencies={[]} />);

    await waitFor(() => {
      const statusCode = screen.getByTestId('statusCode');
      expect(statusCode).toHaveTextContent('500');
    });
  });

  it('uses initialValue before fetch completes', () => {
    const initialValue = { initial: true };
    const fetcher = jest.fn(() => new Promise((resolve) => setTimeout(() => resolve({ result: 'success' }), 100)));
    renderWithContext(<TestComponent
      fetcher={fetcher}
      initialValue={initialValue}
      dependencies={[]}
    />);

    const data = screen.getByTestId('data');
    expect(data).toHaveTextContent(JSON.stringify(initialValue));
  });

  it('clears error on successful fetch after previous error', async () => {
    let shouldFail = true;
    const fetcher = jest.fn(() => {
      if (shouldFail) {
        return Promise.reject(new Error('Failed'));
      }
      return Promise.resolve({ result: 'success' });
    });

    const { rerender } = renderWithContext(
      <TestComponent fetcher={fetcher} initialValue={null} dependencies={[1]} />,
    );

    // Wait for first fetch to fail
    await waitFor(() => {
      const error = screen.getByTestId('error');
      expect(error).toHaveTextContent('An unexpected error occurred');
    });

    // Change dependency to trigger new fetch that succeeds
    shouldFail = false;
    rerender(
      <AppLoadingContext.Provider value={{ isAppLoading: false, setIsAppLoading: jest.fn() }}>
        <TestComponent fetcher={fetcher} initialValue={null} dependencies={[2]} />
      </AppLoadingContext.Provider>,
    );

    // Wait for error to be cleared
    await waitFor(() => {
      const error = screen.getByTestId('error');
      expect(error).toHaveTextContent('');
    });
  });

  it('calls fetcher when dependencies change', async () => {
    const fetcher = jest.fn(() => Promise.resolve({ result: 'success' }));
    const { rerender } = renderWithContext(
      <TestComponent fetcher={fetcher} initialValue={null} dependencies={[1]} />,
    );

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    // Change dependency
    rerender(
      <AppLoadingContext.Provider value={{ isAppLoading: false, setIsAppLoading: jest.fn() }}>
        <TestComponent fetcher={fetcher} initialValue={null} dependencies={[2]} />
      </AppLoadingContext.Provider>,
    );

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });

  it('calls setIsAppLoading when useAppLoading is true', async () => {
    const setIsAppLoading = jest.fn();
    const fetcher = jest.fn(() => Promise.resolve({ result: 'success' }));
    renderWithContext(
      <TestComponent fetcher={fetcher} initialValue={null} dependencies={[]} useAppLoading />,
      setIsAppLoading,
    );

    await waitFor(() => {
      expect(setIsAppLoading).toHaveBeenCalledWith(true);
      expect(setIsAppLoading).toHaveBeenCalledWith(false);
    });
  });

  it('does not call setIsAppLoading when useAppLoading is false', async () => {
    const setIsAppLoading = jest.fn();
    const fetcher = jest.fn(() => Promise.resolve({ result: 'success' }));
    renderWithContext(
      <TestComponent
        fetcher={fetcher}
        initialValue={null}
        dependencies={[]}
        useAppLoading={false}
      />,
      setIsAppLoading,
    );

    await waitFor(() => {
      const loading = screen.getByTestId('loading');
      expect(loading).toHaveTextContent('not-loading');
    });

    expect(setIsAppLoading).not.toHaveBeenCalled();
  });

  it('calls setIsAppLoading(false) even when fetch fails and useAppLoading is true', async () => {
    const setIsAppLoading = jest.fn();
    const fetcher = jest.fn(() => Promise.reject(new Error('Failed')));
    renderWithContext(
      <TestComponent fetcher={fetcher} initialValue={null} dependencies={[]} useAppLoading />,
      setIsAppLoading,
    );

    await waitFor(() => {
      expect(setIsAppLoading).toHaveBeenCalledWith(true);
      expect(setIsAppLoading).toHaveBeenCalledWith(false);
    });
  });
});
