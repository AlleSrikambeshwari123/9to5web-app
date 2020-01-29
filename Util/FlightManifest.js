'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var currencyFormatter = require('currency-formatter');
var fonts = {
    Courier: {
        normal: 'Courier',
        bold: 'Courier-Bold',
        italics: 'Courier-Oblique',
        bolditalics: 'Courier-BoldOblique'
    },
    Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
    },
    Times: {
        normal: 'Times-Roman',
        bold: 'Times-Bold',
        italics: 'Times-Italic',
        bolditalics: 'Times-BoldItalic'
    },
    Symbol: {
        normal: 'Symbol'
    },
    ZapfDingbats: {
        normal: 'ZapfDingbats'
    }
};
var pdffonts = require('pdfmake/build/vfs_fonts');
var PdfPrinter = require('pdfmake');
var printer = new PdfPrinter(fonts);
var moment = require('moment');
var fs = require('fs');
var path = require('path');
var bwipjs = require('bwip-js');
Number.prototype.formatMoney = function (c, d, t) {
    var n = this,
        c = isNaN(c = Math.abs(c)) ? 2 : c,
        d = d == undefined ? "." : d,
        t = t == undefined ? "," : t,
        s = n < 0 ? "-" : "",
        i = String(parseInt(n = Math.abs(Number(n) || 0).toFixed(c))),
        j = (j = i.length) > 3 ? j % 3 : 0;
    return "" + s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};

var FlightManifest = exports.FlightManifest = function () {
    function FlightManifest() {
        _classCallCheck(this, FlightManifest);

        this.totalWeight = 0;
        this.packageCount = 0;
    }

    _createClass(FlightManifest, [{
        key: 'generateManifest',
        value: function generateManifest(manifest, packages) {
            var srv = this;
            srv.packageCount = packages.length;
            return new Promise(function (resolve, reject) {

                var docDefinition = {
                    footer: srv.generateFooter,
                    content: [{
                        stack: [{ text: "NINE TO FIVE IMPORT EXPORT", bold: true, fontSize: 11, alignment: "center" }, { margin: [0, 2], text: "1811 N.W. 51 Street Hanger 42 D", bold: true, fontSize: 9, alignment: "center" }, { margin: [0, 2], text: "Ft. Lauderale, Florida 33309", bold: true, fontSize: 9, alignment: "center" }, { margin: [0, 2], text: "FLIGHT MANIFEST", bold: true, fontSize: 11, alignment: "center" }]
                    }, {
                        margin: [0, 5, 0, 0],
                        table: {
                            headerRows: 0,
                            alignment: "center",
                            width: 400,
                            widths: ['*', '*'],
                            body: [[{ border: [false, false, false, false], text: "For Shipment:", fontSize: 8, alignment: 'right', margin: [0, 0, 2, 0], bold: true }, { border: [false, false, false, false], text: manifest.tailNum, fontSize: 8 }]]
                        }
                    }, {
                        table: {
                            headerRows: 0,
                            alignment: "center",

                            widths: [100, 100, 100, 100],
                            body: [[{ border: [false, false, false, false], text: 'Departure Date:', fontSize: 8, alignment: 'left', margin: [0, 0, 2, 0], bold: true }, { border: [false, false, false, false], text: moment.unix(manifest.shipDate).format("MM/DD/YYYY"), fontSize: 8 }, { border: [false, false, false, false], text: 'Departure Time:', fontSize: 8, alignment: 'left', margin: [0, 0, 2, 0], bold: true }, { border: [false, false, false, false], text: moment.unix(manifest.shipDate).format("hh:mm A"), fontSize: 8 }], [{ border: [false, false, false, false], text: 'Carrier:', fontSize: 8, alignment: 'left', margin: [0, 0, 2, 0], bold: true }, { border: [false, false, false, false], text: manifest.plane.company, fontSize: 8 }, { border: [false, false, false, false], text: 'Airline Flight#:', fontSize: 8, alignment: 'left', margin: [0, 0, 2, 0], bold: true }, { border: [false, false, false, false], text: manifest.tailNum, fontSize: 8 }]]
                        }
                    }, {
                        margin: [0, 5],
                        table: {
                            headerRows: 1,
                            widths: ['*', '*', '*', '*', '*'],
                            body: srv.generatePackagesTable(packages)
                        }
                    }, {
                        margin: [5, 5],
                        table: {
                            headerRows: 0,
                            widths: ['*', '*'],
                            body: [[{ text: "Total Peice Count:      " + srv.packageCount, border: [false, false, false, false], bold: true }, { text: "Total Shipment Weight:   " + srv.totalWeight + " lbs", bold: true, border: [false, false, false, false] }]]

                        }

                    }],
                    defaultStyle: {
                        font: 'Helvetica',
                        fontSize: 8
                    }
                };

                var pdfDoc = printer.createPdfKitDocument(docDefinition);
                var path1 = __dirname.replace("Util", "data");
                var filelocation = path1 + "/" + manifest.mid + '-manifest.pdf';
                console.log(filelocation, "file");
                pdfDoc.pipe(fs.createWriteStream(filelocation));
                pdfDoc.end();
                resolve({ completed: true, filename: filelocation });
            });
        }
    }, {
        key: 'generateFooter',
        value: function generateFooter(currentPage, pageCount) {
            return { text: "Page No: " + currentPage.toString() + '/' + pageCount, alignment: 'right', margin: [50, 10] };
        }
    }, {
        key: 'generatePackagesTable',
        value: function generatePackagesTable(packages) {
            var srv = this;
            var body = [[{ text: "AWB #", fillColor: "#cccccc" }, { text: "Shipper", fillColor: "#cccccc" }, { text: "Package No", fillColor: "#cccccc" }, { text: "Consignee", fillColor: "#cccccc" }, { text: "Weight lbs", fillColor: "#cccccc" }]];
            //add packages here 
            var totalWeight = 0;
            var totaldimWeight = 0;
            var displayweight = 0;
            packages.forEach(function (pkg) {
                displayweight = currencyFormatter.format(pkg.weight, {
                    symbol: '',
                    decimal: '.',
                    thousand: ',',
                    precision: 2,
                    format: '%v %s' // %s is the symbol and %v is the value
                });
                totalWeight += Number(pkg.weight);
                body.push([{ text: "AWB" + pkg.awb }, { text: pkg.awbInfo.shipper }, { text: "PK00" + pkg.id }, { text: pkg.awbInfo.customer.name }, { text: displayweight + "lbs" }]);
            });
            srv.totalWeight = totalWeight;
            // var dimw = currencyFormatter.format(totaldimWeight, {
            //     symbol: '',
            //     decimal: '.',
            //     thousand: ',',
            //     precision: 2,
            //     format: '%v %s' // %s is the symbol and %v is the value
            //   })


            return body;
        }
    }, {
        key: 'generatePackages',
        value: function generatePackages(pakcages) {
            return Promise(function (resolve, reject) {});
        }
    }]);

    return FlightManifest;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlV0aWwvRmxpZ2h0TWFuaWZlc3QuZXM2Il0sIm5hbWVzIjpbImN1cnJlbmN5Rm9ybWF0dGVyIiwicmVxdWlyZSIsImZvbnRzIiwiQ291cmllciIsIm5vcm1hbCIsImJvbGQiLCJpdGFsaWNzIiwiYm9sZGl0YWxpY3MiLCJIZWx2ZXRpY2EiLCJUaW1lcyIsIlN5bWJvbCIsIlphcGZEaW5nYmF0cyIsInBkZmZvbnRzIiwiUGRmUHJpbnRlciIsInByaW50ZXIiLCJtb21lbnQiLCJmcyIsInBhdGgiLCJid2lwanMiLCJOdW1iZXIiLCJwcm90b3R5cGUiLCJmb3JtYXRNb25leSIsImMiLCJkIiwidCIsIm4iLCJpc05hTiIsIk1hdGgiLCJhYnMiLCJ1bmRlZmluZWQiLCJzIiwiaSIsIlN0cmluZyIsInBhcnNlSW50IiwidG9GaXhlZCIsImoiLCJsZW5ndGgiLCJzdWJzdHIiLCJyZXBsYWNlIiwic2xpY2UiLCJGbGlnaHRNYW5pZmVzdCIsInRvdGFsV2VpZ2h0IiwicGFja2FnZUNvdW50IiwibWFuaWZlc3QiLCJwYWNrYWdlcyIsInNydiIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiZG9jRGVmaW5pdGlvbiIsImZvb3RlciIsImdlbmVyYXRlRm9vdGVyIiwiY29udGVudCIsInN0YWNrIiwidGV4dCIsImZvbnRTaXplIiwiYWxpZ25tZW50IiwibWFyZ2luIiwidGFibGUiLCJoZWFkZXJSb3dzIiwid2lkdGgiLCJ3aWR0aHMiLCJib2R5IiwiYm9yZGVyIiwidGFpbE51bSIsInVuaXgiLCJzaGlwRGF0ZSIsImZvcm1hdCIsInBsYW5lIiwiY29tcGFueSIsImdlbmVyYXRlUGFja2FnZXNUYWJsZSIsImRlZmF1bHRTdHlsZSIsImZvbnQiLCJwZGZEb2MiLCJjcmVhdGVQZGZLaXREb2N1bWVudCIsInBhdGgxIiwiX19kaXJuYW1lIiwiZmlsZWxvY2F0aW9uIiwibWlkIiwiY29uc29sZSIsImxvZyIsInBpcGUiLCJjcmVhdGVXcml0ZVN0cmVhbSIsImVuZCIsImNvbXBsZXRlZCIsImZpbGVuYW1lIiwiY3VycmVudFBhZ2UiLCJwYWdlQ291bnQiLCJ0b1N0cmluZyIsImZpbGxDb2xvciIsInRvdGFsZGltV2VpZ2h0IiwiZGlzcGxheXdlaWdodCIsImZvckVhY2giLCJwa2ciLCJ3ZWlnaHQiLCJzeW1ib2wiLCJkZWNpbWFsIiwidGhvdXNhbmQiLCJwcmVjaXNpb24iLCJwdXNoIiwiYXdiIiwiYXdiSW5mbyIsInNoaXBwZXIiLCJpZCIsImN1c3RvbWVyIiwibmFtZSIsInBha2NhZ2VzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEsSUFBSUEsb0JBQW9CQyxRQUFRLG9CQUFSLENBQXhCO0FBQ0MsSUFBSUMsUUFBUTtBQUNUQyxhQUFTO0FBQ1BDLGdCQUFRLFNBREQ7QUFFUEMsY0FBTSxjQUZDO0FBR1BDLGlCQUFTLGlCQUhGO0FBSVBDLHFCQUFhO0FBSk4sS0FEQTtBQU9UQyxlQUFXO0FBQ1RKLGdCQUFRLFdBREM7QUFFVEMsY0FBTSxnQkFGRztBQUdUQyxpQkFBUyxtQkFIQTtBQUlUQyxxQkFBYTtBQUpKLEtBUEY7QUFhVEUsV0FBTztBQUNMTCxnQkFBUSxhQURIO0FBRUxDLGNBQU0sWUFGRDtBQUdMQyxpQkFBUyxjQUhKO0FBSUxDLHFCQUFhO0FBSlIsS0FiRTtBQW1CVEcsWUFBUTtBQUNOTixnQkFBUTtBQURGLEtBbkJDO0FBc0JUTyxrQkFBYztBQUNaUCxnQkFBUTtBQURJO0FBdEJMLENBQVo7QUEwQkMsSUFBSVEsV0FBV1gsUUFBUSx5QkFBUixDQUFmO0FBQ0QsSUFBSVksYUFBYVosUUFBUSxTQUFSLENBQWpCO0FBQ0MsSUFBSWEsVUFBVSxJQUFJRCxVQUFKLENBQWVYLEtBQWYsQ0FBZDtBQUNBLElBQUlhLFNBQVVkLFFBQVEsUUFBUixDQUFkO0FBQ0EsSUFBSWUsS0FBS2YsUUFBUSxJQUFSLENBQVQ7QUFDQSxJQUFJZ0IsT0FBT2hCLFFBQVEsTUFBUixDQUFYO0FBQ0EsSUFBSWlCLFNBQVNqQixRQUFRLFNBQVIsQ0FBYjtBQUNBa0IsT0FBT0MsU0FBUCxD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aEI7QUFPTTFCLCtCQUFldEIsT0FBTzBFLElBQUlDLE1BQVgsQ0FBZjtBQUNOaEMscUJBQUtxQyxJQUFMLENBQVUsQ0FBQyxFQUFDN0MsTUFBSyxRQUFNdUMsSUFBSU8sR0FBaEIsRUFBRCxFQUNWLEVBQUM5QyxNQUFLdUMsSUFBSVEsT0FBSixDQUFZQyxPQUFsQixFQURVLEVBQ2lCLEVBQUNoRCxNQUFLLFNBQU91QyxJQUFJVSxFQUFqQixFQURqQixFQUNzQyxFQUFDakQsTUFBS3VDLElBQUlRLE9BQUosQ0FBWUcsUUFBWixDQUFxQkMsSUFBM0IsRUFEdEMsRUFDdUUsRUFBQ25ELE1BQUtxQyxnQkFBYyxLQUFwQixFQUR2RSxDQUFWO0FBRUgsYUFYRDtBQVlBOUMsZ0JBQUlKLFdBQUosR0FBa0JBLFdBQWxCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUdBLG1CQUFPcUIsSUFBUDtBQUNIOzs7eUNBQ2dCNEMsUSxFQUFTO0FBQ3RCLG1CQUFPNUQsUUFBUSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0IsQ0FFaEMsQ0FGTSxDQUFQO0FBR0giLCJmaWxlIjoiVXRpbC9GbGlnaHRNYW5pZmVzdC5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBjdXJyZW5jeUZvcm1hdHRlciA9IHJlcXVpcmUoJ2N1cnJlbmN5LWZvcm1hdHRlcicpOyBcbiB2YXIgZm9udHMgPSB7XG4gICAgQ291cmllcjoge1xuICAgICAgbm9ybWFsOiAnQ291cmllcicsXG4gICAgICBib2xkOiAnQ291cmllci1Cb2xkJyxcbiAgICAgIGl0YWxpY3M6ICdDb3VyaWVyLU9ibGlxdWUnLFxuICAgICAgYm9sZGl0YWxpY3M6ICdDb3VyaWVyLUJvbGRPYmxpcXVlJ1xuICAgIH0sXG4gICAgSGVsdmV0aWNhOiB7XG4gICAgICBub3JtYWw6ICdIZWx2ZXRpY2EnLFxuICAgICAgYm9sZDogJ0hlbHZldGljYS1Cb2xkJyxcbiAgICAgIGl0YWxpY3M6ICdIZWx2ZXRpY2EtT2JsaXF1ZScsXG4gICAgICBib2xkaXRhbGljczogJ0hlbHZldGljYS1Cb2xkT2JsaXF1ZSdcbiAgICB9LFxuICAgIFRpbWVzOiB7XG4gICAgICBub3JtYWw6ICdUaW1lcy1Sb21hbicsXG4gICAgICBib2xkOiAnVGltZXMtQm9sZCcsXG4gICAgICBpdGFsaWNzOiAnVGltZXMtSXRhbGljJyxcbiAgICAgIGJvbGRpdGFsaWNzOiAnVGltZXMtQm9sZEl0YWxpYydcbiAgICB9LFxuICAgIFN5bWJvbDoge1xuICAgICAgbm9ybWFsOiAnU3ltYm9sJ1xuICAgIH0sXG4gICAgWmFwZkRpbmdiYXRzOiB7XG4gICAgICBub3JtYWw6ICdaYXBmRGluZ2JhdHMnXG4gICAgfVxuICB9O1xuICB2YXIgcGRmZm9udHMgPSByZXF1aXJlKCdwZGZtYWtlL2J1aWxkL3Zmc19mb250cycpXG4gdmFyIFBkZlByaW50ZXIgPSByZXF1aXJlKCdwZGZtYWtlJyk7XG4gIHZhciBwcmludGVyID0gbmV3IFBkZlByaW50ZXIoZm9udHMpO1xuICB2YXIgbW9tZW50ICA9IHJlcXVpcmUoJ21vbWVudCcpOyBcbiAgdmFyIGZzID0gcmVxdWlyZSgnZnMnKTtcbiAgdmFyIHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG4gIHZhciBid2lwanMgPSByZXF1aXJlKCdid2lwLWpzJylcbiAgTnVtYmVyLnByb3RvdHlwZS5mb3JtYXRNb25leSA9IGZ1bmN0aW9uIChjLCBkLCB0KSB7XG4gICAgdmFyIG4gPSB0aGlzLFxuICAgICAgICBjID0gaXNOYU4oYyA9IE1hdGguYWJzKGMpKSA/IDIgOiBjLFxuICAgICAgICBkID0gZCA9PSB1bmRlZmluZWQgPyBcIi5cIiA6IGQsXG4gICAgICAgIHQgPSB0ID09IHVuZGVmaW5lZCA/IFwiLFwiIDogdCxcbiAgICAgICAgcyA9IG4gPCAwID8gXCItXCIgOiBcIlwiLFxuICAgICAgICBpID0gU3RyaW5nKHBhcnNlSW50KG4gPSBNYXRoLmFicyhOdW1iZXIobikgfHwgMCkudG9GaXhlZChjKSkpLFxuICAgICAgICBqID0gKGogPSBpLmxlbmd0aCkgPiAzID8gaiAlIDMgOiAwO1xuICAgIHJldHVybiBcIlwiICsgcyArIChqID8gaS5zdWJzdHIoMCwgaikgKyB0IDogXCJcIikgKyBpLnN1YnN0cihqKS5yZXBsYWNlKC8oXFxkezN9KSg/PVxcZCkvZywgXCIxXCIgKyB0KSArIChjID8gZCArIE1hdGguYWJzKG4gLSBpKS50b0ZpeGVkKGMpLnNsaWNlKDIpIDogXCJcIik7XG59O1xuXG5leHBvcnQgY2xhc3MgRmxpZ2h0TWFuaWZlc3QgeyBcbiAgICBjb25zdHJ1Y3Rvcigpe1xuICAgICAgICB0aGlzLnRvdGFsV2VpZ2h0ICA9MCA7IFxuICAgICAgICB0aGlzLnBhY2thZ2VDb3VudCA9IDAgOyBcbiAgICB9XG4gICAgZ2VuZXJhdGVNYW5pZmVzdChtYW5pZmVzdCxwYWNrYWdlcyl7XG4gICAgICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICAgICBzcnYucGFja2FnZUNvdW50ID0gcGFja2FnZXMubGVuZ3RoOyBcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcblxuXG4gICAgICAgICAgICB2YXIgZG9jRGVmaW5pdGlvbiA9IHsgXG4gICAgICAgICAgICAgICAgZm9vdGVyOiBzcnYuZ2VuZXJhdGVGb290ZXIsXG4gICAgICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFjayA6W1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHt0ZXh0OlwiTklORSBUTyBGSVZFIElNUE9SVCBFWFBPUlRcIixib2xkOnRydWUsZm9udFNpemU6MTEsYWxpZ25tZW50OlwiY2VudGVyXCJ9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHttYXJnaW46WzAsMl0sdGV4dDpcIjE4MTEgTi5XLiA1MSBTdHJlZXQgSGFuZ2VyIDQyIERcIixib2xkOnRydWUsZm9udFNpemU6OSxhbGlnbm1lbnQ6XCJjZW50ZXJcIn0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMCwyXSx0ZXh0OlwiRnQuIExhdWRlcmFsZSwgRmxvcmlkYSAzMzMwOVwiLGJvbGQ6dHJ1ZSxmb250U2l6ZTo5LGFsaWdubWVudDpcImNlbnRlclwifSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOlswLDJdLHRleHQ6XCJGTElHSFQgTUFOSUZFU1RcIixib2xkOnRydWUsZm9udFNpemU6MTEsYWxpZ25tZW50OlwiY2VudGVyXCJ9XG4gICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbjpbMCw1LDAsMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICB0YWJsZTp7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyUm93czowLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsaWdubWVudDpcImNlbnRlclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOjQwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aHM6WycqJywnKiddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvZHk6W1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbe2JvcmRlcjpbZmFsc2UsZmFsc2UsZmFsc2UsZmFsc2VdLHRleHQ6XCJGb3IgU2hpcG1lbnQ6XCIsZm9udFNpemU6OCxhbGlnbm1lbnQ6J3JpZ2h0JyxtYXJnaW46WzAsMCwyLDBdLGJvbGQ6dHJ1ZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtib3JkZXI6W2ZhbHNlLGZhbHNlLGZhbHNlLGZhbHNlXSx0ZXh0Om1hbmlmZXN0LnRhaWxOdW0sZm9udFNpemU6OH1dXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YWJsZTp7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyUm93czowLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsaWdubWVudDpcImNlbnRlclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoczpbMTAwLDEwMCwxMDAsMTAwXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBib2R5OltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge2JvcmRlcjpbZmFsc2UsZmFsc2UsZmFsc2UsZmFsc2VdLHRleHQ6J0RlcGFydHVyZSBEYXRlOicsZm9udFNpemU6OCxhbGlnbm1lbnQ6J2xlZnQnLG1hcmdpbjpbMCwwLDIsMF0sYm9sZDp0cnVlfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtib3JkZXI6W2ZhbHNlLGZhbHNlLGZhbHNlLGZhbHNlXSx0ZXh0Om1vbWVudC51bml4KG1hbmlmZXN0LnNoaXBEYXRlKS5mb3JtYXQoXCJNTS9ERC9ZWVlZXCIpLGZvbnRTaXplOjh9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge2JvcmRlcjpbZmFsc2UsZmFsc2UsZmFsc2UsZmFsc2VdLHRleHQ6J0RlcGFydHVyZSBUaW1lOicsZm9udFNpemU6OCxhbGlnbm1lbnQ6J2xlZnQnLG1hcmdpbjpbMCwwLDIsMF0sYm9sZDp0cnVlfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtib3JkZXI6W2ZhbHNlLGZhbHNlLGZhbHNlLGZhbHNlXSx0ZXh0Om1vbWVudC51bml4KG1hbmlmZXN0LnNoaXBEYXRlKS5mb3JtYXQoXCJoaDptbSBBXCIpLGZvbnRTaXplOjh9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7Ym9yZGVyOltmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZV0sdGV4dDonQ2FycmllcjonLGZvbnRTaXplOjgsYWxpZ25tZW50OidsZWZ0JyxtYXJnaW46WzAsMCwyLDBdLGJvbGQ6dHJ1ZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7Ym9yZGVyOltmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZV0sdGV4dDptYW5pZmVzdC5wbGFuZS5jb21wYW55LGZvbnRTaXplOjh9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge2JvcmRlcjpbZmFsc2UsZmFsc2UsZmFsc2UsZmFsc2VdLHRleHQ6J0FpcmxpbmUgRmxpZ2h0IzonLGZvbnRTaXplOjgsYWxpZ25tZW50OidsZWZ0JyxtYXJnaW46WzAsMCwyLDBdLGJvbGQ6dHJ1ZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7Ym9yZGVyOltmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZV0sdGV4dDptYW5pZmVzdC50YWlsTnVtLGZvbnRTaXplOjh9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW46WzAsNV0sXG4gICAgICAgICAgICAgICAgICAgICAgICB0YWJsZTp7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyUm93czoxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoczpbJyonLCcqJywnKicsJyonLCcqJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9keTpzcnYuZ2VuZXJhdGVQYWNrYWdlc1RhYmxlKHBhY2thZ2VzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW46WzUsNV0sXG4gICAgICAgICAgICAgICAgICAgICAgICB0YWJsZTp7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyUm93czowLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoczpbJyonLCcqJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9keTpbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFt7dGV4dDpcIlRvdGFsIFBlaWNlIENvdW50OiAgICAgIFwiK3Nydi5wYWNrYWdlQ291bnQsIGJvcmRlcjpbZmFsc2UsZmFsc2UsZmFsc2UsZmFsc2VdLGJvbGQ6dHJ1ZX0se3RleHQ6XCJUb3RhbCBTaGlwbWVudCBXZWlnaHQ6ICAgXCIrc3J2LnRvdGFsV2VpZ2h0K1wiIGxic1wiLGJvbGQ6dHJ1ZSxib3JkZXI6W2ZhbHNlLGZhbHNlLGZhbHNlLGZhbHNlXX1dXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBkZWZhdWx0U3R5bGU6IHtcbiAgICAgICAgICAgICAgICAgICAgZm9udDogJ0hlbHZldGljYScsXG4gICAgICAgICAgICAgICAgICAgIGZvbnRTaXplOjhcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9OyBcblxuICAgICAgICAgICAgdmFyIHBkZkRvYyA9IHByaW50ZXIuY3JlYXRlUGRmS2l0RG9jdW1lbnQoZG9jRGVmaW5pdGlvbik7XG4gICAgICAgICAgICB2YXIgcGF0aDEgPSBfX2Rpcm5hbWUucmVwbGFjZShcIlV0aWxcIixcImRhdGFcIik7ICAgXG4gICAgICAgICAgICB2YXIgZmlsZWxvY2F0aW9uID0gcGF0aDErXCIvXCIrbWFuaWZlc3QubWlkKyctbWFuaWZlc3QucGRmJzsgXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhmaWxlbG9jYXRpb24sXCJmaWxlXCIpOyBcbiAgICAgICAgICAgIHBkZkRvYy5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKGZpbGVsb2NhdGlvbikpO1xuICAgICAgICAgICAgcGRmRG9jLmVuZCgpO1xuICAgICAgICAgICAgcmVzb2x2ZSh7Y29tcGxldGVkOnRydWUsIGZpbGVuYW1lOmZpbGVsb2NhdGlvbn0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIGdlbmVyYXRlRm9vdGVyKGN1cnJlbnRQYWdlLCBwYWdlQ291bnQpe1xuICAgICAgICByZXR1cm4gICAgICAgIHsgdGV4dDogXCJQYWdlIE5vOiBcIiArIGN1cnJlbnRQYWdlLnRvU3RyaW5nKCkgKyAnLycgKyBwYWdlQ291bnQsIGFsaWdubWVudDogJ3JpZ2h0JywgbWFyZ2luOls1MCwxMF0gfVxuICAgICAgICAgICAgICAgICAgICAgXG4gICAgfVxuICAgIGdlbmVyYXRlUGFja2FnZXNUYWJsZShwYWNrYWdlcyl7XG4gICAgICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICAgICAgbGV0IGJvZHkgPSBbXG4gICAgICAgICAgICBbe3RleHQ6XCJBV0IgI1wiLGZpbGxDb2xvcjpcIiNjY2NjY2NcIn0sXG4gICAgICAgICAgICB7dGV4dDpcIlNoaXBwZXJcIixmaWxsQ29sb3I6XCIjY2NjY2NjXCJ9LFxuICAgICAgICAgICAge3RleHQ6XCJQYWNrYWdlIE5vXCIsZmlsbENvbG9yOlwiI2NjY2NjY1wifSxcbiAgICAgICAgICAgIHt0ZXh0OlwiQ29uc2lnbmVlXCIsZmlsbENvbG9yOlwiI2NjY2NjY1wifSxcbiAgICAgICAgICAgIHt0ZXh0OlwiV2VpZ2h0IGxic1wiLGZpbGxDb2xvcjpcIiNjY2NjY2NcIn0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIFxuICAgICAgICBdXG4gICAgICAgIC8vYWRkIHBhY2thZ2VzIGhlcmUgXG4gICAgICAgIHZhciB0b3RhbFdlaWdodCA9IDAgOyBcbiAgICAgICAgdmFyIHRvdGFsZGltV2VpZ2h0ID0gMCA7IFxuICAgICAgICB2YXIgZGlzcGxheXdlaWdodCA9IDAgOyBcbiAgICAgICAgcGFja2FnZXMuZm9yRWFjaChwa2cgPT4ge1xuICAgICAgICAgICAgZGlzcGxheXdlaWdodCA9IGN1cnJlbmN5Rm9ybWF0dGVyLmZvcm1hdChwa2cud2VpZ2h0LCB7XG4gICAgICAgICAgICAgICAgICAgIHN5bWJvbDogJycsXG4gICAgICAgICAgICAgICAgICAgIGRlY2ltYWw6ICcuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhvdXNhbmQ6ICcsJyxcbiAgICAgICAgICAgICAgICAgICAgcHJlY2lzaW9uOiAyLFxuICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6ICcldiAlcycgLy8gJXMgaXMgdGhlIHN5bWJvbCBhbmQgJXYgaXMgdGhlIHZhbHVlXG4gICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgdG90YWxXZWlnaHQgKz0gTnVtYmVyKHBrZy53ZWlnaHQpOyBcbiAgICAgICAgICAgIGJvZHkucHVzaChbe3RleHQ6XCJBV0JcIitwa2cuYXdifSxcbiAgICAgICAgICAgIHt0ZXh0OnBrZy5hd2JJbmZvLnNoaXBwZXJ9LHt0ZXh0OlwiUEswMFwiK3BrZy5pZH0se3RleHQ6cGtnLmF3YkluZm8uY3VzdG9tZXIubmFtZX0se3RleHQ6ZGlzcGxheXdlaWdodCtcImxic1wifSxdKSBcbiAgICAgICAgfSk7XG4gICAgICAgIHNydi50b3RhbFdlaWdodCA9IHRvdGFsV2VpZ2h0OyBcbiAgICAgICAgLy8gdmFyIGRpbXcgPSBjdXJyZW5jeUZvcm1hdHRlci5mb3JtYXQodG90YWxkaW1XZWlnaHQsIHtcbiAgICAgICAgLy8gICAgIHN5bWJvbDogJycsXG4gICAgICAgIC8vICAgICBkZWNpbWFsOiAnLicsXG4gICAgICAgIC8vICAgICB0aG91c2FuZDogJywnLFxuICAgICAgICAvLyAgICAgcHJlY2lzaW9uOiAyLFxuICAgICAgICAvLyAgICAgZm9ybWF0OiAnJXYgJXMnIC8vICVzIGlzIHRoZSBzeW1ib2wgYW5kICV2IGlzIHRoZSB2YWx1ZVxuICAgICAgICAvLyAgIH0pXG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGJvZHk7IFxuICAgIH1cbiAgICBnZW5lcmF0ZVBhY2thZ2VzKHBha2NhZ2VzKXtcbiAgICAgICAgcmV0dXJuIFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuXG4gICAgICAgIH0pXG4gICAgfVxuXG59Il19