function generateFullName(name, roles) {
  const combinedRoles = Array.isArray(roles) ? roles.map((r) => r.name).sort() : [];
  return combinedRoles.length > 0 ? `${name}, ${combinedRoles.join(', ')}` : name;
}

module.exports = generateFullName;
