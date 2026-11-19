import { Alert } from '@trussworks/react-uswds';
import React from 'react';
import { useFormContext } from 'react-hook-form';

export const FORM_ERROR_SUMMARY_TEXT =
  'This form has errors. Please fix the following fields before submitting:';

/**
 * Every error message in a form's errors, in field order. A field holding an object or a list,
 * such as a select's option or a list of them, has its errors nested under it, so they are
 * walked as well. A message shown for more than one field is listed once.
 */
export function errorMessages(errors: unknown): string[] {
  const messages: string[] = [];

  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') {
      return;
    }
    const { message } = node as { message?: unknown };
    if (typeof message === 'string' && message) {
      messages.push(message);
      return;
    }
    Object.entries(node).forEach(([key, value]) => {
      // a field error keeps a reference to its input, which isn't an error to walk
      if (key !== 'ref') {
        walk(value);
      }
    });
  };

  walk(errors);
  return [...new Set(messages)];
}

/**
 * Lists what a form's submission is missing, beside its submit button, since the fields it
 * names may be scrolled out of view. Shown once the user has tried to submit, and gone once
 * every error is fixed. Must be rendered inside the form's FormProvider.
 */
export default function FormErrorSummary({
  className = 'margin-top-4 maxw-mobile-lg',
}: {
  className?: string;
}): React.ReactElement | null {
  const { errors, formState } = useFormContext();
  const messages = errorMessages(errors);

  if (!formState.isSubmitted || !messages.length) {
    return null;
  }

  return (
    <Alert
      type="error"
      headingLevel="h4"
      slim
      noIcon
      aria-live="polite"
      className={className}
      data-testid="form-error-summary"
    >
      {FORM_ERROR_SUMMARY_TEXT}
      <ul className="usa-list margin-top-1 margin-bottom-0">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </Alert>
  );
}
