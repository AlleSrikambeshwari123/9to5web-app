const moment = require('moment');

exports.calculatePackageVolumetricWeight = (pkg) => {
  let dimensions = pkg.dimensions.split('x').map(Number);
  // Assuming dimensions are in inches
  return (dimensions[0] * dimensions[1] * dimensions[2]) / 139;
};

exports.checkRole = (userRoles, role) => {
  const roles = userRoles.map((roleData) => roleData.type);
  return roles.includes(role);
};

exports.formatDate = (date) => {
  if (!date) return '';
  return moment(date).format('MMM DD,YYYY HH:mm');
}
