'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

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
var PdfPrinter = require('pdfmake');
var printer = new PdfPrinter(fonts);
var fs = require('fs');
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

var FlightLoadSheet = exports.FlightLoadSheet = function () {
    function FlightLoadSheet() {
        _classCallCheck(this, FlightLoadSheet);
    }

    _createClass(FlightLoadSheet, [{
        key: 'generateManifestLoadSheet',
        value: function generateManifestLoadSheet(manifest) {
            var _this = this;

            return new Promise(function (resolve, reject) {
                var srv = _this;
                var docDefinition = {
                    footer: srv.generateFooter,

                    content: [{
                        stack: [{ text: "NINE TO FIVE IMPORT EXPORT", bold: true, fontSize: 11, alignment: "center" }, { margin: [0, 3], text: "1811 N.W. 51 Street Hanger 42 D", bold: true, fontSize: 9, alignment: "center" }, { margin: [0, 3], text: "Ft. Lauderale, Florida 33309", bold: true, fontSize: 9, alignment: "center" }, { margin: [0, 3], text: "FLIGHT LOAD SHEET", bold: true, fontSize: 11, alignment: "center" }]
                    }, {
                        margin: [0, 3],
                        table: {
                            headerRows: 0,
                            alignment: "center",

                            widths: ['*', '*'],
                            body: [[{ border: [false, false, false, false], text: "For Shipment:", fontSize: 9, alignment: "right", bold: true }, { border: [false, false, false, false], text: manifest.tailNum, fontSize: 9 }]]
                        }
                    }, {
                        margin: [0, 3],
                        table: {
                            headerRows: 0,
                            alignment: "center",

                            widths: ['*', '*', '*', '*'],
                            body: [[{ border: [false, false, false, false], text: 'Departure Date:', fontSize: 8, bold: true }, { border: [false, false, false, false], text: manifest.shipDate, fontSize: 8 }, { border: [false, false, false, false], text: 'Departure Time:', fontSize: 8, bold: true }, { border: [false, false, false, false], text: manifest.shipDate, fontSize: 8 }], [{ border: [false, false, false, false], text: 'Carrier:', fontSize: 8, bold: true }, { border: [false, false, false, false], text: manifest.plane.company, fontSize: 8 }, { border: [false, false, false, false], text: 'Airline Flight#:', fontSize: 8, bold: true }, { border: [false, false, false, false], text: manifest.tailNum, fontSize: 8 }]]
                        }
                    }, {
                        margin: [0, 3],
                        stack: [{ text: "Flight Notes:", fontSize: 9, bold: true }]
                    }],
                    defaultStyle: {
                        font: 'Helvetica',
                        fontSize: 8
                    }
                };

                var path1 = __dirname.replace("Util", "data");
                var filelocation = path1 + "/" + manifest.id + '-load-sheet.pdf';
                console.log(filelocation, "file");
                var pdfDoc = printer.createPdfKitDocument(docDefinition);
                pdfDoc.pipe(fs.createWriteStream(filelocation));
                pdfDoc.end();
                resolve({ completed: true, filename: filelocation });
            });
        }
    }, {
        key: 'generateHeader',
        value: function generateHeader() {}
    }, {
        key: 'generateFooter',
        value: function generateFooter(currentPage, pageCount) {
            return { text: "Page No: " + currentPage.toString() + '/' + pageCount, alignment: 'right', margin: [50, 10] };
        }
    }]);

    return FlightLoadSheet;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlV0aWwvRmxpZ2h0TG9hZFNoZWV0LmVzNiJdLCJuYW1lcyI6WyJmb250cyIsIkNvdXJpZXIiLCJub3JtYWwiLCJib2xkIiwiaXRhbGljcyIsImJvbGRpdGFsaWNzIiwiSGVsdmV0aWNhIiwiVGltZXMiLCJTeW1ib2wiLCJaYXBmRGluZ2JhdHMiLCJQZGZQcmludGVyIiwicmVxdWlyZSIsInByaW50ZXIiLCJmcyIsImJ3aXBqcyIsIk51bWJlciIsInByb3RvdHlwZSIsImZvcm1hdE1vbmV5IiwiYyIsImQiLCJ0IiwibiIsImlzTmFOIiwiTWF0aCIsImFicyIsInVuZGVmaW5lZCIsInMiLCJpIiwiU3RyaW5nIiwicGFyc2VJbnQiLCJ0b0ZpeGVkIiwiaiIsImxlbmd0aCIsInN1YnN0ciIsInJlcGxhY2UiLCJzbGljZSIsIkZsaWdodExvYWRTaGVldCIsIm1hbmlmZXN0IiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJzcnYiLCJkb2NEZWZpbml0aW9uIiwiZm9vdGVyIiwiZ2VuZXJhdGVGb290ZXIiLCJjb250ZW50Iiwic3RhY2siLCJ0ZXh0IiwiZm9udFNpemUiLCJhbGlnbm1lbnQiLCJtYXJnaW4iLCJ0YWJsZSIsImhlYWRlclJvd3MiLCJ3aWR0aHMiLCJib2R5IiwiYm9yZGVyIiwidGFpbE51bSIsInNoaXBEYXRlIiwicGxhbmUiLCJjb21wYW55IiwiZGVmYXVsdFN0eWxlIiwiZm9udCIsInBhdGgxIiwiX19kaXJuYW1lIiwiZmlsZWxvY2F0aW9uIiwiaWQiLCJjb25zb2xlIiwibG9nIiwicGRmRG9jIiwiY3JlYXRlUGRmS2l0RG9jdW1lbnQiLCJwaXBlIiwiY3JlYXRlV3JpdGVTdHJlYW0iLCJlbmQiLCJjb21wbGV0ZWQiLCJmaWxlbmFtZSIsImN1cnJlbnRQYWdlIiwicGFnZUNvdW50IiwidG9TdHJpbmciXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxRQUFRO0FBQ1JDLGFBQVM7QUFDUEMsZ0JBQVEsU0FERDtBQUVQQyxjQUFNLGNBRkM7QUFHUEMsaUJBQVMsaUJBSEY7QUFJUEMscUJBQWE7QUFKTixLQUREO0FBT1JDLGVBQVc7QUFDVEosZ0JBQVEsV0FEQztBQUVUQyxjQUFNLGdCQUZHO0FBR1RDLGlCQUFTLG1CQUhBO0FBSVRDLHFCQUFhO0FBSkosS0FQSDtBQWFSRSxXQUFPO0FBQ0xMLGdCQUFRLGFBREg7QUFFTEMsY0FBTSxZQUZEO0FBR0xDLGlCQUFTLGNBSEo7QUFJTEMscUJBQWE7QUFKUixLQWJDO0FBbUJSRyxZQUFRO0FBQ05OLGdCQUFRO0FBREYsS0FuQkE7QUFzQlJPLGtCQUFjO0FBQ1pQLGdCQUFRO0FBREk7QUF0Qk4sQ0FBWjtBQTBCQyxJQUFJUSxhQUFhQyxRQUFRLFNBQVIsQ0FBakI7QUFDQyxJQUFJQyxVQUFVLElBQUlGLFVBQUosQ0FBZVYsS0FBZixDQUFkO0FBQ0EsSUFBSWEsS0FBS0YsUUFBUSxJQUFSLENBQVQ7QUFDQSxJQUFJRyxTQUFTSCxRQUFRLFNBQVIsQ0FBYjtBQUNBSSxPQUFPQyxTQUFQLENBQWlCQyxXQUFqQixHQUErQixVQUFVQyxDQUFWLEVBQWFDLENBQWIsRUFBZ0JDLENBQWhCLEVBQW1CO0FBQ2hELFFBQUlDLElBQUksSUFBUjtBQUFBLFFBQ0lILElBQUlJLE1BQU1KLElBQUlLLEtBQUtDLEdBQUwsQ0FBU04sQ0FBVCxDQUFWLElBQXlCLENBQXpCLEdBQTZCQSxDQURyQztBQUFBLFFBRUlDLElBQUlBLEtBQUtNLFNBQUwsR0FBaUIsR0FBakIsR0FBdUJOLENBRi9CO0FBQUEsUUFHSUMsSUFBSUEsS0FBS0ssU0FBTCxHQUFpQixHQUFqQixHQUF1QkwsQ0FIL0I7QUFBQSxRQUlJTSxJQUFJTCxJQUFJLENBQUosR0FBUSxHQUFSLEdBQWMsRUFKdEI7QUFBQSxRQUtJTSxJQUFJQyxPQUFPQyxTQUFTUixJQUFJRSxLQUFLQyxHQUFMLENBQVNULE9BQU9NLENBQVAsS0FBYSxDQUF0QixFQUF5QlMsT0FBekIsQ0FBaUNaLENBQWpDLENBQWIsQ0FBUCxDQUxSO0FBQUEsUUFNSWEsSUFBSSxDQUFDQSxJQUFJSixFQUFFSyxNQUFQLElBQWlCLENBQWpCLEdBQXFCRCxJQUFJLENBQXpCLEdBQTZCLENBTnJDO0FBT0EsV0FBTyxLQUFLTCxDQUFMLElBQVVLLElBQUlKLEVBQUVNLE1BQUYsQ0FBUyxDQUFULEVBQVlGLENBQVosSUFBaUJYLENBQXJCLEdBQXlCLEVBQW5DLElBQXlDTyxFQUFFTSxNQUFGLENBQVNGLENBQVQsRUFBWUcsT0FBWixDQUFvQixnQkFBcEIsRUFBc0MsTUFBTWQsQ0FBNUMsQ0FBekMsSUFBMkZGLElBQUlDLElBQUlJLEtBQUtDLEdBQUwsQ0FBU0gsSUFBSU0sQ0FBYixFQUFnQkcsT0FBaEIsQ0FBd0JaLENBQXhCLEVBQTJCaUIsS0FBM0IsQ0FBaUMsQ0FBakMsQ0FBUixHQUE4QyxFQUF6SSxDQUFQO0FBQ0gsQ0FUQzs7SUFVV0MsZSxXQUFBQSxlO0FBQ1QsK0JBQWE7QUFBQTtBQUVaOzs7O2tEQUV5QkMsUSxFQUFTO0FBQUE7O0FBQy9CLG1CQUFPLElBQUlDLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDakMsb0JBQUlDLE1BQU0sS0FBVjtBQUNBLG9CQUFJQyxnQkFBZ0I7QUFDaEJDLDRCQUFRRixJQUFJRyxjQURJOztBQUdoQkMsNkJBQVMsQ0FDRTtBQUNJQywrQkFBTyxDQUNILEVBQUNDLE1BQUssNEJBQU4sRUFBbUM1QyxNQUFLLElBQXhDLEVBQTZDNkMsVUFBUyxFQUF0RCxFQUF5REMsV0FBVSxRQUFuRSxFQURHLEVBRUgsRUFBQ0MsUUFBTyxDQUFDLENBQUQsRUFBRyxDQUFILENBQVIsRUFBY0gsTUFBSyxpQ0FBbkIsRUFBcUQ1QyxNQUFLLElBQTFELEVBQStENkMsVUFBUyxDQUF4RSxFQUEwRUMsV0FBVSxRQUFwRixFQUZHLEVBR0gsRUFBQ0MsUUFBTyxDQUFDLENBQUQsRUFBRyxDQUFILENBQVIsRUFBY0gsTUFBSyw4QkFBbkIsRUFBa0Q1QyxNQUFLLElBQXZELEVBQTRENkMsVUFBUyxDQUFyRSxFQUF1RUMsV0FBVSxRQUFqRixFQUhHLEVBSUgsRUFBQ0MsUUFBTyxDQUFDLENBQUQsRUFBRyxDQUFILENBQVIsRUFBY0gsTUFBSyxtQkFBbkIsRUFBdUM1QyxNQUFLLElBQTVDLEVBQWlENkMsVUFBUyxFQUExRCxFQUE2REMsV0FBVSxRQUF2RSxFQUpHO0FBRFgscUJBREYsRUFTRTtBQUNJQyxnQ0FBTyxDQUFDLENBQUQsRUFBRyxDQUFILENBRFg7QUFFQ0MsK0JBQU07QUFDRkMsd0NBQVcsQ0FEVDtBQUVGSCx1Q0FBVSxRQUZSOztBQUlGSSxvQ0FBTyxDQUFDLEdBQUQsRUFBSyxHQUFMLENBSkw7QUFLRkMsa0NBQUssQ0FDRCxDQUFDLEVBQUNDLFFBQU8sQ0FBQyxLQUFELEVBQU8sS0FBUCxFQUFhLEtBQWIsRUFBbUIsS0FBbkIsQ0FBUixFQUFrQ1IsTUFBSyxlQUF2QyxFQUF1REMsVUFBUyxDQUFoRSxFQUFtRUMsV0FBVSxPQUE3RSxFQUFxRjlDLE1BQUssSUFBMUYsRUFBRCxFQUNBLEVBQUNvRCxRQUFPLENBQUMsS0FBRCxFQUFPLEtBQVAsRUFBYSxLQUFiLEVBQW1CLEtBQW5CLENBQVIsRUFBa0NSLE1BQUtWLFNBQVNtQixPQUFoRCxFQUF3RFIsVUFBUyxDQUFqRSxFQURBLENBREM7QUFMSDtBQUZQLHFCQVRGLEVBc0JEO0FBQ0lFLGdDQUFPLENBQUMsQ0FBRCxFQUFHLENBQUgsQ0FEWDtBQUVJQywrQkFBTTtBQUNGQyx3Q0FBVyxDQURUO0FBRUZILHVDQUFVLFFBRlI7O0FBSUZJLG9DQUFPLENBQUMsR0FBRCxFQUFLLEdBQUwsRUFBUyxHQUFULEVBQWEsR0FBYixDQUpMO0FBS0ZDLGtDQUFLLENBQ0QsQ0FDSSxFQUFDQyxRQUFPLENBQUMsS0FBRCxFQUFPLEtBQVAsRUFBYSxLQUFiLEVBQW1CLEtBQW5CLENBQVIsRUFBa0NSLE1BQUssaUJBQXZDLEVBQXlEQyxVQUFTLENBQWxFLEVBQW9FN0MsTUFBSyxJQUF6RSxFQURKLEVBRUksRUFBQ29ELFFBQU8sQ0FBQyxLQUFELEVBQU8sS0FBUCxFQUFhLEtBQWIsRUFBbUIsS0FBbkIsQ0FBUixFQUFrQ1IsTUFBS1YsU0FBU29CLFFBQWhELEVBQXlEVCxVQUFTLENBQWxFLEVBRkosRUFHSSxFQUFDTyxRQUFPLENBQUMsS0FBRCxFQUFPLEtBQVAsRUFBYSxLQUFiLEVBQW1CLEtBQW5CLENBQVIsRUFBa0NSLE1BQUssaUJBQXZDLEVBQXlEQyxVQUFTLENBQWxFLEVBQW9FN0MsTUFBSyxJQUF6RSxFQUhKLEVBSUksRUFBQ29ELFFBQU8sQ0FBQyxLQUFELEVBQU8sS0FBUCxFQUFhLEtBQWIsRUFBbUIsS0FBbkIsQ0FBUixFQUFrQ1IsTUFBS1YsU0FBU29CLFFBQWhELEVBQXlEVCxVQUFTLENBQWxFLEVBSkosQ0FEQyxFQU9ELENBQ0ksRUFBQ08sUUFBTyxDQUFDLEtBQUQsRUFBTyxLQUFQLEVBQWEsS0FBYixFQUFtQixLQUFuQixDQUFSLEVBQWtDUixNQUFLLFVBQXZDLEVBQWtEQyxVQUFTLENBQTNELEVBQTZEN0MsTUFBSyxJQUFsRSxFQURKLEVBRUksRUFBQ29ELFFBQU8sQ0FBQyxLQUFELEVBQU8sS0FBUCxFQUFhLEtBQWIsRUFBbUIsS0FBbkIsQ0FBUixFQUFrQ1IsTUFBS1YsU0FBU3FCLEtBQVQsQ0FBZUMsT0FBdEQsRUFBOERYLFVBQVMsQ0FBdkUsRUFGSixFQUdJLEVBQUNPLFFBQU8sQ0FBQyxLQUFELEVBQU8sS0FBUCxFQUFhLEtBQWIsRUFBbUIsS0FBbkIsQ0FBUixFQUFrQ1IsTUFBSyxrQkFBdkMsRUFBMERDLFVBQVMsQ0FBbkUsRUFBcUU3QyxNQUFLLElBQTFFLEVBSEosRUFJSSxFQUFDb0QsUUFBTyxDQUFDLEtBQUQsRUFBTyxLQUFQLEVBQWEsS0FBYixFQUFtQixLQUFuQixDQUFSLEVBQWtDUixNQUFLVixTQUFTbUIsT0FBaEQsRUFBd0RSLFVBQVMsQ0FBakUsRUFKSixDQVBDO0FBTEg7QUFGVixxQkF0QkMsRUE4Q0Q7QUFDSUUsZ0NBQU8sQ0FBQyxDQUFELEVBQUcsQ0FBSCxDQURYO0FBRUlKLCtCQUFNLENBQ0YsRUFBQ0MsTUFBSyxlQUFOLEVBQXNCQyxVQUFTLENBQS9CLEVBQWlDN0MsTUFBSyxJQUF0QyxFQURFO0FBRlYscUJBOUNDLENBSE87QUE2RGhCeUQsa0NBQWM7QUFDVkMsOEJBQU0sV0FESTtBQUVWYixrQ0FBUztBQUZDO0FBN0RFLGlCQUFwQjs7QUFtRUEsb0JBQUljLFFBQVFDLFVBQVU3QixPQUFWLENBQWtCLE1BQWxCLEVBQXlCLE1BQXpCLENBQVo7QUFDQSxvQkFBSThCLGVBQWVGLFFBQU0sR0FBTixHQUFVekIsU0FBUzRCLEVBQW5CLEdBQXNCLGlCQUF6QztBQUNBQyx3QkFBUUMsR0FBUixDQUFZSCxZQUFaLEVBQXlCLE1BQXpCO0FBQ0Esb0JBQUlJLFNBQVN4RCxRQUFReUQsb0JBQVIsQ0FBNkIzQixhQUE3QixDQUFiO0FBQ0EwQix1QkFBT0UsSUFBUCxDQUFZekQsR0FBRzBELGlCQUFILENBQXFCUCxZQUFyQixDQUFaO0FBQ0FJLHVCQUFPSSxHQUFQO0FBQ0FqQyx3QkFBUSxFQUFDa0MsV0FBVSxJQUFYLEVBQWlCQyxVQUFTVixZQUExQixFQUFSO0FBQ0gsYUE1RU0sQ0FBUDtBQThFSDs7O3lDQUNlLENBR2Y7Ozt1Q0FFY1csVyxFQUFhQyxTLEVBQVU7QUFDbEMsbUJBQWMsRUFBRTdCLE1BQU0sY0FBYzRCLFlBQVlFLFFBQVosRUFBZCxHQUF1QyxHQUF2QyxHQUE2Q0QsU0FBckQsRUFBZ0UzQixXQUFXLE9BQTNFLEVBQW9GQyxRQUFPLENBQUMsRUFBRCxFQUFJLEVBQUosQ0FBM0YsRUFBZDtBQUVMIiwiZmlsZSI6IlV0aWwvRmxpZ2h0TG9hZFNoZWV0LmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIGZvbnRzID0ge1xuICAgIENvdXJpZXI6IHtcbiAgICAgIG5vcm1hbDogJ0NvdXJpZXInLFxuICAgICAgYm9sZDogJ0NvdXJpZXItQm9sZCcsXG4gICAgICBpdGFsaWNzOiAnQ291cmllci1PYmxpcXVlJyxcbiAgICAgIGJvbGRpdGFsaWNzOiAnQ291cmllci1Cb2xkT2JsaXF1ZSdcbiAgICB9LFxuICAgIEhlbHZldGljYToge1xuICAgICAgbm9ybWFsOiAnSGVsdmV0aWNhJyxcbiAgICAgIGJvbGQ6ICdIZWx2ZXRpY2EtQm9sZCcsXG4gICAgICBpdGFsaWNzOiAnSGVsdmV0aWNhLU9ibGlxdWUnLFxuICAgICAgYm9sZGl0YWxpY3M6ICdIZWx2ZXRpY2EtQm9sZE9ibGlxdWUnXG4gICAgfSxcbiAgICBUaW1lczoge1xuICAgICAgbm9ybWFsOiAnVGltZXMtUm9tYW4nLFxuICAgICAgYm9sZDogJ1RpbWVzLUJvbGQnLFxuICAgICAgaXRhbGljczogJ1RpbWVzLUl0YWxpYycsXG4gICAgICBib2xkaXRhbGljczogJ1RpbWVzLUJvbGRJdGFsaWMnXG4gICAgfSxcbiAgICBTeW1ib2w6IHtcbiAgICAgIG5vcm1hbDogJ1N5bWJvbCdcbiAgICB9LFxuICAgIFphcGZEaW5nYmF0czoge1xuICAgICAgbm9ybWFsOiAnWmFwZkRpbmdiYXRzJ1xuICAgIH1cbiAgfTtcbiB2YXIgUGRmUHJpbnRlciA9IHJlcXVpcmUoJ3BkZm1ha2UnKTtcbiAgdmFyIHByaW50ZXIgPSBuZXcgUGRmUHJpbnRlcihmb250cyk7XG4gIHZhciBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG4gIHZhciBid2lwanMgPSByZXF1aXJlKCdid2lwLWpzJylcbiAgTnVtYmVyLnByb3RvdHlwZS5mb3JtYXRNb25leSA9IGZ1bmN0aW9uIChjLCBkLCB0KSB7XG4gICAgdmFyIG4gPSB0aGlzLFxuICAgICAgICBjID0gaXNOYU4oYyA9IE1hdGguYWJzKGMpKSA/IDIgOiBjLFxuICAgICAgICBkID0gZCA9PSB1bmRlZmluZWQgPyBcIi5cIiA6IGQsXG4gICAgICAgIHQgPSB0ID09IHVuZGVmaW5lZCA/IFwiLFwiIDogdCxcbiAgICAgICAgcyA9IG4gPCAwID8gXCItXCIgOiBcIlwiLFxuICAgICAgICBpID0gU3RyaW5nKHBhcnNlSW50KG4gPSBNYXRoLmFicyhOdW1iZXIobikgfHwgMCkudG9GaXhlZChjKSkpLFxuICAgICAgICBqID0gKGogPSBpLmxlbmd0aCkgPiAzID8gaiAlIDMgOiAwO1xuICAgIHJldHVybiBcIlwiICsgcyArIChqID8gaS5zdWJzdHIoMCwgaikgKyB0IDogXCJcIikgKyBpLnN1YnN0cihqKS5yZXBsYWNlKC8oXFxkezN9KSg/PVxcZCkvZywgXCIxXCIgKyB0KSArIChjID8gZCArIE1hdGguYWJzKG4gLSBpKS50b0ZpeGVkKGMpLnNsaWNlKDIpIDogXCJcIik7XG59O1xuZXhwb3J0IGNsYXNzIEZsaWdodExvYWRTaGVldHtcbiAgICBjb25zdHJ1Y3Rvcigpe1xuXG4gICAgfVxuXG4gICAgZ2VuZXJhdGVNYW5pZmVzdExvYWRTaGVldChtYW5pZmVzdCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICB2YXIgc3J2ID0gdGhpczsgXG4gICAgICAgICAgICB2YXIgZG9jRGVmaW5pdGlvbiA9IHsgXG4gICAgICAgICAgICAgICAgZm9vdGVyOiBzcnYuZ2VuZXJhdGVGb290ZXIsXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrIDpbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHt0ZXh0OlwiTklORSBUTyBGSVZFIElNUE9SVCBFWFBPUlRcIixib2xkOnRydWUsZm9udFNpemU6MTEsYWxpZ25tZW50OlwiY2VudGVyXCJ9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOlswLDNdLHRleHQ6XCIxODExIE4uVy4gNTEgU3RyZWV0IEhhbmdlciA0MiBEXCIsYm9sZDp0cnVlLGZvbnRTaXplOjksYWxpZ25tZW50OlwiY2VudGVyXCJ9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOlswLDNdLHRleHQ6XCJGdC4gTGF1ZGVyYWxlLCBGbG9yaWRhIDMzMzA5XCIsYm9sZDp0cnVlLGZvbnRTaXplOjksYWxpZ25tZW50OlwiY2VudGVyXCJ9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOlswLDNdLHRleHQ6XCJGTElHSFQgTE9BRCBTSEVFVFwiLGJvbGQ6dHJ1ZSxmb250U2l6ZToxMSxhbGlnbm1lbnQ6XCJjZW50ZXJcIn1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbjpbMCwzXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YWJsZTp7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlYWRlclJvd3M6MCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWxpZ25tZW50OlwiY2VudGVyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aHM6WycqJywnKiddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib2R5OltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFt7Ym9yZGVyOltmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZV0sdGV4dDpcIkZvciBTaGlwbWVudDpcIixmb250U2l6ZTo5LCBhbGlnbm1lbnQ6XCJyaWdodFwiLGJvbGQ6dHJ1ZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7Ym9yZGVyOltmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZV0sdGV4dDptYW5pZmVzdC50YWlsTnVtLGZvbnRTaXplOjl9XVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW46WzAsM10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFibGU6e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWFkZXJSb3dzOjAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsaWdubWVudDpcImNlbnRlclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGhzOlsnKicsJyonLCcqJywnKiddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib2R5OltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7Ym9yZGVyOltmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZV0sdGV4dDonRGVwYXJ0dXJlIERhdGU6Jyxmb250U2l6ZTo4LGJvbGQ6dHJ1ZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge2JvcmRlcjpbZmFsc2UsZmFsc2UsZmFsc2UsZmFsc2VdLHRleHQ6bWFuaWZlc3Quc2hpcERhdGUsZm9udFNpemU6OH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge2JvcmRlcjpbZmFsc2UsZmFsc2UsZmFsc2UsZmFsc2VdLHRleHQ6J0RlcGFydHVyZSBUaW1lOicsZm9udFNpemU6OCxib2xkOnRydWV9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtib3JkZXI6W2ZhbHNlLGZhbHNlLGZhbHNlLGZhbHNlXSx0ZXh0Om1hbmlmZXN0LnNoaXBEYXRlLGZvbnRTaXplOjh9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7Ym9yZGVyOltmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZV0sdGV4dDonQ2FycmllcjonLGZvbnRTaXplOjgsYm9sZDp0cnVlfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7Ym9yZGVyOltmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZV0sdGV4dDptYW5pZmVzdC5wbGFuZS5jb21wYW55LGZvbnRTaXplOjh9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtib3JkZXI6W2ZhbHNlLGZhbHNlLGZhbHNlLGZhbHNlXSx0ZXh0OidBaXJsaW5lIEZsaWdodCM6Jyxmb250U2l6ZTo4LGJvbGQ6dHJ1ZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge2JvcmRlcjpbZmFsc2UsZmFsc2UsZmFsc2UsZmFsc2VdLHRleHQ6bWFuaWZlc3QudGFpbE51bSxmb250U2l6ZTo4fSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbjpbMCwzXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFjazpbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHt0ZXh0OlwiRmxpZ2h0IE5vdGVzOlwiLGZvbnRTaXplOjksYm9sZDp0cnVlfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGRlZmF1bHRTdHlsZToge1xuICAgICAgICAgICAgICAgICAgICBmb250OiAnSGVsdmV0aWNhJyxcbiAgICAgICAgICAgICAgICAgICAgZm9udFNpemU6OFxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTsgXG4gICAgICAgICAgXG4gICAgICAgICAgICB2YXIgcGF0aDEgPSBfX2Rpcm5hbWUucmVwbGFjZShcIlV0aWxcIixcImRhdGFcIik7ICAgXG4gICAgICAgICAgICB2YXIgZmlsZWxvY2F0aW9uID0gcGF0aDErXCIvXCIrbWFuaWZlc3QuaWQrJy1sb2FkLXNoZWV0LnBkZic7IFxuICAgICAgICAgICAgY29uc29sZS5sb2coZmlsZWxvY2F0aW9uLFwiZmlsZVwiKTsgXG4gICAgICAgICAgICB2YXIgcGRmRG9jID0gcHJpbnRlci5jcmVhdGVQZGZLaXREb2N1bWVudChkb2NEZWZpbml0aW9uKTtcbiAgICAgICAgICAgIHBkZkRvYy5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKGZpbGVsb2NhdGlvbikpO1xuICAgICAgICAgICAgcGRmRG9jLmVuZCgpO1xuICAgICAgICAgICAgcmVzb2x2ZSh7Y29tcGxldGVkOnRydWUsIGZpbGVuYW1lOmZpbGVsb2NhdGlvbn0pXG4gICAgICAgIH0pXG4gICAgXG4gICAgfVxuICAgIGdlbmVyYXRlSGVhZGVyKCl7XG4gICAgICBcbiAgICAgICBcbiAgICB9XG4gICBcbiAgICBnZW5lcmF0ZUZvb3RlcihjdXJyZW50UGFnZSwgcGFnZUNvdW50KXtcbiAgICAgICAgcmV0dXJuICAgICAgICB7IHRleHQ6IFwiUGFnZSBObzogXCIgKyBjdXJyZW50UGFnZS50b1N0cmluZygpICsgJy8nICsgcGFnZUNvdW50LCBhbGlnbm1lbnQ6ICdyaWdodCcsIG1hcmdpbjpbNTAsMTBdIH1cbiAgICAgICAgICAgICAgICAgICAgIFxuICB9XG59Il19
