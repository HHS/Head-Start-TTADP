function generateFullName(user, collaboratorRoles) {
  const roles = collaboratorRoles ? collaboratorRoles.map((r) => r.role).sort() : [];
  if (!roles.length || roles.length === 0) {
    return user.fullName;
  }
  const combinedRoles = roles.reduce((result, val) => {
    if (val) {
      return val === 'TTAC' || val === 'COR' ? `${result}, ${val}` : `${result}, ${val.split(' ').map((word) => word[0]).join('')}`;
    }
    return '';
  }, []);
  return combinedRoles.length > 0 ? `${user.name}${combinedRoles}` : user.name;
}

module.exports = generateFullName;
