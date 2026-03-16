/**
 * Font Awesome Icon Registry
 *
 * Central location for all Font Awesome icon imports.
 * This helps with:
 * - Tree-shaking: Only imported icons are bundled
 * - Maintainability: Easy to see all icons used in the app
 * - Bandwidth: Zero FA CDN consumption (all bundled at build time)
 *
 * Import pattern:
 * - Use Pro icons when available: @fortawesome/pro-solid-svg-icons
 * - Fall back to Free icons: @fortawesome/free-solid-svg-icons
 */

// Pro-only icons (not available in free version)
export {
  faPenCircle,
} from '@fortawesome/pro-solid-svg-icons';

// Icons available in both free and pro (use free to save license seats)
export {
  faArrowLeft,
  faArrowUpRightFromSquare,
  faChartColumn,
  faCheck,
  faCheckCircle,
  faClock,
  faExclamationCircle,
  faPauseCircle,
  faPencil,
  faSearch,
  faTimesCircle,
} from '@fortawesome/free-solid-svg-icons';
