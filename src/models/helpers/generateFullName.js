function generateFullName(name, roles) {
  const combinedRoles = Array.isArray(roles) ? roles.map((r) => r.name) : [];
  return combinedRoles.length > 0 ? `${name}, ${combinedRoles.join(', ')}` : name;
}

module.exports = generateFullName;
