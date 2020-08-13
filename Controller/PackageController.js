var services = require('../Services/RedisDataServices');
var printerCtrl = require('./PrinterController');
var utils = require('../Util/utils');

exports.get_package_list = (req, res, next) => {
    services.packageService.getAllPackagesWithLastStatus().then((packages) => {
        return Promise.all(
            packages.map(async(pkg, i) => {
                let awb = await services.printService.getAWBDataForPackagesRelatedEntitie(pkg.awbId._id);
                packages[i].pieces = awb.packages ? awb.packages.length : 0
                packages[i].packageNumber = "PK00" + packages[i].id;
                return pkg
            })
        ).then(pkgs => {
            res.render('pages/warehouse/package/list-all', {
                page: req.originalUrl,
                user: res.user,
                title: 'All Packages',
                filterURL: '',
                buttonName: 'Add to Manifest',
                packages: pkgs,
            });
        })

    });
};

exports.get_customer_package_list = (req, res, next) => {
    services.packageService.getPopulatedCustomerPackages(req.params.id).then((packages) => {
        return Promise.all(
            packages.map(async(pkg, i) => {
                let awb = await services.printService.getAWBDataForPackagesRelatedEntitie(pkg.awbId._id);
                packages[i].pieces = awb.packages ? awb.packages.length : 0
                packages[i].packageNumber = "PK00" + packages[i].id;
                return pkg
            })
        ).then(pkgs => {
            res.render('pages/customer/package/list-all', {
                page: req.originalUrl,
                user: res.user,
                title: 'All Packages',
                filterURL: '',
                buttonName: 'Add to Manifest',
                packages: pkgs,
            });
        })

    });
};

exports.get_package_locations = (req, res, next) => {
    services.locationService.getLocations().then((locations) => {
        res.send(locations);
    });
};
exports.get_package_zones = (req, res, next) => {
    services.zoneService.getZones().then(zones => {
        res.send(zones);
    })
};

exports.get_filtered_package_list = (req, res, next) => {
    let title = 'All Packages';
    let filterURL = '';
    let buttonName = '';
    services.packageService
        .getAllPackagesWithLastStatus({ filter: req.params.filter })
        .then(async(packages) => {

            if (req.params.filter === 'in-manifest') {
                packages = packages.filter((i) => i.manifestId);
                title = 'Packages';
                filterURL = 'in-manifest';
            }

            if (req.params.filter === 'deliver') {
                packages = packages.filter((i) => i.manifestId);
                title = 'All Packages';
                filterURL = 'deliver';
                buttonName = 'Add to Delivery';
            }

            if (req.params.filter === 'in-pmb9000') {
                packages = packages.filter((i) => i.manifestId);
                packages = packages.filter((i) => i.customerId);
                packages = packages.filter((i) => i.awbId);
                title = '9to5 Warehouse Packages';
                filterURL = 'in-pmb9000';
            }

            if (req.params.filter === 'not-pmb9000') {
                packages = packages.filter((i) => i.manifestId && i.customerId && i.awbId);
                title = 'Post Boxes Etc';
                filterURL = 'not-pmb9000';
            }

            if (req.params.filter === 'in-manifest-no-docs') {
                let noDocsAWBIds = await services.awbService.getInManifestNoInvoiceIds();
                packages = packages.filter((i) => {
                    return (i.manifestId && noDocsAWBIds.includes(i.awbId.toString()))
                });
                title = 'Packages in Manifest (no docs)';
            }

            return Promise.all(
                packages.map(async(pkg, i) => {

                    // Adding package number and pieces in response
                    let awb = await services.printService.getAWBDataForPackagesRelatedEntitie(pkg.awbId);
                    packages[i].pieces = awb.packages ? awb.packages.length : 0
                    packages[i].packageNumber = "PK00" + packages[i].id;

                    if (req.params.filter === 'in-manifest-no-docs') {
                        return pkg;
                    }
                    if (req.params.filter === 'deliver') {
                        return pkg;
                    }
                    if (req.params.filter === 'in-manifest') {
                        let status = await services.packageService.getPackageLastStatus(pkg._id);
                        pkg.lastStatusText = status && status.status;
                        return pkg;
                    }
                    if (req.params.filter === 'in-pmb9000') {
                        let customer = await services.customerService.getCustomer(pkg.customerId);
                        if (customer.pmb == 9000) {
                            let awb = await services.awbService.getAwb(pkg.awbId);
                            if (awb.deliveryMethod) {
                                pkg.awbdeliveryMethod = awb.deliveryMethod;
                            } else {
                                pkg.awbdeliveryMethod = '';
                            }
                            let status = await services.packageService.getPackageLastStatus(pkg._id);
                            pkg.customerpmb = '9000';
                            pkg.lastStatusText = status && status.status;
                            return pkg;
                        }
                    }
                    if (req.params.filter === 'not-pmb9000') {
                        let customer = await services.customerService.getCustomer(pkg.customerId);
                        if (customer.pmb != 9000) {
                            if (pkg.locationId) {
                                // There is a location (string) field already in package itself, but for some 
                                // reason it's out of sync with locatioId, so we look by locationId.
                                let location = await services.locationService.getLocation(pkg.locationId)
                                pkg.location = location && location.name;
                            }
                            return pkg;
                        }
                    }
                })

            );

        })
        .then((packages) => {

            const filtered = packages.filter((el) => {
                return el != null;
            });
            if (req.params.filter === 'deliver') {
                res.render('pages/warehouse/package/list-all', {
                    page: req.originalUrl,
                    user: res.user,
                    title: title,
                    filterURL: filterURL,
                    buttonName: 'Add to Delivery',
                    packages: filtered,
                });
            } else {
                res.render('pages/warehouse/package/list', {
                    page: req.originalUrl,
                    user: res.user,
                    title: title,
                    filterURL: filterURL,
                    packages: filtered,
                });
            }
        });
};

exports.get_fll_package_list = (req, res, next) => {
    services.packageService.getPackagesInFll_updated().then((packages) => {
        res.render('pages/warehouse/package/list', {
            page: req.originalUrl,
            user: res.user,
            title: 'Packages On Hands Of FLL',
            filterURL: '',
            packages: packages,
        });
    });
};

exports.get_nas_package_list = (req, res, next) => {
    services.packageService.getPackagesInNas_updated().then((packages) => {
        res.render('pages/warehouse/package/list', {
            page: req.originalUrl,
            user: res.user,
            title: 'Packages On Hand Of NAS',
            filterURL: '',
            packages: packages,
        });
    });
};

exports.get_nas_package_aging = (req, res, next) => {
    services.packageService.getAllPackages_updated().then((packages) => {
        console.log({packages});
        res.render('pages/warehouse/package/aging', {
            page: req.originalUrl,
            user: res.user,
            title: 'Packages Aging',
            filterURL: '',
            packages: packages,
        });
    });
};

exports.get_package_no_docs = (req, res, next) => {
    services.packageService.getPackagesNoDocs().then((packages) => {
        //console.log("packages")
        res.render('pages/warehouse/package/no-docs', {
          page: req.originalUrl,
          title: "Packages - No Docs",
          user: res.user,
          packages: packages,
        })
    });
}

exports.get_awb_packages = (req, res, next) => {
    services.packageService.getPackages_updated(req.params.awbId).then((packages) => {
        res.send(packages);
    });
};