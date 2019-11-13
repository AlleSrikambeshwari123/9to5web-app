"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var dataContext = require('./dataContext');
var printUtil = require("../Util/PrinterUtil");

var PrintService = exports.PrintService = function () {
    function PrintService() {
        _classCallCheck(this, PrintService);
    }
    //print awb 


    _createClass(PrintService, [{
        key: "sendAwbToPrint",
        value: async function sendAwbToPrint(awb, username) {
            var printServer = await printUtil.getUserPrinter(username);
            console.log("printServer:", printServer);
            dataContext.redisClient.publish("print:awb:" + printServer, awb);
        }
    }, {
        key: "sendLblToPrint",
        value: async function sendLblToPrint(awb, username) {
            var printServer = await printUtil.getUserPrinter(username);
            console.log("printServer:", printServer);
            dataContext.redisClient.publish('print:lbl:' + printServer, awb);
        }
    }, {
        key: "sendSingleLbl",
        value: async function sendSingleLbl(awb, pkgId, username) {
            var printServer = await printUtil.getUserPrinter(username);
            console.log("printServer:", printServer);
            dataContext.redisClient.publish('print:single:lbl:' + printServer, awb + ":" + pkgId);
        }
    }]);

    return PrintService;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUHJpbnRTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJkYXRhQ29udGV4dCIsInJlcXVpcmUiLCJwcmludFV0aWwiLCJQcmludFNlcnZpY2UiLCJhd2IiLCJ1c2VybmFtZSIsInByaW50U2VydmVyIiwiZ2V0VXNlclByaW50ZXIiLCJjb25zb2xlIiwibG9nIiwicmVkaXNDbGllbnQiLCJwdWJsaXNoIiwicGtnSWQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxjQUFjQyxRQUFRLGVBQVIsQ0FBbEI7QUFDQSxJQUFJQyxZQUFZRCxRQUFRLHFCQUFSLENBQWhCOztJQUNhRSxZLFdBQUFBLFk7QUFDVCw0QkFBYTtBQUFBO0FBRVo7QUFDRDs7Ozs7NkNBQ3FCQyxHLEVBQUlDLFEsRUFBUztBQUM5QixnQkFBSUMsY0FBYyxNQUFNSixVQUFVSyxjQUFWLENBQXlCRixRQUF6QixDQUF4QjtBQUNBRyxvQkFBUUMsR0FBUixDQUFZLGNBQVosRUFBMkJILFdBQTNCO0FBQ0FOLHdCQUFZVSxXQUFaLENBQXdCQyxPQUF4QixDQUFnQyxlQUFhTCxXQUE3QyxFQUF5REYsR0FBekQ7QUFDSDs7OzZDQUNvQkEsRyxFQUFJQyxRLEVBQVM7QUFDOUIsZ0JBQUlDLGNBQWMsTUFBTUosVUFBVUssY0FBVixDQUF5QkYsUUFBekIsQ0FBeEI7QUFDQUcsb0JBQVFDLEdBQVIsQ0FBWSxjQUFaLEVBQTJCSCxXQUEzQjtBQUNBTix3QkFBWVUsV0FBWixDQUF3QkMsT0FBeEIsQ0FBZ0MsZUFBYUwsV0FBN0MsRUFBeURGLEdBQXpEO0FBQ0g7Ozs0Q0FDbUJBLEcsRUFBSVEsSyxFQUFNUCxRLEVBQVM7QUFDbkMsZ0JBQUlDLGNBQWMsTUFBTUosVUFBVUssY0FBVixDQUF5QkYsUUFBekIsQ0FBeEI7QUFDQUcsb0JBQVFDLEdBQVIsQ0FBWSxjQUFaLEVBQTJCSCxXQUEzQjtBQUNBTix3QkFBWVUsV0FBWixDQUF3QkMsT0FBeEIsQ0FBZ0Msc0JBQW9CTCxXQUFwRCxFQUFxRUYsR0FBckUsU0FBNEVRLEtBQTVFO0FBQ0giLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9QcmludFNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgZGF0YUNvbnRleHQgPSByZXF1aXJlKCcuL2RhdGFDb250ZXh0JylcbnZhciBwcmludFV0aWwgPSByZXF1aXJlKFwiLi4vVXRpbC9QcmludGVyVXRpbFwiKVxuZXhwb3J0IGNsYXNzIFByaW50U2VydmljZXtcbiAgICBjb25zdHJ1Y3Rvcigpe1xuXG4gICAgfVxuICAgIC8vcHJpbnQgYXdiIFxuICAgIGFzeW5jIHNlbmRBd2JUb1ByaW50KGF3Yix1c2VybmFtZSl7XG4gICAgICAgIHZhciBwcmludFNlcnZlciA9IGF3YWl0IHByaW50VXRpbC5nZXRVc2VyUHJpbnRlcih1c2VybmFtZSlcbiAgICAgICAgY29uc29sZS5sb2coXCJwcmludFNlcnZlcjpcIixwcmludFNlcnZlcilcbiAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQucHVibGlzaChcInByaW50OmF3YjpcIitwcmludFNlcnZlcixhd2IpXG4gICAgfVxuICAgIGFzeW5jIHNlbmRMYmxUb1ByaW50KGF3Yix1c2VybmFtZSl7XG4gICAgICAgIHZhciBwcmludFNlcnZlciA9IGF3YWl0IHByaW50VXRpbC5nZXRVc2VyUHJpbnRlcih1c2VybmFtZSlcbiAgICAgICAgY29uc29sZS5sb2coXCJwcmludFNlcnZlcjpcIixwcmludFNlcnZlcilcbiAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQucHVibGlzaCgncHJpbnQ6bGJsOicrcHJpbnRTZXJ2ZXIsYXdiKVxuICAgIH1cbiAgICBhc3luYyBzZW5kU2luZ2xlTGJsKGF3Yixwa2dJZCx1c2VybmFtZSl7XG4gICAgICAgIHZhciBwcmludFNlcnZlciA9IGF3YWl0IHByaW50VXRpbC5nZXRVc2VyUHJpbnRlcih1c2VybmFtZSlcbiAgICAgICAgY29uc29sZS5sb2coXCJwcmludFNlcnZlcjpcIixwcmludFNlcnZlcilcbiAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQucHVibGlzaCgncHJpbnQ6c2luZ2xlOmxibDonK3ByaW50U2VydmVyLCAgYCR7YXdifToke3BrZ0lkfWApXG4gICAgfVxuXG59Il19
