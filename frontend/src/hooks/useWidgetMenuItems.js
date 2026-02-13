import { useMemo } from 'react'

export default function useWidgetMenuItems(showTabularData, setShowTabularData, capture, checkboxes, exportRows) {
  // eslint-disable-next-line max-len
  const atLeastOneRowIsSelected = useMemo(() => Object.values(checkboxes).some((v) => v), [checkboxes])

  const menuItems = useMemo(() => {
    const menu = [
      {
        label: showTabularData ? 'Display graph' : 'Display table',
        onClick: () => setShowTabularData(!showTabularData),
      },
    ]

    if (!showTabularData) {
      menu.push({
        label: 'Save screenshot',
        onClick: capture,
      })
    }

    if (showTabularData) {
      menu.push({
        label: 'Export table',
        onClick: async () => exportRows(),
      })
    }

    if (showTabularData && atLeastOneRowIsSelected) {
      menu.push({
        label: 'Export selected rows',
        onClick: async () => exportRows('selected'),
      })
    }

    return menu
  }, [atLeastOneRowIsSelected, capture, exportRows, setShowTabularData, showTabularData])

  return menuItems
}
