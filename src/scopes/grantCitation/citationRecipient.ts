/* eslint-disable import/prefer-default-export */

export function withCitationRecipient(citationRecipients: string[]) {
  return citationRecipients.map((citationRecipient) => {
    const [citationId, recipientId] = citationRecipient.split(':');

    const numericCitationId = Number(citationId);
    const numericRecipientId = Number(recipientId);

    if (!Number.isInteger(numericCitationId) || !Number.isInteger(numericRecipientId)) {
      return {};
    }

    return {
      citationId: numericCitationId,
      recipient_id: numericRecipientId,
    };
  });
}
