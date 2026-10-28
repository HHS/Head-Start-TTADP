import { act, renderHook } from '@testing-library/react-hooks';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router-dom';
import useNavigationPromptModal from './useNavigationPromptModal';

describe('useNavigationPromptModal', () => {
  const renderPrompt = ({
    when = true,
    onSave = jest.fn().mockResolvedValue(true),
    initialEntries = ['/preferences'],
  }: {
    when?: boolean;
    onSave?: () => Promise<boolean>;
    initialEntries?: string[];
  } = {}) => {
    const history = createMemoryHistory({ initialEntries });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Router history={history}>{children}</Router>
    );
    const hook = renderHook(() => useNavigationPromptModal({ when, onSave }), { wrapper });

    return { ...hook, history, onSave };
  };

  it('blocks dirty navigation until the user chooses to continue', () => {
    const { result, history } = renderPrompt();

    act(() => {
      history.push('/next');
    });

    expect(result.current.isOpen).toBe(true);
    expect(history.location.pathname).toBe('/preferences');

    act(() => {
      result.current.continueWithoutSaving();
    });

    expect(history.location.pathname).toBe('/next');
    expect(result.current.isOpen).toBe(false);
  });

  it('continues a blocked Back or Forward by pushing the destination', () => {
    const { result, history } = renderPrompt({
      initialEntries: ['/previous', '/preferences', '/forward'],
    });
    // createMemoryHistory starts at the first entry; move to /preferences unblocked
    act(() => {
      result.current.bypassOnce();
      history.go(1);
    });

    act(() => {
      history.goForward();
    });

    expect(result.current.isOpen).toBe(true);
    expect(history.location.pathname).toBe('/preferences');

    act(() => {
      result.current.continueWithoutSaving();
    });

    expect(history.location.pathname).toBe('/forward');
    expect(history.action).toBe('PUSH');
  });

  it('replays a blocked replace as a replace', () => {
    const { result, history } = renderPrompt({ initialEntries: ['/previous', '/preferences'] });

    act(() => {
      history.replace('/next');
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.continueWithoutSaving();
    });

    expect(history.location.pathname).toBe('/next');
    expect(history.length).toBe(2);
  });

  it('allows pristine navigation without opening the modal', () => {
    const { result, history } = renderPrompt({ when: false });

    act(() => {
      history.push('/next');
    });

    expect(history.location.pathname).toBe('/next');
    expect(result.current.isOpen).toBe(false);
  });

  it('allows a one-time navigation bypass', () => {
    const { result, history } = renderPrompt();

    act(() => {
      result.current.bypassOnce();
      history.push('/notifications');
    });

    expect(history.location.pathname).toBe('/notifications');
    expect(result.current.isOpen).toBe(false);
  });

  it('dismisses the prompt without navigating', () => {
    const { result, history } = renderPrompt();

    act(() => {
      history.push('/next');
    });

    act(() => {
      result.current.dismiss();
    });

    expect(history.location.pathname).toBe('/preferences');
    expect(result.current.isOpen).toBe(false);
  });

  it('allows logout navigation without prompting', () => {
    const { result, history } = renderPrompt();

    act(() => {
      history.push('/logout');
    });

    expect(history.location.pathname).toBe('/logout');
    expect(result.current.isOpen).toBe(false);
  });

  it('stays on the page and closes the modal when saving fails', async () => {
    const onSave = jest.fn().mockResolvedValue(false);
    const { result, history } = renderPrompt({ onSave });

    act(() => {
      history.push('/next');
    });

    await act(async () => {
      await result.current.saveAndContinue();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(history.location.pathname).toBe('/preferences');
    expect(result.current.isOpen).toBe(false);
  });

  it('saves before continuing to the pending destination', async () => {
    const onSave = jest.fn().mockResolvedValue(true);
    const { result, history } = renderPrompt({ onSave });

    act(() => {
      history.push('/next');
    });

    await act(async () => {
      await result.current.saveAndContinue();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(history.location.pathname).toBe('/next');
  });
});
