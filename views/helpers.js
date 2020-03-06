exports.calculatePackageVolumetricWeight = (pkg) => {
  let dimensions = pkg.dimensions.split('x').map(Number);
  // Assuming dimensions are in inches
  return (dimensions[0] * dimensions[1] * dimensions[2]) / 139;
};
