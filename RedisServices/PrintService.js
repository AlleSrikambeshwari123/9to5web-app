'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var dataContext = require('./dataContext');

var PrintService = exports.PrintService = function () {
    function PrintService() {
        _classCallCheck(this, PrintService);
    }
    //print awb 


    _createClass(PrintService, [{
        key: 'sendAwbToPrint',
        value: function sendAwbToPrint(awb, username) {
            dataContext.redisClient.publish("print:awb:" + username, awb);
        }
    }, {
        key: 'sendLblToPrint',
        value: function sendLblToPrint(awb, username) {
            dataContext.redisClient.publish('print:lbl:' + username, awb);
        }
    }]);

    return PrintService;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUHJpbnRTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJkYXRhQ29udGV4dCIsInJlcXVpcmUiLCJQcmludFNlcnZpY2UiLCJhd2IiLCJ1c2VybmFtZSIsInJlZGlzQ2xpZW50IiwicHVibGlzaCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLElBQUlBLGNBQWNDLFFBQVEsZUFBUixDQUFsQjs7SUFDYUMsWSxXQUFBQSxZO0FBQ1QsNEJBQWE7QUFBQTtBQUVaO0FBQ0Q7Ozs7O3VDQUNlQyxHLEVBQUlDLFEsRUFBUztBQUN4Qkosd0JBQVlLLFdBQVosQ0FBd0JDLE9BQXhCLENBQWdDLGVBQWFGLFFBQTdDLEVBQXNERCxHQUF0RDtBQUNIOzs7dUNBQ2NBLEcsRUFBSUMsUSxFQUFTO0FBQ3hCSix3QkFBWUssV0FBWixDQUF3QkMsT0FBeEIsQ0FBZ0MsZUFBYUYsUUFBN0MsRUFBc0RELEdBQXREO0FBQ0giLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9QcmludFNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgZGF0YUNvbnRleHQgPSByZXF1aXJlKCcuL2RhdGFDb250ZXh0JylcbmV4cG9ydCBjbGFzcyBQcmludFNlcnZpY2V7XG4gICAgY29uc3RydWN0b3IoKXtcblxuICAgIH1cbiAgICAvL3ByaW50IGF3YiBcbiAgICBzZW5kQXdiVG9QcmludChhd2IsdXNlcm5hbWUpe1xuICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5wdWJsaXNoKFwicHJpbnQ6YXdiOlwiK3VzZXJuYW1lLGF3YilcbiAgICB9XG4gICAgc2VuZExibFRvUHJpbnQoYXdiLHVzZXJuYW1lKXtcbiAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQucHVibGlzaCgncHJpbnQ6bGJsOicrdXNlcm5hbWUsYXdiKVxuICAgIH1cblxufSJdfQ==
