// url=https://www.figma.com/design/5Fr0NKQf9MQ5WGd8BWxA6i/TTA-Hub-Design-Library?node-id=1786-15733
// component=Alert

/**
 * Figma Code Connect template (v2) for the TTA Hub Design Library "Alert".
 *
 * Figma component set node-id 1786:15733 (State x Type variant set),
 * Last read from Figma: 2026-11-25. 
 * Maps directly to the @trussworks/react-uswds `Alert`. 
 * Spacing (16px padding, 20px icon, 16px gap, left-aligned text) comes 
 * from the global alert overrides in`src/App.scss`, so no extra classes 
 * are needed.
 *
 * - `State` -> trussworks `type`.
 * - `Type=Default` has no heading in the design, so none is emitted. The message
 *   is read from the "alert content" text layer.
 * - `Type=List` -> `validation`, which makes trussworks render children as-is
 *   (otherwise they are wrapped in a <p>, and a <ul> inside a <p> is invalid).
 *   Same pattern as MissingCitationAlerts. The first line of the Figma text is the
 *   intro paragraph; the remaining lines are bullets.
 * - `Type=Dismissable` [NEEDS DECISION]: trussworks `Alert` has
 *   no native dismiss control, so it renders like Default.
 */

import figma from 'figma';

const instance = figma.selectedInstance;

const type = instance.getEnum('State', {
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
  Info: 'info',
});

const isList = instance.getEnum('Type', {
  Default: false,
  Dismissable: false,
  List: true,
});

const textLayer = instance.findLayers((node) => 'textContent' in node, {
  traverseInstances: true,
})[0];
const lines = (textLayer && 'textContent' in textLayer ? textLayer.textContent : 'Alert content')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

const intro = lines[0] || 'Alert content';
const bullets = lines
  .slice(1)
  .map((line) => `    <li>${line}</li>`)
  .join('\n');

const example = isList
  ? figma.code`<Alert${figma.helpers.react.renderProp('type', type)} headingLevel="h4" validation>
  <p className="usa-alert__text">${intro}</p>
  <ul className="usa-list">
${bullets}
  </ul>
</Alert>`
  : figma.code`<Alert${figma.helpers.react.renderProp('type', type)} headingLevel="h4">
  ${intro}
</Alert>`;

export default {
  id: 'Alert',
  imports: ["import { Alert } from '@trussworks/react-uswds';"],
  example,
  metadata: { nestable: true },
};
