exports.calculatePackageVolumetricWeight = (pkg) => {
  let dimensions = pkg.dimensions.split('x').map(Number);
  // Assuming dimensions are in inches
  return (dimensions[0] * dimensions[1] * dimensions[2]) / 139;
};

exports.checkRole = (userRoles, role) => {
  const roles = userRoles.map((roleData) => roleData.type);
  return roles.includes(role);
};
