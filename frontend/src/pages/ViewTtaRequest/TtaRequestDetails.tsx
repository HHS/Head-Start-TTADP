import { Button } from '@trussworks/react-uswds';
import React from 'react';
import ReadOnlyContent from '../../components/ReadOnlyContent';
import type { TtaRequestResponse } from '../TtaRequestForm/types';

const recipientAwareLabel = (recipientAware: boolean | null) => {
  if (recipientAware === null) {
    return '';
  }
  return recipientAware ? 'Yes' : 'No';
};

const citationLabel = ({ citation, findingType }: TtaRequestResponse['citations'][number]) =>
  findingType ? `${findingType} - ${citation}` : citation;

interface TtaRequestDetailsProps {
  ttaRequest: TtaRequestResponse;
  /** set when the details can be edited in place, as the reviewer can */
  onEdit?: (() => void) | null;
  /** the section titles' heading level, so they fit the outline of the page they are on */
  headingLevel?: 2 | 3;
}

/**
 * The creator's part of a request, read only: who it is for, and its goal and context.
 */
export default function TtaRequestDetails({
  ttaRequest,
  onEdit = null,
  headingLevel = 2,
}: TtaRequestDetailsProps): React.ReactElement {
  const { citations } = ttaRequest;
  // as on the activity report: H3s are set in sans, H2s in serif
  const titleClassName = headingLevel === 3 ? 'font-sans-lg text-bold' : 'font-serif-xl';

  return (
    <>
      <ReadOnlyContent
        title="Who is the request for?"
        titleHeadingLevel={headingLevel}
        titleClassName={titleClassName}
        spacing={{ section: 0, row: 3 }}
        titleAction={
          onEdit ? (
            <Button type="button" unstyled onClick={onEdit}>
              Edit request
            </Button>
          ) : null
        }
        sections={[
          {
            data: {
              // one grant per line, without the bullets an array would get
              'Recipient grant': (
                <>
                  {ttaRequest.grants.map((grant) => (
                    <div key={grant.id}>{grant.name}</div>
                  ))}
                </>
              ),
              'Recipient aware of request': recipientAwareLabel(ttaRequest.recipientAware),
              'Request originator': ttaRequest.originator ?? '',
            },
          },
        ]}
      />
      <ReadOnlyContent
        title="Goal and context"
        titleHeadingLevel={headingLevel}
        titleClassName={titleClassName}
        spacing={{ title: 2, section: 1 }}
        sections={[
          {
            data: {
              // curated template names already lead with their standard, e.g. "(Monitoring) ..."
              "Recipient's Goal": ttaRequest.goalTemplate?.templateName ?? '',
              'Request background or context': ttaRequest.context ?? '',
              ...(citations.length
                ? {
                    'Citations addressed': (
                      <ul className="usa-list margin-0">
                        {citations.map((citation) => (
                          <li key={`${citation.findingType}::${citation.citation}`}>
                            {citationLabel(citation)}
                          </li>
                        ))}
                      </ul>
                    ),
                  }
                : {}),
            },
          },
        ]}
      />
    </>
  );
}
