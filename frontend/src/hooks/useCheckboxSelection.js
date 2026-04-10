import { useState, useEffect } from 'react';
import { parseCheckboxEvent } from '../Constants';

/**
 * useCheckboxSelection
 *
 * Generic hook for managing checkbox selection state across paginated lists.
 *
 * @param {object} options
 * @param {Array}  options.items        - Current page items
 * @param {Array}  [options.allItemIds] - All item IDs across all pages (for cross-page select-all)
 * @param {Function} options.getItemId  - (item) => string — extract unique string ID from an item
 *
 * @returns {object} Selection state and handlers
 */
export default function useCheckboxSelection({ items, allItemIds = [], getItemId }) {
  // State: { [stringId]: boolean }
  const [selectedCheckboxes, setSelectedCheckboxes] = useState({});
  const [allPageChecked, setAllPageChecked] = useState(false);

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
      {},
    );
    setSelectedCheckboxes({ ...thisPageCheckboxes, ...preserved });
  };

  const clearAll = () => {
    const allIdCheckboxes = allItemIds.reduce(
      (obj, id) => ({ ...obj, [String(id)]: false }),
      {},
    );
    setSelectedCheckboxes(allIdCheckboxes);
  };

  // Select or clear ALL items across all pages
  const selectOrClearAll = (isClear) => {
    const allIdCheckboxes = allItemIds.reduce(
      (obj, id) => ({ ...obj, [String(id)]: !isClear }),
      {},
    );
    setSelectedCheckboxes(allIdCheckboxes);
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
    isChecked,
    getIdsForAction,
    clearAll,
  };
}
