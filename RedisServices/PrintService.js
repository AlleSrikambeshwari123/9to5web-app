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
    }, {
        key: 'sendSingleLbl',
        value: function sendSingleLbl(awb, pkgId, username) {
            dataContext.redisClient.publish('print:single:lbl:' + username, awb + ':' + pkgId);
        }
    }]);

    return PrintService;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvUHJpbnRTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJkYXRhQ29udGV4dCIsInJlcXVpcmUiLCJQcmludFNlcnZpY2UiLCJhd2IiLCJ1c2VybmFtZSIsInJlZGlzQ2xpZW50IiwicHVibGlzaCIsInBrZ0lkIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEsSUFBSUEsY0FBY0MsUUFBUSxlQUFSLENBQWxCOztJQUNhQyxZLFdBQUFBLFk7QUFDVCw0QkFBYTtBQUFBO0FBRVo7QUFDRDs7Ozs7dUNBQ2VDLEcsRUFBSUMsUSxFQUFTO0FBQ3hCSix3QkFBWUssV0FBWixDQUF3QkMsT0FBeEIsQ0FBZ0MsZUFBYUYsUUFBN0MsRUFBc0RELEdBQXREO0FBQ0g7Ozt1Q0FDY0EsRyxFQUFJQyxRLEVBQVM7QUFDeEJKLHdCQUFZSyxXQUFaLENBQXdCQyxPQUF4QixDQUFnQyxlQUFhRixRQUE3QyxFQUFzREQsR0FBdEQ7QUFDSDs7O3NDQUNhQSxHLEVBQUlJLEssRUFBTUgsUSxFQUFTO0FBQzdCSix3QkFBWUssV0FBWixDQUF3QkMsT0FBeEIsQ0FBZ0Msc0JBQW9CRixRQUFwRCxFQUFrRUQsR0FBbEUsU0FBeUVJLEtBQXpFO0FBQ0giLCJmaWxlIjoiUmVkaXNTZXJ2aWNlcy9QcmludFNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgZGF0YUNvbnRleHQgPSByZXF1aXJlKCcuL2RhdGFDb250ZXh0JylcbmV4cG9ydCBjbGFzcyBQcmludFNlcnZpY2V7XG4gICAgY29uc3RydWN0b3IoKXtcblxuICAgIH1cbiAgICAvL3ByaW50IGF3YiBcbiAgICBzZW5kQXdiVG9QcmludChhd2IsdXNlcm5hbWUpe1xuICAgICAgICBkYXRhQ29udGV4dC5yZWRpc0NsaWVudC5wdWJsaXNoKFwicHJpbnQ6YXdiOlwiK3VzZXJuYW1lLGF3YilcbiAgICB9XG4gICAgc2VuZExibFRvUHJpbnQoYXdiLHVzZXJuYW1lKXtcbiAgICAgICAgZGF0YUNvbnRleHQucmVkaXNDbGllbnQucHVibGlzaCgncHJpbnQ6bGJsOicrdXNlcm5hbWUsYXdiKVxuICAgIH1cbiAgICBzZW5kU2luZ2xlTGJsKGF3Yixwa2dJZCx1c2VybmFtZSl7XG4gICAgICAgIGRhdGFDb250ZXh0LnJlZGlzQ2xpZW50LnB1Ymxpc2goJ3ByaW50OnNpbmdsZTpsYmw6Jyt1c2VybmFtZSwgIGAke2F3Yn06JHtwa2dJZH1gKVxuICAgIH1cblxufSJdfQ==
