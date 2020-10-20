var services = require('../Services/RedisDataServices');
var printerCtrl = require('./PrinterController');
var utils = require('../Util/utils');
var helpers = require('../views/helpers');

exports.get_package_list = (req, res, next) => {
    // services.packageService.getAllPackagesWithLastStatus().then((packages) => {
    //     return Promise.all(
    //         packages.map(async(pkg, i) => {
    //             let awb = await services.printService.getAWBDataForPackagesRelatedEntitie(pkg.awbId._id);
    //             packages[i].pieces = awb.packages ? awb.packages.length : 0
    //             packages[i].packageNumber = "PK00" + packages[i].id;
    //             return pkg
    //         })
    //     ).then(pkgs => {
            
    //     })
    // });
    res.render('pages/warehouse/package/list-all', {
        page: req.originalUrl,
        user: res.user,
        title: 'All Packages',
        filterURL: '',
        buttonName: 'Add to Manifest',
        packages: [],//pkgs,
        daterange:req.query.daterange?req.query.daterange:'',
        clear:req.query.clear
    });
};

exports.get_all_package_list = (req, res, next) => {
    services.packageService.getAllFullPackagesWithLastStatus(req).then(async (packagesResult) => {
        var dataTable = {
            draw: req.query.draw,
            recordsTotal: packagesResult.total,
            recordsFiltered: packagesResult.total,
            data:[]
          }
          var data = [];
          var packages = packagesResult.packages?packagesResult.packages:[];
              packages = await services.packageService.managePackagesData(packages);
              
          for(var i=0; i< packages.length; i++){
            var packageDetail = [];
            packageDetail.push(`<input type="checkbox" name="package-select" class="package-select" />`)
            packageDetail.push(helpers.formatDate(packages[i].OrignalBarcodeDate));
            if(packages[i].customer && packages[i].customer.length){
                packageDetail.push((
                    (packages[i]['customer'] && packages[i]['customer'].length && packages[i]['customer'][0].lastName )? 
                `${packages[i]['customer'][0].firstName} ${packages[i]['customer'][0].lastName}` : 
                `${packages[i]['customer'][0].firstName}`))
            }else{
                packageDetail.push('-')
            }
            var awbId = packages[i].awbId ? packages[i].awbId : "#";
            var awbNumber = (packages[i].awb ) ? packages[i].awb.awbId :'-';
            packageDetail.push(`<a class="text-decoration-none" href="/warehouse/nas/awb/manage/${awbId}/preview"><b>${packages[i].express? '*':'' }</b>${awbNumber} </a>`)
            var barcode = (packages[i].barcode && packages[i].barcode.length) ? packages[i].barcode[0].barcode :'-';
            packageDetail.push(barcode);
            packageDetail.push(packages[i].packageNumber);
            packageDetail.push(packages[i].description);
            var zoneName = (packages[i].zone && packages[i].zone.length) ? packages[i].zone[0].name : '-';
            packageDetail.push(zoneName);
            packageDetail.push(packages[i].pieceNo);
            packageDetail.push(packages[i].weight);
            packageDetail.push((packages[i].pieces || packages[i].pieces > -1) ? packages[i].pieces : '');
            packageDetail.push(packages[i].lastStatusText);
            packageDetail.push(packages[i].awbCreatedAt);
            packageDetail.push(packages[i].actualFlight);
            packageDetail.push(packages[i].manifestId);
            packageDetail.push((packages[i].lastStatusDates) ? packages[i].lastStatusDates : '' );
            packageDetail.push(`<a href="../pkg-label/download/${packages[i]._id}"><i class="fa fa-download"></i></a>
            <a
              class="btn btn-link btn-primary btn-print-pkg"
              data-toggle="modal"
              data-id="${packages[i]._id}"
              data-original-title="Print Label"
              data-target="#print-popup"
            ><i class="fa fa-print"></i>
          </a>`);
            
            data.push(packageDetail);
          }
          dataTable.data = data;
          res.json(dataTable);
    })
}

exports.get_customer_package_list = async (req, res, next) => {
    let awbs = await services.awbService.getAwbCustomer(req.params.id)
    let packageResponse = []
    for(let awb of awbs){
        let packages = await services.packageService.getPopulatedCustomerPackages(awb.packages)
        packageResponse.push(...packages)
    }
    res.render('pages/customer/package/list-all', {
        page: req.originalUrl,
        user: res.user,
        title: 'All Packages',
        filterURL: '',
        buttonName: 'Add to Manifest',
        packages: packageResponse,
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
                    // packages[i].pieces = awb.packages ? awb.packages.length : 0
                    let pkgsAwb = await services.packageService.get_Packages_update({awbId :pkg.awbId});
                    packages[i].pieces = pkgsAwb ? pkgsAwb.length : 0

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

exports.get_all_nas_package_list = (req, res, next) => {
    services.packageService.getAllPackagesInNas_updated(req).then((packages) => {
        res.json(packages);       
    });
}


exports.get_nas_package_aging = (req, res, next) => {
    //services.packageService.getAllPackages_updated().then((packages) => {
        res.render('pages/warehouse/package/aging', {
            page: req.originalUrl,
            user: res.user,
            title: 'Packages Aging',
            filterURL: '',
            packages: []//packages,
        });
    //});
};

exports.get_all_nas_package_aging = (req, res, next) =>{
    var filterURL =  '';
    services.packageService.get_all_nas_package_aging(req).then((packagesResult) => {
        var dataTable = {
            draw: req.query.draw,
            recordsTotal: packagesResult.total,
            recordsFiltered: packagesResult.total,
            data:[]
          }
          var data = [];
          var packages = packagesResult.packages?packagesResult.packages:[];
          for(var i=0; i< packages.length; i++){
            var packageDetail = [];
            var name = '';
            if(packages[i].customer  && packages[i].customer.firstName) {
                name = packages[i].customer.firstName + (packages[i].customer.lastName ? packages[i].customer.lastName : '')
            }
            packageDetail.push(name);
            packageDetail.push(helpers.formatDate(packages[i].createdAt))
            packageDetail.push(packages[i].barcode ? packages[i].barcode.barcode : '');
            packageDetail.push(packages[i].description);
            packageDetail.push((packages[i].customer && packages[i].customer.pmb) ? packages[i].customer.pmb: '');
            packageDetail.push(packages[i].packageType);
            packageDetail.push(packages[i].aging);
            packageDetail.push(packages[i].agingdollar);
            packageDetail.push(packages[i].weight);
            packageDetail.push((packages[i].pieces || packages[i].pieces > -1) ? packages[i].pieces : '');
            packageDetail.push(packages[i].lastStatusText);
            var awb = (packages[i].awb && packages[i].awb.awbId) ? packages[i].awb.awbId : '';
            packageDetail.push(`<a href="../awb/manage/${packages[i].awb._id}/preview">${awb}</a>`)
            packageDetail.push();
            if (typeof filterURL !== 'undefined' && filterURL === 'not-pmb9000') {
                packageDetail.push(packages[i].location);
            }
            if (typeof filterURL !== 'undefined' && filterURL === 'in-pmb9000') {
                packageDetail.push(packages[i].awbdeliveryMethod);
            }
            var action = `<a href="../../pkg-label/download/${packages[i]._id}"><i class="fa fa-download"></i></a>
            <a class="btn btn-link btn-primary btn-print-pkg" data-toggle="modal" data-id="${packages[i]._id}" data-original-title="Print Label" data-target="#print-popup"><i class="fa fa-print"></i> </a>`;
            packageDetail.push(action);
            data.push(packageDetail);
          }
          dataTable.data = data;
          res.json(dataTable);
    })
}

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