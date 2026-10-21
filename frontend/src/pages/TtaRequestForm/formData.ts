import type {
  CitationOption,
  TtaRequestFormValues,
  TtaRequestPayload,
  TtaRequestRecipient,
  TtaRequestResponse,
} from './types';

const RECIPIENT_AWARE_TO_API: Record<string, boolean | null> = {
  yes: true,
  no: false,
  '': null,
};

const recipientAwareToForm = (recipientAware: boolean | null): string => {
  if (recipientAware === null) {
    return '';
  }
  return recipientAware ? 'yes' : 'no';
};

/** the select key buildUniqueCitationOptions gives the same citation, so a saved one matches */
const citationToOption = ({
  citation,
  findingType,
}: TtaRequestResponse['citations'][number]): CitationOption => ({
  label: citation,
  value: `${findingType}::${citation}`,
  name: citation,
  findingType: findingType ?? '',
  standardIds: [],
});

/**
 * The form's values as the API takes them. A draft is saved as it stands, so every field
 * goes along whether or not it has been filled in.
 */
export function toApiPayload(values: TtaRequestFormValues): TtaRequestPayload {
  return {
    recipientId: values.recipient?.id ?? null,
    grantIds: (values.grants || []).map((grant) => grant.id),
    recipientAware: RECIPIENT_AWARE_TO_API[values.recipientAware ?? ''] ?? null,
    originator: values.originator ? String(values.originator.value) : null,
    goalTemplateId: values.goal?.id ?? null,
    citations: (values.citations || []).map((citation) => ({
      citation: citation.name ?? citation.label,
      findingType: citation.findingType || null,
    })),
    context: values.context ?? '',
    creatorNotes: values.creatorNotes ?? '',
    reviewerId: values.reviewer ? Number(values.reviewer.value) : null,
  };
}

/**
 * A saved request as the form's values. The recipient is taken from the options when it is
 * among them, since only the option carries every grant the recipient could choose.
 */
export function toFormValues(
  ttaRequest: TtaRequestResponse,
  recipientOptions: TtaRequestRecipient[] = []
): TtaRequestFormValues {
  const { recipient, goalTemplate, reviewer } = ttaRequest;
  const recipientOption = recipient
    ? recipientOptions.find((option) => option.id === recipient.id)
    : null;

  let formRecipient: TtaRequestRecipient | null = null;
  if (recipientOption) {
    formRecipient = recipientOption;
  } else if (recipient) {
    formRecipient = { ...recipient, grants: ttaRequest.grants };
  }

  return {
    recipient: formRecipient,
    grants: ttaRequest.grants,
    recipientAware: recipientAwareToForm(ttaRequest.recipientAware),
    originator: ttaRequest.originator
      ? { value: ttaRequest.originator, label: ttaRequest.originator }
      : null,
    goal: goalTemplate
      ? {
          id: goalTemplate.id,
          name: goalTemplate.templateName,
          standard: goalTemplate.standard ?? undefined,
        }
      : null,
    citations: ttaRequest.citations.map(citationToOption),
    context: ttaRequest.context ?? '',
    creatorNotes: ttaRequest.creatorNotes ?? '',
    reviewer: reviewer ? { value: reviewer.id, label: reviewer.name } : null,
  };
}
