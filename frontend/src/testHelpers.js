// Disable eslint rule making this a default export. This file will,
// I'm sure, accumulate more helper functions

/* eslint-disable import/prefer-default-export */
export const withText = (text) => (content, node) => {
  const hasText = (n) => n.textContent === text;
  const nodeHasText = hasText(node);
  const childrenDontHaveText = Array.from(node.children).every(
    (child) => !hasText(child),
  );

  return nodeHasText && childrenDontHaveText;
};
