var services = require('./Services/RedisDataServices');
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
            // var token = req.session.token;
            // if (token) {
            //     utils.verifyToken(token).then(function (user) {
            //         res.user = user;
            //         // Temporary disable the printer
            //         // res.printer = services.printService.getUserPrinter(user.username);
            //         var navMode = handleNavigation(user);
            //         res.navigationMode = navMode;
            //         req['userId'] = user['_id'];
            //         req['username'] = user['username'];
            //         req['user'] = user;

            //         if (Array.isArray(allowedRoles))
            //             if (allowedRoles.indexOf(user.role) < 0) {
            //                 res.status(401).render('pages/401', { user: user });
            //             }
            //         next();
            //     }, function () {
            //         res.redirect('/')
            //         // res.status(401).render('pages/401', { title: 'Express', failed: '0' });
            //     });
            // }
            // else
            //     res.redirect('/')
        },
    }
};