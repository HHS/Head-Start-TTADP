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
    topics: [],
  };
}, {
  [isAlerts ? 'alertsCount' : 'count']: count, [isAlerts ? 'alerts' : 'rows']: [], recipients: [], topics: [],
});

export const withText = (text) => (content, node) => {
  const hasText = (n) => n.textContent === text;
  const nodeHasText = hasText(node);
  const childrenDontHaveText = Array.from(node.children).every(
    (child) => !hasText(child),
  );

  return nodeHasText && childrenDontHaveText;
};

function mockProperty(obj, property, value) {
  const { [property]: originalProperty } = obj;
  // eslint-disable-next-line no-param-reassign
  delete obj[property];
  beforeAll(() => {
    Object.defineProperty(obj, property, {
      configurable: true,
      writable: true,
      value,
    });
  });
  afterAll(() => {
    // eslint-disable-next-line no-param-reassign
    obj[property] = originalProperty;
  });
}

export function mockNavigatorProperty(property, value) {
  mockProperty(navigator, property, value);
}

export function mockWindowProperty(property, value) {
  mockProperty(window, property, value);
}
