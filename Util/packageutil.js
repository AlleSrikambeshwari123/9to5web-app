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
            if (cpackage.hasOpt == false) fees.opt = 0;
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlV0aWwvcGFja2FnZXV0aWwuZXM2Il0sIm5hbWVzIjpbIlBhY2thZ2VVdGlsaXR5IiwiX0VYUkFURSIsIl9WQVQiLCJfQlJPS0VSQUdFIiwiX0ZVRUwiLCJfQUlSX1NISVBQSU5HX0ZFRSIsIl9TRUFfU0hJUFBJTkdfRkVFIiwiY3BhY2thZ2UiLCJPYmplY3QiLCJhc3NpZ24iLCJjYWxjdWxhdGVDYXJnb0ZlZXMiLCJmZWVzIiwidHR2YWx1ZSIsImR1dHkiLCJ2YXQiLCJzaGlwcGluZ1ZhbHVlIiwib3B0IiwiZnVlbEZlZSIsImJyb2tlcmFnZUZlZSIsInZhbHVlIiwiZnJlaWdodCIsIndlaWdodCIsImluc3VyYW5jZSIsImR1dHlQZXJjZW50IiwiaGFzT3B0IiwibXR5cGUiLCJiaWxsT2ZMYWRlbiIsImRvY0ZlZSIsInRvdGFsQ29zdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztJQUdhQSxjLFdBQUFBLGM7QUFFVCw4QkFBYTtBQUFBOztBQUNULGFBQUtDLE9BQUwsR0FBZSxHQUFmO0FBQ0EsYUFBS0MsSUFBTCxHQUFZLEtBQVo7QUFDQSxhQUFLQyxVQUFMLEdBQWtCLEdBQWxCO0FBQ0EsYUFBS0MsS0FBTCxHQUFhLElBQWI7QUFDQSxhQUFLQyxpQkFBTCxHQUF5QixDQUFDLElBQUQsRUFBTSxJQUFOLEVBQVcsSUFBWCxDQUF6QjtBQUNBLGFBQUtDLGlCQUFMLEdBQXlCLElBQXpCO0FBQ0g7Ozs7c0NBRWFDLFEsRUFBUzs7QUFFbkI7QUFDQUEsdUJBQVlDLE9BQU9DLE1BQVAsQ0FBY0YsUUFBZCxFQUF1QixLQUFLRyxrQkFBTCxDQUF3QkgsUUFBeEIsQ0FBdkIsQ0FBWjtBQUNBLG1CQUFPQSxRQUFQO0FBQ0g7OzsyQ0FHa0JBLFEsRUFBUzs7QUFFeEIsZ0JBQUlJLE9BQU87QUFDUEMseUJBQVEsQ0FERDtBQUVQQyxzQkFBSyxDQUZFO0FBR1BDLHFCQUFJLENBSEc7QUFJUEMsK0JBQWMsQ0FKUDtBQUtQQyxxQkFBSSxDQUxHO0FBTVBDLHlCQUFRLENBTkQ7QUFPUEMsOEJBQWE7QUFQTixhQUFYOztBQVVBOztBQUVBUCxpQkFBS0MsT0FBTCxHQUFlTCxTQUFTWSxLQUFULEdBQWlCLEtBQUtsQixPQUFyQztBQUNBVSxpQkFBS1MsT0FBTCxHQUFlYixTQUFTYyxNQUFULEdBQWtCLEtBQUtwQixPQUF0Qzs7QUFFQVUsaUJBQUtXLFNBQUwsR0FBaUJYLEtBQUtDLE9BQUwsR0FBZSxHQUFoQztBQUNBRCxpQkFBS0UsSUFBTCxHQUFZTixTQUFTZ0IsV0FBVCxJQUF3QlosS0FBS0MsT0FBTCxHQUFlRCxLQUFLUyxPQUE1QyxDQUFaO0FBQ0FULGlCQUFLSyxHQUFMLEdBQVcsQ0FBQ0wsS0FBS0MsT0FBTCxHQUFlRCxLQUFLUyxPQUFyQixJQUErQixHQUExQztBQUNBLGdCQUFJYixTQUFTaUIsTUFBVCxJQUFtQixLQUF2QixFQUNJYixLQUFLSyxHQUFMLEdBQVcsQ0FBWDtBQUNKTCxpQkFBS0csR0FBTCxHQUFXLENBQUNILEtBQUtDLE9BQUwsR0FBZUQsS0FBS0UsSUFBcEIsR0FBMkJGLEtBQUtTLE9BQWpDLElBQTRDLEtBQUtsQixJQUE1RDs7QUFFQTtBQUNBLGdCQUFJSyxTQUFTa0IsS0FBVCxJQUFpQixDQUFyQixFQUF1QjtBQUNuQixvQkFBSSxLQUFJbEIsU0FBU2MsTUFBYixJQUFzQixFQUExQixFQUE2Qjs7QUFFekJWLHlCQUFLSSxhQUFMLEdBQXFCUixTQUFTYyxNQUFULEdBQWtCLEtBQUtoQixpQkFBTCxDQUF1QixDQUF2QixDQUF2QztBQUNILGlCQUhELE1BSUssSUFBSSxLQUFLRSxTQUFTYyxNQUFkLElBQXVCLEVBQTNCLEVBQStCO0FBQ2hDVix5QkFBS0ksYUFBTCxHQUFxQlIsU0FBU2MsTUFBVCxHQUFrQixLQUFLaEIsaUJBQUwsQ0FBdUIsQ0FBdkIsQ0FBdkM7QUFDSCxpQkFGSSxNQUdBLElBQUlFLFNBQVNjLE1BQVQsR0FBZ0IsRUFBcEIsRUFBdUI7QUFDeEJWLHlCQUFLSSxhQUFMLEdBQXFCUixTQUFTYyxNQUFULEdBQWtCLEtBQUtoQixpQkFBTCxDQUF1QixDQUF2QixDQUF2QztBQUNIOztBQUVETSxxQkFBS0ksYUFBTCxHQUFxQkosS0FBS0ksYUFBTCxHQUFxQixLQUFLZCxPQUEvQztBQUNBVSxxQkFBS08sWUFBTCxHQUFvQixDQUFDUCxLQUFLRSxJQUFMLEdBQVlGLEtBQUtHLEdBQWpCLEdBQXVCSCxLQUFLSyxHQUE3QixJQUFvQyxLQUFLYixVQUE3RDtBQUNILGFBZEQsTUFlSztBQUNEO0FBQ0FRLHFCQUFLSSxhQUFMLEdBQXFCUixTQUFTYyxNQUFULEdBQWtCLEtBQUtmLGlCQUE1QztBQUNBSyxxQkFBS2UsV0FBTCxHQUFvQixLQUFLLEtBQUt6QixPQUE5QjtBQUNBVSxxQkFBS2dCLE1BQUwsR0FBYyxLQUFLLEtBQUsxQixPQUF4QjtBQUNBVSxxQkFBS08sWUFBTCxHQUFvQlAsS0FBS0MsT0FBTCxHQUFlLEtBQUtULFVBQXhDO0FBQ0g7O0FBRUQ7QUFDQVEsaUJBQUtNLE9BQUwsR0FBZU4sS0FBS0ksYUFBTCxHQUFxQixLQUFLWCxLQUF6QztBQUNBTyxpQkFBS2lCLFNBQUwsR0FBa0JqQixLQUFLRSxJQUFMLEdBQVlGLEtBQUtJLGFBQWpCLEdBQWlDSixLQUFLSyxHQUF0QyxHQUEyQ0wsS0FBS08sWUFBaEQsR0FBK0RQLEtBQUtNLE9BQXBFLEdBQThFTixLQUFLRyxHQUFyRzs7QUFHQSxtQkFBT0gsSUFBUDtBQUNIIiwiZmlsZSI6IlV0aWwvcGFja2FnZXV0aWwuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcclxuXHJcblxyXG5leHBvcnQgY2xhc3MgUGFja2FnZVV0aWxpdHl7XHJcbiAgICBcclxuICAgIGNvbnN0cnVjdG9yKCl7XHJcbiAgICAgICAgdGhpcy5fRVhSQVRFID0gNy4wIDsgXHJcbiAgICAgICAgdGhpcy5fVkFUID0gMC4xMjU7IFxyXG4gICAgICAgIHRoaXMuX0JST0tFUkFHRSA9IDAuMzsgXHJcbiAgICAgICAgdGhpcy5fRlVFTCA9IDAuMTU7IFxyXG4gICAgICAgIHRoaXMuX0FJUl9TSElQUElOR19GRUUgPSBbMi41NywyLjUwLDIuMjVdXHJcbiAgICAgICAgdGhpcy5fU0VBX1NISVBQSU5HX0ZFRSA9IDAuOTU7XHJcbiAgICB9XHJcblxyXG4gICAgY2FsY3VsYXRlRmVlcyhjcGFja2FnZSl7XHJcbiAgICAgIFxyXG4gICAgICAgIC8vY2FjbHVsYXRlIGZvciBzZWEgXHJcbiAgICAgICAgY3BhY2thZ2UgID0gT2JqZWN0LmFzc2lnbihjcGFja2FnZSx0aGlzLmNhbGN1bGF0ZUNhcmdvRmVlcyhjcGFja2FnZSkpXHJcbiAgICAgICAgcmV0dXJuIGNwYWNrYWdlIDsgXHJcbiAgICB9XHJcblxyXG4gICBcclxuICAgIGNhbGN1bGF0ZUNhcmdvRmVlcyhjcGFja2FnZSl7XHJcbiAgICAgICAgIFxyXG4gICAgICAgIHZhciBmZWVzID0ge1xyXG4gICAgICAgICAgICB0dHZhbHVlOjAsXHJcbiAgICAgICAgICAgIGR1dHk6MCxcclxuICAgICAgICAgICAgdmF0OjAsXHJcbiAgICAgICAgICAgIHNoaXBwaW5nVmFsdWU6MCxcclxuICAgICAgICAgICAgb3B0OjAsXHJcbiAgICAgICAgICAgIGZ1ZWxGZWU6MCxcclxuICAgICAgICAgICAgYnJva2VyYWdlRmVlOjBcclxuICAgICAgICB9OyBcclxuXHJcbiAgICAgICAgLy9kbyB5b3VyIGNhbHMgaGVyZSBcclxuXHJcbiAgICAgICAgZmVlcy50dHZhbHVlID0gY3BhY2thZ2UudmFsdWUgKiB0aGlzLl9FWFJBVEU7IFxyXG4gICAgICAgIGZlZXMuZnJlaWdodCA9IGNwYWNrYWdlLndlaWdodCAqIHRoaXMuX0VYUkFURTtcclxuICAgICAgICBcclxuICAgICAgICBmZWVzLmluc3VyYW5jZSA9IGZlZXMudHR2YWx1ZSAqIC4wMjsgXHJcbiAgICAgICAgZmVlcy5kdXR5ID0gY3BhY2thZ2UuZHV0eVBlcmNlbnQgKiAoZmVlcy50dHZhbHVlICsgZmVlcy5mcmVpZ2h0KTtcclxuICAgICAgICBmZWVzLm9wdCA9IChmZWVzLnR0dmFsdWUgKyBmZWVzLmZyZWlnaHQpICouMDc7IFxyXG4gICAgICAgIGlmIChjcGFja2FnZS5oYXNPcHQgPT0gZmFsc2UgKVxyXG4gICAgICAgICAgICBmZWVzLm9wdCA9IDA7IFxyXG4gICAgICAgIGZlZXMudmF0ID0gKGZlZXMudHR2YWx1ZSArIGZlZXMuZHV0eSArIGZlZXMuZnJlaWdodCkgKiB0aGlzLl9WQVQ7IFxyXG5cclxuICAgICAgICAvL3NoaXBwaW5nIGNvc3QgY2FsY3VsYXRlZCBiYXNlZCBvbiB3ZWlnaHQgIFxyXG4gICAgICAgIGlmIChjcGFja2FnZS5tdHlwZSAhPTIpe1xyXG4gICAgICAgICAgICBpZiAoMD49IGNwYWNrYWdlLndlaWdodCA8PTI1KXtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBmZWVzLnNoaXBwaW5nVmFsdWUgPSBjcGFja2FnZS53ZWlnaHQgKiB0aGlzLl9BSVJfU0hJUFBJTkdfRkVFWzBdOyBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmICgyNSA+IGNwYWNrYWdlLndlaWdodCA8PTUwICl7XHJcbiAgICAgICAgICAgICAgICBmZWVzLnNoaXBwaW5nVmFsdWUgPSBjcGFja2FnZS53ZWlnaHQgKiB0aGlzLl9BSVJfU0hJUFBJTkdfRkVFWzFdOyBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmIChjcGFja2FnZS53ZWlnaHQ+NTApe1xyXG4gICAgICAgICAgICAgICAgZmVlcy5zaGlwcGluZ1ZhbHVlID0gY3BhY2thZ2Uud2VpZ2h0ICogdGhpcy5fQUlSX1NISVBQSU5HX0ZFRVsyXTsgXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGZlZXMuc2hpcHBpbmdWYWx1ZSA9IGZlZXMuc2hpcHBpbmdWYWx1ZSAqIHRoaXMuX0VYUkFURTsgXHJcbiAgICAgICAgICAgIGZlZXMuYnJva2VyYWdlRmVlID0gKGZlZXMuZHV0eSArIGZlZXMudmF0ICsgZmVlcy5vcHQpICogdGhpcy5fQlJPS0VSQUdFO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgLy9zaGlwcGluZyBieSBzZWEgXHJcbiAgICAgICAgICAgIGZlZXMuc2hpcHBpbmdWYWx1ZSA9IGNwYWNrYWdlLndlaWdodCAqIHRoaXMuX1NFQV9TSElQUElOR19GRUU7IFxyXG4gICAgICAgICAgICBmZWVzLmJpbGxPZkxhZGVuICA9IDEwICogdGhpcy5fRVhSQVRFOyBcclxuICAgICAgICAgICAgZmVlcy5kb2NGZWUgPSAxMCAqIHRoaXMuX0VYUkFURTsgXHJcbiAgICAgICAgICAgIGZlZXMuYnJva2VyYWdlRmVlID0gZmVlcy50dHZhbHVlICogdGhpcy5fQlJPS0VSQUdFOyBcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy9jb21tb24gZmVlcyB0byBib3RoIGFpciBhbmQgc2hpcHBpbmcgXHJcbiAgICAgICAgZmVlcy5mdWVsRmVlID0gZmVlcy5zaGlwcGluZ1ZhbHVlICogdGhpcy5fRlVFTDtcclxuICAgICAgICBmZWVzLnRvdGFsQ29zdCA9IChmZWVzLmR1dHkgKyBmZWVzLnNoaXBwaW5nVmFsdWUgKyBmZWVzLm9wdCsgZmVlcy5icm9rZXJhZ2VGZWUgKyBmZWVzLmZ1ZWxGZWUgKyBmZWVzLnZhdCk7IFxyXG5cclxuICAgICAgICBcclxuICAgICAgICByZXR1cm4gZmVlcyA7IFxyXG4gICAgfVxyXG5cclxuXHJcbn0iXX0=
