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
