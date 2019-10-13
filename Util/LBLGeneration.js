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

        this.companies = {
            nineTofive: {
                logo: 'public/img/logo.jpg',
                name: "NINE TO FIVE IMPORT EXPORT"
            },
            postBoxes: {
                logo: 'public/img/pbe-logo.png',
                name: "POST BOXES ETC"
            }
        };
    }

    _createClass(LBLGeneration, [{
        key: 'generatePackageLabels',
        value: function generatePackageLabels(awb) {
            var _this = this;

            return new Promise(function (resolve, reject) {
                _this.awb = awb.awb;
                var srv = _this;
                var company = _this.companies.nineTofive;
                if (Number(srv.awb.customer.pmb) >= 9000) {
                    company = _this.companies.nineTofive;
                } else company = _this.companies.postBoxes;
                console.log("generating", awb.awb);
                console.log(_this.awb.packages.length, "- no of labels to generate.");
                Promise.all(srv.awb.packages.map(function (pkg) {
                    return _this.GernerateAWBLabel(pkg, company);
                })).then(function (results) {
                    console.log(results);
                    resolve(results);
                });
            });
        }
    }, {
        key: 'GernerateAWBLabel',
        value: function GernerateAWBLabel(pkg, company) {
            var _this2 = this;

            return new Promise(function (resolve, reject) {

                var srv = _this2;
                //this needs to bee in a loop 

                _this2.generateBarcode(srv.awb.customer.pmb + "-" + srv.awb.id.toString() + "-" + pkg.id).then(function (png) {
                    var docDefinition = {
                        pageSize: {
                            width: 288.00,
                            height: 432.00
                        },
                        pageMargins: [10, 10, 10, 10],
                        content: [{
                            // margin:[0,20],
                            table: {
                                headerRows: 0,
                                widths: ['*', '*', "*"],
                                body: [[{ margin: [1, 5], stack: [{
                                        image: company.logo, width: 70, alignment: 'center'
                                    }, { text: '' }, { margin: [5, 6], qr: srv.awb.customer.pmb + "-" + srv.awb.id.toString() + "-" + pkg.id, fit: '60', alignment: 'center' }], border: [false, false, false, true] },

                                //logo for lbl 
                                { colSpan: 2, border: [false, false, false, true], stack: [{ margin: [1, 5], text: company.name, fontSize: 10, bold: true }, { margin: [1, 2], text: "1811 51st Street" }, { margin: [1, 2], text: "Hanger 42 D" }, { margin: [1, 2], text: "Fort Lauderdale, FL 33309 " }, { margin: [1, 2], text: "UNITED STATES " }] }]] //end table body 
                            }
                        }, {
                            table: {
                                margin: [0, 0],
                                headerRows: 0,
                                widths: ['*', 60],
                                body: [[{ margin: [1, 1], stack: [{ text: "CONSIGNEE", fontSize: 4, bold: true }, { margin: [2, 5], text: srv.awb.customer.name, fontSize: 8, bold: true }], border: [false, false, false, true] }, //logo for lbl 
                                { border: [true, false, false, true], stack: [{ text: "Account No", fontSize: 8, bold: true }, { margin: [2, 5], text: srv.awb.customer.pmb, fontSize: 9, bold: true
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
                                body: [[{ margin: [1, 1], stack: [{ text: "SHIPPER", fontSize: 7, bold: true }, { margin: [0, 5], text: srv.awb.shipper, fontSize: 8, bold: true }], border: [false, false, false, true] }]] //end table body 
                            }

                        }, {
                            table: {
                                margin: [0, 0],
                                headerRows: 0,
                                widths: ['*', 30, 50],
                                body: [[{ margin: [1, 1], stack: [{ text: "PACKAGE NO", fontSize: 6, bold: true }, { margin: [0, 5], text: "PK00" + pkg.id, fontSize: 12, bold: true }], border: [false, false, false, true] }, //logo for lbl 
                                { margin: [1, 1], stack: [{ text: "PIECE", fontSize: 6, bold: true }, { margin: [10, 5], text: pkg.packageIndex, fontSize: 12, bold: true }], border: [true, false, false, true] }, { margin: [1, 1], stack: [{ text: "TOTAL PIECES", fontSize: 6, bold: true }, { margin: [10, 5], text: srv.awb.packages.length, fontSize: 12, bold: true }], border: [true, false, false, true] }]] //end table body 
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
                                body: [[{ margin: [0, 0], stack: [{ margin: [0, 5], text: "DESCRIPTION", fontSize: 7, bold: true }, { margin: [0, 5], text: pkg.description, fontSize: 7, bold: true },
                                    //table here 
                                    {
                                        margin: [0, 0],
                                        table: {
                                            margin: [0, 0],
                                            headerRows: 0,
                                            widths: ['*'],
                                            body: [[{ margin: [1, 1], stack: [{ text: "NOTES", fontSize: 7, bold: true }, { margin: [0, 10], text: "Class 3", fontSize: 7, bold: true }], border: [true, true, true, true] }]] //end table body 
                                        }

                                    }], border: [false, false, false, true] }, //barcode for lbl 
                                { margin: [1, 1], stack: [{ margin: [0, 1], text: "WEIGHT", fontSize: 6, bold: true }, { margin: [0, 2], text: pkg.weight + ' lbs.', fontSize: 8, bold: true }, { margin: [0, 1], text: "DIMENSIONS", fontSize: 6, bold: true }, { margin: [0, 1], text: pkg.dimensions + ' ins.', fontSize: 8, bold: true }, { margin: [0, 1], text: "VOL. WEIGHT", fontSize: 6, bold: true }, { margin: [0, 2], text: srv.calculateDimensionalWeight(pkg.dimensions) + ' Vlbs', fontSize: 5, bold: true }], border: [true, false, false, true] }]] //end table body 
                            }

                        }],

                        defaultStyle: {
                            font: 'Helvetica',
                            fontSize: 11
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlV0aWwvTEJMR2VuZXJhdGlvbi5lczYiXSwibmFtZXMiOlsiZm9udHMiLCJDb3VyaWVyIiwibm9ybWFsIiwiYm9sZCIsIml0YWxpY3MiLCJib2xkaXRhbGljcyIsIkhlbHZldGljYSIsIlRpbWVzIiwiU3ltYm9sIiwiWmFwZkRpbmdiYXRzIiwiUGRmUHJpbnRlciIsInJlcXVpcmUiLCJwcmludGVyIiwiZnMiLCJid2lwanMiLCJOdW1iZXIiLCJwcm90b3R5cGUiLCJmb3JtYXRNb25leSIsImMiLCJkIiwidCIsIm4iLCJpc05hTiIsIk1hdGgiLCJhYnMiLCJ1bmRlZmluZWQiLCJzIiwiaSIsIlN0cmluZyIsInBhcnNlSW50IiwidG9GaXhlZCIsImoiLCJsZW5ndGgiLCJzdWJzdHIiLCJyZXBsYWNlIiwic2xpY2UiLCJMQkxHZW5lcmF0aW9uIiwiY29tcGFuaWVzIiwibmluZVRvZml2ZSIsImxvZ28iLCJuYW1lIiwicG9zdEJveGVzIiwiYXdiIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJzcnYiLCJjb21wYW55IiwiY3VzdG9tZXIiLCJwbWIiLCJjb25zb2xlIiwibG9nIiwicGFja2FnZXMiLCJhbGwiLCJtYXAiLCJHZXJuZXJhdGVBV0JMYWJlbCIsInBrZyIsInRoZW4iLCJyZXN1bHRzIiwiZ2VuZXJhdGVCYXJjb2RlIiwiaWQiLCJ0b1N0cmluZyIsImRvY0RlZmluaXRpb24iLCJwYWdlU2l6ZSIsIndpZHRoIiwiaGVpZ2h0IiwicGFnZU1hcmdpbnMiLCJjb250ZW50IiwidGFibGUiLCJoZWFkZXJSb3dzIiwid2lkdGhzIiwiYm9keSIsIm1hcmdpbiIsInN0YWNrIiwiaW1hZ2UiLCJhbGlnbm1lbnQiLCJ0ZXh0IiwicXIiLCJmaXQiLCJib3JkZXIiLCJjb2xTcGFuIiwiZm9udFNpemUiLCJzaGlwcGVyIiwicGFja2FnZUluZGV4IiwicG5nIiwiZGVzY3JpcHRpb24iLCJ3ZWlnaHQiLCJkaW1lbnNpb25zIiwiY2FsY3VsYXRlRGltZW5zaW9uYWxXZWlnaHQiLCJkZWZhdWx0U3R5bGUiLCJmb250IiwicGRmRG9jIiwiY3JlYXRlUGRmS2l0RG9jdW1lbnQiLCJmaWxlbmFtZSIsInBpcGUiLCJjcmVhdGVXcml0ZVN0cmVhbSIsImVuZCIsImdlbmVyYXRlZCIsImRpbWVuc2lvbnBhcnRzIiwic3BsaXQiLCJudW1lcmF0b3IiLCJ0cmltIiwiZGltV2VpZ2h0IiwibGF5b3V0IiwiZmlsbENvbG9yIiwiYWRkcmVzcyIsInRvQnVmZmVyIiwiYmNpZCIsInNjYWxlIiwiaW5jbHVkZXRleHQiLCJ0ZXh0eGFsaWduIiwiZXJyIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBRUMsSUFBSUEsUUFBUTtBQUNUQyxhQUFTO0FBQ1BDLGdCQUFRLFNBREQ7QUFFUEMsY0FBTSxjQUZDO0FBR1BDLGlCQUFTLGlCQUhGO0FBSVBDLHFCQUFhO0FBSk4sS0FEQTtBQU9UQyxlQUFXO0FBQ1RKLGdCQUFRLFdBREM7QUFFVEMsY0FBTSxnQkFGRztBQUdUQyxpQkFBUyxtQkFIQTtBQUlUQyxxQkFBYTtBQUpKLEtBUEY7QUFhVEUsV0FBTztBQUNMTCxnQkFBUSxhQURIO0FBRUxDLGNBQU0sWUFGRDtBQUdMQyxpQkFBUyxjQUhKO0FBSUxDLHFCQUFhO0FBSlIsS0FiRTtBQW1CVEcsWUFBUTtBQUNOTixnQkFBUTtBQURGLEtBbkJDO0FBc0JUTyxrQkFBYztBQUNaUCxnQkFBUTtBQURJO0FBdEJMLENBQVo7QUEwQkEsSUFBSVEsYUFBYUMsUUFBUSxTQUFSLENBQWpCO0FBQ0MsSUFBSUMsVUFBVSxJQUFJRixVQUFKLENBQWVWLEtBQWYsQ0FBZDtBQUNBLElBQUlhLEtBQUtGLFFBQVEsSUFBUixDQUFUO0FBQ0EsSUFBSUcsU0FBU0gsUUFBUSxTQUFSLENBQWI7QUFDQUksT0FBT0MsU0FBUCxDQUFpQkMsV0FBakIsR0FBK0IsVUFBVUMsQ0FBVixFQUFhQyxDQUFiLEVBQWdCQyxDQUFoQixFQUFtQjtBQUNoRCxRQUFJQyxJQUFJLElBQVI7QUFBQSxRQUNJSCxJQUFJSSxNQUFNSixJQUFJSyxL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QixtQkFBTyxJQUFJakMsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBVUMsTUFBVixFQUFxQjtBQUNwQy9CLHVCQUFPNEYsUUFBUCxDQUFnQjtBQUNkQywwQkFBTSxRQURRO0FBRWQvQiw4QkFGYztBQUdkZ0MsMkJBQU8sQ0FITztBQUlkM0MsNEJBQVEsRUFKTTtBQUtkNEMsaUNBQWEsSUFMQztBQU1kQyxnQ0FBWTtBQU5FLGlCQUFoQixFQU9HLFVBQUNDLEdBQUQsRUFBTTNCLEdBQU4sRUFBYztBQUNmLHdCQUFJMkIsR0FBSixFQUFTbEUsT0FBT2tFLEdBQVAsRUFBVCxLQUNLbkUsUUFBUXdDLEdBQVI7QUFDTixpQkFWRDtBQVdELGFBWkksQ0FBUDtBQWFIIiwiZmlsZSI6IlV0aWwvTEJMR2VuZXJhdGlvbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuXG4gdmFyIGZvbnRzID0ge1xuICAgIENvdXJpZXI6IHtcbiAgICAgIG5vcm1hbDogJ0NvdXJpZXInLFxuICAgICAgYm9sZDogJ0NvdXJpZXItQm9sZCcsXG4gICAgICBpdGFsaWNzOiAnQ291cmllci1PYmxpcXVlJyxcbiAgICAgIGJvbGRpdGFsaWNzOiAnQ291cmllci1Cb2xkT2JsaXF1ZSdcbiAgICB9LFxuICAgIEhlbHZldGljYToge1xuICAgICAgbm9ybWFsOiAnSGVsdmV0aWNhJyxcbiAgICAgIGJvbGQ6ICdIZWx2ZXRpY2EtQm9sZCcsXG4gICAgICBpdGFsaWNzOiAnSGVsdmV0aWNhLU9ibGlxdWUnLFxuICAgICAgYm9sZGl0YWxpY3M6ICdIZWx2ZXRpY2EtQm9sZE9ibGlxdWUnXG4gICAgfSxcbiAgICBUaW1lczoge1xuICAgICAgbm9ybWFsOiAnVGltZXMtUm9tYW4nLFxuICAgICAgYm9sZDogJ1RpbWVzLUJvbGQnLFxuICAgICAgaXRhbGljczogJ1RpbWVzLUl0YWxpYycsXG4gICAgICBib2xkaXRhbGljczogJ1RpbWVzLUJvbGRJdGFsaWMnXG4gICAgfSxcbiAgICBTeW1ib2w6IHtcbiAgICAgIG5vcm1hbDogJ1N5bWJvbCdcbiAgICB9LFxuICAgIFphcGZEaW5nYmF0czoge1xuICAgICAgbm9ybWFsOiAnWmFwZkRpbmdiYXRzJ1xuICAgIH1cbiAgfTtcbiB2YXIgUGRmUHJpbnRlciA9IHJlcXVpcmUoJ3BkZm1ha2UnKTtcbiAgdmFyIHByaW50ZXIgPSBuZXcgUGRmUHJpbnRlcihmb250cyk7XG4gIHZhciBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG4gIHZhciBid2lwanMgPSByZXF1aXJlKCdid2lwLWpzJylcbiAgTnVtYmVyLnByb3RvdHlwZS5mb3JtYXRNb25leSA9IGZ1bmN0aW9uIChjLCBkLCB0KSB7XG4gICAgdmFyIG4gPSB0aGlzLFxuICAgICAgICBjID0gaXNOYU4oYyA9IE1hdGguYWJzKGMpKSA/IDIgOiBjLFxuICAgICAgICBkID0gZCA9PSB1bmRlZmluZWQgPyBcIi5cIiA6IGQsXG4gICAgICAgIHQgPSB0ID09IHVuZGVmaW5lZCA/IFwiLFwiIDogdCxcbiAgICAgICAgcyA9IG4gPCAwID8gXCItXCIgOiBcIlwiLFxuICAgICAgICBpID0gU3RyaW5nKHBhcnNlSW50KG4gPSBNYXRoLmFicyhOdW1iZXIobikgfHwgMCkudG9GaXhlZChjKSkpLFxuICAgICAgICBqID0gKGogPSBpLmxlbmd0aCkgPiAzID8gaiAlIDMgOiAwO1xuICAgIHJldHVybiBcIlwiICsgcyArIChqID8gaS5zdWJzdHIoMCwgaikgKyB0IDogXCJcIikgKyBpLnN1YnN0cihqKS5yZXBsYWNlKC8oXFxkezN9KSg/PVxcZCkvZywgXCIxXCIgKyB0KSArIChjID8gZCArIE1hdGguYWJzKG4gLSBpKS50b0ZpeGVkKGMpLnNsaWNlKDIpIDogXCJcIik7XG59O1xuZXhwb3J0IGNsYXNzIExCTEdlbmVyYXRpb25cbntcbiAgICBjb25zdHJ1Y3Rvcigpe1xuICAgICAgICAgICAgdGhpcy5jb21wYW5pZXMgPSB7XG4gICAgICAgICAgICBuaW5lVG9maXZlOiB7XG4gICAgICAgICAgICAgICAgbG9nbzoncHVibGljL2ltZy9sb2dvLmpwZycsXG4gICAgICAgICAgICAgICAgbmFtZTogXCJOSU5FIFRPIEZJVkUgSU1QT1JUIEVYUE9SVFwiXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHBvc3RCb3hlczoge1xuICAgICAgICAgICAgICAgIGxvZ286J3B1YmxpYy9pbWcvcGJlLWxvZ28ucG5nJywgXG4gICAgICAgICAgICAgICAgbmFtZSA6IFwiUE9TVCBCT1hFUyBFVENcIlxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2VuZXJhdGVQYWNrYWdlTGFiZWxzKGF3Yil7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICB0aGlzLmF3YiA9IGF3Yi5hd2I7IFxuICAgICAgICAgICAgdmFyIHNydiAgPSB0aGlzOyBcbiAgICAgICAgICAgIHZhciBjb21wYW55ICA9IHRoaXMuY29tcGFuaWVzLm5pbmVUb2ZpdmU7IFxuICAgICAgICAgICAgaWYgKE51bWJlcihzcnYuYXdiLmN1c3RvbWVyLnBtYik+PTkwMDApe1xuICAgICAgICAgICAgICAgIGNvbXBhbnkgPSB0aGlzLmNvbXBhbmllcy5uaW5lVG9maXZlOyBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgY29tcGFueSA9IHRoaXMuY29tcGFuaWVzLnBvc3RCb3hlc1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJnZW5lcmF0aW5nXCIsYXdiLmF3Yik7IFxuICAgICAgICAgICAgY29uc29sZS5sb2codGhpcy5hd2IucGFja2FnZXMubGVuZ3RoLFwiLSBubyBvZiBsYWJlbHMgdG8gZ2VuZXJhdGUuXCIpOyBcbiAgICAgICAgICAgIFByb21pc2UuYWxsKHNydi5hd2IucGFja2FnZXMubWFwKHBrZz0+dGhpcy5HZXJuZXJhdGVBV0JMYWJlbChwa2csY29tcGFueSkpKS50aGVuKHJlc3VsdHM9PntcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHRzKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdHMpXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgIFxuICAgIH1cbiAgICBHZXJuZXJhdGVBV0JMYWJlbChwa2cgLCBjb21wYW55KXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIHNydiA9IHRoaXM7IFxuICAgICAgICAgICAgLy90aGlzIG5lZWRzIHRvIGJlZSBpbiBhIGxvb3AgXG4gICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5nZW5lcmF0ZUJhcmNvZGUoc3J2LmF3Yi5jdXN0b21lci5wbWIrXCItXCIrc3J2LmF3Yi5pZC50b1N0cmluZygpK1wiLVwiK3BrZy5pZCkudGhlbihwbmc9PntcbiAgICAgICAgICAgICAgICB2YXIgZG9jRGVmaW5pdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgcGFnZVNpemU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiAyODguMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IDQzMi4wMFxuICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgcGFnZU1hcmdpbnM6IFsgMTAsIDEwLCAxMCwgMTAgXSxcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1hcmdpbjpbMCwyMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFibGU6e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWFkZXJSb3dzOjAsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aHM6WycqJywnKicsXCIqXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib2R5OltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW3ttYXJnaW46WzEsNV0sc3RhY2s6W3tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbWFnZTpjb21wYW55LmxvZ28sd2lkdGg6NzAsIGFsaWdubWVudDonY2VudGVyJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSx7dGV4dDonJ30sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOls1LDZdLHFyOnNydi5hd2IuY3VzdG9tZXIucG1iK1wiLVwiK3Nydi5hd2IuaWQudG9TdHJpbmcoKStcIi1cIitwa2cuaWQsIGZpdDonNjAnLGFsaWdubWVudDonY2VudGVyJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXSAgICxib3JkZXI6W2ZhbHNlLGZhbHNlLGZhbHNlLHRydWVdfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL2xvZ28gZm9yIGxibCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7Y29sU3BhbjoyLGJvcmRlcjpbZmFsc2UsZmFsc2UsZmFsc2UsdHJ1ZV0sc3RhY2s6W1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHttYXJnaW46WzEsNV0sdGV4dDpjb21wYW55Lm5hbWUsZm9udFNpemU6MTAsYm9sZDp0cnVlfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOlsxLDJdLHRleHQ6XCIxODExIDUxc3QgU3RyZWV0XCJ9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHttYXJnaW46WzEsMl0sdGV4dDpcIkhhbmdlciA0MiBEXCJ9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHttYXJnaW46WzEsMl0sdGV4dDpcIkZvcnQgTGF1ZGVyZGFsZSwgRkwgMzMzMDkgXCJ9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHttYXJnaW46WzEsMl0sdGV4dDpcIlVOSVRFRCBTVEFURVMgXCJ9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLy9lbmQgdGFibGUgYm9keSBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhYmxlOntcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2luOlswLDBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWFkZXJSb3dzOjAsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aHM6WycqJyw2MF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvZHk6W1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW3ttYXJnaW46WzEsMV0sc3RhY2s6W1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHt0ZXh0OlwiQ09OU0lHTkVFXCIsIGZvbnRTaXplOjQsYm9sZDp0cnVlfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOlsyLDVdLHRleHQ6c3J2LmF3Yi5jdXN0b21lci5uYW1lLCBmb250U2l6ZTo4LGJvbGQ6dHJ1ZX0sXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0sYm9yZGVyOltmYWxzZSxmYWxzZSxmYWxzZSx0cnVlXX0sIC8vbG9nbyBmb3IgbGJsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtib3JkZXI6W3RydWUsZmFsc2UsZmFsc2UsdHJ1ZV0sc3RhY2s6W1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHt0ZXh0OlwiQWNjb3VudCBOb1wiLCBmb250U2l6ZTo4LGJvbGQ6dHJ1ZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMiw1XSx0ZXh0OnNydi5hd2IuY3VzdG9tZXIucG1iLCBmb250U2l6ZTo5LGJvbGQ6dHJ1ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB7bWFyZ2luOlsxLDFdLHRleHQ6XCJOSU5FIFRPIEZJVkUgSU1QT1JUIEVYUE9SVFwiLGZvbnRTaXplOjksYm9sZDp0cnVlfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB7bWFyZ2luOlsxLDFdLHRleHQ6XCIxODExIDUxc3QgU3RyZWV0XCJ9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHttYXJnaW46WzEsMV0sdGV4dDpcIkhhbmdlciA0MiBEXCJ9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHttYXJnaW46WzEsMV0sdGV4dDpcIkZvcnQgTGF1ZGVyZGFsZSwgRkwgMzMzMDkgVU5JVEVEIFNUQVRFU1wifVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF19XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXS8vZW5kIHRhYmxlIGJvZHkgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YWJsZTp7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbjpbMCwwXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyUm93czowLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGhzOlsnKiddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib2R5OltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFt7bWFyZ2luOlsxLDFdLHN0YWNrOltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7dGV4dDpcIkFXQiBOb1wiLCBmb250U2l6ZTo0LGJvbGQ6dHJ1ZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMCw1XSx0ZXh0OlwiQVdCXCIrc3J2LmF3Yi5pZCwgZm9udFNpemU6MTMsYm9sZDp0cnVlfSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXSxib3JkZXI6W2ZhbHNlLGZhbHNlLGZhbHNlLHRydWVdfSwgLy9sb2dvIGZvciBsYmwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXS8vZW5kIHRhYmxlIGJvZHkgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YWJsZTp7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbjpbMCwwXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyUm93czowLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGhzOlsnKiddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib2R5OltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFt7bWFyZ2luOlsxLDFdLHN0YWNrOltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7dGV4dDpcIlNISVBQRVJcIiwgZm9udFNpemU6Nyxib2xkOnRydWV9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHttYXJnaW46WzAsNV0sdGV4dDpzcnYuYXdiLnNoaXBwZXIsIGZvbnRTaXplOjgsYm9sZDp0cnVlfSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXSxib3JkZXI6W2ZhbHNlLGZhbHNlLGZhbHNlLHRydWVdfSwgLy9sb2dvIGZvciBsYmwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXS8vZW5kIHRhYmxlIGJvZHkgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YWJsZTp7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbjpbMCwwXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyUm93czowLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGhzOlsnKicsMzAsNTBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib2R5OltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFt7bWFyZ2luOlsxLDFdLHN0YWNrOltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7dGV4dDpcIlBBQ0tBR0UgTk9cIiwgZm9udFNpemU6Nixib2xkOnRydWV9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHttYXJnaW46WzAsNV0sdGV4dDpcIlBLMDBcIitwa2cuaWQsIGZvbnRTaXplOjEyLGJvbGQ6dHJ1ZX0sXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0sYm9yZGVyOltmYWxzZSxmYWxzZSxmYWxzZSx0cnVlXX0sIC8vbG9nbyBmb3IgbGJsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMSwxXSxzdGFjazpbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3RleHQ6XCJQSUVDRVwiLCBmb250U2l6ZTo2LGJvbGQ6dHJ1ZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMTAsNV0sdGV4dDpwa2cucGFja2FnZUluZGV4LCBmb250U2l6ZToxMixib2xkOnRydWV9LFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLGJvcmRlcjpbdHJ1ZSxmYWxzZSxmYWxzZSx0cnVlXX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOlsxLDFdLHN0YWNrOltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7dGV4dDpcIlRPVEFMIFBJRUNFU1wiLCBmb250U2l6ZTo2LGJvbGQ6dHJ1ZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMTAsNV0sdGV4dDpzcnYuYXdiLnBhY2thZ2VzLmxlbmd0aCwgZm9udFNpemU6MTIsYm9sZDp0cnVlfSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXSxib3JkZXI6W3RydWUsZmFsc2UsZmFsc2UsdHJ1ZV19XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXS8vZW5kIHRhYmxlIGJvZHkgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YWJsZTp7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbjpbMCwwXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyUm93czowLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGhzOlsnKiddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib2R5OltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFt7bWFyZ2luOlsxLDFdLHN0YWNrOltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOlswLDVdLGltYWdlOiAnZGF0YTppbWFnZS9qcGVnO2Jhc2U2NCwnK3BuZy50b1N0cmluZygnYmFzZTY0Jyksd2lkdGg6MTgwLGhlaWdodDozMCxhbGlnbm1lbnQ6XCJsZWZ0XCJ9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8ge21hcmdpbjpbMCw1XSx0ZXh0OlwiUEtcIitzcnYuYXdiLmlkLCBmb250U2l6ZToxMixib2xkOnRydWV9LFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLGJvcmRlcjpbZmFsc2UsZmFsc2UsZmFsc2UsdHJ1ZV19LCAvL2JhcmNvZGUgZm9yIGxibCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0vL2VuZCB0YWJsZSBib2R5IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFibGU6e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW46WzAsMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlYWRlclJvd3M6MCwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoczpbJyonLDUwXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9keTpbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMCwwIF0sc3RhY2s6W1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOlswLDVdLHRleHQ6XCJERVNDUklQVElPTlwiLCBmb250U2l6ZTo3LGJvbGQ6dHJ1ZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHttYXJnaW46WzAsNV0sdGV4dDpwa2cuZGVzY3JpcHRpb24sIGZvbnRTaXplOjcsYm9sZDp0cnVlfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL3RhYmxlIGhlcmUgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW46WzAsMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhYmxlOntcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbjpbMCwwXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlYWRlclJvd3M6MCwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aHM6WycqJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib2R5OltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbe21hcmdpbjpbMSwxXSxzdGFjazpbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHt0ZXh0OlwiTk9URVNcIiwgZm9udFNpemU6Nyxib2xkOnRydWV9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOlswLDEwXSx0ZXh0OlwiQ2xhc3MgM1wiLCBmb250U2l6ZTo3LGJvbGQ6dHJ1ZX0sXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXSxib3JkZXI6W3RydWUsdHJ1ZSx0cnVlLHRydWVdfSwgLy9sb2dvIGZvciBsYmwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXS8vZW5kIHRhYmxlIGJvZHkgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0sYm9yZGVyOltmYWxzZSxmYWxzZSxmYWxzZSx0cnVlXX0sIC8vYmFyY29kZSBmb3IgbGJsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMSwxXSxzdGFjazpbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMCwxXSx0ZXh0OlwiV0VJR0hUXCIsIGZvbnRTaXplOjYsYm9sZDp0cnVlfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOlswLDJdLHRleHQ6YCR7cGtnLndlaWdodH0gbGJzLmAsIGZvbnRTaXplOjgsYm9sZDp0cnVlfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOlswLDFdLHRleHQ6XCJESU1FTlNJT05TXCIsIGZvbnRTaXplOjYsYm9sZDp0cnVlfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOlswLDFdLHRleHQ6YCR7cGtnLmRpbWVuc2lvbnN9IGlucy5gLCBmb250U2l6ZTo4LGJvbGQ6dHJ1ZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMCwxXSx0ZXh0OlwiVk9MLiBXRUlHSFRcIiwgZm9udFNpemU6Nixib2xkOnRydWV9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHttYXJnaW46WzAsMl0sdGV4dDpgJHtzcnYuY2FsY3VsYXRlRGltZW5zaW9uYWxXZWlnaHQocGtnLmRpbWVuc2lvbnMpfSBWbGJzYCwgZm9udFNpemU6NSxib2xkOnRydWV9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy90YWJsZSBoZXJlIFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0sYm9yZGVyOlt0cnVlLGZhbHNlLGZhbHNlLHRydWVdfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0vL2VuZCB0YWJsZSBib2R5IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRTdHlsZToge1xuICAgICAgICAgICAgICAgICAgICAgIGZvbnQ6ICdIZWx2ZXRpY2EnLFxuICAgICAgICAgICAgICAgICAgICAgIGZvbnRTaXplOjExXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgIHZhciBwZGZEb2MgPSBwcmludGVyLmNyZWF0ZVBkZktpdERvY3VtZW50KGRvY0RlZmluaXRpb24pO1xuICAgICAgICAgICAgICAgICAgdmFyIGZpbGVuYW1lID0gc3J2LmF3Yi5pZCsnLScrcGtnLmlkKyctbGJsLnBkZic7IFxuICAgICAgICAgICAgICAgICAgcGRmRG9jLnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0oZmlsZW5hbWUpKTtcbiAgICAgICAgICAgICAgICAgIHBkZkRvYy5lbmQoKTtcbiAgICAgICAgICAgICAgICAgIHJlc29sdmUoe2dlbmVyYXRlZDp0cnVlLGZpbGVuYW1lOmZpbGVuYW1lfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBcbiAgICAgICAgfSlcbiAgICAgICAgLy8gcmV0dXJuIG5ldyBQcm9taXNlICgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgIC8vICAgICB0aGlzLmF3YiA9IGF3Yi5hd2I7IFxuXG4gICAgICAgIC8vICAgICB2YXIgZG9jRGVmaW5pdGlvbiA9IHsgXG4gICAgICAgIC8vICAgICAgICAgY29udGVudDogW1xuICAgICAgICAvLyAgICAgICAgICAgICB7XG4gICAgICAgIC8vICAgICAgICAgICAgICAgICB0ZXh0OlwiSEVZXCJcbiAgICAgICAgLy8gICAgICAgICAgICAgfSxcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8ge1xuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgbGF5b3V0IDogJ2xpZ2h0SG9yaXpvbnRhbGxpbmVzJyxcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgIG1hcmdpbjpbMCwyMF0sXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICB0YWJsZToge1xuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgIGhlYWRlclJvd3M6MSxcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICB3aWR0aHM6WycqJyxcIipcIixcIipcIl0sXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgYm9keTpbXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIFt7bWFyZ2luOlsxLDFdLHRleHQ6XCJcIix9LCAvL2xvZ28gZm9yIGxibCBcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgW3ttYXJnaW46WzEsMV0sc3RhY2s6XG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICBbXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAge3RleHQ6XCJOSU5FIFRPIEZJVkUgSU1QT1JUIEVYUE9SVFwiLGZvbnRTaXplOjEzfSxcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICB7dGV4dDpcIjE4MTEgNTFzdCBTdHJlZXRcIn0sXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAge3RleHQ6XCJIYW5nZXIgNDIgRFwifSxcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICB7dGV4dDpcIkZvcnQgTGF1ZGVyZGFsZSwgRkwgMzMzMDkgVU5JVEVEIFNUQVRFU1wifVxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgXVxuICAgIFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAsY29sU3BhbjoyfSwgXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIHttYXJnaW46WzEsMV0sdGV4dDpcIlwifV0gLy9ST1cgMSBFTkQgXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vIFt7bWFyZ2luOls1LDVdLHN0YWNrOltcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgIHt0ZXh0OlwiQ09OU0lHTkVFXCJ9LHRoaXMuYXdiLmN1c3RvbWVyLm5hbWVdfSwgLy9jdXN0b21lciBuYW1lIFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyB7bWFyZ2luOls1LDVdLHN0YWNrOltcIkFjY291bnQgTm9cIix0aGlzLmF3Yi5jdXN0b21lci5wbWJdfSx7dGV4dDpcIlwifV0sIC8vUk9XIDIgXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vIFtcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgIHttYXJnaW46WzEsMV0sXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgc3RhY2s6W1xuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgIHt0ZXh0OlwiQVdCIE5PXCJ9LFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgIHt0ZXh0OnRoaXMuYXdiLmlkfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgXSxcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgIGNvbFNwYW46M30sXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICB7dGV4dDpcIlwifSx7dGV4dDpcIlwifVxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyBdLCAvL2VuZCByb3cgM1xuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyBbXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICB7bWFyZ2luOlsxLDFdLFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgIHN0YWNrOltcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICB7dGV4dDpcIlNoaXBwZXJcIn0sXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAge3RleHQ6dGhpcy5hd2Iuc2hpcHBlcn1cbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICBdLFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgY29sU3BhbjozfSxcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgIHt0ZXh0OlwiXCJ9LFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAge3RleHQ6XCJcIn1cbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gXSwgLy9lbmQgcm93IDRcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gW1xuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAge21hcmdpbjpbMSwxXSxcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICBzdGFjazpbXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAge3RleHQ6XCJQQUNLQUdFIE5PXCJ9LFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgIHt0ZXh0OnRoaXMuYXdiLnNoaXBwZXJ9XG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgXVxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgfSxcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgIHsgc3RhY2s6W1xuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgIHt0ZXh0OlwiUElFQ0VcIn0sXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAge3RleHQ6dGhpcy5hd2Iuc2hpcHBlcn1cbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICBdfSxcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgIHsgc3RhY2s6W1xuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgIHt0ZXh0OlwiVE9UQUwgUElFQ0VTXCJ9LFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgIHt0ZXh0OnRoaXMuYXdiLnNoaXBwZXJ9XG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgXX1cbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gXSwvL2VuZCByb3cgNSBcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gW1xuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAge21hcmdpbjpbMSwxXSxpbWFnZTp7fSxjb2xTcGFuOjN9LC8vQkFSQ09ERVxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAge3RleHQ6XCJcIn0sXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICB7dGV4dDpcIlwifVxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyBdLFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyBbXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgIHtcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgIG1hcmdpbjpbMSwxXSx0ZXh0OlwiXCIsY29sU3BhbjozLFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICB9XG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vIF1cbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICBdXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICBdLFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgZGVmYXVsdFN0eWxlOiB7XG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgZm9udDogJ0hlbHZldGljYScsXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgZm9udFNpemU6N1xuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICB9LFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyB9fVxuICAgICAgICAvLyAgICAgICAgIF0sXG4gICAgICAgIC8vICAgICB9XG4gICAgICAgIC8vICAgICBjb25zb2xlLmxvZygndHJ5aW5nIHRvIGNyZWF0ZSBQREYuLi4uJylcbiAgICAgICAgLy8gICAgIHZhciBwZGZEb2MgPSBwcmludGVyLmNyZWF0ZVBkZktpdERvY3VtZW50KGRvY0RlZmluaXRpb24pO1xuICAgICAgICAvLyAgICAgcGRmRG9jLnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0oJ2xibC5wZGYnKSk7XG4gICAgICAgIC8vICAgICBwZGZEb2MuZW5kKCk7XG4gICAgICAgIC8vIH0pXG4gICAgICAgXG4gICAgfVxuICAgIGNhbGN1bGF0ZURpbWVuc2lvbmFsV2VpZ2h0KGRpbWVuc2lvbnMpe1xuICAgICAgICB2YXIgZGltZW5zaW9ucGFydHMgPSBkaW1lbnNpb25zLnNwbGl0KCd4Jyk7IFxuICAgICAgICB2YXIgbnVtZXJhdG9yID0gMTsgXG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBkaW1lbnNpb25wYXJ0cy5sZW5ndGggOyBpKyspe1xuICAgICAgICAgICAgbnVtZXJhdG9yID0gbnVtZXJhdG9yICogTnVtYmVyKGRpbWVuc2lvbnBhcnRzW2ldLnRyaW0oKSlcbiAgICAgICAgICAgIFxuICAgICAgICB9XG4gICAgICAgIHZhciBkaW1XZWlnaHQgPSBudW1lcmF0b3IgLyAxMzk7IFxuICAgICAgICByZXR1cm4gTnVtYmVyKGRpbVdlaWdodCkuZm9ybWF0TW9uZXkoMiwgJy4nLCAnLCcpXG5cbiAgICB9XG4gICAgZ2VuZXJhdGVTaGlwZXJDb3NpZ25lZVRhYmxlKGF3Yil7XG4gICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGxheW91dCA6ICdsaWdodEhvcml6b250YWxsaW5lcycsXG4gICAgICAgICAgICBtYXJnaW46WzAsMjBdLFxuICAgICAgICAgICAgdGFibGU6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXJSb3dzOjEsXG4gICAgICAgICAgICAgICAgd2lkdGhzOlsnKicsXCIqXCJdLFxuICAgICAgICAgICAgICAgIGJvZHk6W1xuICAgICAgICAgICAgICAgICAgICBbe21hcmdpbjpbMSwxXSx0ZXh0OlwiU2hpcHBlciBJbmZvcm1hdGlvblwiLGZpbGxDb2xvcjpcIiNjY2NjY2NcIn0sIHttYXJnaW46WzEsMV0sdGV4dDpcIkNvc2lnbmVlIEluZm9tYXRpb25cIixmaWxsQ29sb3I6JyNjY2NjY2MnfV0sXG4gICAgICAgICAgICAgICAgICAgIFt7bWFyZ2luOls1LDVdLHN0YWNrOlthd2Iuc2hpcHBlcixcIlwiXX0se21hcmdpbjpbNSw1XSxzdGFjazpbYXdiLmN1c3RvbWVyLm5hbWUsYXdiLmN1c3RvbWVyLnBtYixhd2IuY3VzdG9tZXIuYWRkcmVzc119XVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgfX1cbiAgICB9XG4gICAgZ2VuZXJhdGVCYXJjb2RlICh0ZXh0KXtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGJ3aXBqcy50b0J1ZmZlcih7XG4gICAgICAgICAgICAgIGJjaWQ6ICdjb2RlMzknLFxuICAgICAgICAgICAgICB0ZXh0LFxuICAgICAgICAgICAgICBzY2FsZTogNSxcbiAgICAgICAgICAgICAgaGVpZ2h0OiAxMCxcbiAgICAgICAgICAgICAgaW5jbHVkZXRleHQ6IHRydWUsXG4gICAgICAgICAgICAgIHRleHR4YWxpZ246ICdyaWdodCdcbiAgICAgICAgICAgIH0sIChlcnIsIHBuZykgPT4ge1xuICAgICAgICAgICAgICBpZiAoZXJyKSByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgZWxzZSByZXNvbHZlKHBuZyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICB9XG4gIFxufSJdfQ==
