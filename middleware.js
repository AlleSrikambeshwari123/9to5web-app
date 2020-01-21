var printerUtil = require("./Util/PrinterUtil")
var services = require('./RedisServices/RedisDataServices');
var utils = require('./Util/utils');

module.exports = function (allowedRoles) {
    function handleNavigation(user) {
        var adminRoles = ['Admin'];
        var CSRRoles = ['CSR'];

        if (adminRoles.indexOf(user.role) > -1) {
            return "admin-mode";
        }
    }
    return {
        checkSession: async function (req, res, next) {
            var token = req.session.token;
            if (token) {
                utils.verifyToken(token).then(function (user) {
                    res.user = user;
                    res.printer = printerUtil.getUserPrinter(user.username);
                    var navMode = handleNavigation(user);
                    console.log("NAV MODE", navMode);
                    //if users is in role
                    if (Array.isArray(allowedRoles))
                        if (allowedRoles.indexOf(user.role) < 0) {
                            res.status(401).render('pages/401', { user: user });
                        }
                    var navMode = handleNavigation(user);
                    console.log("NAV MODE", navMode);
                    res.navigationMode = navMode;
                    next();
                }, function () {
                    res.status(401).render('pages/401', { title: 'Express', failed: '0' });
                });
            }
            else
                res.redirect('/')
        },
    }
};