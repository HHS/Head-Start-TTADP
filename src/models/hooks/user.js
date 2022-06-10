function generateFullName(name, role) {
  const combinedRoles = Array.isArray(role) ? role.reduce((result, val) => {
    if (val) {
      return val === 'TTAC' || val === 'COR' ? `${result}, ${val}` : `${result}, ${val.split(' ').map((word) => word[0]).join('')}`;
    }
    return '';
  }, []) : [];
  return combinedRoles.length > 0 ? `${name}${combinedRoles}` : name;
}

export default generateFullName;
