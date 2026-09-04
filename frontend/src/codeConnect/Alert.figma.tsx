import figma from '@figma/code-connect';
import { Alert } from '@trussworks/react-uswds';
import React from 'react';

/**
 * Figma Code Connect mapping for the TTA Hub Design Library "Alert" component.
 *
 * Figma component set: TTA Hub Design Library
 *   node-id 1786:15733 (State x Type variant set)
 *   read from Figma on 2026-09-04
 *
 * We map the Figma component directly to the @trussworks/react-uswds `Alert`,
 * which is the component the app already uses everywhere. There is no bespoke
 * TTA Hub Alert wrapper.
 *
 * Variant mapping:
 *   Figma `State` (Success | Warning | Error | Info) -> trussworks `type`.
 *
 * KNOWN GAPS
 *   - Figma `Type=List`: trussworks `Alert` has no `type="list"`; a list is just
 *     list markup passed as `children`. Left out of the prop map for now.
 *   - Figma `Type=Dismissable`: trussworks `Alert` has no native dismiss control.
 *     There is no 1:1 code equivalent; needs a design/eng decision before mapping.
 */
figma.connect(
  Alert,
  'https://www.figma.com/design/5Fr0NKQf9MQ5WGd8BWxA6i/TTA-Hub-Design-Library?node-id=1786-15733',
  {
    props: {
      type: figma.enum('State', {
        Success: 'success',
        Warning: 'warning',
        Error: 'error',
        Info: 'info',
      }),
    },
    example: ({ type }) => (
      <Alert type={type} headingLevel="h4" heading="Alert heading">
        Alert content
      </Alert>
    ),
  }
);
