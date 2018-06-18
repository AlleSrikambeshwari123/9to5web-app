/**
 * Created by Stevan on 10/2/2017.
 */

module.exports = function(userService,allowedRoles){
    function handleNavigation(user){
        var adminRoles  = ['Admin'];
        var CSRRoles = ['CSR'];
        var immigrationRoles = ['Immigration-IT'];

        if (adminRoles.indexOf(user.Role)>-1){
            return "admin-mode";
        }
        if(CSRRoles.indexOf(user.RoleName)>-1){
            return "csr-mode";

        }
        if(immigrationRoles.indexOf(user.RoleName)>-1){
            return "immigration-mode";

        }

    }
    return {
        requireAuthentication : function(req,res,next){
            //get the session here
            var pageData = {};
            var token = req.session.token;
            if(token){
                userService.verifyToken(token).then(function(user){
                    res.User = user;
                    pageData.User = user;
                    //if users is in role
                    if (Array.isArray(allowedRoles) )
                        if (allowedRoles.indexOf(user.RoleName) < 0){

                            res.status(401).render('pages/401', pageData);
                        }
                    var navMode = handleNavigation(user);

                    res.navigationMode = navMode;
                    next();
                },function(){
                    res.status(401).render('pages/401', { title: 'Express',failed:'0' });
                });
            }
            else
                res.redirect('/')

        },

    }
};