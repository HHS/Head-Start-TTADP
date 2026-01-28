 
export const handleArrayQuery = (q) => {
  if (q.length) {
    return [q].flat().join(', ');
  }
  return '';
};
