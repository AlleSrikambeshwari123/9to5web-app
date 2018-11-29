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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlV0aWwvcGFja2FnZXV0aWwuZXM2Il0sIm5hbWVzIjpbIlBhY2thZ2VVdGlsaXR5IiwiX0VYUkFURSIsIl9WQVQiLCJfQlJPS0VSQUdFIiwiX0ZVRUwiLCJfQUlSX1NISVBQSU5HX0ZFRSIsIl9TRUFfU0hJUFBJTkdfRkVFIiwiY3BhY2thZ2UiLCJPYmplY3QiLCJhc3NpZ24iLCJjYWxjdWxhdGVDYXJnb0ZlZXMiLCJmZWVzIiwidHR2YWx1ZSIsImR1dHkiLCJ2YXQiLCJzaGlwcGluZ1ZhbHVlIiwib3B0IiwiZnVlbEZlZSIsImJyb2tlcmFnZUZlZSIsInZhbHVlIiwiZnJlaWdodCIsIndlaWdodCIsImluc3VyYW5jZSIsImR1dHlQZXJjZW50IiwiaGFzT3B0IiwibXR5cGUiLCJiaWxsT2ZMYWRlbiIsImRvY0ZlZSIsInRvdGFsQ29zdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztJQUdhQSxjLFdBQUFBLGM7QUFFVCw4QkFBYTtBQUFBOztBQUNULGFBQUtDLE9BQUwsR0FBZSxHQUFmO0FBQ0EsYUFBS0MsSUFBTCxHQUFZLEtBQVo7QUFDQSxhQUFLQyxVQUFMLEdBQWtCLEdBQWxCO0FBQ0EsYUFBS0MsS0FBTCxHQUFhLElBQWI7QUFDQSxhQUFLQyxpQkFBTCxHQUF5QixDQUFDLElBQUQsRUFBTSxJQUFOLEVBQVcsSUFBWCxDQUF6QjtBQUNBLGFBQUtDLGlCQUFMLEdBQXlCLElBQXpCO0FBQ0g7Ozs7c0NBRWFDLFEsRUFBUzs7QUFFbkI7QUFDQUEsdUJBQVlDLE9BQU9DLE1BQVAsQ0FBY0YsUUFBZCxFQUF1QixLQUFLRyxrQkFBTCxDQUF3QkgsUUFBeEIsQ0FBdkIsQ0FBWjtBQUNBLG1CQUFPQSxRQUFQO0FBQ0g7OzsyQ0FHa0JBLFEsRUFBUzs7QUFFeEIsZ0JBQUlJLE9BQU87QUFDUEMseUJBQVEsQ0FERDtBQUVQQyxzQkFBSyxDQUZFO0FBR1BDLHFCQUFJLENBSEc7QUFJUEMsK0JBQWMsQ0FKUDtBQUtQQyxxQkFBSSxDQUxHO0FBTVBDLHlCQUFRLENBTkQ7QUFPUEMsOEJBQWE7QUFQTixhQUFYOztBQVVBOztBQUVBUCxpQkFBS0MsT0FBTCxHQUFlTCxTQUFTWSxLQUFULEdBQWlCLEtBQUtsQixPQUFyQztBQUNBVSxpQkFBS1MsT0FBTCxHQUFlYixTQUFTYyxNQUFULEdBQWtCLEtBQUtwQixPQUF0Qzs7QUFFQVUsaUJBQUtXLFNBQUwsR0FBaUJYLEtBQUtDLE9BQUwsR0FBZSxHQUFoQztBQUNBRCxpQkFBS0UsSUFBTCxHQUFZTixTQUFTZ0IsV0FBVCxJQUF3QlosS0FBS0MsT0FBTCxHQUFlRCxLQUFLUyxPQUE1QyxDQUFaO0FBQ0FULGlCQUFLSyxHQUFMLEdBQVcsQ0FBQ0wsS0FBS0MsT0FBTCxHQUFlRCxLQUFLUyxPQUFyQixJQUErQixHQUExQzs7QUFFQSxnQkFBSWIsU0FBU2lCLE1BQVQsSUFBbUIsS0FBdkIsRUFDSWIsS0FBS0ssR0FBTCxHQUFXLENBQVg7QUFDSkwsaUJBQUtHLEdBQUwsR0FBVyxDQUFDSCxLQUFLQyxPQUFMLEdBQWVELEtBQUtFLElBQXBCLEdBQTJCRixLQUFLUyxPQUFqQyxJQUE0QyxLQUFLbEIsSUFBNUQ7O0FBRUE7QUFDQSxnQkFBSUssU0FBU2tCLEtBQVQsSUFBaUIsQ0FBckIsRUFBdUI7QUFDbkIsb0JBQUksS0FBSWxCLFNBQVNjLE1BQWIsSUFBc0IsRUFBMUIsRUFBNkI7O0FBRXpCVix5QkFBS0ksYUFBTCxHQUFxQlIsU0FBU2MsTUFBVCxHQUFrQixLQUFLaEIsaUJBQUwsQ0FBdUIsQ0FBdkIsQ0FBdkM7QUFDSCxpQkFIRCxNQUlLLElBQUksS0FBS0UsU0FBU2MsTUFBZCxJQUF1QixFQUEzQixFQUErQjtBQUNoQ1YseUJBQUtJLGFBQUwsR0FBcUJSLFNBQVNjLE1BQVQsR0FBa0IsS0FBS2hCLGlCQUFMLENBQXVCLENBQXZCLENBQXZDO0FBQ0gsaUJBRkksTUFHQSxJQUFJRSxTQUFTYyxNQUFULEdBQWdCLEVBQXBCLEVBQXVCO0FBQ3hCVix5QkFBS0ksYUFBTCxHQUFxQlIsU0FBU2MsTUFBVCxHQUFrQixLQUFLaEIsaUJBQUwsQ0FBdUIsQ0FBdkIsQ0FBdkM7QUFDSDs7QUFFRE0scUJBQUtJLGFBQUwsR0FBcUJKLEtBQUtJLGFBQUwsR0FBcUIsS0FBS2QsT0FBL0M7QUFDQVUscUJBQUtPLFlBQUwsR0FBb0IsQ0FBQ1AsS0FBS0UsSUFBTCxHQUFZRixLQUFLRyxHQUFqQixHQUF1QkgsS0FBS0ssR0FBN0IsSUFBb0MsS0FBS2IsVUFBN0Q7QUFDSCxhQWRELE1BZUs7QUFDRDtBQUNBUSxxQkFBS0ksYUFBTCxHQUFxQlIsU0FBU2MsTUFBVCxHQUFrQixLQUFLZixpQkFBNUM7QUFDQUsscUJBQUtlLFdBQUwsR0FBb0IsS0FBSyxLQUFLekIsT0FBOUI7QUFDQVUscUJBQUtnQixNQUFMLEdBQWMsS0FBSyxLQUFLMUIsT0FBeEI7QUFDQVUscUJBQUtPLFlBQUwsR0FBb0JQLEtBQUtDLE9BQUwsR0FBZSxLQUFLVCxVQUF4QztBQUNIOztBQUVEO0FBQ0FRLGlCQUFLTSxPQUFMLEdBQWVOLEtBQUtJLGFBQUwsR0FBcUIsS0FBS1gsS0FBekM7QUFDQU8saUJBQUtpQixTQUFMLEdBQWtCakIsS0FBS0UsSUFBTCxHQUFZRixLQUFLSSxhQUFqQixHQUFpQ0osS0FBS0ssR0FBdEMsR0FBMkNMLEtBQUtPLFlBQWhELEdBQStEUCxLQUFLTSxPQUFwRSxHQUE4RU4sS0FBS0csR0FBckc7O0FBR0EsbUJBQU9ILElBQVA7QUFDSCIsImZpbGUiOiJVdGlsL3BhY2thZ2V1dGlsLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXHJcblxyXG5cclxuZXhwb3J0IGNsYXNzIFBhY2thZ2VVdGlsaXR5e1xyXG4gICAgXHJcbiAgICBjb25zdHJ1Y3Rvcigpe1xyXG4gICAgICAgIHRoaXMuX0VYUkFURSA9IDcuMCA7IFxyXG4gICAgICAgIHRoaXMuX1ZBVCA9IDAuMTI1OyBcclxuICAgICAgICB0aGlzLl9CUk9LRVJBR0UgPSAwLjM7IFxyXG4gICAgICAgIHRoaXMuX0ZVRUwgPSAwLjE1OyBcclxuICAgICAgICB0aGlzLl9BSVJfU0hJUFBJTkdfRkVFID0gWzIuNTcsMi41MCwyLjI1XVxyXG4gICAgICAgIHRoaXMuX1NFQV9TSElQUElOR19GRUUgPSAwLjk1O1xyXG4gICAgfVxyXG5cclxuICAgIGNhbGN1bGF0ZUZlZXMoY3BhY2thZ2Upe1xyXG4gICAgICBcclxuICAgICAgICAvL2NhY2x1bGF0ZSBmb3Igc2VhIFxyXG4gICAgICAgIGNwYWNrYWdlICA9IE9iamVjdC5hc3NpZ24oY3BhY2thZ2UsdGhpcy5jYWxjdWxhdGVDYXJnb0ZlZXMoY3BhY2thZ2UpKVxyXG4gICAgICAgIHJldHVybiBjcGFja2FnZSA7IFxyXG4gICAgfVxyXG5cclxuICAgXHJcbiAgICBjYWxjdWxhdGVDYXJnb0ZlZXMoY3BhY2thZ2Upe1xyXG4gICAgICAgICBcclxuICAgICAgICB2YXIgZmVlcyA9IHtcclxuICAgICAgICAgICAgdHR2YWx1ZTowLFxyXG4gICAgICAgICAgICBkdXR5OjAsXHJcbiAgICAgICAgICAgIHZhdDowLFxyXG4gICAgICAgICAgICBzaGlwcGluZ1ZhbHVlOjAsXHJcbiAgICAgICAgICAgIG9wdDowLFxyXG4gICAgICAgICAgICBmdWVsRmVlOjAsXHJcbiAgICAgICAgICAgIGJyb2tlcmFnZUZlZTowXHJcbiAgICAgICAgfTsgXHJcblxyXG4gICAgICAgIC8vZG8geW91ciBjYWxzIGhlcmUgXHJcblxyXG4gICAgICAgIGZlZXMudHR2YWx1ZSA9IGNwYWNrYWdlLnZhbHVlICogdGhpcy5fRVhSQVRFOyBcclxuICAgICAgICBmZWVzLmZyZWlnaHQgPSBjcGFja2FnZS53ZWlnaHQgKiB0aGlzLl9FWFJBVEU7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZmVlcy5pbnN1cmFuY2UgPSBmZWVzLnR0dmFsdWUgKiAuMDI7IFxyXG4gICAgICAgIGZlZXMuZHV0eSA9IGNwYWNrYWdlLmR1dHlQZXJjZW50ICogKGZlZXMudHR2YWx1ZSArIGZlZXMuZnJlaWdodCk7XHJcbiAgICAgICAgZmVlcy5vcHQgPSAoZmVlcy50dHZhbHVlICsgZmVlcy5mcmVpZ2h0KSAqLjA3OyBcclxuICAgICAgICBcclxuICAgICAgICBpZiAoY3BhY2thZ2UuaGFzT3B0ID09IGZhbHNlIClcclxuICAgICAgICAgICAgZmVlcy5vcHQgPSAwOyBcclxuICAgICAgICBmZWVzLnZhdCA9IChmZWVzLnR0dmFsdWUgKyBmZWVzLmR1dHkgKyBmZWVzLmZyZWlnaHQpICogdGhpcy5fVkFUOyBcclxuXHJcbiAgICAgICAgLy9zaGlwcGluZyBjb3N0IGNhbGN1bGF0ZWQgYmFzZWQgb24gd2VpZ2h0ICBcclxuICAgICAgICBpZiAoY3BhY2thZ2UubXR5cGUgIT0yKXtcclxuICAgICAgICAgICAgaWYgKDA+PSBjcGFja2FnZS53ZWlnaHQgPD0yNSl7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgZmVlcy5zaGlwcGluZ1ZhbHVlID0gY3BhY2thZ2Uud2VpZ2h0ICogdGhpcy5fQUlSX1NISVBQSU5HX0ZFRVswXTsgXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAoMjUgPiBjcGFja2FnZS53ZWlnaHQgPD01MCApe1xyXG4gICAgICAgICAgICAgICAgZmVlcy5zaGlwcGluZ1ZhbHVlID0gY3BhY2thZ2Uud2VpZ2h0ICogdGhpcy5fQUlSX1NISVBQSU5HX0ZFRVsxXTsgXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAoY3BhY2thZ2Uud2VpZ2h0PjUwKXtcclxuICAgICAgICAgICAgICAgIGZlZXMuc2hpcHBpbmdWYWx1ZSA9IGNwYWNrYWdlLndlaWdodCAqIHRoaXMuX0FJUl9TSElQUElOR19GRUVbMl07IFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBmZWVzLnNoaXBwaW5nVmFsdWUgPSBmZWVzLnNoaXBwaW5nVmFsdWUgKiB0aGlzLl9FWFJBVEU7IFxyXG4gICAgICAgICAgICBmZWVzLmJyb2tlcmFnZUZlZSA9IChmZWVzLmR1dHkgKyBmZWVzLnZhdCArIGZlZXMub3B0KSAqIHRoaXMuX0JST0tFUkFHRTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIC8vc2hpcHBpbmcgYnkgc2VhIFxyXG4gICAgICAgICAgICBmZWVzLnNoaXBwaW5nVmFsdWUgPSBjcGFja2FnZS53ZWlnaHQgKiB0aGlzLl9TRUFfU0hJUFBJTkdfRkVFOyBcclxuICAgICAgICAgICAgZmVlcy5iaWxsT2ZMYWRlbiAgPSAxMCAqIHRoaXMuX0VYUkFURTsgXHJcbiAgICAgICAgICAgIGZlZXMuZG9jRmVlID0gMTAgKiB0aGlzLl9FWFJBVEU7IFxyXG4gICAgICAgICAgICBmZWVzLmJyb2tlcmFnZUZlZSA9IGZlZXMudHR2YWx1ZSAqIHRoaXMuX0JST0tFUkFHRTsgXHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vY29tbW9uIGZlZXMgdG8gYm90aCBhaXIgYW5kIHNoaXBwaW5nIFxyXG4gICAgICAgIGZlZXMuZnVlbEZlZSA9IGZlZXMuc2hpcHBpbmdWYWx1ZSAqIHRoaXMuX0ZVRUw7XHJcbiAgICAgICAgZmVlcy50b3RhbENvc3QgPSAoZmVlcy5kdXR5ICsgZmVlcy5zaGlwcGluZ1ZhbHVlICsgZmVlcy5vcHQrIGZlZXMuYnJva2VyYWdlRmVlICsgZmVlcy5mdWVsRmVlICsgZmVlcy52YXQpOyBcclxuXHJcbiAgICAgICAgXHJcbiAgICAgICAgcmV0dXJuIGZlZXMgOyBcclxuICAgIH1cclxuXHJcblxyXG59Il19
