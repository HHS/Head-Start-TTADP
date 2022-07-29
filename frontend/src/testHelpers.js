export const convertToResponse = (
  reports,
  isAlerts = false,
  count = reports.length,
) => reports.reduce((previous, current) => {
  const { activityRecipients, ...report } = current;
  const recipients = activityRecipients.map((recipient) => (
    {
      ...recipient,
      activityReportId: report.id,
    }
  ));

  return {
    [isAlerts ? 'alerts' : 'rows']: [...previous[isAlerts ? 'alerts' : 'rows'], report],
    recipients: [...previous.recipients, ...recipients],
    [isAlerts ? 'alertsCount' : 'count']: count,
  };
}, { [isAlerts ? 'alertsCount' : 'count']: count, [isAlerts ? 'alerts' : 'rows']: [], recipients: [] });

export const withText = (text) => (content, node) => {
  const hasText = (n) => n.textContent === text;
  const nodeHasText = hasText(node);
  const childrenDontHaveText = Array.from(node.children).every(
    (child) => !hasText(child),
  );

  return nodeHasText && childrenDontHaveText;
};

export function mockWindowProperty(property, value) {
  const { [property]: originalProperty } = window;
  delete window[property];
  beforeAll(() => {
    Object.defineProperty(window, property, {
      configurable: true,
      writable: true,
      value,
    });
  });
  afterAll(() => {
    window[property] = originalProperty;
  });
}

export function mockDocumentProperty(property, value) {
  const { [property]: originalProperty } = document;
  delete document[property];
  beforeAll(() => {
    Object.defineProperty(document, property, {
      configurable: true,
      writable: true,
      value,
    });
  });
  afterAll(() => {
    document[property] = originalProperty;
  });
}
