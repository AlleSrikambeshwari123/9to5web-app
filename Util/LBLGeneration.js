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

var LBLGeneration = exports.LBLGeneration = function () {
    function LBLGeneration() {
        _classCallCheck(this, LBLGeneration);
    }

    _createClass(LBLGeneration, [{
        key: 'generatePackageLabels',
        value: function generatePackageLabels(awb) {
            var _this = this;

            this.awb = awb.awb;
            var srv = this;
            console.log("generating", awb.awb);
            console.log(this.awb.packages.length, "- no of labels to generate.");
            Promise.all(srv.awb.packages.map(function (pkg) {
                return _this.GernerateAWBLabel(pkg);
            })).then(function (results) {
                console.log(results);
            });
        }
    }, {
        key: 'GernerateAWBLabel',
        value: function GernerateAWBLabel(pkg) {
            var _this2 = this;

            return new Promise(function (resolve, reject) {

                var srv = _this2;
                //this needs to bee in a loop 

                _this2.generateBarcode(srv.awb.customer.pmb + "-" + srv.awb.id.toString() + "-" + pkg.id).then(function (png) {
                    var docDefinition = {
                        pageSize: {
                            width: 306.00,
                            height: 'auto'
                        },
                        pageMargins: [30, 10, 30, 30],
                        content: [{
                            // margin:[0,20],
                            table: {
                                headerRows: 0,
                                widths: ['*', '*', "*"],
                                body: [[{ margin: [1, 5], image: "public/img/logo.jpg", width: 60, border: [false, false, false, true] }, //logo for lbl 
                                { colSpan: 2, border: [false, false, false, true], stack: [{ margin: [1, 1], text: "NINE TO FIVE IMPORT EXPORT", fontSize: 9, bold: true }, { margin: [1, 1], text: "1811 51st Street" }, { margin: [1, 1], text: "Hanger 42 D" }, { margin: [1, 1], text: "Fort Lauderdale, FL 33309 UNITED STATES" }] }]] //end table body 
                            }
                        }, {
                            table: {
                                margin: [0, 0],
                                headerRows: 0,
                                widths: ['*', 60],
                                body: [[{ margin: [1, 1], stack: [{ text: "CONSIGNEE", fontSize: 4, bold: true }, { margin: [2, 5], text: srv.awb.customer.name, fontSize: 5, bold: true }], border: [false, false, false, true] }, //logo for lbl 
                                { border: [true, false, false, true], stack: [{ text: "Account No", fontSize: 5, bold: true }, { margin: [2, 5], text: srv.awb.customer.pmb, fontSize: 9, bold: true
                                        // {margin:[1,1],text:"NINE TO FIVE IMPORT EXPORT",fontSize:9,bold:true},
                                        // {margin:[1,1],text:"1811 51st Street"},
                                        // {margin:[1,1],text:"Hanger 42 D"},
                                        // {margin:[1,1],text:"Fort Lauderdale, FL 33309 UNITED STATES"}
                                    }] }]] //end table body 
                            }

                        }, {
                            table: {
                                margin: [0, 0],
                                headerRows: 0,
                                widths: ['*'],
                                body: [[{ margin: [1, 1], stack: [{ text: "AWB No", fontSize: 4, bold: true }, { margin: [0, 5], text: "AWB" + srv.awb.id, fontSize: 13, bold: true }], border: [false, false, false, true] }]] //end table body 
                            }

                        }, {
                            table: {
                                margin: [0, 0],
                                headerRows: 0,
                                widths: ['*'],
                                body: [[{ margin: [1, 1], stack: [{ text: "Shipper", fontSize: 4, bold: true }, { margin: [0, 5], text: srv.awb.shipper, fontSize: 8, bold: true }], border: [false, false, false, true] }]] //end table body 
                            }

                        }, {
                            table: {
                                margin: [0, 0],
                                headerRows: 0,
                                widths: ['*', 30, 50],
                                body: [[{ margin: [1, 1], stack: [{ text: "PACKAGE NO", fontSize: 4, bold: true }, { margin: [0, 5], text: "PK00" + pkg.id, fontSize: 12, bold: true }], border: [false, false, false, true] }, //logo for lbl 
                                { margin: [1, 1], stack: [{ text: "PIECE", fontSize: 4, bold: true }, { margin: [10, 5], text: pkg.packageIndex, fontSize: 12, bold: true }], border: [true, false, false, true] }, { margin: [1, 1], stack: [{ text: "TOTAL PIECES", fontSize: 4, bold: true }, { margin: [10, 5], text: srv.awb.packages.length, fontSize: 12, bold: true }], border: [true, false, false, true] }]] //end table body 
                            }

                        }, {
                            table: {
                                margin: [0, 0],
                                headerRows: 0,
                                widths: ['*'],
                                body: [[{ margin: [1, 1], stack: [{ margin: [0, 5], image: 'data:image/jpeg;base64,' + png.toString('base64'), width: 180, height: 30, alignment: "left"
                                        // {margin:[0,5],text:"PK"+srv.awb.id, fontSize:12,bold:true},

                                    }], border: [false, false, false, true] }]] //end table body 
                            }

                        }, {
                            table: {
                                margin: [0, 0],
                                headerRows: 0,
                                widths: ['*', 50],
                                body: [[{ margin: [0, 0], stack: [{ margin: [0, 5], text: "DESCRIPTION", fontSize: 5, bold: true }, { margin: [0, 5], text: pkg.description, fontSize: 5, bold: true },
                                    //table here 
                                    {
                                        margin: [0, 0],
                                        table: {
                                            margin: [0, 0],
                                            headerRows: 0,
                                            widths: ['*'],
                                            body: [[{ margin: [1, 1], stack: [{ text: "NOTES", fontSize: 5, bold: true }, { margin: [0, 10], text: "Class 3", fontSize: 5, bold: true }], border: [true, true, true, true] }]] //end table body 
                                        }

                                    }], border: [false, false, false, true] }, //barcode for lbl 
                                { margin: [1, 1], stack: [{ margin: [0, 1], text: "WEIGHT", fontSize: 5, bold: true }, { margin: [0, 2], text: pkg.weight + ' lbs.', fontSize: 5, bold: true }, { margin: [0, 1], text: "DIMENSIONS", fontSize: 5, bold: true }, { margin: [0, 1], text: pkg.dimensions + ' ins.', fontSize: 5, bold: true }, { margin: [0, 1], text: "VOL. WEIGHT", fontSize: 5, bold: true }, { margin: [0, 2], text: srv.calculateDimensionalWeight(pkg.dimensions) + ' Vlbs', fontSize: 5, bold: true }], border: [true, false, false, true] }]] //end table body 
                            }

                        }],

                        defaultStyle: {
                            font: 'Helvetica',
                            fontSize: 7
                        }

                    };
                    var pdfDoc = printer.createPdfKitDocument(docDefinition);
                    var filename = srv.awb.id + '-' + pkg.id + '-lbl.pdf';
                    pdfDoc.pipe(fs.createWriteStream(filename));
                    pdfDoc.end();
                    resolve({ generated: true, filename: filename });
                });
            });
            // return new Promise ((resolve,reject)=>{
            //     this.awb = awb.awb; 

            //     var docDefinition = { 
            //         content: [
            //             {
            //                 text:"HEY"
            //             },
            //             // {
            //             //     layout : 'lightHorizontallines',
            //             //     margin:[0,20],
            //             //     table: {
            //             //         headerRows:1,
            //             //         widths:['*',"*","*"],
            //             //         body:[
            //             //             [{margin:[1,1],text:"",}, //logo for lbl 
            //             //             [{margin:[1,1],stack:
            //             //                 [
            //             //                     {text:"NINE TO FIVE IMPORT EXPORT",fontSize:13},
            //             //                     {text:"1811 51st Street"},
            //             //                     {text:"Hanger 42 D"},
            //             //                     {text:"Fort Lauderdale, FL 33309 UNITED STATES"}
            //             //                 ]

            //             //             ,colSpan:2}, 
            //             //             {margin:[1,1],text:""}] //ROW 1 END 
            //             //             // [{margin:[5,5],stack:[
            //             //             //     {text:"CONSIGNEE"},this.awb.customer.name]}, //customer name 
            //             //             // {margin:[5,5],stack:["Account No",this.awb.customer.pmb]},{text:""}], //ROW 2 
            //             //             // [
            //             //             //     {margin:[1,1],
            //             //             //         stack:[
            //             //             //         {text:"AWB NO"},
            //             //             //         {text:this.awb.id}

            //             //             //         ],
            //             //             //     colSpan:3},
            //             //             //     {text:""},{text:""}
            //             //             // ], //end row 3
            //             //             // [
            //             //             //     {margin:[1,1],
            //             //             //         stack:[
            //             //             //         {text:"Shipper"},
            //             //             //         {text:this.awb.shipper}
            //             //             //         ],
            //             //             //     colSpan:3},
            //             //             //     {text:""},
            //             //             //     {text:""}
            //             //             // ], //end row 4
            //             //             // [
            //             //             //     {margin:[1,1],
            //             //             //         stack:[
            //             //             //         {text:"PACKAGE NO"},
            //             //             //         {text:this.awb.shipper}
            //             //             //         ]
            //             //             //     },
            //             //             //     { stack:[
            //             //             //         {text:"PIECE"},
            //             //             //         {text:this.awb.shipper}
            //             //             //         ]},
            //             //             //     { stack:[
            //             //             //         {text:"TOTAL PIECES"},
            //             //             //         {text:this.awb.shipper}
            //             //             //         ]}
            //             //             // ],//end row 5 
            //             //             // [
            //             //             //     {margin:[1,1],image:{},colSpan:3},//BARCODE
            //             //             //     {text:""},
            //             //             //     {text:""}
            //             //             // ],
            //             //             // [
            //             //             //    {
            //             //             //        margin:[1,1],text:"",colSpan:3,
            //             //             //    }
            //             //             // ]
            //             //         ]
            //             //     ],
            //             //     defaultStyle: {
            //             //         font: 'Helvetica',
            //             //         fontSize:7
            //             //       },
            //             // }}
            //         ],
            //     }
            //     console.log('trying to create PDF....')
            //     var pdfDoc = printer.createPdfKitDocument(docDefinition);
            //     pdfDoc.pipe(fs.createWriteStream('lbl.pdf'));
            //     pdfDoc.end();
            // })
        }
    }, {
        key: 'calculateDimensionalWeight',
        value: function calculateDimensionalWeight(dimensions) {
            var dimensionparts = dimensions.split('x');
            var numerator = 1;
            for (var i = 0; i < dimensionparts.length; i++) {
                numerator = numerator * Number(dimensionparts[i].trim());
            }
            var dimWeight = numerator / 139;
            return Number(dimWeight).formatMoney(2, '.', ',');
        }
    }, {
        key: 'generateShiperCosigneeTable',
        value: function generateShiperCosigneeTable(awb) {
            return {
                layout: 'lightHorizontallines',
                margin: [0, 20],
                table: {
                    headerRows: 1,
                    widths: ['*', "*"],
                    body: [[{ margin: [1, 1], text: "Shipper Information", fillColor: "#cccccc" }, { margin: [1, 1], text: "Cosignee Infomation", fillColor: '#cccccc' }], [{ margin: [5, 5], stack: [awb.shipper, ""] }, { margin: [5, 5], stack: [awb.customer.name, awb.customer.pmb, awb.customer.address] }]]
                } };
        }
    }, {
        key: 'generateBarcode',
        value: function generateBarcode(text) {
            return new Promise(function (resolve, reject) {
                bwipjs.toBuffer({
                    bcid: 'code39',
                    text: text,
                    scale: 5,
                    height: 10,
                    includetext: true,
                    textxalign: 'right'
                }, function (err, png) {
                    if (err) reject(err);else resolve(png);
                });
            });
        }
    }]);

    return LBLGeneration;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlV0aWwvTEJMR2VuZXJhdGlvbi5lczYiXSwibmFtZXMiOlsiZm9udHMiLCJDb3VyaWVyIiwibm9ybWFsIiwiYm9sZCIsIml0YWxpY3MiLCJib2xkaXRhbGljcyIsIkhlbHZldGljYSIsIlRpbWVzIiwiU3ltYm9sIiwiWmFwZkRpbmdiYXRzIiwiUGRmUHJpbnRlciIsInJlcXVpcmUiLCJwcmludGVyIiwiZnMiLCJid2lwanMiLCJOdW1iZXIiLCJwcm90b3R5cGUiLCJmb3JtYXRNb25leSIsImMiLCJkIiwidCIsIm4iLCJpc05hTiIsIk1hdGgiLCJhYnMiLCJ1bmRlZmluZWQiLCJzIiwiaSIsIlN0cmluZyIsInBhcnNlSW50IiwidG9GaXhlZCIsImoiLCJsZW5ndGgiLCJzdWJzdHIiLCJyZXBsYWNlIiwic2xpY2UiLCJMQkxHZW5lcmF0aW9uIiwiYXdiIiwic3J2IiwiY29uc29sZSIsImxvZyIsInBhY2thZ2VzIiwiUHJvbWlzZSIsImFsbCIsIm1hcCIsIkdlcm5lcmF0ZUFXQkxhYmVsIiwicGtnIiwidGhlbiIsInJlc3VsdHMiLCJyZXNvbHZlIiwicmVqZWN0IiwiZ2VuZXJhdGVCYXJjb2RlIiwiY3VzdG9tZXIiLCJwbWIiLCJpZCIsInRvU3RyaW5nIiwiZG9jRGVmaW5pdGlvbiIsInBhZ2VTaXplIiwid2lkdGgiLCJoZWlnaHQiLCJwYWdlTWFyZ2lucyIsImNvbnRlbnQiLCJ0YWJsZSIsImhlYWRlclJvd3MiLCJ3aWR0aHMiLCJib2R5IiwibWFyZ2luIiwiaW1hZ2UiLCJib3JkZXIiLCJjb2xTcGFuIiwic3RhY2siLCJ0ZXh0IiwiZm9udFNpemUiLCJuYW1lIiwic2hpcHBlciIsInBhY2thZ2VJbmRleCIsInBuZyIsImFsaWdubWVudCIsImRlc2NyaXB0aW9uIiwid2VpZ2h0IiwiZGltZW5zaW9ucyIsImNhbGN1bGF0ZURpbWVuc2lvbmFsV2VpZ2h0IiwiZGVmYXVsdFN0eWxlIiwiZm9udCIsInBkZkRvYyIsImNyZWF0ZVBkZktpdERvY3VtZW50IiwiZmlsZW5hbWUiLCJwaXBlIiwiY3JlYXRlV3JpdGVTdHJlYW0iLCJlbmQiLCJnZW5lcmF0ZWQiLCJkaW1lbnNpb25wYXJ0cyIsInNwbGl0IiwibnVtZXJhdG9yIiwidHJpbSIsImRpbVdlaWdodCIsImxheW91dCIsImZpbGxDb2xvciIsImFkZHJlc3MiLCJ0b0J1ZmZlciIsImJjaWQiLCJzY2FsZSIsImluY2x1ZGV0ZXh0IiwidGV4dHhhbGlnbiIsImVyciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUVDLElBQUlBLFFBQVE7QUFDVEMsYUFBUztBQUNQQyxnQkFBUSxTQUREO0FBRVBDLGNBQU0sY0FGQztBQUdQQyxpQkFBUyxpQkFIRjtBQUlQQyxxQkFBYTtBQUpOLEtBREE7QUFPVEMsZUFBVztBQUNUSixnQkFBUSxXQURDO0FBRVRDLGNBQU0sZ0JBRkc7QUFHVEMsaUJBQVMsbUJBSEE7QUFJVEMscUJBQWE7QUFKSixLQVBGO0FBYVRFLFdBQU87QUFDTEwsZ0JBQVEsYUFESDtBQUVMQyxjQUFNLFlBRkQ7QUFHTEMsaUJBQVMsY0FISjtBQUlMQyxxQkFBYTtBQUpSLEtBYkU7QUFtQlRHLFlBQVE7QUFDTk4sZ0JBQVE7QUFERixLQW5CQztBQXNCVE8sa0JBQWM7QUFDWlAsZ0JBQVE7QUFESTtBQXRCTCxDQUFaO0FBMEJBLElBQUlRLGFBQWFDLFFBQVEsU0FBUixDQUFqQjtBQUNDLElBQUlDLFVBQVUsSUFBSUYsVUFBSixDQUFlVixLQUFmLENBQWQ7QUFDQSxJQUFJYSxLQUFLRixRQUFRLElBQVIsQ0FBVDtBQUNBLElBQUlHLFNBQVNILFFBQVEsU0FBUixDQUFiO0FBQ0FJLE9BQU9DLFNBQVAsQ0FBaUJDLFdBQWpCLEdBQStCLFVBQVVDLENBQVYsRUFBYUMsQ0FBYixFQUFnQkMsQ0FBaEIsRUFBbUI7QUFDaEQsUUFBSUMsSUFBSSxJQUFSO0FBQUEsUUFDSUgsSUFBSUksTUFBTUosSUFBSUssS0FBS0MsR0FBTCxDQUFTTixDQUFULENBQVYsSUFBeUIsQ0FBekIsR0FBNkJBLENBRHJDO0FBQUEsUUFFSUMsSUFB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Q0FDZ0IzQixJLEVBQUs7QUFDbEIsbUJBQU8sSUFBSTdCLE9BQUosQ0FBWSxVQUFDTyxPQUFELEVBQVVDLE1BQVYsRUFBcUI7QUFDcENwQyx1QkFBT3FGLFFBQVAsQ0FBZ0I7QUFDZEMsMEJBQU0sUUFEUTtBQUVkN0IsOEJBRmM7QUFHZDhCLDJCQUFPLENBSE87QUFJZDFDLDRCQUFRLEVBSk07QUFLZDJDLGlDQUFhLElBTEM7QUFNZEMsZ0NBQVk7QUFORSxpQkFBaEIsRUFPRyxVQUFDQyxHQUFELEVBQU01QixHQUFOLEVBQWM7QUFDZix3QkFBSTRCLEdBQUosRUFBU3RELE9BQU9zRCxHQUFQLEVBQVQsS0FDS3ZELFFBQVEyQixHQUFSO0FBQ04saUJBVkQ7QUFXRCxhQVpJLENBQVA7QUFhSCIsImZpbGUiOiJVdGlsL0xCTEdlbmVyYXRpb24uanMiLCJzb3VyY2VzQ29udGVudCI6WyJcblxuIHZhciBmb250cyA9IHtcbiAgICBDb3VyaWVyOiB7XG4gICAgICBub3JtYWw6ICdDb3VyaWVyJyxcbiAgICAgIGJvbGQ6ICdDb3VyaWVyLUJvbGQnLFxuICAgICAgaXRhbGljczogJ0NvdXJpZXItT2JsaXF1ZScsXG4gICAgICBib2xkaXRhbGljczogJ0NvdXJpZXItQm9sZE9ibGlxdWUnXG4gICAgfSxcbiAgICBIZWx2ZXRpY2E6IHtcbiAgICAgIG5vcm1hbDogJ0hlbHZldGljYScsXG4gICAgICBib2xkOiAnSGVsdmV0aWNhLUJvbGQnLFxuICAgICAgaXRhbGljczogJ0hlbHZldGljYS1PYmxpcXVlJyxcbiAgICAgIGJvbGRpdGFsaWNzOiAnSGVsdmV0aWNhLUJvbGRPYmxpcXVlJ1xuICAgIH0sXG4gICAgVGltZXM6IHtcbiAgICAgIG5vcm1hbDogJ1RpbWVzLVJvbWFuJyxcbiAgICAgIGJvbGQ6ICdUaW1lcy1Cb2xkJyxcbiAgICAgIGl0YWxpY3M6ICdUaW1lcy1JdGFsaWMnLFxuICAgICAgYm9sZGl0YWxpY3M6ICdUaW1lcy1Cb2xkSXRhbGljJ1xuICAgIH0sXG4gICAgU3ltYm9sOiB7XG4gICAgICBub3JtYWw6ICdTeW1ib2wnXG4gICAgfSxcbiAgICBaYXBmRGluZ2JhdHM6IHtcbiAgICAgIG5vcm1hbDogJ1phcGZEaW5nYmF0cydcbiAgICB9XG4gIH07XG4gdmFyIFBkZlByaW50ZXIgPSByZXF1aXJlKCdwZGZtYWtlJyk7XG4gIHZhciBwcmludGVyID0gbmV3IFBkZlByaW50ZXIoZm9udHMpO1xuICB2YXIgZnMgPSByZXF1aXJlKCdmcycpO1xuICB2YXIgYndpcGpzID0gcmVxdWlyZSgnYndpcC1qcycpXG4gIE51bWJlci5wcm90b3R5cGUuZm9ybWF0TW9uZXkgPSBmdW5jdGlvbiAoYywgZCwgdCkge1xuICAgIHZhciBuID0gdGhpcyxcbiAgICAgICAgYyA9IGlzTmFOKGMgPSBNYXRoLmFicyhjKSkgPyAyIDogYyxcbiAgICAgICAgZCA9IGQgPT0gdW5kZWZpbmVkID8gXCIuXCIgOiBkLFxuICAgICAgICB0ID0gdCA9PSB1bmRlZmluZWQgPyBcIixcIiA6IHQsXG4gICAgICAgIHMgPSBuIDwgMCA/IFwiLVwiIDogXCJcIixcbiAgICAgICAgaSA9IFN0cmluZyhwYXJzZUludChuID0gTWF0aC5hYnMoTnVtYmVyKG4pIHx8IDApLnRvRml4ZWQoYykpKSxcbiAgICAgICAgaiA9IChqID0gaS5sZW5ndGgpID4gMyA/IGogJSAzIDogMDtcbiAgICByZXR1cm4gXCJcIiArIHMgKyAoaiA/IGkuc3Vic3RyKDAsIGopICsgdCA6IFwiXCIpICsgaS5zdWJzdHIoaikucmVwbGFjZSgvKFxcZHszfSkoPz1cXGQpL2csIFwiMVwiICsgdCkgKyAoYyA/IGQgKyBNYXRoLmFicyhuIC0gaSkudG9GaXhlZChjKS5zbGljZSgyKSA6IFwiXCIpO1xufTtcbmV4cG9ydCBjbGFzcyBMQkxHZW5lcmF0aW9uXG57XG4gICAgY29uc3RydWN0b3IoKXtcblxuICAgIH1cblxuICAgIGdlbmVyYXRlUGFja2FnZUxhYmVscyhhd2Ipe1xuICAgICAgICB0aGlzLmF3YiA9IGF3Yi5hd2I7IFxuICAgICAgICB2YXIgc3J2ICA9IHRoaXM7IFxuICAgICAgICBjb25zb2xlLmxvZyhcImdlbmVyYXRpbmdcIixhd2IuYXdiKTsgXG4gICAgICAgIGNvbnNvbGUubG9nKHRoaXMuYXdiLnBhY2thZ2VzLmxlbmd0aCxcIi0gbm8gb2YgbGFiZWxzIHRvIGdlbmVyYXRlLlwiKTsgXG4gICAgICAgIFByb21pc2UuYWxsKHNydi5hd2IucGFja2FnZXMubWFwKHBrZz0+dGhpcy5HZXJuZXJhdGVBV0JMYWJlbChwa2cpKSkudGhlbihyZXN1bHRzPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHRzKTtcbiAgICAgICAgfSlcbiAgICB9XG4gICAgR2VybmVyYXRlQVdCTGFiZWwocGtnKXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIHNydiA9IHRoaXM7IFxuICAgICAgICAgICAgLy90aGlzIG5lZWRzIHRvIGJlZSBpbiBhIGxvb3AgXG4gICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5nZW5lcmF0ZUJhcmNvZGUoc3J2LmF3Yi5jdXN0b21lci5wbWIrXCItXCIrc3J2LmF3Yi5pZC50b1N0cmluZygpK1wiLVwiK3BrZy5pZCkudGhlbihwbmc9PntcbiAgICAgICAgICAgICAgICB2YXIgZG9jRGVmaW5pdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgcGFnZVNpemU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiAzMDYuMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6ICdhdXRvJ1xuICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgcGFnZU1hcmdpbnM6IFsgMzAsIDEwLCAzMCwgMzAgXSxcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1hcmdpbjpbMCwyMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFibGU6e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWFkZXJSb3dzOjAsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aHM6WycqJywnKicsXCIqXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib2R5OltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFt7bWFyZ2luOlsxLDVdLGltYWdlOlwicHVibGljL2ltZy9sb2dvLmpwZ1wiLHdpZHRoOjYwLGJvcmRlcjpbZmFsc2UsZmFsc2UsZmFsc2UsdHJ1ZV19LCAvL2xvZ28gZm9yIGxibCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7Y29sU3BhbjoyLGJvcmRlcjpbZmFsc2UsZmFsc2UsZmFsc2UsdHJ1ZV0sc3RhY2s6W1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHttYXJnaW46WzEsMV0sdGV4dDpcIk5JTkUgVE8gRklWRSBJTVBPUlQgRVhQT1JUXCIsZm9udFNpemU6OSxib2xkOnRydWV9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHttYXJnaW46WzEsMV0sdGV4dDpcIjE4MTEgNTFzdCBTdHJlZXRcIn0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMSwxXSx0ZXh0OlwiSGFuZ2VyIDQyIERcIn0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMSwxXSx0ZXh0OlwiRm9ydCBMYXVkZXJkYWxlLCBGTCAzMzMwOSBVTklURUQgU1RBVEVTXCJ9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLy9lbmQgdGFibGUgYm9keSBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhYmxlOntcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2luOlswLDBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWFkZXJSb3dzOjAsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aHM6WycqJyw2MF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvZHk6W1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW3ttYXJnaW46WzEsMV0sc3RhY2s6W1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHt0ZXh0OlwiQ09OU0lHTkVFXCIsIGZvbnRTaXplOjQsYm9sZDp0cnVlfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOlsyLDVdLHRleHQ6c3J2LmF3Yi5jdXN0b21lci5uYW1lLCBmb250U2l6ZTo1LGJvbGQ6dHJ1ZX0sXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0sYm9yZGVyOltmYWxzZSxmYWxzZSxmYWxzZSx0cnVlXX0sIC8vbG9nbyBmb3IgbGJsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtib3JkZXI6W3RydWUsZmFsc2UsZmFsc2UsdHJ1ZV0sc3RhY2s6W1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHt0ZXh0OlwiQWNjb3VudCBOb1wiLCBmb250U2l6ZTo1LGJvbGQ6dHJ1ZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMiw1XSx0ZXh0OnNydi5hd2IuY3VzdG9tZXIucG1iLCBmb250U2l6ZTo5LGJvbGQ6dHJ1ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB7bWFyZ2luOlsxLDFdLHRleHQ6XCJOSU5FIFRPIEZJVkUgSU1QT1JUIEVYUE9SVFwiLGZvbnRTaXplOjksYm9sZDp0cnVlfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB7bWFyZ2luOlsxLDFdLHRleHQ6XCIxODExIDUxc3QgU3RyZWV0XCJ9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHttYXJnaW46WzEsMV0sdGV4dDpcIkhhbmdlciA0MiBEXCJ9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHttYXJnaW46WzEsMV0sdGV4dDpcIkZvcnQgTGF1ZGVyZGFsZSwgRkwgMzMzMDkgVU5JVEVEIFNUQVRFU1wifVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF19XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXS8vZW5kIHRhYmxlIGJvZHkgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YWJsZTp7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbjpbMCwwXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyUm93czowLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGhzOlsnKiddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib2R5OltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFt7bWFyZ2luOlsxLDFdLHN0YWNrOltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7dGV4dDpcIkFXQiBOb1wiLCBmb250U2l6ZTo0LGJvbGQ6dHJ1ZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMCw1XSx0ZXh0OlwiQVdCXCIrc3J2LmF3Yi5pZCwgZm9udFNpemU6MTMsYm9sZDp0cnVlfSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXSxib3JkZXI6W2ZhbHNlLGZhbHNlLGZhbHNlLHRydWVdfSwgLy9sb2dvIGZvciBsYmwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXS8vZW5kIHRhYmxlIGJvZHkgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YWJsZTp7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbjpbMCwwXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyUm93czowLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGhzOlsnKiddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib2R5OltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFt7bWFyZ2luOlsxLDFdLHN0YWNrOltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7dGV4dDpcIlNoaXBwZXJcIiwgZm9udFNpemU6NCxib2xkOnRydWV9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHttYXJnaW46WzAsNV0sdGV4dDpzcnYuYXdiLnNoaXBwZXIsIGZvbnRTaXplOjgsYm9sZDp0cnVlfSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXSxib3JkZXI6W2ZhbHNlLGZhbHNlLGZhbHNlLHRydWVdfSwgLy9sb2dvIGZvciBsYmwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXS8vZW5kIHRhYmxlIGJvZHkgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YWJsZTp7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbjpbMCwwXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyUm93czowLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGhzOlsnKicsMzAsNTBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib2R5OltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFt7bWFyZ2luOlsxLDFdLHN0YWNrOltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7dGV4dDpcIlBBQ0tBR0UgTk9cIiwgZm9udFNpemU6NCxib2xkOnRydWV9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHttYXJnaW46WzAsNV0sdGV4dDpcIlBLMDBcIitwa2cuaWQsIGZvbnRTaXplOjEyLGJvbGQ6dHJ1ZX0sXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0sYm9yZGVyOltmYWxzZSxmYWxzZSxmYWxzZSx0cnVlXX0sIC8vbG9nbyBmb3IgbGJsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMSwxXSxzdGFjazpbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3RleHQ6XCJQSUVDRVwiLCBmb250U2l6ZTo0LGJvbGQ6dHJ1ZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMTAsNV0sdGV4dDpwa2cucGFja2FnZUluZGV4LCBmb250U2l6ZToxMixib2xkOnRydWV9LFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLGJvcmRlcjpbdHJ1ZSxmYWxzZSxmYWxzZSx0cnVlXX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOlsxLDFdLHN0YWNrOltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7dGV4dDpcIlRPVEFMIFBJRUNFU1wiLCBmb250U2l6ZTo0LGJvbGQ6dHJ1ZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMTAsNV0sdGV4dDpzcnYuYXdiLnBhY2thZ2VzLmxlbmd0aCwgZm9udFNpemU6MTIsYm9sZDp0cnVlfSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXSxib3JkZXI6W3RydWUsZmFsc2UsZmFsc2UsdHJ1ZV19XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXS8vZW5kIHRhYmxlIGJvZHkgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YWJsZTp7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbjpbMCwwXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyUm93czowLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGhzOlsnKiddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib2R5OltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFt7bWFyZ2luOlsxLDFdLHN0YWNrOltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOlswLDVdLGltYWdlOiAnZGF0YTppbWFnZS9qcGVnO2Jhc2U2NCwnK3BuZy50b1N0cmluZygnYmFzZTY0Jyksd2lkdGg6MTgwLGhlaWdodDozMCxhbGlnbm1lbnQ6XCJsZWZ0XCJ9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8ge21hcmdpbjpbMCw1XSx0ZXh0OlwiUEtcIitzcnYuYXdiLmlkLCBmb250U2l6ZToxMixib2xkOnRydWV9LFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLGJvcmRlcjpbZmFsc2UsZmFsc2UsZmFsc2UsdHJ1ZV19LCAvL2JhcmNvZGUgZm9yIGxibCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0vL2VuZCB0YWJsZSBib2R5IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFibGU6e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW46WzAsMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlYWRlclJvd3M6MCwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoczpbJyonLDUwXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9keTpbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMCwwIF0sc3RhY2s6W1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOlswLDVdLHRleHQ6XCJERVNDUklQVElPTlwiLCBmb250U2l6ZTo1LGJvbGQ6dHJ1ZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHttYXJnaW46WzAsNV0sdGV4dDpwa2cuZGVzY3JpcHRpb24sIGZvbnRTaXplOjUsYm9sZDp0cnVlfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL3RhYmxlIGhlcmUgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW46WzAsMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhYmxlOntcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbjpbMCwwXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlYWRlclJvd3M6MCwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aHM6WycqJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib2R5OltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbe21hcmdpbjpbMSwxXSxzdGFjazpbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHt0ZXh0OlwiTk9URVNcIiwgZm9udFNpemU6NSxib2xkOnRydWV9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOlswLDEwXSx0ZXh0OlwiQ2xhc3MgM1wiLCBmb250U2l6ZTo1LGJvbGQ6dHJ1ZX0sXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXSxib3JkZXI6W3RydWUsdHJ1ZSx0cnVlLHRydWVdfSwgLy9sb2dvIGZvciBsYmwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXS8vZW5kIHRhYmxlIGJvZHkgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0sYm9yZGVyOltmYWxzZSxmYWxzZSxmYWxzZSx0cnVlXX0sIC8vYmFyY29kZSBmb3IgbGJsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMSwxXSxzdGFjazpbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMCwxXSx0ZXh0OlwiV0VJR0hUXCIsIGZvbnRTaXplOjUsYm9sZDp0cnVlfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOlswLDJdLHRleHQ6YCR7cGtnLndlaWdodH0gbGJzLmAsIGZvbnRTaXplOjUsYm9sZDp0cnVlfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOlswLDFdLHRleHQ6XCJESU1FTlNJT05TXCIsIGZvbnRTaXplOjUsYm9sZDp0cnVlfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOlswLDFdLHRleHQ6YCR7cGtnLmRpbWVuc2lvbnN9IGlucy5gLCBmb250U2l6ZTo1LGJvbGQ6dHJ1ZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMCwxXSx0ZXh0OlwiVk9MLiBXRUlHSFRcIiwgZm9udFNpemU6NSxib2xkOnRydWV9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHttYXJnaW46WzAsMl0sdGV4dDpgJHtzcnYuY2FsY3VsYXRlRGltZW5zaW9uYWxXZWlnaHQocGtnLmRpbWVuc2lvbnMpfSBWbGJzYCwgZm9udFNpemU6NSxib2xkOnRydWV9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy90YWJsZSBoZXJlIFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0sYm9yZGVyOlt0cnVlLGZhbHNlLGZhbHNlLHRydWVdfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0vL2VuZCB0YWJsZSBib2R5IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRTdHlsZToge1xuICAgICAgICAgICAgICAgICAgICAgIGZvbnQ6ICdIZWx2ZXRpY2EnLFxuICAgICAgICAgICAgICAgICAgICAgIGZvbnRTaXplOjdcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgdmFyIHBkZkRvYyA9IHByaW50ZXIuY3JlYXRlUGRmS2l0RG9jdW1lbnQoZG9jRGVmaW5pdGlvbik7XG4gICAgICAgICAgICAgICAgICB2YXIgZmlsZW5hbWUgPSBzcnYuYXdiLmlkKyctJytwa2cuaWQrJy1sYmwucGRmJzsgXG4gICAgICAgICAgICAgICAgICBwZGZEb2MucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbShmaWxlbmFtZSkpO1xuICAgICAgICAgICAgICAgICAgcGRmRG9jLmVuZCgpO1xuICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7Z2VuZXJhdGVkOnRydWUsZmlsZW5hbWU6ZmlsZW5hbWV9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIFxuICAgICAgICB9KVxuICAgICAgICAvLyByZXR1cm4gbmV3IFByb21pc2UgKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgLy8gICAgIHRoaXMuYXdiID0gYXdiLmF3YjsgXG5cbiAgICAgICAgLy8gICAgIHZhciBkb2NEZWZpbml0aW9uID0geyBcbiAgICAgICAgLy8gICAgICAgICBjb250ZW50OiBbXG4gICAgICAgIC8vICAgICAgICAgICAgIHtcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgIHRleHQ6XCJIRVlcIlxuICAgICAgICAvLyAgICAgICAgICAgICB9LFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyB7XG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICBsYXlvdXQgOiAnbGlnaHRIb3Jpem9udGFsbGluZXMnLFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgbWFyZ2luOlswLDIwXSxcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgIHRhYmxlOiB7XG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgaGVhZGVyUm93czoxLFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgIHdpZHRoczpbJyonLFwiKlwiLFwiKlwiXSxcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICBib2R5OltcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgW3ttYXJnaW46WzEsMV0sdGV4dDpcIlwiLH0sIC8vbG9nbyBmb3IgbGJsIFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICBbe21hcmdpbjpbMSwxXSxzdGFjazpcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgIFtcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICB7dGV4dDpcIk5JTkUgVE8gRklWRSBJTVBPUlQgRVhQT1JUXCIsZm9udFNpemU6MTN9LFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgIHt0ZXh0OlwiMTgxMSA1MXN0IFN0cmVldFwifSxcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICB7dGV4dDpcIkhhbmdlciA0MiBEXCJ9LFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgIHt0ZXh0OlwiRm9ydCBMYXVkZXJkYWxlLCBGTCAzMzMwOSBVTklURUQgU1RBVEVTXCJ9XG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICBdXG4gICAgXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgICxjb2xTcGFuOjJ9LCBcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAge21hcmdpbjpbMSwxXSx0ZXh0OlwiXCJ9XSAvL1JPVyAxIEVORCBcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gW3ttYXJnaW46WzUsNV0sc3RhY2s6W1xuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAge3RleHQ6XCJDT05TSUdORUVcIn0sdGhpcy5hd2IuY3VzdG9tZXIubmFtZV19LCAvL2N1c3RvbWVyIG5hbWUgXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vIHttYXJnaW46WzUsNV0sc3RhY2s6W1wiQWNjb3VudCBOb1wiLHRoaXMuYXdiLmN1c3RvbWVyLnBtYl19LHt0ZXh0OlwiXCJ9XSwgLy9ST1cgMiBcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gW1xuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAge21hcmdpbjpbMSwxXSxcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICBzdGFjazpbXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAge3RleHQ6XCJBV0IgTk9cIn0sXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAge3RleHQ6dGhpcy5hd2IuaWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICBdLFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgY29sU3BhbjozfSxcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgIHt0ZXh0OlwiXCJ9LHt0ZXh0OlwiXCJ9XG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vIF0sIC8vZW5kIHJvdyAzXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vIFtcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgIHttYXJnaW46WzEsMV0sXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgc3RhY2s6W1xuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgIHt0ZXh0OlwiU2hpcHBlclwifSxcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICB7dGV4dDp0aGlzLmF3Yi5zaGlwcGVyfVxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgIF0sXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICBjb2xTcGFuOjN9LFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAge3RleHQ6XCJcIn0sXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICB7dGV4dDpcIlwifVxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyBdLCAvL2VuZCByb3cgNFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyBbXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICB7bWFyZ2luOlsxLDFdLFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgIHN0YWNrOltcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICB7dGV4dDpcIlBBQ0tBR0UgTk9cIn0sXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAge3RleHQ6dGhpcy5hd2Iuc2hpcHBlcn1cbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICBdXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICB9LFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgeyBzdGFjazpbXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAge3RleHQ6XCJQSUVDRVwifSxcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICB7dGV4dDp0aGlzLmF3Yi5zaGlwcGVyfVxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgIF19LFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgeyBzdGFjazpbXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAge3RleHQ6XCJUT1RBTCBQSUVDRVNcIn0sXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAge3RleHQ6dGhpcy5hd2Iuc2hpcHBlcn1cbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICBdfVxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyBdLC8vZW5kIHJvdyA1IFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyBbXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICB7bWFyZ2luOlsxLDFdLGltYWdlOnt9LGNvbFNwYW46M30sLy9CQVJDT0RFXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICB7dGV4dDpcIlwifSxcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgIHt0ZXh0OlwiXCJ9XG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vIF0sXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vIFtcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAge1xuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgbWFyZ2luOlsxLDFdLHRleHQ6XCJcIixjb2xTcGFuOjMsXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgIH1cbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gXVxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgIF1cbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgIF0sXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICBkZWZhdWx0U3R5bGU6IHtcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICBmb250OiAnSGVsdmV0aWNhJyxcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICBmb250U2l6ZTo3XG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgIH0sXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vIH19XG4gICAgICAgIC8vICAgICAgICAgXSxcbiAgICAgICAgLy8gICAgIH1cbiAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKCd0cnlpbmcgdG8gY3JlYXRlIFBERi4uLi4nKVxuICAgICAgICAvLyAgICAgdmFyIHBkZkRvYyA9IHByaW50ZXIuY3JlYXRlUGRmS2l0RG9jdW1lbnQoZG9jRGVmaW5pdGlvbik7XG4gICAgICAgIC8vICAgICBwZGZEb2MucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbSgnbGJsLnBkZicpKTtcbiAgICAgICAgLy8gICAgIHBkZkRvYy5lbmQoKTtcbiAgICAgICAgLy8gfSlcbiAgICAgICBcbiAgICB9XG4gICAgY2FsY3VsYXRlRGltZW5zaW9uYWxXZWlnaHQoZGltZW5zaW9ucyl7XG4gICAgICAgIHZhciBkaW1lbnNpb25wYXJ0cyA9IGRpbWVuc2lvbnMuc3BsaXQoJ3gnKTsgXG4gICAgICAgIHZhciBudW1lcmF0b3IgPSAxOyBcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGRpbWVuc2lvbnBhcnRzLmxlbmd0aCA7IGkrKyl7XG4gICAgICAgICAgICBudW1lcmF0b3IgPSBudW1lcmF0b3IgKiBOdW1iZXIoZGltZW5zaW9ucGFydHNbaV0udHJpbSgpKVxuICAgICAgICAgICAgXG4gICAgICAgIH1cbiAgICAgICAgdmFyIGRpbVdlaWdodCA9IG51bWVyYXRvciAvIDEzOTsgXG4gICAgICAgIHJldHVybiBOdW1iZXIoZGltV2VpZ2h0KS5mb3JtYXRNb25leSgyLCAnLicsICcsJylcblxuICAgIH1cbiAgICBnZW5lcmF0ZVNoaXBlckNvc2lnbmVlVGFibGUoYXdiKXtcbiAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbGF5b3V0IDogJ2xpZ2h0SG9yaXpvbnRhbGxpbmVzJyxcbiAgICAgICAgICAgIG1hcmdpbjpbMCwyMF0sXG4gICAgICAgICAgICB0YWJsZToge1xuICAgICAgICAgICAgICAgIGhlYWRlclJvd3M6MSxcbiAgICAgICAgICAgICAgICB3aWR0aHM6WycqJyxcIipcIl0sXG4gICAgICAgICAgICAgICAgYm9keTpbXG4gICAgICAgICAgICAgICAgICAgIFt7bWFyZ2luOlsxLDFdLHRleHQ6XCJTaGlwcGVyIEluZm9ybWF0aW9uXCIsZmlsbENvbG9yOlwiI2NjY2NjY1wifSwge21hcmdpbjpbMSwxXSx0ZXh0OlwiQ29zaWduZWUgSW5mb21hdGlvblwiLGZpbGxDb2xvcjonI2NjY2NjYyd9XSxcbiAgICAgICAgICAgICAgICAgICAgW3ttYXJnaW46WzUsNV0sc3RhY2s6W2F3Yi5zaGlwcGVyLFwiXCJdfSx7bWFyZ2luOls1LDVdLHN0YWNrOlthd2IuY3VzdG9tZXIubmFtZSxhd2IuY3VzdG9tZXIucG1iLGF3Yi5jdXN0b21lci5hZGRyZXNzXX1dXG4gICAgICAgICAgICAgICAgXVxuICAgICAgICB9fVxuICAgIH1cbiAgICBnZW5lcmF0ZUJhcmNvZGUgKHRleHQpe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgYndpcGpzLnRvQnVmZmVyKHtcbiAgICAgICAgICAgICAgYmNpZDogJ2NvZGUzOScsXG4gICAgICAgICAgICAgIHRleHQsXG4gICAgICAgICAgICAgIHNjYWxlOiA1LFxuICAgICAgICAgICAgICBoZWlnaHQ6IDEwLFxuICAgICAgICAgICAgICBpbmNsdWRldGV4dDogdHJ1ZSxcbiAgICAgICAgICAgICAgdGV4dHhhbGlnbjogJ3JpZ2h0J1xuICAgICAgICAgICAgfSwgKGVyciwgcG5nKSA9PiB7XG4gICAgICAgICAgICAgIGlmIChlcnIpIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICBlbHNlIHJlc29sdmUocG5nKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgIH1cbiAgXG59Il19
