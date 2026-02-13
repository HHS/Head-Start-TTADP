import { useMemo } from 'react'

const DEFAULT_MARGIN_CONFIG = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
}
/**
 *
 * @param {object} config
 * @param {number} config.top
 * @param {number} config.right
 * @param {number} config.bottom
 * @param {number} config.left
 * @returns {string}
 */
export default function useMarginFromConfig(config) {
  const resolvedConfig = useMemo(
    () => ({
      ...DEFAULT_MARGIN_CONFIG,
      ...config,
    }),
    [config]
  )

  return [
    `margin-top-${resolvedConfig.top}`,
    `margin-right-${resolvedConfig.right}`,
    `margin-bottom-${resolvedConfig.bottom}`,
    `margin-left-${resolvedConfig.left}`,
  ].join(' ')
}
