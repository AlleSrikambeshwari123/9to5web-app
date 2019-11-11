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
var pdffonts = require('pdfmake/build/vfs_fonts');
var PdfPrinter = require('pdfmake');
var printer = new PdfPrinter(pdffonts);
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlV0aWwvTEJMR2VuZXJhdGlvbi5lczYiXSwibmFtZXMiOlsiZm9udHMiLCJDb3VyaWVyIiwibm9ybWFsIiwiYm9sZCIsIml0YWxpY3MiLCJib2xkaXRhbGljcyIsIkhlbHZldGljYSIsIlRpbWVzIiwiU3ltYm9sIiwiWmFwZkRpbmdiYXRzIiwicGRmZm9udHMiLCJyZXF1aXJlIiwiUGRmUHJpbnRlciIsInByaW50ZXIiLCJmcyIsImJ3aXBqcyIsIk51bWJlciIsInByb3RvdHlwZSIsImZvcm1hdE1vbmV5IiwiYyIsImQiLCJ0IiwibiIsImlzTmFOIiwiTWF0aCIsImFicyIsInVuZGVmaW5lZCIsInMiLCJpIiwiU3RyaW5nIiwicGFyc2VJbnQiLCJ0b0ZpeGVkIiwiaiIsImxlbmd0aCIsInN1YnN0ciIsInJlcGxhY2UiLCJzbGljZSIsIkxCTEdlbmVyYXRpb24iLCJjb21wYW5pZXMiLCJuaW5lVG9maXZlIiwibG9nbyIsIm5hbWUiLCJwb3N0Qm94ZXMiLCJhd2IiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInNydiIsImNvbXBhbnkiLCJjdXN0b21lciIsInBtYiIsImNvbnNvbGUiLCJsb2ciLCJwYWNrYWdlcyIsImFsbCIsIm1hcCIsIkdlcm5lcmF0ZUFXQkxhYmVsIiwicGtnIiwidGhlbiIsInJlc3VsdHMiLCJnZW5lcmF0ZUJhcmNvZGUiLCJpZCIsInRvU3RyaW5nIiwiZG9jRGVmaW5pdGlvbiIsInBhZ2VTaXplIiwid2lkdGgiLCJoZWlnaHQiLCJwYWdlTWFyZ2lucyIsImNvbnRlbnQiLCJ0YWJsZSIsImhlYWRlclJvd3MiLCJ3aWR0aHMiLCJib2R5IiwibWFyZ2luIiwic3RhY2siLCJpbWFnZSIsImFsaWdubWVudCIsInRleHQiLCJxciIsImZpdCIsImJvcmRlciIsImNvbFNwYW4iLCJmb250U2l6ZSIsInNoaXBwZXIiLCJwYWNrYWdlSW5kZXgiLCJwbmciLCJkZXNjcmlwdGlvbiIsIndlaWdodCIsImRpbWVuc2lvbnMiLCJjYWxjdWxhdGVEaW1lbnNpb25hbFdlaWdodCIsImRlZmF1bHRTdHlsZSIsImZvbnQiLCJwZGZEb2MiLCJjcmVhdGVQZGZLaXREb2N1bWVudCIsImZpbGVuYW1lIiwicGlwZSIsImNyZWF0ZVdyaXRlU3RyZWFtIiwiZW5kIiwiZ2VuZXJhdGVkIiwiZGltZW5zaW9ucGFydHMiLCJzcGxpdCIsIm51bWVyYXRvciIsInRyaW0iLCJkaW1XZWlnaHQiLCJsYXlvdXQiLCJmaWxsQ29sb3IiLCJhZGRyZXNzIiwidG9CdWZmZXIiLCJiY2lkIiwic2NhbGUiLCJpbmNsdWRldGV4dCIsInRleHR4YWxpZ24iLCJlcnIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFFQyxJQUFJQSxRQUFRO0FBQ1RDLGFBQVM7QUFDUEMsZ0JBQVEsU0FERDtBQUVQQyxjQUFNLGNBRkM7QUFHUEMsaUJBQVMsaUJBSEY7QUFJUEMscUJBQWE7QUFKTixLQURBO0FBT1RDLGVBQVc7QUFDVEosZ0JBQVEsV0FEQztBQUVUQyxjQUFNLGdCQUZHO0FBR1RDLGlCQUFTLG1CQUhBO0FBSVRDLHFCQUFhO0FBSkosS0FQRjtBQWFURSxXQUFPO0FBQ0xMLGdCQUFRLGFBREg7QUFFTEMsY0FBTSxZQUZEO0FBR0xDLGlCQUFTLGNBSEo7QUFJTEMscUJBQWE7QUFKUixLQWJFO0FBbUJURyxZQUFRO0FBQ05OLGdCQUFRO0FBREYsS0FuQkM7QUFzQlRPLGtCQUFjO0FBQ1pQLGdCQUFRO0FBREk7QUF0QkwsQ0FBWjtBQTBCQyxJQUFJUSxXQUFXQyxRQUFRLHlCQUFSLENBQWY7QUFDRCxJQUFJQyxhQUFhRCxRQUFRLFNBQVIsQ0FBakI7QUFDQyxJQUFJRSxVQUFVLElBQUlELFVBQUosQ0FBZUYsUUFBZixDQUFkO0FBQ0EsSUFBSUksS0FBS0gsUUFBUSxJQUFSLENBQVQ7QUFDQSxJQUFJSSxTQUFTSixRQUFRLFNBQVIsQ0FBYjtBQUNBSyxPQUFPQyxTQUFQLENBQWlCQyxXQUFqQixHQUErQixVQUFVQyxDQUFWLEVBQWFDLENBQWIsRUFBZ0JDLENBQWhCLEVBQW1CO0FBQ2hELFFB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O0FBSEYsaUJBSEwsRUFBUDtBQVdGOzs7d0NBQ2dCN0IsSSxFQUFLO0FBQ2xCLG1CQUFPLElBQUlqQyxPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFVQyxNQUFWLEVBQXFCO0FBQ3BDL0IsdUJBQU80RixRQUFQLENBQWdCO0FBQ2RDLDBCQUFNLFFBRFE7QUFFZC9CLDhCQUZjO0FBR2RnQywyQkFBTyxDQUhPO0FBSWQzQyw0QkFBUSxFQUpNO0FBS2Q0QyxpQ0FBYSxJQUxDO0FBTWRDLGdDQUFZO0FBTkUsaUJBQWhCLEVBT0csVUFBQ0MsR0FBRCxFQUFNM0IsR0FBTixFQUFjO0FBQ2Ysd0JBQUkyQixHQUFKLEVBQVNsRSxPQUFPa0UsR0FBUCxFQUFULEtBQ0tuRSxRQUFRd0MsR0FBUjtBQUNOLGlCQVZEO0FBV0QsYUFaSSxDQUFQO0FBYUgiLCJmaWxlIjoiVXRpbC9MQkxHZW5lcmF0aW9uLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG5cbiB2YXIgZm9udHMgPSB7XG4gICAgQ291cmllcjoge1xuICAgICAgbm9ybWFsOiAnQ291cmllcicsXG4gICAgICBib2xkOiAnQ291cmllci1Cb2xkJyxcbiAgICAgIGl0YWxpY3M6ICdDb3VyaWVyLU9ibGlxdWUnLFxuICAgICAgYm9sZGl0YWxpY3M6ICdDb3VyaWVyLUJvbGRPYmxpcXVlJ1xuICAgIH0sXG4gICAgSGVsdmV0aWNhOiB7XG4gICAgICBub3JtYWw6ICdIZWx2ZXRpY2EnLFxuICAgICAgYm9sZDogJ0hlbHZldGljYS1Cb2xkJyxcbiAgICAgIGl0YWxpY3M6ICdIZWx2ZXRpY2EtT2JsaXF1ZScsXG4gICAgICBib2xkaXRhbGljczogJ0hlbHZldGljYS1Cb2xkT2JsaXF1ZSdcbiAgICB9LFxuICAgIFRpbWVzOiB7XG4gICAgICBub3JtYWw6ICdUaW1lcy1Sb21hbicsXG4gICAgICBib2xkOiAnVGltZXMtQm9sZCcsXG4gICAgICBpdGFsaWNzOiAnVGltZXMtSXRhbGljJyxcbiAgICAgIGJvbGRpdGFsaWNzOiAnVGltZXMtQm9sZEl0YWxpYydcbiAgICB9LFxuICAgIFN5bWJvbDoge1xuICAgICAgbm9ybWFsOiAnU3ltYm9sJ1xuICAgIH0sXG4gICAgWmFwZkRpbmdiYXRzOiB7XG4gICAgICBub3JtYWw6ICdaYXBmRGluZ2JhdHMnXG4gICAgfVxuICB9O1xuICB2YXIgcGRmZm9udHMgPSByZXF1aXJlKCdwZGZtYWtlL2J1aWxkL3Zmc19mb250cycpXG4gdmFyIFBkZlByaW50ZXIgPSByZXF1aXJlKCdwZGZtYWtlJyk7XG4gIHZhciBwcmludGVyID0gbmV3IFBkZlByaW50ZXIocGRmZm9udHMpO1xuICB2YXIgZnMgPSByZXF1aXJlKCdmcycpO1xuICB2YXIgYndpcGpzID0gcmVxdWlyZSgnYndpcC1qcycpXG4gIE51bWJlci5wcm90b3R5cGUuZm9ybWF0TW9uZXkgPSBmdW5jdGlvbiAoYywgZCwgdCkge1xuICAgIHZhciBuID0gdGhpcyxcbiAgICAgICAgYyA9IGlzTmFOKGMgPSBNYXRoLmFicyhjKSkgPyAyIDogYyxcbiAgICAgICAgZCA9IGQgPT0gdW5kZWZpbmVkID8gXCIuXCIgOiBkLFxuICAgICAgICB0ID0gdCA9PSB1bmRlZmluZWQgPyBcIixcIiA6IHQsXG4gICAgICAgIHMgPSBuIDwgMCA/IFwiLVwiIDogXCJcIixcbiAgICAgICAgaSA9IFN0cmluZyhwYXJzZUludChuID0gTWF0aC5hYnMoTnVtYmVyKG4pIHx8IDApLnRvRml4ZWQoYykpKSxcbiAgICAgICAgaiA9IChqID0gaS5sZW5ndGgpID4gMyA/IGogJSAzIDogMDtcbiAgICByZXR1cm4gXCJcIiArIHMgKyAoaiA/IGkuc3Vic3RyKDAsIGopICsgdCA6IFwiXCIpICsgaS5zdWJzdHIoaikucmVwbGFjZSgvKFxcZHszfSkoPz1cXGQpL2csIFwiMVwiICsgdCkgKyAoYyA/IGQgKyBNYXRoLmFicyhuIC0gaSkudG9GaXhlZChjKS5zbGljZSgyKSA6IFwiXCIpO1xufTtcbmV4cG9ydCBjbGFzcyBMQkxHZW5lcmF0aW9uXG57XG4gICAgY29uc3RydWN0b3IoKXtcbiAgICAgICAgICAgIHRoaXMuY29tcGFuaWVzID0ge1xuICAgICAgICAgICAgbmluZVRvZml2ZToge1xuICAgICAgICAgICAgICAgIGxvZ286J3B1YmxpYy9pbWcvbG9nby5qcGcnLFxuICAgICAgICAgICAgICAgIG5hbWU6IFwiTklORSBUTyBGSVZFIElNUE9SVCBFWFBPUlRcIlxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICBwb3N0Qm94ZXM6IHtcbiAgICAgICAgICAgICAgICBsb2dvOidwdWJsaWMvaW1nL3BiZS1sb2dvLnBuZycsIFxuICAgICAgICAgICAgICAgIG5hbWUgOiBcIlBPU1QgQk9YRVMgRVRDXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdlbmVyYXRlUGFja2FnZUxhYmVscyhhd2Ipe1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgdGhpcy5hd2IgPSBhd2IuYXdiOyBcbiAgICAgICAgICAgIHZhciBzcnYgID0gdGhpczsgXG4gICAgICAgICAgICB2YXIgY29tcGFueSAgPSB0aGlzLmNvbXBhbmllcy5uaW5lVG9maXZlOyBcbiAgICAgICAgICAgIGlmIChOdW1iZXIoc3J2LmF3Yi5jdXN0b21lci5wbWIpPj05MDAwKXtcbiAgICAgICAgICAgICAgICBjb21wYW55ID0gdGhpcy5jb21wYW5pZXMubmluZVRvZml2ZTsgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGNvbXBhbnkgPSB0aGlzLmNvbXBhbmllcy5wb3N0Qm94ZXNcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZ2VuZXJhdGluZ1wiLGF3Yi5hd2IpOyBcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMuYXdiLnBhY2thZ2VzLmxlbmd0aCxcIi0gbm8gb2YgbGFiZWxzIHRvIGdlbmVyYXRlLlwiKTsgXG4gICAgICAgICAgICBQcm9taXNlLmFsbChzcnYuYXdiLnBhY2thZ2VzLm1hcChwa2c9PnRoaXMuR2VybmVyYXRlQVdCTGFiZWwocGtnLGNvbXBhbnkpKSkudGhlbihyZXN1bHRzPT57XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHRzKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgICBcbiAgICB9XG4gICAgR2VybmVyYXRlQVdCTGFiZWwocGtnICwgY29tcGFueSl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBzcnYgPSB0aGlzOyBcbiAgICAgICAgICAgIC8vdGhpcyBuZWVkcyB0byBiZWUgaW4gYSBsb29wIFxuICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuZ2VuZXJhdGVCYXJjb2RlKHNydi5hd2IuY3VzdG9tZXIucG1iK1wiLVwiK3Nydi5hd2IuaWQudG9TdHJpbmcoKStcIi1cIitwa2cuaWQpLnRoZW4ocG5nPT57XG4gICAgICAgICAgICAgICAgdmFyIGRvY0RlZmluaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgIHBhZ2VTaXplOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogMjg4LjAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiA0MzIuMDBcbiAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgIHBhZ2VNYXJnaW5zOiBbIDEwLCAxMCwgMTAsIDEwIF0sXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBtYXJnaW46WzAsMjBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhYmxlOntcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyUm93czowLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGhzOlsnKicsJyonLFwiKlwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9keTpbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFt7bWFyZ2luOlsxLDVdLHN0YWNrOlt7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW1hZ2U6Y29tcGFueS5sb2dvLHdpZHRoOjcwLCBhbGlnbm1lbnQ6J2NlbnRlcidcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0se3RleHQ6Jyd9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbNSw2XSxxcjpzcnYuYXdiLmN1c3RvbWVyLnBtYitcIi1cIitzcnYuYXdiLmlkLnRvU3RyaW5nKCkrXCItXCIrcGtnLmlkLCBmaXQ6JzYwJyxhbGlnbm1lbnQ6J2NlbnRlcid9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0gICAsYm9yZGVyOltmYWxzZSxmYWxzZSxmYWxzZSx0cnVlXX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9sb2dvIGZvciBsYmwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge2NvbFNwYW46Mixib3JkZXI6W2ZhbHNlLGZhbHNlLGZhbHNlLHRydWVdLHN0YWNrOltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOlsxLDVdLHRleHQ6Y29tcGFueS5uYW1lLGZvbnRTaXplOjEwLGJvbGQ6dHJ1ZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMSwyXSx0ZXh0OlwiMTgxMSA1MXN0IFN0cmVldFwifSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOlsxLDJdLHRleHQ6XCJIYW5nZXIgNDIgRFwifSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOlsxLDJdLHRleHQ6XCJGb3J0IExhdWRlcmRhbGUsIEZMIDMzMzA5IFwifSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOlsxLDJdLHRleHQ6XCJVTklURUQgU1RBVEVTIFwifVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF19XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXS8vZW5kIHRhYmxlIGJvZHkgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YWJsZTp7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbjpbMCwwXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyUm93czowLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGhzOlsnKicsNjBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib2R5OltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFt7bWFyZ2luOlsxLDFdLHN0YWNrOltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7dGV4dDpcIkNPTlNJR05FRVwiLCBmb250U2l6ZTo0LGJvbGQ6dHJ1ZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMiw1XSx0ZXh0OnNydi5hd2IuY3VzdG9tZXIubmFtZSwgZm9udFNpemU6OCxib2xkOnRydWV9LFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLGJvcmRlcjpbZmFsc2UsZmFsc2UsZmFsc2UsdHJ1ZV19LCAvL2xvZ28gZm9yIGxibCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7Ym9yZGVyOlt0cnVlLGZhbHNlLGZhbHNlLHRydWVdLHN0YWNrOltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7dGV4dDpcIkFjY291bnQgTm9cIiwgZm9udFNpemU6OCxib2xkOnRydWV9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHttYXJnaW46WzIsNV0sdGV4dDpzcnYuYXdiLmN1c3RvbWVyLnBtYiwgZm9udFNpemU6OSxib2xkOnRydWV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8ge21hcmdpbjpbMSwxXSx0ZXh0OlwiTklORSBUTyBGSVZFIElNUE9SVCBFWFBPUlRcIixmb250U2l6ZTo5LGJvbGQ6dHJ1ZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8ge21hcmdpbjpbMSwxXSx0ZXh0OlwiMTgxMSA1MXN0IFN0cmVldFwifSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB7bWFyZ2luOlsxLDFdLHRleHQ6XCJIYW5nZXIgNDIgRFwifSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB7bWFyZ2luOlsxLDFdLHRleHQ6XCJGb3J0IExhdWRlcmRhbGUsIEZMIDMzMzA5IFVOSVRFRCBTVEFURVNcIn1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0vL2VuZCB0YWJsZSBib2R5IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFibGU6e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW46WzAsMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlYWRlclJvd3M6MCwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoczpbJyonXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9keTpbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbe21hcmdpbjpbMSwxXSxzdGFjazpbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3RleHQ6XCJBV0IgTm9cIiwgZm9udFNpemU6NCxib2xkOnRydWV9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHttYXJnaW46WzAsNV0sdGV4dDpcIkFXQlwiK3Nydi5hd2IuaWQsIGZvbnRTaXplOjEzLGJvbGQ6dHJ1ZX0sXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0sYm9yZGVyOltmYWxzZSxmYWxzZSxmYWxzZSx0cnVlXX0sIC8vbG9nbyBmb3IgbGJsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0vL2VuZCB0YWJsZSBib2R5IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFibGU6e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW46WzAsMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlYWRlclJvd3M6MCwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoczpbJyonXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9keTpbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbe21hcmdpbjpbMSwxXSxzdGFjazpbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3RleHQ6XCJTSElQUEVSXCIsIGZvbnRTaXplOjcsYm9sZDp0cnVlfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOlswLDVdLHRleHQ6c3J2LmF3Yi5zaGlwcGVyLCBmb250U2l6ZTo4LGJvbGQ6dHJ1ZX0sXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0sYm9yZGVyOltmYWxzZSxmYWxzZSxmYWxzZSx0cnVlXX0sIC8vbG9nbyBmb3IgbGJsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0vL2VuZCB0YWJsZSBib2R5IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFibGU6e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW46WzAsMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlYWRlclJvd3M6MCwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoczpbJyonLDMwLDUwXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9keTpbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbe21hcmdpbjpbMSwxXSxzdGFjazpbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3RleHQ6XCJQQUNLQUdFIE5PXCIsIGZvbnRTaXplOjYsYm9sZDp0cnVlfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOlswLDVdLHRleHQ6XCJQSzAwXCIrcGtnLmlkLCBmb250U2l6ZToxMixib2xkOnRydWV9LFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLGJvcmRlcjpbZmFsc2UsZmFsc2UsZmFsc2UsdHJ1ZV19LCAvL2xvZ28gZm9yIGxibCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHttYXJnaW46WzEsMV0sc3RhY2s6W1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHt0ZXh0OlwiUElFQ0VcIiwgZm9udFNpemU6Nixib2xkOnRydWV9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHttYXJnaW46WzEwLDVdLHRleHQ6cGtnLnBhY2thZ2VJbmRleCwgZm9udFNpemU6MTIsYm9sZDp0cnVlfSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXSxib3JkZXI6W3RydWUsZmFsc2UsZmFsc2UsdHJ1ZV19LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMSwxXSxzdGFjazpbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3RleHQ6XCJUT1RBTCBQSUVDRVNcIiwgZm9udFNpemU6Nixib2xkOnRydWV9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHttYXJnaW46WzEwLDVdLHRleHQ6c3J2LmF3Yi5wYWNrYWdlcy5sZW5ndGgsIGZvbnRTaXplOjEyLGJvbGQ6dHJ1ZX0sXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0sYm9yZGVyOlt0cnVlLGZhbHNlLGZhbHNlLHRydWVdfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0vL2VuZCB0YWJsZSBib2R5IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFibGU6e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW46WzAsMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlYWRlclJvd3M6MCwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoczpbJyonXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9keTpbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbe21hcmdpbjpbMSwxXSxzdGFjazpbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMCw1XSxpbWFnZTogJ2RhdGE6aW1hZ2UvanBlZztiYXNlNjQsJytwbmcudG9TdHJpbmcoJ2Jhc2U2NCcpLHdpZHRoOjE4MCxoZWlnaHQ6MzAsYWxpZ25tZW50OlwibGVmdFwifVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHttYXJnaW46WzAsNV0sdGV4dDpcIlBLXCIrc3J2LmF3Yi5pZCwgZm9udFNpemU6MTIsYm9sZDp0cnVlfSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXSxib3JkZXI6W2ZhbHNlLGZhbHNlLGZhbHNlLHRydWVdfSwgLy9iYXJjb2RlIGZvciBsYmwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLy9lbmQgdGFibGUgYm9keSBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhYmxlOntcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2luOlswLDBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWFkZXJSb3dzOjAsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aHM6WycqJyw1MF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvZHk6W1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHttYXJnaW46WzAsMCBdLHN0YWNrOltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMCw1XSx0ZXh0OlwiREVTQ1JJUFRJT05cIiwgZm9udFNpemU6Nyxib2xkOnRydWV9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOlswLDVdLHRleHQ6cGtnLmRlc2NyaXB0aW9uLCBmb250U2l6ZTo3LGJvbGQ6dHJ1ZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy90YWJsZSBoZXJlIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2luOlswLDBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YWJsZTp7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW46WzAsMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWFkZXJSb3dzOjAsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGhzOlsnKiddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9keTpbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW3ttYXJnaW46WzEsMV0sc3RhY2s6W1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7dGV4dDpcIk5PVEVTXCIsIGZvbnRTaXplOjcsYm9sZDp0cnVlfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMCwxMF0sdGV4dDpcIkNsYXNzIDNcIiwgZm9udFNpemU6Nyxib2xkOnRydWV9LFxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0sYm9yZGVyOlt0cnVlLHRydWUsdHJ1ZSx0cnVlXX0sIC8vbG9nbyBmb3IgbGJsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0vL2VuZCB0YWJsZSBib2R5IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLGJvcmRlcjpbZmFsc2UsZmFsc2UsZmFsc2UsdHJ1ZV19LCAvL2JhcmNvZGUgZm9yIGxibCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHttYXJnaW46WzEsMV0sc3RhY2s6W1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHttYXJnaW46WzAsMV0sdGV4dDpcIldFSUdIVFwiLCBmb250U2l6ZTo2LGJvbGQ6dHJ1ZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMCwyXSx0ZXh0OmAke3BrZy53ZWlnaHR9IGxicy5gLCBmb250U2l6ZTo4LGJvbGQ6dHJ1ZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMCwxXSx0ZXh0OlwiRElNRU5TSU9OU1wiLCBmb250U2l6ZTo2LGJvbGQ6dHJ1ZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbMCwxXSx0ZXh0OmAke3BrZy5kaW1lbnNpb25zfSBpbnMuYCwgZm9udFNpemU6OCxib2xkOnRydWV9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHttYXJnaW46WzAsMV0sdGV4dDpcIlZPTC4gV0VJR0hUXCIsIGZvbnRTaXplOjYsYm9sZDp0cnVlfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOlswLDJdLHRleHQ6YCR7c3J2LmNhbGN1bGF0ZURpbWVuc2lvbmFsV2VpZ2h0KHBrZy5kaW1lbnNpb25zKX0gVmxic2AsIGZvbnRTaXplOjUsYm9sZDp0cnVlfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vdGFibGUgaGVyZSBcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLGJvcmRlcjpbdHJ1ZSxmYWxzZSxmYWxzZSx0cnVlXX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLy9lbmQgdGFibGUgYm9keSBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0U3R5bGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICBmb250OiAnSGVsdmV0aWNhJyxcbiAgICAgICAgICAgICAgICAgICAgICBmb250U2l6ZToxMVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICB2YXIgcGRmRG9jID0gcHJpbnRlci5jcmVhdGVQZGZLaXREb2N1bWVudChkb2NEZWZpbml0aW9uKTtcbiAgICAgICAgICAgICAgICAgIHZhciBmaWxlbmFtZSA9IHNydi5hd2IuaWQrJy0nK3BrZy5pZCsnLWxibC5wZGYnOyBcbiAgICAgICAgICAgICAgICAgIHBkZkRvYy5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKGZpbGVuYW1lKSk7XG4gICAgICAgICAgICAgICAgICBwZGZEb2MuZW5kKCk7XG4gICAgICAgICAgICAgICAgICByZXNvbHZlKHtnZW5lcmF0ZWQ6dHJ1ZSxmaWxlbmFtZTpmaWxlbmFtZX0pXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgXG4gICAgICAgIH0pXG4gICAgICAgIC8vIHJldHVybiBuZXcgUHJvbWlzZSAoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAvLyAgICAgdGhpcy5hd2IgPSBhd2IuYXdiOyBcblxuICAgICAgICAvLyAgICAgdmFyIGRvY0RlZmluaXRpb24gPSB7IFxuICAgICAgICAvLyAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgLy8gICAgICAgICAgICAge1xuICAgICAgICAvLyAgICAgICAgICAgICAgICAgdGV4dDpcIkhFWVwiXG4gICAgICAgIC8vICAgICAgICAgICAgIH0sXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vIHtcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgIGxheW91dCA6ICdsaWdodEhvcml6b250YWxsaW5lcycsXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICBtYXJnaW46WzAsMjBdLFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgdGFibGU6IHtcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICBoZWFkZXJSb3dzOjEsXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgd2lkdGhzOlsnKicsXCIqXCIsXCIqXCJdLFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgIGJvZHk6W1xuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICBbe21hcmdpbjpbMSwxXSx0ZXh0OlwiXCIsfSwgLy9sb2dvIGZvciBsYmwgXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIFt7bWFyZ2luOlsxLDFdLHN0YWNrOlxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgW1xuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgIHt0ZXh0OlwiTklORSBUTyBGSVZFIElNUE9SVCBFWFBPUlRcIixmb250U2l6ZToxM30sXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAge3RleHQ6XCIxODExIDUxc3QgU3RyZWV0XCJ9LFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgIHt0ZXh0OlwiSGFuZ2VyIDQyIERcIn0sXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAge3RleHQ6XCJGb3J0IExhdWRlcmRhbGUsIEZMIDMzMzA5IFVOSVRFRCBTVEFURVNcIn1cbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgIF1cbiAgICBcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLGNvbFNwYW46Mn0sIFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICB7bWFyZ2luOlsxLDFdLHRleHQ6XCJcIn1dIC8vUk9XIDEgRU5EIFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyBbe21hcmdpbjpbNSw1XSxzdGFjazpbXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICB7dGV4dDpcIkNPTlNJR05FRVwifSx0aGlzLmF3Yi5jdXN0b21lci5uYW1lXX0sIC8vY3VzdG9tZXIgbmFtZSBcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8ge21hcmdpbjpbNSw1XSxzdGFjazpbXCJBY2NvdW50IE5vXCIsdGhpcy5hd2IuY3VzdG9tZXIucG1iXX0se3RleHQ6XCJcIn1dLCAvL1JPVyAyIFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyBbXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICB7bWFyZ2luOlsxLDFdLFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgIHN0YWNrOltcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICB7dGV4dDpcIkFXQiBOT1wifSxcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICB7dGV4dDp0aGlzLmF3Yi5pZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgIF0sXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICBjb2xTcGFuOjN9LFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAge3RleHQ6XCJcIn0se3RleHQ6XCJcIn1cbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gXSwgLy9lbmQgcm93IDNcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gW1xuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAge21hcmdpbjpbMSwxXSxcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICBzdGFjazpbXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAge3RleHQ6XCJTaGlwcGVyXCJ9LFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgIHt0ZXh0OnRoaXMuYXdiLnNoaXBwZXJ9XG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgXSxcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgIGNvbFNwYW46M30sXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICB7dGV4dDpcIlwifSxcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgIHt0ZXh0OlwiXCJ9XG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vIF0sIC8vZW5kIHJvdyA0XG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vIFtcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgIHttYXJnaW46WzEsMV0sXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgc3RhY2s6W1xuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgIHt0ZXh0OlwiUEFDS0FHRSBOT1wifSxcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICB7dGV4dDp0aGlzLmF3Yi5zaGlwcGVyfVxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgIF1cbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgIH0sXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICB7IHN0YWNrOltcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICB7dGV4dDpcIlBJRUNFXCJ9LFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgIHt0ZXh0OnRoaXMuYXdiLnNoaXBwZXJ9XG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgXX0sXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICB7IHN0YWNrOltcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICB7dGV4dDpcIlRPVEFMIFBJRUNFU1wifSxcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICB7dGV4dDp0aGlzLmF3Yi5zaGlwcGVyfVxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgIF19XG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vIF0sLy9lbmQgcm93IDUgXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vIFtcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgIHttYXJnaW46WzEsMV0saW1hZ2U6e30sY29sU3BhbjozfSwvL0JBUkNPREVcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgIHt0ZXh0OlwiXCJ9LFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAge3RleHQ6XCJcIn1cbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gXSxcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gW1xuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICB7XG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICBtYXJnaW46WzEsMV0sdGV4dDpcIlwiLGNvbFNwYW46MyxcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgfVxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgICAgICAvLyBdXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vICAgICAgICAgXVxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgXSxcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgIGRlZmF1bHRTdHlsZToge1xuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgIGZvbnQ6ICdIZWx2ZXRpY2EnLFxuICAgICAgICAvLyAgICAgICAgICAgICAvLyAgICAgICAgIGZvbnRTaXplOjdcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gICAgICAgfSxcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gfX1cbiAgICAgICAgLy8gICAgICAgICBdLFxuICAgICAgICAvLyAgICAgfVxuICAgICAgICAvLyAgICAgY29uc29sZS5sb2coJ3RyeWluZyB0byBjcmVhdGUgUERGLi4uLicpXG4gICAgICAgIC8vICAgICB2YXIgcGRmRG9jID0gcHJpbnRlci5jcmVhdGVQZGZLaXREb2N1bWVudChkb2NEZWZpbml0aW9uKTtcbiAgICAgICAgLy8gICAgIHBkZkRvYy5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKCdsYmwucGRmJykpO1xuICAgICAgICAvLyAgICAgcGRmRG9jLmVuZCgpO1xuICAgICAgICAvLyB9KVxuICAgICAgIFxuICAgIH1cbiAgICBjYWxjdWxhdGVEaW1lbnNpb25hbFdlaWdodChkaW1lbnNpb25zKXtcbiAgICAgICAgdmFyIGRpbWVuc2lvbnBhcnRzID0gZGltZW5zaW9ucy5zcGxpdCgneCcpOyBcbiAgICAgICAgdmFyIG51bWVyYXRvciA9IDE7IFxuICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgZGltZW5zaW9ucGFydHMubGVuZ3RoIDsgaSsrKXtcbiAgICAgICAgICAgIG51bWVyYXRvciA9IG51bWVyYXRvciAqIE51bWJlcihkaW1lbnNpb25wYXJ0c1tpXS50cmltKCkpXG4gICAgICAgICAgICBcbiAgICAgICAgfVxuICAgICAgICB2YXIgZGltV2VpZ2h0ID0gbnVtZXJhdG9yIC8gMTM5OyBcbiAgICAgICAgcmV0dXJuIE51bWJlcihkaW1XZWlnaHQpLmZvcm1hdE1vbmV5KDIsICcuJywgJywnKVxuXG4gICAgfVxuICAgIGdlbmVyYXRlU2hpcGVyQ29zaWduZWVUYWJsZShhd2Ipe1xuICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBsYXlvdXQgOiAnbGlnaHRIb3Jpem9udGFsbGluZXMnLFxuICAgICAgICAgICAgbWFyZ2luOlswLDIwXSxcbiAgICAgICAgICAgIHRhYmxlOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyUm93czoxLFxuICAgICAgICAgICAgICAgIHdpZHRoczpbJyonLFwiKlwiXSxcbiAgICAgICAgICAgICAgICBib2R5OltcbiAgICAgICAgICAgICAgICAgICAgW3ttYXJnaW46WzEsMV0sdGV4dDpcIlNoaXBwZXIgSW5mb3JtYXRpb25cIixmaWxsQ29sb3I6XCIjY2NjY2NjXCJ9LCB7bWFyZ2luOlsxLDFdLHRleHQ6XCJDb3NpZ25lZSBJbmZvbWF0aW9uXCIsZmlsbENvbG9yOicjY2NjY2NjJ31dLFxuICAgICAgICAgICAgICAgICAgICBbe21hcmdpbjpbNSw1XSxzdGFjazpbYXdiLnNoaXBwZXIsXCJcIl19LHttYXJnaW46WzUsNV0sc3RhY2s6W2F3Yi5jdXN0b21lci5uYW1lLGF3Yi5jdXN0b21lci5wbWIsYXdiLmN1c3RvbWVyLmFkZHJlc3NdfV1cbiAgICAgICAgICAgICAgICBdXG4gICAgICAgIH19XG4gICAgfVxuICAgIGdlbmVyYXRlQmFyY29kZSAodGV4dCl7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBid2lwanMudG9CdWZmZXIoe1xuICAgICAgICAgICAgICBiY2lkOiAnY29kZTM5JyxcbiAgICAgICAgICAgICAgdGV4dCxcbiAgICAgICAgICAgICAgc2NhbGU6IDUsXG4gICAgICAgICAgICAgIGhlaWdodDogMTAsXG4gICAgICAgICAgICAgIGluY2x1ZGV0ZXh0OiB0cnVlLFxuICAgICAgICAgICAgICB0ZXh0eGFsaWduOiAncmlnaHQnXG4gICAgICAgICAgICB9LCAoZXJyLCBwbmcpID0+IHtcbiAgICAgICAgICAgICAgaWYgKGVycikgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgIGVsc2UgcmVzb2x2ZShwbmcpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgfVxuICBcbn0iXX0=
