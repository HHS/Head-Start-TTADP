import { renderHook, act } from '@testing-library/react-hooks';
import useCheckboxSelection from '../useCheckboxSelection';

const makeCheckEvent = (value, checked) => ({ target: { value, checked } });

const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
const getItemId = (item) => String(item.id);

describe('useCheckboxSelection', () => {
  // 1. Initial state
  describe('initial state', () => {
    it('starts with nothing selected', () => {
      const { result } = renderHook(() => useCheckboxSelection({ items, getItemId }));
      expect(result.current.selectedCheckboxes).toEqual({});
    });

    it('allPageChecked is false initially', () => {
      const { result } = renderHook(() => useCheckboxSelection({ items, getItemId }));
      expect(result.current.allPageChecked).toBe(false);
    });

    it('numberOfSelected is 0 initially', () => {
      const { result } = renderHook(() => useCheckboxSelection({ items, getItemId }));
      expect(result.current.numberOfSelected).toBe(0);
    });
  });

  // 2. Individual selection
  describe('handleCheckboxSelect', () => {
    it('selects a single item via handleCheckboxSelect', () => {
      const { result } = renderHook(() => useCheckboxSelection({ items, getItemId }));

      act(() => {
        result.current.handleCheckboxSelect(makeCheckEvent('1', true));
      });

      expect(result.current.isChecked('1')).toBe(true);
      expect(result.current.numberOfSelected).toBe(1);
    });

    it('deselects a single item via handleCheckboxSelect', () => {
      const { result } = renderHook(() => useCheckboxSelection({ items, getItemId }));

      act(() => {
        result.current.handleCheckboxSelect(makeCheckEvent('1', true));
      });
      act(() => {
        result.current.handleCheckboxSelect(makeCheckEvent('1', false));
      });

      expect(result.current.isChecked('1')).toBe(false);
      expect(result.current.numberOfSelected).toBe(0);
    });

    it('selectedIds reflects selected items', () => {
      const { result } = renderHook(() => useCheckboxSelection({ items, getItemId }));

      act(() => {
        result.current.handleCheckboxSelect(makeCheckEvent('2', true));
        result.current.handleCheckboxSelect(makeCheckEvent('3', true));
      });

      expect(result.current.selectedIds).toEqual(expect.arrayContaining(['2', '3']));
      expect(result.current.selectedIds).toHaveLength(2);
    });

    it('isChecked returns true for selected item and false for unselected', () => {
      const { result } = renderHook(() => useCheckboxSelection({ items, getItemId }));

      act(() => {
        result.current.handleCheckboxSelect(makeCheckEvent('1', true));
      });

      expect(result.current.isChecked('1')).toBe(true);
      expect(result.current.isChecked('2')).toBe(false);
      expect(result.current.isChecked('3')).toBe(false);
    });
  });

  // 3. Page select-all
  describe('handleSelectAllPage', () => {
    it('handleSelectAllPage with checked=true selects all page items', () => {
      const { result } = renderHook(() => useCheckboxSelection({ items, getItemId }));

      act(() => {
        result.current.handleSelectAllPage({ target: { checked: true } });
      });

      expect(result.current.isChecked('1')).toBe(true);
      expect(result.current.isChecked('2')).toBe(true);
      expect(result.current.isChecked('3')).toBe(true);
    });

    it('handleSelectAllPage with checked=false deselects all page items', () => {
      const { result } = renderHook(() => useCheckboxSelection({ items, getItemId }));

      act(() => {
        result.current.handleSelectAllPage({ target: { checked: true } });
      });
      act(() => {
        result.current.handleSelectAllPage({ target: { checked: false } });
      });

      expect(result.current.isChecked('1')).toBe(false);
      expect(result.current.isChecked('2')).toBe(false);
      expect(result.current.isChecked('3')).toBe(false);
    });

    it('handleSelectAllPage preserves selections on other pages', () => {
      const pageOneItems = [{ id: 1 }, { id: 2 }];
      const pageTwoItems = [{ id: 3 }, { id: 4 }];

      // Simulate page 1 with all selected
      const { result, rerender } = renderHook(
        ({ currentItems }) => useCheckboxSelection({ items: currentItems, getItemId }),
        { initialProps: { currentItems: pageOneItems } },
      );

      act(() => {
        result.current.handleSelectAllPage({ target: { checked: true } });
      });

      expect(result.current.isChecked('1')).toBe(true);
      expect(result.current.isChecked('2')).toBe(true);

      // Switch to page 2
      rerender({ currentItems: pageTwoItems });

      act(() => {
        result.current.handleSelectAllPage({ target: { checked: true } });
      });

      expect(result.current.isChecked('3')).toBe(true);
      expect(result.current.isChecked('4')).toBe(true);

      // Page 1 selections should still be intact
      expect(result.current.isChecked('1')).toBe(true);
      expect(result.current.isChecked('2')).toBe(true);
    });
  });

  // 4. allPageChecked
  describe('allPageChecked', () => {
    it('allPageChecked becomes true when all page items are selected', () => {
      const { result } = renderHook(() => useCheckboxSelection({ items, getItemId }));

      act(() => {
        result.current.handleCheckboxSelect(makeCheckEvent('1', true));
        result.current.handleCheckboxSelect(makeCheckEvent('2', true));
        result.current.handleCheckboxSelect(makeCheckEvent('3', true));
      });

      expect(result.current.allPageChecked).toBe(true);
    });

    it('allPageChecked becomes false when any page item is deselected', () => {
      const { result } = renderHook(() => useCheckboxSelection({ items, getItemId }));

      act(() => {
        result.current.handleSelectAllPage({ target: { checked: true } });
      });
      act(() => {
        result.current.handleCheckboxSelect(makeCheckEvent('2', false));
      });

      expect(result.current.allPageChecked).toBe(false);
    });

    it('allPageChecked is false when items array is empty', () => {
      const { result } = renderHook(() => useCheckboxSelection({ items: [], getItemId }));
      expect(result.current.allPageChecked).toBe(false);
    });
  });

  // 5. Cross-page select-all (selectOrClearAll)
  describe('selectOrClearAll', () => {
    it('selectOrClearAll(false) selects all allItemIds', () => {
      const allItemIds = ['1', '2', '3', '4', '5'];
      const { result } = renderHook(() => useCheckboxSelection({ items, allItemIds, getItemId }));

      act(() => {
        result.current.selectOrClearAll(false);
      });

      allItemIds.forEach((id) => {
        expect(result.current.isChecked(id)).toBe(true);
      });
      expect(result.current.numberOfSelected).toBe(5);
    });

    it('selectOrClearAll(true) clears all selections', () => {
      const allItemIds = ['1', '2', '3', '4', '5'];
      const { result } = renderHook(() => useCheckboxSelection({ items, allItemIds, getItemId }));

      act(() => {
        result.current.selectOrClearAll(false);
      });
      act(() => {
        result.current.selectOrClearAll(true);
      });

      expect(result.current.numberOfSelected).toBe(0);
      expect(result.current.selectedIds).toHaveLength(0);
    });
  });

  // 6. pageSelectedIds
  describe('pageSelectedIds', () => {
    it('pageSelectedIds only includes IDs from current page that are selected', () => {
      const { result } = renderHook(() => useCheckboxSelection({ items, getItemId }));

      act(() => {
        result.current.handleCheckboxSelect(makeCheckEvent('1', true));
        result.current.handleCheckboxSelect(makeCheckEvent('3', true));
      });

      expect(result.current.pageSelectedIds).toEqual(expect.arrayContaining(['1', '3']));
      expect(result.current.pageSelectedIds).toHaveLength(2);
      expect(result.current.pageSelectedIds).not.toContain('2');
    });

    it('pageSelectedIds does not include selected IDs from other pages', () => {
      const pageOneItems = [{ id: 1 }, { id: 2 }];
      const pageTwoItems = [{ id: 3 }, { id: 4 }];

      const { result, rerender } = renderHook(
        ({ currentItems }) => useCheckboxSelection({ items: currentItems, getItemId }),
        { initialProps: { currentItems: pageOneItems } },
      );

      // Select all on page 1
      act(() => {
        result.current.handleSelectAllPage({ target: { checked: true } });
      });

      // Switch to page 2
      rerender({ currentItems: pageTwoItems });

      // Only page 2 IDs should be in pageSelectedIds
      expect(result.current.pageSelectedIds).not.toContain('1');
      expect(result.current.pageSelectedIds).not.toContain('2');
    });
  });

  // 7. getIdsForAction
  describe('getIdsForAction', () => {
    it('getIdsForAction returns selectedIds when items are selected', () => {
      const { result } = renderHook(() => useCheckboxSelection({ items, getItemId }));

      act(() => {
        result.current.handleCheckboxSelect(makeCheckEvent('2', true));
      });

      expect(result.current.getIdsForAction()).toEqual(['2']);
    });

    it('getIdsForAction falls back to all page item IDs when nothing selected', () => {
      const { result } = renderHook(() => useCheckboxSelection({ items, getItemId }));

      const ids = result.current.getIdsForAction();
      expect(ids).toEqual(expect.arrayContaining(['1', '2', '3']));
      expect(ids).toHaveLength(3);
    });
  });

  // 8. Custom getItemId
  describe('custom getItemId', () => {
    it('works with custom getItemId that returns non-numeric strings', () => {
      const stringItems = [{ key: 'alpha' }, { key: 'beta' }, { key: 'gamma' }];
      const stringGetItemId = (item) => item.key;

      const { result } = renderHook(() => useCheckboxSelection({
        items: stringItems,
        getItemId: stringGetItemId,
      }));

      act(() => {
        result.current.handleCheckboxSelect(makeCheckEvent('alpha', true));
      });

      expect(result.current.isChecked('alpha')).toBe(true);
      expect(result.current.isChecked('beta')).toBe(false);
      expect(result.current.numberOfSelected).toBe(1);
    });

    it('works with getItemId returning composite keys', () => {
      const compositeItems = [
        { region: 'east', type: 'A' },
        { region: 'west', type: 'B' },
      ];
      const compositeGetItemId = (item) => `${item.region}-${item.type}`;

      const { result } = renderHook(() => useCheckboxSelection({
        items: compositeItems,
        getItemId: compositeGetItemId,
      }));

      act(() => {
        result.current.handleCheckboxSelect(makeCheckEvent('east-A', true));
      });

      expect(result.current.isChecked('east-A')).toBe(true);
      expect(result.current.isChecked('west-B')).toBe(false);
    });
  });

  // 9. clearAll
  describe('clearAll', () => {
    it('clears all selections made via handleCheckboxSelect', () => {
      const allItemIds = ['1', '2', '3'];
      const { result } = renderHook(() => useCheckboxSelection({ items, allItemIds, getItemId }));

      act(() => {
        result.current.handleCheckboxSelect(makeCheckEvent('1', true));
        result.current.handleCheckboxSelect(makeCheckEvent('2', true));
      });

      expect(result.current.numberOfSelected).toBe(2);

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.numberOfSelected).toBe(0);
      expect(result.current.selectedIds).toHaveLength(0);
      allItemIds.forEach((id) => expect(result.current.isChecked(id)).toBe(false));
    });

    it('clears all selections after selectOrClearAll(false)', () => {
      const allItemIds = ['1', '2', '3', '4', '5'];
      const { result } = renderHook(() => useCheckboxSelection({ items, allItemIds, getItemId }));

      act(() => {
        result.current.selectOrClearAll(false);
      });

      expect(result.current.numberOfSelected).toBe(5);

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.numberOfSelected).toBe(0);
      allItemIds.forEach((id) => expect(result.current.isChecked(id)).toBe(false));
    });

    it('clears cross-page selections', () => {
      const allItemIds = ['1', '2', '3', '4'];
      const pageOneItems = [{ id: 1 }, { id: 2 }];
      const pageTwoItems = [{ id: 3 }, { id: 4 }];

      const { result, rerender } = renderHook(
        ({ currentItems }) => useCheckboxSelection({ items: currentItems, allItemIds, getItemId }),
        { initialProps: { currentItems: pageOneItems } },
      );

      act(() => {
        result.current.handleSelectAllPage({ target: { checked: true } });
      });

      rerender({ currentItems: pageTwoItems });

      act(() => {
        result.current.handleSelectAllPage({ target: { checked: true } });
      });

      expect(result.current.numberOfSelected).toBe(4);

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.numberOfSelected).toBe(0);
      allItemIds.forEach((id) => expect(result.current.isChecked(id)).toBe(false));
    });

    it('is a no-op when nothing is selected', () => {
      const allItemIds = ['1', '2', '3'];
      const { result } = renderHook(() => useCheckboxSelection({ items, allItemIds, getItemId }));

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.numberOfSelected).toBe(0);
      expect(result.current.selectedIds).toHaveLength(0);
    });
  });

  // 10. numberOfSelected
  describe('numberOfSelected', () => {
    it('numberOfSelected counts items across pages (not just current page)', () => {
      const pageOneItems = [{ id: 1 }, { id: 2 }];
      const pageTwoItems = [{ id: 3 }, { id: 4 }];

      const { result, rerender } = renderHook(
        ({ currentItems }) => useCheckboxSelection({ items: currentItems, getItemId }),
        { initialProps: { currentItems: pageOneItems } },
      );

      // Select both items on page 1
      act(() => {
        result.current.handleSelectAllPage({ target: { checked: true } });
      });

      expect(result.current.numberOfSelected).toBe(2);

      // Switch to page 2 and select one item
      rerender({ currentItems: pageTwoItems });

      act(() => {
        result.current.handleCheckboxSelect(makeCheckEvent('3', true));
      });

      // Should count 3 total across both pages
      expect(result.current.numberOfSelected).toBe(3);
    });
  });
});
