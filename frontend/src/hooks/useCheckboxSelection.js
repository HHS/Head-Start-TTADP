import { useEffect, useRef, useState } from 'react';
import { parseCheckboxEvent } from '../Constants';

const buildSelectionMap = (ids, checked) => {
  const selectionMap = {};
  ids.forEach((id) => {
    selectionMap[String(id)] = checked;
  });
  return selectionMap;
};

/**
 * useCheckboxSelection
 *
 * Generic hook for managing checkbox selection state across paginated lists.
 *
 * @param {object} options
 * @param {Array}  options.items        - Current page items
 * @param {Array}  [options.allItemIds] - All item IDs across all pages (for cross-page select-all)
 * @param {Function} options.getItemId  - (item) => string — extract unique string ID from an item
 * @param {boolean} [options.pruneOnAllItemIdsChange] - Remove selections missing from allItemIds
 *
 * @returns {object} Selection state and handlers
 */
export default function useCheckboxSelection({
  items,
  allItemIds = [],
  getItemId,
  pruneOnAllItemIdsChange = false,
}) {
  // State: { [stringId]: boolean }
  const [selectedCheckboxes, setSelectedCheckboxes] = useState({});
  const [allPageChecked, setAllPageChecked] = useState(false);
  const previousAllItemIds = useRef(allItemIds);

  // Derived values
  const numberOfSelected = Object.values(selectedCheckboxes).filter(Boolean).length;
  const selectedIds = Object.keys(selectedCheckboxes).filter((k) => selectedCheckboxes[k]);
  const pageSelectedIds = items
    .map((item) => String(getItemId(item)))
    .filter((id) => selectedCheckboxes[id]);

  // Update allPageChecked when items or selectedCheckboxes change
  useEffect(() => {
    const pageIds = items.map((item) => String(getItemId(item)));
    const countChecked = pageIds.filter((id) => selectedCheckboxes[id]).length;
    setAllPageChecked(items.length > 0 && items.length === countChecked);
  }, [items, selectedCheckboxes, getItemId]);

  useEffect(() => {
    if (!pruneOnAllItemIdsChange) {
      previousAllItemIds.current = allItemIds;
      return;
    }

    const hadAllItemIds = previousAllItemIds.current.length > 0;
    const hasAllItemIds = allItemIds.length > 0;

    if (!hadAllItemIds && !hasAllItemIds) {
      return;
    }

    const validIds = new Set(allItemIds.map((id) => String(id)));
    setSelectedCheckboxes((previousSelections) => {
      const nextSelections = {};
      Object.entries(previousSelections).forEach(([id, checked]) => {
        if (validIds.has(id)) {
          nextSelections[id] = checked;
        }
      });

      return Object.keys(nextSelections).length === Object.keys(previousSelections).length
        ? previousSelections
        : nextSelections;
    });
    previousAllItemIds.current = allItemIds;
  }, [allItemIds, pruneOnAllItemIdsChange]);

  // Toggle individual checkbox
  const handleCheckboxSelect = (event) => {
    const { checked, value } = parseCheckboxEvent(event);
    setSelectedCheckboxes((prev) => ({ ...prev, [value]: checked === true }));
  };

  // Toggle all items on current page (preserves other pages' selections)
  const handleSelectAllPage = (event) => {
    const { checked } = parseCheckboxEvent(event);
    const thisPageIds = items.map((item) => String(getItemId(item)));
    // Preserve selections on other pages
    const preserved = Object.keys(selectedCheckboxes).reduce((obj, key) => {
      if (!thisPageIds.includes(key)) {
        return { ...obj, [key]: selectedCheckboxes[key] };
      }
      return obj;
    }, {});
    const thisPageCheckboxes = thisPageIds.reduce(
      (obj, id) => ({ ...obj, [id]: checked === true }),
      {}
    );
    setSelectedCheckboxes({ ...thisPageCheckboxes, ...preserved });
  };

  const clearAll = () => {
    setSelectedCheckboxes(buildSelectionMap(allItemIds, false));
  };

  // Select or clear ALL items across all pages
  const selectOrClearAll = (isClear) => {
    setSelectedCheckboxes(buildSelectionMap(allItemIds, !isClear));
  };

  const selectIds = (ids) => {
    setSelectedCheckboxes(buildSelectionMap(ids, true));
  };

  // Check if a specific ID is selected
  const isChecked = (id) => Boolean(selectedCheckboxes[String(id)]);

  // Returns selected IDs, or falls back to current page IDs if nothing is selected
  const getIdsForAction = () => {
    if (selectedIds.length > 0) {
      return selectedIds;
    }
    return items.map((item) => String(getItemId(item)));
  };

  return {
    selectedCheckboxes,
    allPageChecked,
    numberOfSelected,
    selectedIds,
    pageSelectedIds,
    handleCheckboxSelect,
    handleSelectAllPage,
    selectOrClearAll,
    selectIds,
    isChecked,
    getIdsForAction,
    clearAll,
  };
}
