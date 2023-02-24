/* eslint-disable import/prefer-default-export */
export const handleArrayQuery = (q) => {
  if (q.length) {
    return [q].flat().join(', ');
  }
  return '';
};
