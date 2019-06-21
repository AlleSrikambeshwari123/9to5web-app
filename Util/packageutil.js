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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlV0aWwvcGFja2FnZXV0aWwuZXM2Il0sIm5hbWVzIjpbIlBhY2thZ2VVdGlsaXR5IiwiX0VYUkFURSIsIl9WQVQiLCJfQlJPS0VSQUdFIiwiX0ZVRUwiLCJfQUlSX1NISVBQSU5HX0ZFRSIsIl9TRUFfU0hJUFBJTkdfRkVFIiwiY3BhY2thZ2UiLCJPYmplY3QiLCJhc3NpZ24iLCJjYWxjdWxhdGVDYXJnb0ZlZXMiLCJmZWVzIiwidHR2YWx1ZSIsImR1dHkiLCJ2YXQiLCJzaGlwcGluZ1ZhbHVlIiwib3B0IiwiZnVlbEZlZSIsImJyb2tlcmFnZUZlZSIsInZhbHVlIiwiZnJlaWdodCIsIndlaWdodCIsImluc3VyYW5jZSIsImR1dHlQZXJjZW50IiwiaGFzT3B0IiwibXR5cGUiLCJiaWxsT2ZMYWRlbiIsImRvY0ZlZSIsInRvdGFsQ29zdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztJQUdhQSxjLFdBQUFBLGM7QUFFVCw4QkFBYTtBQUFBOztBQUNULGFBQUtDLE9BQUwsR0FBZSxHQUFmO0FBQ0EsYUFBS0MsSUFBTCxHQUFZLEtBQVo7QUFDQSxhQUFLQyxVQUFMLEdBQWtCLEdBQWxCO0FBQ0EsYUFBS0MsS0FBTCxHQUFhLElBQWI7QUFDQSxhQUFLQyxpQkFBTCxHQUF5QixDQUFDLElBQUQsRUFBTSxJQUFOLEVBQVcsSUFBWCxDQUF6QjtBQUNBLGFBQUtDLGlCQUFMLEdBQXlCLElBQXpCO0FBQ0g7Ozs7c0NBRWFDLFEsRUFBUzs7QUFFbkI7QUFDQUEsdUJBQVlDLE9BQU9DLE1BQVAsQ0FBY0YsUUFBZCxFQUF1QixLQUFLRyxrQkFBTCxDQUF3QkgsUUFBeEIsQ0FBdkIsQ0FBWjtBQUNBLG1CQUFPQSxRQUFQO0FBQ0g7OzsyQ0FHa0JBLFEsRUFBUzs7QUFFeEIsZ0JBQUlJLE9BQU87QUFDUEMseUJBQVEsQ0FERDtBQUVQQyxzQkFBSyxDQUZFO0FBR1BDLHFCQUFJLENBSEc7QUFJUEMsK0JBQWMsQ0FKUDtBQUtQQyxxQkFBSSxDQUxHO0FBTVBDLHlCQUFRLENBTkQ7QUFPUEMsOEJBQWE7QUFQTixhQUFYOztBQVVBOztBQUVBUCxpQkFBS0MsT0FBTCxHQUFlTCxTQUFTWSxLQUFULEdBQWlCLEtBQUtsQixPQUFyQztBQUNBVSxpQkFBS1MsT0FBTCxHQUFlYixTQUFTYyxNQUFULEdBQWtCLEtBQUtwQixPQUF0Qzs7QUFFQVUsaUJBQUtXLFNBQUwsR0FBaUJYLEtBQUtDLE9BQUwsR0FBZSxHQUFoQztBQUNBRCxpQkFBS0UsSUFBTCxHQUFZTixTQUFTZ0IsV0FBVCxJQUF3QlosS0FBS0MsT0FBTCxHQUFlRCxLQUFLUyxPQUE1QyxDQUFaO0FBQ0FULGlCQUFLSyxHQUFMLEdBQVcsQ0FBQ0wsS0FBS0MsT0FBTCxHQUFlRCxLQUFLUyxPQUFyQixJQUErQixHQUExQzs7QUFFQSxnQkFBSWIsU0FBU2lCLE1BQVQsSUFBbUIsS0FBdkIsRUFDSWIsS0FBS0ssR0FBTCxHQUFXLENBQVg7QUFDSkwsaUJBQUtHLEdBQUwsR0FBVyxDQUFDSCxLQUFLQyxPQUFMLEdBQWVELEtBQUtFLElBQXBCLEdBQTJCRixLQUFLUyxPQUFqQyxJQUE0QyxLQUFLbEIsSUFBNUQ7O0FBRUE7QUFDQSxnQkFBSUssU0FBU2tCLEtBQVQsSUFBaUIsQ0FBckIsRUFBdUI7QUFDbkIsb0JBQUksS0FBSWxCLFNBQVNjLE1BQWIsSUFBc0IsRUFBMUIsRUFBNkI7O0FBRXpCVix5QkFBS0ksYUFBTCxHQUFxQlIsU0FBU2MsTUFBVCxHQUFrQixLQUFLaEIsaUJBQUwsQ0FBdUIsQ0FBdkIsQ0FBdkM7QUFDSCxpQkFIRCxNQUlLLElBQUksS0FBS0UsU0FBU2MsTUFBZCxJQUF1QixFQUEzQixFQUErQjtBQUNoQ1YseUJBQUtJLGFBQUwsR0FBcUJSLFNBQVNjLE1BQVQsR0FBa0IsS0FBS2hCLGlCQUFMLENBQXVCLENBQXZCLENBQXZDO0FBQ0gsaUJBRkksTUFHQSxJQUFJRSxTQUFTYyxNQUFULEdBQWdCLEVBQXBCLEVBQXVCO0FBQ3hCVix5QkFBS0ksYUFBTCxHQUFxQlIsU0FBU2MsTUFBVCxHQUFrQixLQUFLaEIsaUJBQUwsQ0FBdUIsQ0FBdkIsQ0FBdkM7QUFDSDs7QUFFRE0scUJBQUtJLGFBQUwsR0FBcUJKLEtBQUtJLGFBQUwsR0FBcUIsS0FBS2QsT0FBL0M7QUFDQVUscUJBQUtPLFlBQUwsR0FBb0IsQ0FBQ1AsS0FBS0UsSUFBTCxHQUFZRixLQUFLRyxHQUFqQixHQUF1QkgsS0FBS0ssR0FBN0IsSUFBb0MsS0FBS2IsVUFBN0Q7QUFDSCxhQWRELE1BZUs7QUFDRDtBQUNBUSxxQkFBS0ksYUFBTCxHQUFxQlIsU0FBU2MsTUFBVCxHQUFrQixLQUFLZixpQkFBNUM7QUFDQUsscUJBQUtlLFdBQUwsR0FBb0IsS0FBSyxLQUFLekIsT0FBOUI7QUFDQVUscUJBQUtnQixNQUFMLEdBQWMsS0FBSyxLQUFLMUIsT0FBeEI7QUFDQVUscUJBQUtPLFlBQUwsR0FBb0JQLEtBQUtDLE9BQUwsR0FBZSxLQUFLVCxVQUF4QztBQUNIOztBQUVEO0FBQ0FRLGlCQUFLTSxPQUFMLEdBQWVOLEtBQUtJLGFBQUwsR0FBcUIsS0FBS1gsS0FBekM7QUFDQU8saUJBQUtpQixTQUFMLEdBQWtCakIsS0FBS0UsSUFBTCxHQUFZRixLQUFLSSxhQUFqQixHQUFpQ0osS0FBS0ssR0FBdEMsR0FBMkNMLEtBQUtPLFlBQWhELEdBQStEUCxLQUFLTSxPQUFwRSxHQUE4RU4sS0FBS0csR0FBckc7O0FBR0EsbUJBQU9ILElBQVA7QUFDSCIsImZpbGUiOiJVdGlsL3BhY2thZ2V1dGlsLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG5cblxuZXhwb3J0IGNsYXNzIFBhY2thZ2VVdGlsaXR5e1xuICAgIFxuICAgIGNvbnN0cnVjdG9yKCl7XG4gICAgICAgIHRoaXMuX0VYUkFURSA9IDcuMCA7IFxuICAgICAgICB0aGlzLl9WQVQgPSAwLjEyNTsgXG4gICAgICAgIHRoaXMuX0JST0tFUkFHRSA9IDAuMzsgXG4gICAgICAgIHRoaXMuX0ZVRUwgPSAwLjE1OyBcbiAgICAgICAgdGhpcy5fQUlSX1NISVBQSU5HX0ZFRSA9IFsyLjU3LDIuNTAsMi4yNV1cbiAgICAgICAgdGhpcy5fU0VBX1NISVBQSU5HX0ZFRSA9IDAuOTU7XG4gICAgfVxuXG4gICAgY2FsY3VsYXRlRmVlcyhjcGFja2FnZSl7XG4gICAgICBcbiAgICAgICAgLy9jYWNsdWxhdGUgZm9yIHNlYSBcbiAgICAgICAgY3BhY2thZ2UgID0gT2JqZWN0LmFzc2lnbihjcGFja2FnZSx0aGlzLmNhbGN1bGF0ZUNhcmdvRmVlcyhjcGFja2FnZSkpXG4gICAgICAgIHJldHVybiBjcGFja2FnZSA7IFxuICAgIH1cblxuICAgXG4gICAgY2FsY3VsYXRlQ2FyZ29GZWVzKGNwYWNrYWdlKXtcbiAgICAgICAgIFxuICAgICAgICB2YXIgZmVlcyA9IHtcbiAgICAgICAgICAgIHR0dmFsdWU6MCxcbiAgICAgICAgICAgIGR1dHk6MCxcbiAgICAgICAgICAgIHZhdDowLFxuICAgICAgICAgICAgc2hpcHBpbmdWYWx1ZTowLFxuICAgICAgICAgICAgb3B0OjAsXG4gICAgICAgICAgICBmdWVsRmVlOjAsXG4gICAgICAgICAgICBicm9rZXJhZ2VGZWU6MFxuICAgICAgICB9OyBcblxuICAgICAgICAvL2RvIHlvdXIgY2FscyBoZXJlIFxuXG4gICAgICAgIGZlZXMudHR2YWx1ZSA9IGNwYWNrYWdlLnZhbHVlICogdGhpcy5fRVhSQVRFOyBcbiAgICAgICAgZmVlcy5mcmVpZ2h0ID0gY3BhY2thZ2Uud2VpZ2h0ICogdGhpcy5fRVhSQVRFO1xuICAgICAgICBcbiAgICAgICAgZmVlcy5pbnN1cmFuY2UgPSBmZWVzLnR0dmFsdWUgKiAuMDI7IFxuICAgICAgICBmZWVzLmR1dHkgPSBjcGFja2FnZS5kdXR5UGVyY2VudCAqIChmZWVzLnR0dmFsdWUgKyBmZWVzLmZyZWlnaHQpO1xuICAgICAgICBmZWVzLm9wdCA9IChmZWVzLnR0dmFsdWUgKyBmZWVzLmZyZWlnaHQpICouMDc7IFxuICAgICAgICBcbiAgICAgICAgaWYgKGNwYWNrYWdlLmhhc09wdCA9PSBmYWxzZSApXG4gICAgICAgICAgICBmZWVzLm9wdCA9IDA7IFxuICAgICAgICBmZWVzLnZhdCA9IChmZWVzLnR0dmFsdWUgKyBmZWVzLmR1dHkgKyBmZWVzLmZyZWlnaHQpICogdGhpcy5fVkFUOyBcblxuICAgICAgICAvL3NoaXBwaW5nIGNvc3QgY2FsY3VsYXRlZCBiYXNlZCBvbiB3ZWlnaHQgIFxuICAgICAgICBpZiAoY3BhY2thZ2UubXR5cGUgIT0yKXtcbiAgICAgICAgICAgIGlmICgwPj0gY3BhY2thZ2Uud2VpZ2h0IDw9MjUpe1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgZmVlcy5zaGlwcGluZ1ZhbHVlID0gY3BhY2thZ2Uud2VpZ2h0ICogdGhpcy5fQUlSX1NISVBQSU5HX0ZFRVswXTsgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICgyNSA+IGNwYWNrYWdlLndlaWdodCA8PTUwICl7XG4gICAgICAgICAgICAgICAgZmVlcy5zaGlwcGluZ1ZhbHVlID0gY3BhY2thZ2Uud2VpZ2h0ICogdGhpcy5fQUlSX1NISVBQSU5HX0ZFRVsxXTsgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjcGFja2FnZS53ZWlnaHQ+NTApe1xuICAgICAgICAgICAgICAgIGZlZXMuc2hpcHBpbmdWYWx1ZSA9IGNwYWNrYWdlLndlaWdodCAqIHRoaXMuX0FJUl9TSElQUElOR19GRUVbMl07IFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBmZWVzLnNoaXBwaW5nVmFsdWUgPSBmZWVzLnNoaXBwaW5nVmFsdWUgKiB0aGlzLl9FWFJBVEU7IFxuICAgICAgICAgICAgZmVlcy5icm9rZXJhZ2VGZWUgPSAoZmVlcy5kdXR5ICsgZmVlcy52YXQgKyBmZWVzLm9wdCkgKiB0aGlzLl9CUk9LRVJBR0U7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvL3NoaXBwaW5nIGJ5IHNlYSBcbiAgICAgICAgICAgIGZlZXMuc2hpcHBpbmdWYWx1ZSA9IGNwYWNrYWdlLndlaWdodCAqIHRoaXMuX1NFQV9TSElQUElOR19GRUU7IFxuICAgICAgICAgICAgZmVlcy5iaWxsT2ZMYWRlbiAgPSAxMCAqIHRoaXMuX0VYUkFURTsgXG4gICAgICAgICAgICBmZWVzLmRvY0ZlZSA9IDEwICogdGhpcy5fRVhSQVRFOyBcbiAgICAgICAgICAgIGZlZXMuYnJva2VyYWdlRmVlID0gZmVlcy50dHZhbHVlICogdGhpcy5fQlJPS0VSQUdFOyBcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy9jb21tb24gZmVlcyB0byBib3RoIGFpciBhbmQgc2hpcHBpbmcgXG4gICAgICAgIGZlZXMuZnVlbEZlZSA9IGZlZXMuc2hpcHBpbmdWYWx1ZSAqIHRoaXMuX0ZVRUw7XG4gICAgICAgIGZlZXMudG90YWxDb3N0ID0gKGZlZXMuZHV0eSArIGZlZXMuc2hpcHBpbmdWYWx1ZSArIGZlZXMub3B0KyBmZWVzLmJyb2tlcmFnZUZlZSArIGZlZXMuZnVlbEZlZSArIGZlZXMudmF0KTsgXG5cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBmZWVzIDsgXG4gICAgfVxuXG5cbn0iXX0=
