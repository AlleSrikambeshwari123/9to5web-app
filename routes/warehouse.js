var express = require('express');
var router = express.Router();
var services = require('../RedisServices/RedisDataServices');
var middleware = require('../middleware');
var moment = require('moment');

var lredis = require('../RedisServices/redis-local');
var redis = lredis;
var PackageUtil = require('../Util/packageutil').PackageUtility;
var packageUtil = new PackageUtil();
var formidable = require('formidable');
var path = require('path');
var fs = require('fs');
var delfile = '';
var uniqid = require('uniqid')
var rServices = require('../RedisServices/RedisDataServices')
var datacontext = require("../RedisServices/dataContext")
var FlightLoadSheet = require('../Util/FlightLoadSheet').FlightLoadSheet;
var loadSheet = new FlightLoadSheet();
var FlightManifest = require('../Util/FlightManifest').FlightManifest;
var flightManifest = new FlightManifest()

const sumFunction = (accumulator, currentValue) => accumulator + currentValue;
router.get('/manifest-count/:mid/:mtype', middleware(services.userService).checkSession, function (req, res, next) {
    var mid = req.params.mid;
    var mtype = req.params.mtype;
    var manifestKeys = `manifest:${mid}:${mtype}:*`;

    var packageCount = 0;


    redis.getKeys(manifestKeys).then((keys) => {
        //foreach key get the cardinality of the set and add it 

        Promise.all(keys.map(redis.setSize)).then((sizes) => {

            if (sizes.length > 0) {
                var sumResult = { mtype: mtype, size: sizes.reduce(sumFunction) }
                res.send(sumResult);
            }
            else
                res.send({ mtype: mtype, count: 0 });
        });
    });

});

router.get('/mlist', middleware(services.userService).checkSession, (req, res, next) => {
    services.manifestService.listAllManifest().then((result) => {
        res.send(result.listing);
    });
});

router.get('/export-manifest/:mid', middleware(services.userService).checkSession, (req, res, next) => {

    var mid = Number(req.params.mid);
    var dir = __dirname.replace("routes", "public\\manifest_files");
    console.log('dirname:' + __dirname);
    console.log('dir: ' + dir);
    //send the package array since there is a problem doing this in c# itself 
    var manifestKey = `manifest:${mid}:*`;

    //so we get the keys 
    redis.getKeys(manifestKey).then((data) => {
        console.log(data);
        if (data.length == 0) {
            res.redirect('/warehouse/m-packages/' + mid);
            return;
        }

        redis.union(data).then(function (result) {
            console.log(result)
            //we need the actual packages now 
            Promise.all(result.map(redis.getPackage)).then(function (packages) {
                // console.log(packages);
                //get the manist 
                redis.hgetall("tew:manifest:" + mid).then((manifest) => {
                    var packagesString = JSON.stringify(packages);
                    //
                    services.manifestService.exportExcel(manifest.title, Number(manifest.mtypeId), packagesString, dir).then((mREsult) => {
                        // res.send({"packages":packagesString}); 
                        res.download(mREsult.file);
                    });
                });
            });
        });
    });
});
router.post('/email-manifest', middleware(services.userService).checkSession, (req, res, next) => {
    var body = req.body;
    var mid = Number(body.mid);
    var email = body.email;
    var brokerName = body.name;
    var dir = __dirname.replace("routes", "public\\manifest_files");
    console.log('dirname:' + __dirname);
    console.log('dir: ' + dir);
    //send the package array since there is a problem doing this in c# itself 
    var manifestKey = `manifest:${mid}:*`;

    //so we get the keys 
    redis.getKeys(manifestKey).then((data) => {
        console.log(data);
        if (data.length == 0) {
            res.send({ message: 'no packages to export' });
            return;
        }
        redis.union(data).then(function (result) {
            console.log(result)
            //we need the actual packages now 
            Promise.all(result.map(redis.getPackage)).then(function (packages) {
                // console.log(packages);
                var packagesString = JSON.stringify(packages);
                //
                lredis.hgetall("tew:manifest:" + mid).then((manifest) => {
                    var emailRequest = {
                        title: manifest.title,
                        mtypeId: Number(manifest.mtypeId),
                        packages: packagesString,
                        dir_loc: dir,
                        email: email,
                        name: brokerName
                    };
                    services.manifestService.emailBroker(emailRequest).then((result) => {
                        res.send({ message: 'Email Sent' })
                    });
                })

            });

        });
    });

});
router.post('/verify-manifest', middleware(services.userService).checkSession, (req, res, next) => {
    //handle file upload 
    //pass to .net for process 
    console.log('verifying');
    //delete the original file 
    var mid = Number(req.body.mid); console.log(__dirname.replace("routes", "public\\uploads\\"));
    var filePath = path.join(__dirname.replace("routes", "public\\uploads\\"), req.body.filename);
    fs.unlink(delfile);
    services.manifestService.verifyManifest(mid, filePath).then(function (result) {
        res.send({ result: 'yea' });
    });


});

router.post('/rm-manifest', middleware(services.userService).checkSession, (req, res, next) => {
    var mid = Numebr(req.body.mid);
    if (isNaN(mid)) {
        res.send({ deleted: false });
    }
    else {
        rServices.manifestService.deleteManifest(mid).then((result) => {
            res.send(result);
        })
    }

});

//#endregion


//#region AWB

router.post('/get-customer-info', middleware(services.userService).checkSession, (req, res, next) => {
    //get customer information 
    var skybox = req.body.box;
    lredis.hgetall('tew:owners:' + skybox).then((result) => {
        console.log(result);
        if (result == null)
            res.send({
                err: 'Could not get customer information'
            });
        //send err
        else
            res.send(result);
    }).catch((err) => {
        res.send({
            err: 'Could not get customer information'
        });
    });

});
router.post('/get-mpackages/', middleware(services.userService).checkSession, (req, res, next) => {
    services.packageService.getReceivedPackages(0, 1).then(packages => {
        res.send(packages);
    })
})


router.get('/new-awb', (req, res, next) => {
    services.packageService.getNewAwb().then(awbRes => {
        res.send(awbRes);
    })
});
router.get('/awb-details/:id', (req, res, next) => {
    var awbId = req.params.id;
    console.log('looking for ' + awbId)
    services.packageService.getAwb(awbId).then(awb => {
        res.send(awb);
    })
})
router.post("/save-awb", middleware(services.userService).checkSession, (req, res, next) => {
    var body = req.body;
    body.username = res.User.username;
    console.log('save-awb', body, moment().toString("hh:mm:ss"));

    services.packageService.saveAwb(body).then(result => {
        res.send(result);
    })
});

router.post('/save-awb-package', middleware(services.userService).checkSession, (req, res, next) => {
    var body = req.body;
    console.log(body);
    services.packageService.savePackageToAwb(body).then(pkgResult => {
        console.log(pkgResult)
        res.send(pkgResult);
    })
})
router.post('/find-customer', (req, res, next) => {
    var body = req.body;
    console.log(body);
    services.customerService.findCustomer(body.search).then(customers => {
        res.send(customers);
    })
})
//#endregion
router.get('/download-flight-manifest/:mid', (req, res, next) => {
    var mid = req.params.mid;

    services.manifestService.getManifest(mid).then(manifest => {
        console.log(manifest)
        services.packageService.getPackageOnManifest(mid).then(packages => {
            console.log('packages', packages)
            flightManifest.generateManifest(manifest, packages).then(result => {
                console.log(result);
                setTimeout(() => {
                    res.download(result.filename);
                }, 500);

            })
        });

        //loadSheet.generateManifestLoadSheet(manifest); 
    })
})
router.get('/download-load-sheet/:mid', (req, res, next) => {
    var mid = req.params.mid;

    services.manifestService.getManifest(mid).then(manifest => {
        console.log(manifest)
        services.packageService.getPackageOnManifest(mid).then(packages => {
            console.log('packages', packages)
            loadSheet.generateManifestLoadSheet(manifest, packages).then(result => {
                console.log(result);
                setTimeout(() => {
                    res.download(result.filename);
                }, 500);

            })
        });

        //loadSheet.generateManifestLoadSheet(manifest); 
    })
})

//router.get("/download-load-sheet")
router.get('/incoming-shipment', (req, res, next) => {
    res.render('pages/warehouse/incoming-shipment', {})
})
router.get('/rec-package-nas', middleware(services.userService).checkSession, (req, res, next) => {
    var pageData = {};
    pageData.packages = [];
    pageData.title = "Recieve Package NAS";
    pageData.mid = req.params.mid;
    pageData.luser = res.User.firstName + ' ' + res.User.lastName;
    pageData.RoleId = res.User.role;

    res.render('pages/warehouse/rec-nas', pageData);
})
router.get('/update-invoice', middleware(services.userService).checkSession, (req, res, next) => {
    var pageData = {};
    pageData.packages = [];
    pageData.title = "Update Invoices";
    pageData.mid = req.params.mid;
    pageData.luser = res.User.firstName + ' ' + res.User.lastName;
    pageData.RoleId = res.User.role;
    res.render('pages/warehouse/invoice-update', pageData);
})
router.post('/rec-package-nas', middleware(services.userService).checkSession, (req, res, next) => {
    var pageData = {};
    pageData.packages = [];
    pageData.title = "Recieve Package NAS";
    pageData.mid = req.params.mid;
    pageData.luser = res.User.firstName + ' ' + res.User.lastName;
    pageData.RoleId = res.User.role;
    var body = req.body;
    var nas_location_id = 2;
    services.packageService.updateLocation(body.trackNo, nas_location_id).then(result => {
        res.render('pages/warehouse/rec-nas', pageData);
    })

})
router.post('/process-pkg-nas', middleware(services.userService).checkSession, (req, res, next) => {
    var pageData = {};
    pageData.packages = [];
    pageData.title = "Recieve Package NAS";
    pageData.mid = req.params.mid;
    pageData.luser = res.User.firstName + ' ' + res.User.lastName;
    pageData.RoleId = res.User.role;
    var body = req.body;
    var nas_location_id = 2;

    services.packageService.procssessPackage(body).then(result => {
        res.send(result)
    })


})
router.get('/delivery-detail/:id', middleware(services.userService).checkSession, (req, res, next) => {
    var pageData = {};
    pageData.packages = [];
    pageData.title = "Delivery Detail";
    pageData.mid = req.params.mid;
    pageData.luser = res.User.fristname + ' ' + res.User.lastname;
    pageData.RoleId = res.User.role;
    // services.packageService.getPackagesOnDelivery(deliveryId).then(packages=>{
    //     res.render('pages/warehouse/delivery-detail',pageData); 
    // })
    var deliveryId = req.params.id;
    res.render('pages/warehouse/delivery-detail', pageData);
})
router.get('/deliveries', middleware(services.userService).checkSession, (req, res, next) => {
    var pageData = {};
    pageData.packages = [];
    pageData.title = "Warehouse to Store Deliveries";
    pageData.mid = req.params.mid;
    pageData.luser = res.User.firstName + ' ' + res.User.lastName;
    pageData.RoleId = res.User.role;
    services.locationService.getLocations().then(locations => {
        services.deliveryService.getDeliveries().then(results => {
            pageData.deliveries = results.deliveries;
            pageData.locations = locations.locations;
            console.log(locations)
            res.render('pages/warehouse/deliveries', pageData);
        });
    })


})

router.get('/store-packages', middleware(services.userService).checkSession, (req, res, next) => {
    services.packageService.getNoDocsPackackages().then(packages => {
        var pageData = {};
        pageData.packages = packages;
        pageData.title = "Store Packages";
        pageData.mid = req.params.mid;
        pageData.luser = res.User.firstName + ' ' + res.User.lastName;
        pageData.RoleId = res.User.role;
        res.render('pages/warehouse/store-packages', pageData);
    })

})

router.get('/nas-no-docs', middleware(services.userService).checkSession, (req, res, next) => {
    services.packageService.getNoDocsPackackages().then(packages => {
        var pageData = {};
        pageData.packages = packages;
        pageData.title = "Packages with no documents";
        pageData.mid = req.params.mid;
        pageData.luser = res.User.firstName + ' ' + res.User.lastName;
        pageData.RoleId = res.User.role;
        res.render('pages/warehouse/nas-no-docs', pageData);
    })
})
router.post('/rm-package', middleware(services.userService).checkSession, (req, res, next) => {
    var trackingNo = req.body.trackingNo;
    var packageId = req.body.id;
    var manifest = req.body.mid;
    console.log('removing package ' + packageId)
    rServices.packageService.removePackageById(packageId).then((delResult) => {
        res.send(delResult);
    });
});

router.post('/save-package', middleware(services.userService).checkSession, (req, res, next) => {
    var body = req.body;
    rServices.packageService.savePackage(body).then((result) => {
        console.log('printing the result here')
        console.log(result);
        console.log('_-----------------------------')
        NewPackageAlert(result.sPackage);
        res.send(result);


    }).catch((err) => {
        res.send(err);
    });
    //save the package to the package NS




});
router.get('/no-docs/', middleware(services.userService).checkSession, (req, res, next) => {

})
router.post('/packages', middleware(services.userService).checkSession, (req, res, next) => {
    var body = req.body;
    var package = {
        trackingNo: body.trackingNo,
        description: body.description,
        shipper: body.shipper,
        value: Number(body.value),
        pieces: Number(body.pieces),
        weight: Number(body.weight)
    };
    redis.hmset('packages:' + package.trackingNo, package);
    console.log(package);
    res.redirect('/warehouse/packages');
});

function NewPackageAlert(package) {
    var emailBody = "";
    var emailRequest = {
        email: emailBody,
        toPerson: "",
        name: ""
    }
    console.log(__dirname);
    fs.readFile(path.join(__dirname.replace("routes", ""), "public/emails/package_receipt/index.html"), "UTF8", function (err, data) {
        if (err)
            console.log(err);
        emailRequest.email = data;

        // lredis.hgetall("tew:owners:" + package.skybox).then((customer) => {
        //     emailRequest.toPerson = customer.email;
        //     emailRequest.name = customer.name;
        //     //replace the email with the detials 
        //     emailRequest.email = emailRequest.email.replace("{{NAME}}", customer.name)
        //     emailRequest.email = emailRequest.email.replace("{{TRACKINGNO}}", package.trackingNo)
        //     if (typeof package.shipper != "undefined")
        //         emailRequest.email = emailRequest.email.replace("{{SHIPPER}}", package.shipper);
        //     else
        //         emailRequest.email = emailRequest.email.replace("{{SHIPPER}}", "N/A");
        //     emailRequest.email = emailRequest.email.replace("{{DATEREC}}", moment().format("YYYY-MM-DD"));
        //     redis.client.hexists("packages:" + package.trackingNo, "emailSent", (err, exists) => {
        //         if (exists == 0) {

        //             services.manifestService.alertCustomer(emailRequest).then((emailResult) => {
        //                 //set the package to alerted 
        //                 if (emailResult.sent == true)
        //                     redis.hmset("packages:" + package, { emailSent: 1 })
        //             })
        //         }
        //     });
        // });

    });

}
//#endregion

//#region Processing 
router.post('/store-package', middleware(services.userService).checkSession, (req, res, next) => {
    var body = req.body;
    var trackingNo = body.package;
    var bin = body.bin;
    console.log(bin);
    rServices.packageService.storePackageForPickup(trackingNo, bin).then(function (result) {
        var rtn = {
            updated: true,
            package: result
        }
        res.send(rtn);
    });
});
router.get('/processing', middleware(services.userService).checkSession, (req, res, next) => {
    var pageData = {};
    pageData.title = "Manifest Processing";
    pageData.luser = res.User.FirstName + ' ' + res.User.LastName;
    pageData.RoleId = res.User.role;
    rServices.manifestService.getManifestProcessing().then((data) => {

        pageData.manifestList = data.manifests;
        res.render('pages/warehouse/processing', pageData)
    });

});
router.get('/get-processing/:mid', middleware(services.userService).checkSession, (req, res, next) => {
    var mid = Number(req.params.mid)
    rServices.packageService.getManifestPackagesByStatus(mid, 3).then((packages) => {
        res.send(packages);
    })
});
router.post('/process-package', middleware(services.userService).checkSession, (req, res, next) => {

    //1. find the package 
    //2. we need update the status 
    //3. we need to re-index the record 
    var body = req.body;
    console.log(body);
    //make sure it exists 
    lredis.client.exists("packages:" + body.package, (err, result) => {
        console.log('first result' + result);
        if (result == 1) {
            lredis.hmset("packages:" + body.package, { "status": 3, "processedBy": res.User.Username }).then((err) => {
                lredis.getPackage(body.package).then(function (rpackage) {
                    rServices.packageService.updatePackageIndex(body.package);
                    res.send({ 'updated': true, package: rpackage });
                });

            });
        }
        else {
            res.send({ updated: false });
        }
    });
});

router.get('/store-check-in', middleware(services.userService).checkSession, (req, res, next) => {
    var pageData = {};
    pageData.title = "Store Checkin";
    pageData.luser = res.User.FirstName + ' ' + res.User.LastName;
    pageData.RoleId = res.User.role;
    res.render('pages/warehouse/store-checkin', pageData);
})
//#endregion

router.post('/download-awb', function (req, res, next) {
    var template = path.join(__dirname.replace("routes", "templates\\"), "awb-template.pdf");
    var body = req.body;
    console.log(body)
    var mid = Number(body.mid);

    services.manifestService.getAwb(mid, template, body.totalWeight, body.totalValue, body.pieces).then((result) => {
        console.log(result);
        res.send({ filename: result.filename });
    });
});
router.get('/download-file/:filename', function (req, res, net) {
    var file = req.params.filename;
    var dir = __dirname.replace("routes", "templates\\");
    res.download(path.join(dir, file));
});
router.post('/upload', function (req, res) {
    // create an incoming form object
    console.log("yes sur we got a file uploaded! check the upload dir.");
    var uploadedFiles = [];
    var index = 0;
    var form = new formidable.IncomingForm();
    var orignalFiles = [];
    // specify that we want to allow the user to upload multiple files in a single request
    form.multiples = false;
    console.log(__dirname);
    // store all uploads in the /uploads directory
    form.uploadDir = path.join(__dirname.replace("routes", ""), '/public/uploads');
    var imagesDir = path.join(__dirname.replace("routes", ""), '/public/images');
    // every time a file has been uploaded successfully,
    // rename it to it's orginal name
    var IMAGES_PATH = path.join(form.uploadDir, '*.{png,jpeg,jpg,svg,gif}');
    form.on('file', function (field, file) {
        //mv(file.path, path.join(form.uploadDir, file.name));
        var content;
        var unique = uniqid();
        orignalFiles[index] = file.path;
        // First I want to read the file
        fs.readFile(file.path, function read(err, data) {
            if (err) {
                throw err;
            }
            content = data;

            fs.writeFile(path.join(form.uploadDir, unique + file.name), content, function (err) {
                if (err) throw err;
                /!*do something else.*!/
                // fs.unlink(file.path);
            });
        });


        //fs.rename(file.path, path.join(form.uploadDir, file.name));
        console.log('BIG file uploaded yee-haaaa!');
        uploadedFiles[index] = {
            'uploadedFile': unique + file.name
        };
        var filename = file.name;

        console.log("images:" + IMAGES_PATH);
        console.log("publish:" + imagesDir);


    });

    // log any errors that occur
    form.on('error', function (err) {
        console.log('An error has occured: \n' + err);
    });

    // once all the files have been uploaded, send a response to the client
    form.on('end', function () {
        //we want to upload to azure storage from here
        console.log(uploadedFiles);
        delfile = orignalFiles[0];
        // fs.unlink(orignalFiles[0]);
        res.end(JSON.stringify(uploadedFiles));

    });

    // parse the incoming request containing the form data
    form.parse(req);
});
module.exports = router;