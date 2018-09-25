"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var PackageUtility = exports.PackageUtility = function () {
    function PackageUtility() {
        _classCallCheck(this, PackageUtility);

        this._EXRATE = 7.0;
        this._VAT = 0.125;
        this._BROKERAGE = 0.3;
        this._FUEL = 0.15;
        this._AIR_SHIPPING_FEE = [2.57, 2.50, 2.25];
        this._SEA_SHIPPING_FEE = 0.95;
    }

    _createClass(PackageUtility, [{
        key: "calculateFees",
        value: function calculateFees(cpackage) {

            //caclulate for sea 
            cpackage = Object.assign(cpackage, this.calculateCargoFees(cpackage));
            return cpackage;
        }
    }, {
        key: "calculateCargoFees",
        value: function calculateCargoFees(cpackage) {

            var fees = {
                ttvalue: 0,
                duty: 0,
                vat: 0,
                shippingValue: 0,
                opt: 0,
                fuelFee: 0,
                brokerageFee: 0
            };

            //do your cals here 

            fees.ttvalue = cpackage.value * this._EXRATE;
            fees.freight = cpackage.weight * this._EXRATE;

            fees.insurance = fees.ttvalue * .02;
            fees.duty = cpackage.dutyPercent * (fees.ttvalue + fees.freight);
            fees.opt = (fees.ttvalue + fees.freight) * .07;
            fees.vat = (fees.ttvalue + fees.duty + fees.freight) * this._VAT;

            //shipping cost calculated based on weight  
            if (cpackage.mtype != 2) {
                if (0 >= cpackage.weight <= 25) {

                    fees.shippingValue = cpackage.weight * this._AIR_SHIPPING_FEE[0];
                } else if (25 > cpackage.weight <= 50) {
                    fees.shippingValue = cpackage.weight * this._AIR_SHIPPING_FEE[1];
                } else if (cpackage.weight > 50) {
                    fees.shippingValue = cpackage.weight * this._AIR_SHIPPING_FEE[2];
                }

                fees.shippingValue = fees.shippingValue * this._EXRATE;
                fees.brokerageFee = (fees.duty + fees.vat + fees.opt) * this._BROKERAGE;
            } else {
                //shipping by sea 
                fees.shippingValue = cpackage.weight * this._SEA_SHIPPING_FEE;
                fees.billOfLaden = 10 * this._EXRATE;
                fees.docFee = 10 * this._EXRATE;
                fees.brokerageFee = fees.ttvalue * this._BROKERAGE;
            }

            //common fees to both air and shipping 
            fees.fuelFee = fees.shippingValue * this._FUEL;
            fees.totalCost = fees.duty + fees.shippingValue + fees.opt + fees.brokerageFee + fees.fuelFee + fees.vat;

            return fees;
        }
    }]);

    return PackageUtility;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlV0aWwvcGFja2FnZXV0aWwuZXM2Il0sIm5hbWVzIjpbIlBhY2thZ2VVdGlsaXR5IiwiX0VYUkFURSIsIl9WQVQiLCJfQlJPS0VSQUdFIiwiX0ZVRUwiLCJfQUlSX1NISVBQSU5HX0ZFRSIsIl9TRUFfU0hJUFBJTkdfRkVFIiwiY3BhY2thZ2UiLCJPYmplY3QiLCJhc3NpZ24iLCJjYWxjdWxhdGVDYXJnb0ZlZXMiLCJmZWVzIiwidHR2YWx1ZSIsImR1dHkiLCJ2YXQiLCJzaGlwcGluZ1ZhbHVlIiwib3B0IiwiZnVlbEZlZSIsImJyb2tlcmFnZUZlZSIsInZhbHVlIiwiZnJlaWdodCIsIndlaWdodCIsImluc3VyYW5jZSIsImR1dHlQZXJjZW50IiwibXR5cGUiLCJiaWxsT2ZMYWRlbiIsImRvY0ZlZSIsInRvdGFsQ29zdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztJQUdhQSxjLFdBQUFBLGM7QUFFVCw4QkFBYTtBQUFBOztBQUNULGFBQUtDLE9BQUwsR0FBZSxHQUFmO0FBQ0EsYUFBS0MsSUFBTCxHQUFZLEtBQVo7QUFDQSxhQUFLQyxVQUFMLEdBQWtCLEdBQWxCO0FBQ0EsYUFBS0MsS0FBTCxHQUFhLElBQWI7QUFDQSxhQUFLQyxpQkFBTCxHQUF5QixDQUFDLElBQUQsRUFBTSxJQUFOLEVBQVcsSUFBWCxDQUF6QjtBQUNBLGFBQUtDLGlCQUFMLEdBQXlCLElBQXpCO0FBQ0g7Ozs7c0NBRWFDLFEsRUFBUzs7QUFFbkI7QUFDQUEsdUJBQVlDLE9BQU9DLE1BQVAsQ0FBY0YsUUFBZCxFQUF1QixLQUFLRyxrQkFBTCxDQUF3QkgsUUFBeEIsQ0FBdkIsQ0FBWjtBQUNBLG1CQUFPQSxRQUFQO0FBQ0g7OzsyQ0FHa0JBLFEsRUFBUzs7QUFFeEIsZ0JBQUlJLE9BQU87QUFDUEMseUJBQVEsQ0FERDtBQUVQQyxzQkFBSyxDQUZFO0FBR1BDLHFCQUFJLENBSEc7QUFJUEMsK0JBQWMsQ0FKUDtBQUtQQyxxQkFBSSxDQUxHO0FBTVBDLHlCQUFRLENBTkQ7QUFPUEMsOEJBQWE7QUFQTixhQUFYOztBQVVBOztBQUVBUCxpQkFBS0MsT0FBTCxHQUFlTCxTQUFTWSxLQUFULEdBQWlCLEtBQUtsQixPQUFyQztBQUNBVSxpQkFBS1MsT0FBTCxHQUFlYixTQUFTYyxNQUFULEdBQWtCLEtBQUtwQixPQUF0Qzs7QUFFQVUsaUJBQUtXLFNBQUwsR0FBaUJYLEtBQUtDLE9BQUwsR0FBZSxHQUFoQztBQUNBRCxpQkFBS0UsSUFBTCxHQUFZTixTQUFTZ0IsV0FBVCxJQUF3QlosS0FBS0MsT0FBTCxHQUFlRCxLQUFLUyxPQUE1QyxDQUFaO0FBQ0FULGlCQUFLSyxHQUFMLEdBQVcsQ0FBQ0wsS0FBS0MsT0FBTCxHQUFlRCxLQUFLUyxPQUFyQixJQUErQixHQUExQztBQUNBVCxpQkFBS0csR0FBTCxHQUFXLENBQUNILEtBQUtDLE9BQUwsR0FBZUQsS0FBS0UsSUFBcEIsR0FBMkJGLEtBQUtTLE9BQWpDLElBQTRDLEtBQUtsQixJQUE1RDs7QUFFQTtBQUNBLGdCQUFJSyxTQUFTaUIsS0FBVCxJQUFpQixDQUFyQixFQUF1QjtBQUNuQixvQkFBSSxLQUFJakIsU0FBU2MsTUFBYixJQUFzQixFQUExQixFQUE2Qjs7QUFFekJWLHlCQUFLSSxhQUFMLEdBQXFCUixTQUFTYyxNQUFULEdBQWtCLEtBQUtoQixpQkFBTCxDQUF1QixDQUF2QixDQUF2QztBQUNILGlCQUhELE1BSUssSUFBSSxLQUFLRSxTQUFTYyxNQUFkLElBQXVCLEVBQTNCLEVBQStCO0FBQ2hDVix5QkFBS0ksYUFBTCxHQUFxQlIsU0FBU2MsTUFBVCxHQUFrQixLQUFLaEIsaUJBQUwsQ0FBdUIsQ0FBdkIsQ0FBdkM7QUFDSCxpQkFGSSxNQUdBLElBQUlFLFNBQVNjLE1BQVQsR0FBZ0IsRUFBcEIsRUFBdUI7QUFDeEJWLHlCQUFLSSxhQUFMLEdBQXFCUixTQUFTYyxNQUFULEdBQWtCLEtBQUtoQixpQkFBTCxDQUF1QixDQUF2QixDQUF2QztBQUNIOztBQUVETSxxQkFBS0ksYUFBTCxHQUFxQkosS0FBS0ksYUFBTCxHQUFxQixLQUFLZCxPQUEvQztBQUNBVSxxQkFBS08sWUFBTCxHQUFvQixDQUFDUCxLQUFLRSxJQUFMLEdBQVlGLEtBQUtHLEdBQWpCLEdBQXVCSCxLQUFLSyxHQUE3QixJQUFvQyxLQUFLYixVQUE3RDtBQUNILGFBZEQsTUFlSztBQUNEO0FBQ0FRLHFCQUFLSSxhQUFMLEdBQXFCUixTQUFTYyxNQUFULEdBQWtCLEtBQUtmLGlCQUE1QztBQUNBSyxxQkFBS2MsV0FBTCxHQUFvQixLQUFLLEtBQUt4QixPQUE5QjtBQUNBVSxxQkFBS2UsTUFBTCxHQUFjLEtBQUssS0FBS3pCLE9BQXhCO0FBQ0FVLHFCQUFLTyxZQUFMLEdBQW9CUCxLQUFLQyxPQUFMLEdBQWUsS0FBS1QsVUFBeEM7QUFDSDs7QUFFRDtBQUNBUSxpQkFBS00sT0FBTCxHQUFlTixLQUFLSSxhQUFMLEdBQXFCLEtBQUtYLEtBQXpDO0FBQ0FPLGlCQUFLZ0IsU0FBTCxHQUFrQmhCLEtBQUtFLElBQUwsR0FBWUYsS0FBS0ksYUFBakIsR0FBaUNKLEtBQUtLLEdBQXRDLEdBQTJDTCxLQUFLTyxZQUFoRCxHQUErRFAsS0FBS00sT0FBcEUsR0FBOEVOLEtBQUtHLEdBQXJHOztBQUdBLG1CQUFPSCxJQUFQO0FBQ0giLCJmaWxlIjoiVXRpbC9wYWNrYWdldXRpbC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxyXG5cclxuXHJcbmV4cG9ydCBjbGFzcyBQYWNrYWdlVXRpbGl0eXtcclxuICAgIFxyXG4gICAgY29uc3RydWN0b3IoKXtcclxuICAgICAgICB0aGlzLl9FWFJBVEUgPSA3LjAgOyBcclxuICAgICAgICB0aGlzLl9WQVQgPSAwLjEyNTsgXHJcbiAgICAgICAgdGhpcy5fQlJPS0VSQUdFID0gMC4zOyBcclxuICAgICAgICB0aGlzLl9GVUVMID0gMC4xNTsgXHJcbiAgICAgICAgdGhpcy5fQUlSX1NISVBQSU5HX0ZFRSA9IFsyLjU3LDIuNTAsMi4yNV1cclxuICAgICAgICB0aGlzLl9TRUFfU0hJUFBJTkdfRkVFID0gMC45NTtcclxuICAgIH1cclxuXHJcbiAgICBjYWxjdWxhdGVGZWVzKGNwYWNrYWdlKXtcclxuICAgICAgXHJcbiAgICAgICAgLy9jYWNsdWxhdGUgZm9yIHNlYSBcclxuICAgICAgICBjcGFja2FnZSAgPSBPYmplY3QuYXNzaWduKGNwYWNrYWdlLHRoaXMuY2FsY3VsYXRlQ2FyZ29GZWVzKGNwYWNrYWdlKSlcclxuICAgICAgICByZXR1cm4gY3BhY2thZ2UgOyBcclxuICAgIH1cclxuXHJcbiAgIFxyXG4gICAgY2FsY3VsYXRlQ2FyZ29GZWVzKGNwYWNrYWdlKXtcclxuICAgICAgICAgXHJcbiAgICAgICAgdmFyIGZlZXMgPSB7XHJcbiAgICAgICAgICAgIHR0dmFsdWU6MCxcclxuICAgICAgICAgICAgZHV0eTowLFxyXG4gICAgICAgICAgICB2YXQ6MCxcclxuICAgICAgICAgICAgc2hpcHBpbmdWYWx1ZTowLFxyXG4gICAgICAgICAgICBvcHQ6MCxcclxuICAgICAgICAgICAgZnVlbEZlZTowLFxyXG4gICAgICAgICAgICBicm9rZXJhZ2VGZWU6MFxyXG4gICAgICAgIH07IFxyXG5cclxuICAgICAgICAvL2RvIHlvdXIgY2FscyBoZXJlIFxyXG5cclxuICAgICAgICBmZWVzLnR0dmFsdWUgPSBjcGFja2FnZS52YWx1ZSAqIHRoaXMuX0VYUkFURTsgXHJcbiAgICAgICAgZmVlcy5mcmVpZ2h0ID0gY3BhY2thZ2Uud2VpZ2h0ICogdGhpcy5fRVhSQVRFO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGZlZXMuaW5zdXJhbmNlID0gZmVlcy50dHZhbHVlICogLjAyOyBcclxuICAgICAgICBmZWVzLmR1dHkgPSBjcGFja2FnZS5kdXR5UGVyY2VudCAqIChmZWVzLnR0dmFsdWUgKyBmZWVzLmZyZWlnaHQpO1xyXG4gICAgICAgIGZlZXMub3B0ID0gKGZlZXMudHR2YWx1ZSArIGZlZXMuZnJlaWdodCkgKi4wNzsgXHJcbiAgICAgICAgZmVlcy52YXQgPSAoZmVlcy50dHZhbHVlICsgZmVlcy5kdXR5ICsgZmVlcy5mcmVpZ2h0KSAqIHRoaXMuX1ZBVDsgXHJcblxyXG4gICAgICAgIC8vc2hpcHBpbmcgY29zdCBjYWxjdWxhdGVkIGJhc2VkIG9uIHdlaWdodCAgXHJcbiAgICAgICAgaWYgKGNwYWNrYWdlLm10eXBlICE9Mil7XHJcbiAgICAgICAgICAgIGlmICgwPj0gY3BhY2thZ2Uud2VpZ2h0IDw9MjUpe1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGZlZXMuc2hpcHBpbmdWYWx1ZSA9IGNwYWNrYWdlLndlaWdodCAqIHRoaXMuX0FJUl9TSElQUElOR19GRUVbMF07IFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKDI1ID4gY3BhY2thZ2Uud2VpZ2h0IDw9NTAgKXtcclxuICAgICAgICAgICAgICAgIGZlZXMuc2hpcHBpbmdWYWx1ZSA9IGNwYWNrYWdlLndlaWdodCAqIHRoaXMuX0FJUl9TSElQUElOR19GRUVbMV07IFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGNwYWNrYWdlLndlaWdodD41MCl7XHJcbiAgICAgICAgICAgICAgICBmZWVzLnNoaXBwaW5nVmFsdWUgPSBjcGFja2FnZS53ZWlnaHQgKiB0aGlzLl9BSVJfU0hJUFBJTkdfRkVFWzJdOyBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgZmVlcy5zaGlwcGluZ1ZhbHVlID0gZmVlcy5zaGlwcGluZ1ZhbHVlICogdGhpcy5fRVhSQVRFOyBcclxuICAgICAgICAgICAgZmVlcy5icm9rZXJhZ2VGZWUgPSAoZmVlcy5kdXR5ICsgZmVlcy52YXQgKyBmZWVzLm9wdCkgKiB0aGlzLl9CUk9LRVJBR0U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAvL3NoaXBwaW5nIGJ5IHNlYSBcclxuICAgICAgICAgICAgZmVlcy5zaGlwcGluZ1ZhbHVlID0gY3BhY2thZ2Uud2VpZ2h0ICogdGhpcy5fU0VBX1NISVBQSU5HX0ZFRTsgXHJcbiAgICAgICAgICAgIGZlZXMuYmlsbE9mTGFkZW4gID0gMTAgKiB0aGlzLl9FWFJBVEU7IFxyXG4gICAgICAgICAgICBmZWVzLmRvY0ZlZSA9IDEwICogdGhpcy5fRVhSQVRFOyBcclxuICAgICAgICAgICAgZmVlcy5icm9rZXJhZ2VGZWUgPSBmZWVzLnR0dmFsdWUgKiB0aGlzLl9CUk9LRVJBR0U7IFxyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvL2NvbW1vbiBmZWVzIHRvIGJvdGggYWlyIGFuZCBzaGlwcGluZyBcclxuICAgICAgICBmZWVzLmZ1ZWxGZWUgPSBmZWVzLnNoaXBwaW5nVmFsdWUgKiB0aGlzLl9GVUVMO1xyXG4gICAgICAgIGZlZXMudG90YWxDb3N0ID0gKGZlZXMuZHV0eSArIGZlZXMuc2hpcHBpbmdWYWx1ZSArIGZlZXMub3B0KyBmZWVzLmJyb2tlcmFnZUZlZSArIGZlZXMuZnVlbEZlZSArIGZlZXMudmF0KTsgXHJcblxyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiBmZWVzIDsgXHJcbiAgICB9XHJcblxyXG5cclxufSJdfQ==
