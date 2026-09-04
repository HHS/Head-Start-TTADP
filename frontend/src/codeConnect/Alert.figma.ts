// url=https://www.figma.com/design/5Fr0NKQf9MQ5WGd8BWxA6i/TTA-Hub-Design-Library?node-id=1786-15733
// component=Alert

/**
 * Figma Code Connect template (v2) for the TTA Hub Design Library "Alert".
 *
 * Figma component set node-id 1786:15733 (State x Type variant set),
 * read from Figma on 2026-09-04. Maps directly to the @trussworks/react-uswds
 * `Alert` — the component the app already uses everywhere.
 *
 * Only the Figma `State` variant is mapped (-> trussworks `type`). Two Figma
 * variants have no 1:1 code equivalent and are intentionally left unmapped as
 * [NEEDS DECISION] until design confirms intent:
 *   - Type=List: trussworks `Alert` has no list variant; a list is just markup
 *     passed as `children`.
 *   - Type=Dismissable: trussworks `Alert` has no native dismiss control.
 */

import figma from 'figma';

const type = figma.selectedInstance.getEnum('State', {
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
  Info: 'info',
});

export default {
  id: 'Alert',
  imports: ["import { Alert } from '@trussworks/react-uswds';"],
  example: figma.code`<Alert${figma.helpers.react.renderProp(
    'type',
    type
  )} headingLevel="h4" heading="Alert heading">
        Alert content
      </Alert>`,
  metadata: { nestable: true },
};
