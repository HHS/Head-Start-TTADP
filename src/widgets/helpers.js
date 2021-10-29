/* eslint-disable import/prefer-default-export */
export function countBySingleKey(data, key) {
  // Get counts for each key.
  const results = [];
  data.forEach((point) => {
    point[key].forEach((r) => {
      const obj = results.find((e) => e.name === r);
      if (obj) {
        obj.count += 1;
      } else {
        results.push({ name: r, count: 1 });
      }
    });
  });

  // Sort By Count largest to smallest.
  results.sort((r1, r2) => {
    if (r2.count - r1.count === 0) {
      // Break tie on name
      const name1 = r1.name.toUpperCase().replace(' ', ''); // ignore upper and lowercase
      const name2 = r2.name.toUpperCase().replace(' ', ''); // ignore upper and lowercase
      if (name1 < name2) {
        return -1;
      }
      if (name1 > name2) {
        return 1;
      }
    }
    return r2.count - r1.count;
  });

  return results;
}
