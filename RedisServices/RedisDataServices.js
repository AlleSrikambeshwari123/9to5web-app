'use strict';

var CustomerService = require('./CustomerService').CustomerService;
var ManifestService = require('./ManifestService').ManifestService;
var customerService = new CustomerService();
var manifestService = new ManifestService();
var PackageService = require('./PackageService').PackageService;
var packageService = new PackageService();
var UserService = require('./UserService').UserService;
var userService = new UserService();

module.exports = {
  customerService: customerService,
  manifestService: manifestService,
  packageService: packageService,
  userService: userService
};
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUmVkaXNEYXRhU2VydmljZXMuZXM2Il0sIm5hbWVzIjpbIkN1c3RvbWVyU2VydmljZSIsInJlcXVpcmUiLCJNYW5pZmVzdFNlcnZpY2UiLCJjdXN0b21lclNlcnZpY2UiLCJtYW5pZmVzdFNlcnZpY2UiLCJQYWNrYWdlU2VydmljZSIsInBhY2thZ2VTZXJ2aWNlIiwiVXNlclNlcnZpY2UiLCJ1c2VyU2VydmljZSIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7O0FBQUEsSUFBSUEsa0JBQWtCQyxRQUFRLG1CQUFSLEVBQTZCRCxlQUFuRDtBQUNBLElBQUlFLGtCQUFrQkQsUUFBUSxtQkFBUixFQUE2QkMsZUFBbkQ7QUFDQSxJQUFJQyxrQkFBa0IsSUFBSUgsZUFBSixFQUF0QjtBQUNBLElBQUlJLGtCQUFrQixJQUFJRixlQUFKLEVBQXRCO0FBQ0EsSUFBSUcsaUJBQWlCSixRQUFRLGtCQUFSLEVBQTRCSSxjQUFqRDtBQUNBLElBQUlDLGlCQUFpQixJQUFJRCxjQUFKLEVBQXJCO0FBQ0EsSUFBSUUsY0FBY04sUUFBUSxlQUFSLEVBQXlCTSxXQUEzQztBQUNBLElBQUlDLGNBQWMsSUFBSUQsV0FBSixFQUFsQjs7QUFFQUUsT0FBT0MsT0FBUCxHQUFpQjtBQUNmUCxtQkFBaUJBLGVBREY7QUFFZkMsbUJBQWlCQSxlQUZGO0FBR2ZFLGtCQUFnQkEsY0FIRDtBQUlmRSxlQUFZQTtBQUpHLENBQWpCIiwiZmlsZSI6IlJlZGlzU2VydmljZXMvUmVkaXNEYXRhU2VydmljZXMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgQ3VzdG9tZXJTZXJ2aWNlID0gcmVxdWlyZSgnLi9DdXN0b21lclNlcnZpY2UnKS5DdXN0b21lclNlcnZpY2U7IFxudmFyIE1hbmlmZXN0U2VydmljZSA9IHJlcXVpcmUoJy4vTWFuaWZlc3RTZXJ2aWNlJykuTWFuaWZlc3RTZXJ2aWNlOyBcbnZhciBjdXN0b21lclNlcnZpY2UgPSBuZXcgQ3VzdG9tZXJTZXJ2aWNlKCk7IFxudmFyIG1hbmlmZXN0U2VydmljZSA9IG5ldyBNYW5pZmVzdFNlcnZpY2UoKTsgXG52YXIgUGFja2FnZVNlcnZpY2UgPSByZXF1aXJlKCcuL1BhY2thZ2VTZXJ2aWNlJykuUGFja2FnZVNlcnZpY2VcbnZhciBwYWNrYWdlU2VydmljZSA9IG5ldyBQYWNrYWdlU2VydmljZSgpOyBcbnZhciBVc2VyU2VydmljZSA9IHJlcXVpcmUoJy4vVXNlclNlcnZpY2UnKS5Vc2VyU2VydmljZTsgXG52YXIgdXNlclNlcnZpY2UgPSBuZXcgVXNlclNlcnZpY2UoKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7IFxuICBjdXN0b21lclNlcnZpY2U6IGN1c3RvbWVyU2VydmljZSxcbiAgbWFuaWZlc3RTZXJ2aWNlOiBtYW5pZmVzdFNlcnZpY2UsXG4gIHBhY2thZ2VTZXJ2aWNlOiBwYWNrYWdlU2VydmljZSxcbiAgdXNlclNlcnZpY2U6dXNlclNlcnZpY2Vcbn0iXX0=
