import { renderHook } from '@testing-library/react-hooks';
import useWidgetMenuItems from '../useWidgetMenuItems';

describe('useWidgetMenuItems', () => {
  it('should return menu items', () => {
    const { result } = renderHook(() => useWidgetMenuItems(
      false,
      jest.fn(),
      jest.fn(),
      {},
      jest.fn(),
    ));

    const menuItems = result.current;
    expect(menuItems).toEqual([
      {
        label: 'Display table',
        onClick: expect.any(Function),
      },
      {
        label: 'Save screenshot',
        onClick: expect.any(Function),
      },
    ]);
  });

  it('should display menu items for tabular data', () => {
    const { result } = renderHook(() => useWidgetMenuItems(
      true,
      jest.fn(),
      jest.fn(),
      {},
      jest.fn(),
    ));

    const menuItems = result.current;
    expect(menuItems).toEqual([
      {
        label: 'Display graph',
        onClick: expect.any(Function),
      },
      {
        label: 'Export table',
        onClick: expect.any(Function),
      },
    ]);
  });

  it('should display menu items for selected rows', () => {
    const { result } = renderHook(() => useWidgetMenuItems(
      true,
      jest.fn(),
      jest.fn(),
      { 1: true },
      jest.fn(),
    ));

    const menuItems = result.current;
    expect(menuItems).toEqual([
      {
        label: 'Display graph',
        onClick: expect.any(Function),
      },
      {
        label: 'Export table',
        onClick: expect.any(Function),
      },
      {
        label: 'Export selected rows',
        onClick: expect.any(Function),
      },
    ]);
  });
});
