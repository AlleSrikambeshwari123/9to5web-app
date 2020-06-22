var fonts = {
    Courier: {
      normal: 'Courier',
      bold: 'Courier-Bold',
      italics: 'Courier-Oblique',
      bolditalics: 'Courier-BoldOblique',
    },
    Helvetica: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique',
    },
    Times: {
      normal: 'Times-Roman',
      bold: 'Times-Bold',
      italics: 'Times-Italic',
      bolditalics: 'Times-BoldItalic',
    },
    Symbol: {
      normal: 'Symbol',
    },
    ZapfDingbats: {
      normal: 'ZapfDingbats',
    },
  };
  var PdfPrinter = require('pdfmake');
  var printer = new PdfPrinter(fonts);
  var fs = require('fs');
  var bwipjs = require('bwip-js');
  Number.prototype.formatMoney = function (c, d, t) {
    var n = this,
      c = isNaN((c = Math.abs(c))) ? 2 : c,
      d = d == undefined ? '.' : d,
      t = t == undefined ? ',' : t,
      s = n < 0 ? '-' : '',
      i = String(parseInt((n = Math.abs(Number(n) || 0).toFixed(c)))),
      j = (j = i.length) > 3 ? j % 3 : 0;
    return (
      '' +
      s +
      (j ? i.substr(0, j) + t : '') +
      i.substr(j).replace(/(\d{3})(?=\d)/g, '1' + t) +
      (c
        ? d +
          Math.abs(n - i)
            .toFixed(c)
            .slice(2)
        : '')
    );
  };
  
  class CUBEGeneration {
    constructor() {
      this.companies = {
        nineTofive: {
          logo: 'public/img/logo.jpg',
          name: 'NINE TO FIVE IMPORT EXPORT',
        },
        postBoxes: {
          logo: 'public/img/pbe-logo.png',
          name: 'POST BOXES ETC',
        },
      };
    }
  
    generateAllPackageLabels(awb) {
      return new Promise((resolve, reject) => {
        this.awb = awb;
        this.awb['id'] = awb['_id'];
  
        if (awb.id == undefined) {
          resolve({ success: false, message: "Can't create the barcode because of invalid information" });
        }
  
        var company = this.companies.nineTofive;
        if (Number(this.awb.customer.pmb) >= 9000) {
          company = this.companies.nineTofive;
        } else if (this.awb.customer.pmb == '') {
          this.awb.customer.pmb = 9000;
          company = this.companies.nineTofive;
        } else company = this.companies.postBoxes;
  
        console.log(this.awb.packages.length, '- no of labels to generate.');
        console.log('company logo' + company.logo);
  
        Promise.all(awb.packages.map((pkg,key) => this.GernerateAWBLabel((key+1), pkg, company)))
          .then((results) => {
            results.forEach((result, i) => {
              results[i]['name'] = results[i].filename;
              delete results[i].filename;
            });
            console.log(results);
            resolve(results);
          })
          .catch((err) => {
            console.error(err);
            reject(err);
          });
      });
    }
    generateSinglePackageLabel(awb, pkg) {
      return new Promise((resolve, reject) => {
        this.awb = awb;
        this.awb['id'] = awb['_id'];
  
        if (awb.id == undefined) {
          resolve({ success: false, message: "Can't create the barcode because of invalid information" });
        }
  
        var company = this.companies.nineTofive;
        if (Number(this.awb.customer.pmb) >= 9000) {
          company = this.companies.nineTofive;
        } else if (this.awb.customer.pmb == '') {
          this.awb.customer.pmb = 9000;
          company = this.companies.nineTofive;
        } else company = this.companies.postBoxes;
        this.GernerateAWBLabel(0,pkg, company)
          .then((result) => {
            console.log(result);
            resolve(result);
          })
          .catch((err) => {
            console.error(err);
            reject(err);
          });
      });
    }
  
    generateSinglePriceLabel(awb,price) {
      return new Promise((resolve, reject) => {
        this.awb = awb;
        this.awb['id'] = awb['_id'];
  
        if (awb.id == undefined) {
          resolve({ success: false, message: "Can't create the barcode because of invalid information" });
        }
        var company = this.companies.nineTofive;
        if (Number(this.awb.customerId.pmb) >= 9000) {
          company = this.companies.nineTofive;
        } else if (this.awb.customerId.pmb == '') {
          this.awb.customerId.pmb = 9000;
          company = this.companies.nineTofive;
        } else company = this.companies.postBoxes;
        this.GerneratePriceLabel(price, company)
          .then((result) => {
            console.log(result);
            resolve(result);
          })
          .catch((err) => {
            console.error(err);
            reject(err);
          });
      });
    }
  
    GerneratePriceLabel(price, company) {
      return new Promise((resolve, reject) => {
        try {
          var docDefinition = {
            pageSize: {
              width:4*72,
              height:3*72
            },
            pageMargins: [20, 10, 10,5],
            content: [
              {
                style: 'tableExample',
                color: '#444',
                layout: 'noBorders',
                table: {
                  widths: [170, 'auto', 'auto'],
                  headerRows: 1,
                  // keepWithHeaderRows: 1,
                  body: [
                    [{ text: '@', style: 'tableHeader',alignment: 'center' }, {}, {}],
                    [{ text: company.name, style: 'tableHeader', colSpan: 2, alignment: 'center' }, {}, {}],
                    [{ text: 'Invocies $', style: 'tableHeader', colSpan: 2, alignment: 'center' }, {}, {}],
                    [{ text: 'Charges', style: 'tableHeader', colSpan: 2, fontSize:"12", alignment: 'left' }, {}, {}],
                  ],
                }
              },
              {
                style: 'tableExample',
                layout: 'noBorders',
                table: {
                  headerRows: 1,
                  // keepWithHeaderRows: 1,
                  body: [
                    [
                      { text: 'Duty ', style: 'tableHeader', bold: true, alignment: 'center' },
                      { text: ":", style: 'tableHeader', alignment: 'center' },
                      { text: '$'+price.Duty == null ? '0': price.Duty  , style: 'tableHeader', alignment: 'center' },
                      { text: "", style: 'tableHeader', alignment: 'center' },
                      { text: 'Freight ', style: 'tableHeader', bold: true, alignment: 'center' },
                      { text: ":", style: 'tableHeader', alignment: 'center' },
                      { text: '$'+price.Freight == null ? '0':price.Freight  , style: 'tableHeader', alignment: 'center' },
                    ],
                    [
                      { text: 'CustomsProc ', style: 'tableHeader', bold: true, alignment: 'center' },
                      { text: ":", style: 'tableHeader', alignment: 'center' },
                      { text: '$'+price.CustomsProc == null ? '0':price.CustomsProc  , style: 'tableHeader', alignment: 'center' },
                      { text: "", style: 'tableHeader', alignment: 'center' },
                      { text: 'NoDocs ', style: 'tableHeader', bold: true, alignment: 'center' },
                      { text: ":", style: 'tableHeader', alignment: 'center' },
                      { text: '$'+price.NoDocs == null ? '0':price.NoDocs  , style: 'tableHeader', alignment: 'center' },
                    ],
                    [
                      { text: 'Env.Levy ', style: 'tableHeader', bold: true, alignment: 'center' },
                      { text: ":", style: 'tableHeader', alignment: 'center' },
                      { text: '$'+price.EnvLevy == null ? '0':price.EnvLevy  , style: 'tableHeader', alignment: 'center' },
                      { text: "", style: 'tableHeader', alignment: 'center' },
                      { text: 'Insurance ', style: 'tableHeader', bold: true, alignment: 'center' },
                      { text: ":", style: 'tableHeader', alignment: 'center' },
                      { text: '$'+price.Insurance == null ? '0':price.Insurance  , style: 'tableHeader', alignment: 'center' },
                    ],
                    [
                      { text: 'CustomsVAT ', style: 'tableHeader', bold: true, alignment: 'center' },
                      { text: ":", style: 'tableHeader', alignment: 'center' },
                      { text: '$'+price.CustomsVAT == null ? '0':price.CustomsVAT  , style: 'tableHeader', alignment: 'center' },
                      { text: "", style: 'tableHeader', alignment: 'center' },
                      { text: 'Storage ', style: 'tableHeader', bold: true, alignment: 'center' },
                      { text: ":", style: 'tableHeader', alignment: 'center' },
                      { text: '$'+price.Storage == null ? '0':price.Storage  , style: 'tableHeader', alignment: 'center' },
                    ],
                    [
                      { text: '',  style: 'tableHeader', bold: true, alignment: 'center' },
                      { text: "", style: 'tableHeader', alignment: 'center' },
                      { text: '', style: 'tableHeader', alignment: 'center' },
                      { text: "", style: 'tableHeader', alignment: 'center' },
                      { text: 'Brokerage ', style: 'tableHeader', bold: true, alignment: 'center' },
                      { text: ":", style: 'tableHeader', alignment: 'center' },
                      { text: '$'+price.Brokerage == null ? '0':price.Brokerage  , style: 'tableHeader', alignment: 'center' },
                    ],
                    [
                      { text: '',  style: 'tableHeader', bold: true, alignment: 'center' },
                      { text: "", style: 'tableHeader', alignment: 'center' },
                      { text: '', style: 'tableHeader', alignment: 'center' },
                      { text: "", style: 'tableHeader', alignment: 'center' },
                      { text: 'Sed ', style: 'tableHeader', bold: true, alignment: 'center' },
                      { text: ":", style: 'tableHeader', alignment: 'center' },
                      { text: '$'+price.Sed == null ? '0':price.Sed  , style: 'tableHeader', alignment: 'center' },
                    ],
                    [
                      { text: '',  style: 'tableHeader', bold: true, alignment: 'center' },
                      { text: "", style: 'tableHeader', alignment: 'center' },
                      { text: '', style: 'tableHeader', alignment: 'center' },
                      { text: "", style: 'tableHeader', alignment: 'center' },
                      { text: 'Express ', style: 'tableHeader', bold: true, alignment: 'center' },
                      { text: ":", style: 'tableHeader', alignment: 'center' },
                      { text: '$'+price.Express == null ? '0':price.Express  , style: 'tableHeader', alignment: 'center' },
                    ],
                    [
                      { text: '',  style: 'tableHeader', bold: true, alignment: 'center' },
                      { text: "", style: 'tableHeader', alignment: 'center' },
                      { text: '', style: 'tableHeader', alignment: 'center' },
                      { text: "", style: 'tableHeader', alignment: 'center' },
                      { text: 'Delivery ', style: 'tableHeader', bold: true, alignment: 'center' },
                      { text: ":", style: 'tableHeader', alignment: 'center' },
                      { text: '$'+price.Delivery == null ? '0':price.Delivery  , style: 'tableHeader', alignment: 'center' },
                    ],
                    [
                      { text: 'ServicesVat',  style: 'tableHeader', bold: true, alignment: 'center' },
                      { text: ":", style: 'tableHeader', alignment: 'center' },
                      { text: '$'+price.ServiceVat == null ? '0':price.ServiceVat  , style: 'tableHeader', alignment: 'center' },
                      { text: "", style: 'tableHeader', alignment: 'center' },
                      { text: 'Pickup ', style: 'tableHeader', bold: true, alignment: 'center' },
                      { text: ":", style: 'tableHeader', alignment: 'center' },
                      { text: '$'+price.Pickup == null ? '0':price.Pickup  , style: 'tableHeader', alignment: 'center' },
                    ],
                    [
                      { text: 'TotalWet',  style: 'tableHeader', bold: true, alignment: 'center' },
                      { text: ":", style: 'tableHeader', alignment: 'center' },
                      { text: '$'+price.TotalWet == null ? '0':price.TotalWet  , style: 'tableHeader', alignment: 'center' },
                      { text: "", style: 'tableHeader', alignment: 'center' },
                      { text: 'Hazmat ', style: 'tableHeader', bold: true, alignment: 'center' },
                      { text: ":", style: 'tableHeader', alignment: 'center' },
                      { text: '$'+price.Hazmat == null ? '0':price.Hazmat  , style: 'tableHeader', alignment: 'center' },
                    ],
                  ],
                },
              },
            ],
            defaultStyle: {
              font: 'Helvetica',
              fontSize: 8,
            },
          };
          var filestream;
          var pdfDoc = printer.createPdfKitDocument(docDefinition);
          var filename = '/pricelabel.' + price.id + '.pdf';
          var filepath = global.uploadRoot + filename;
          pdfDoc.pipe((filestream = fs.createWriteStream(filepath)));
          pdfDoc.end();
          filestream.on('finish', async function () {
            resolve({ success: true, path: filepath, filename: filename });
          });
        } catch (error) {
          reject(error);
        }
      });
    }
    GernerateAWBLabel(key,pkg, company) {
      return new Promise((resolve, reject) => {
        var noDocs = '';
  
        // if (this.awb.invoiceNumber == "" && (this.awb.invoices || []).length === 0) {
        //   noDocs = "***"
        // }
  
        if ((this.awb.invoices || []).length === 0) {
          noDocs = '***';
        }
  
        var notes = '';
        if (this.awb.hazmat && this.awb.hazmat.description) {
          notes = this.awb.hazmat.description;
        }
        this.generateBarcode(pkg.trackingNo)
          .then((png) => {
            try {
              var docDefinition = {
                pageSize: {
                  width: 288.0,
                  height: 432.0,
                },
                pageMargins: [10, 10, 10, 10],
                content: [
                  {
                    // margin:[0,20],
                    table: {
                      headerRows: 0,
                      widths: ['*', '*', '*'],
                      body: [
                        [
                          {
                            margin: [1, 5],
                            stack: [
                              { image: company.logo, width: 70, alignment: 'center' },
                              { text: '' },
                              { margin: [5, 6], qr: pkg.trackingNo, fit: '60', alignment: 'center' },
                            ],
                            border: [false, false, false, true],
                          },
                          //logo for lbl
                          {
                            colSpan: 2,
                            border: [false, false, false, true],
                            stack: [
                              { margin: [1, 5], text: company.name, fontSize: 10, bold: true },
                              { margin: [1, 2], text: '1811 51st Street', fontSize: 9 },
                              { margin: [1, 2], text: '2801 NW 55th Court, Building 6W', fontSize: 9 },
                              { margin: [1, 2], text: 'Fort Lauderdale, FL 33309 ', fontSize: 9 },
                              { margin: [1, 2], text: 'UNITED STATES ', fontSize: 9 },
                            ],
                          },
                        ],
                      ], //end table body
                    },
                  },
                  {
                    table: {
                      margin: [0, 0],
                      headerRows: 0,
                      widths: ['*', 60],
                      body: [
                        [
                          {
                            margin: [1, 1],
                            stack: [
                              { text: 'CONSIGNEE', fontSize: 4, bold: true },
                              {
                                margin: [2, 5],
                                text: '',
                                fontSize: 11,
                                bold: true,
                              },
                            ],
                            border: [false, false, false, true],
                          }, //logo for lbl
                          {
                            border: [true, false, false, true],
                            stack: [
                              { text: 'Account No', fontSize: 8, bold: true },
                              { margin: [2, 5], text: this.awb.customer.pmb, fontSize: 18, bold: true },
                              // {margin:[1,1],text:"NINE TO FIVE IMPORT EXPORT",fontSize:9,bold:true},
                              // {margin:[1,1],text:"1811 51st Street"},
                              // {margin:[1,1],text:"Hanger 42 D"},
                              // {margin:[1,1],text:"Fort Lauderdale, FL 33309 UNITED STATES"}
                            ],
                          },
                        ],
                      ], //end table body
                    },
                  },
                  {
                    table: {
                      margin: [0, 0],
                      headerRows: 0,
                      widths: ['*'],
                      body: [
                        [
                          {
                            margin: [1, 1],
                            stack: [
                              { text: 'AWB No', fontSize: 4, bold: true },
                              { margin: [0, 5], text: 'AWB-' + this.awb.awbId, fontSize: 16, bold: true },
                            ],
                            border: [false, false, false, true],
                          }, //logo for lbl
                        ],
                      ], //end table body
                    },
                  },
                  {
                    table: {
                      margin: [0, 0],
                      headerRows: 0,
                      widths: ['*'],
                      body: [
                        [
                          {
                            margin: [1, 1],
                            stack: [
                              { text: 'SHIPPER', fontSize: 7, bold: true },
                              { margin: [0, 5], text: '', fontSize: 10, bold: true },
                            ],
                            border: [false, false, false, true],
                          }, //logo for lbl
                        ],
                      ], //end table body
                    },
                  },
                  {
                    table: {
                      margin: [0, 0],
                      headerRows: 0,
                      widths: [200, 50],
                      body: [
                        [
                          {
                            margin: [1, 1],
                            stack: [
                              { text: 'Cube Tracking NO', fontSize: 6, bold: true },
                              { margin: [0, 5], text: 'CUBE ' + pkg.trackingNo, fontSize: 14, bold: true },
                            ],
                            border: [false, false, false, true],
                          }, //logo for lbl
                          // {
                          //   margin: [1, 1], stack: [
                          //     { text: "TRACKING NO", fontSize: 6, bold: true },
                          //     { margin: [10, 5], text: pkg.trackingNo, fontSize: 12, bold: true },
                          //   ], border: [true, false, false, true]
                          // },
                          {
                            margin: [1, 1],
                            stack: [
                              { text: 'TOTAL PIECES', fontSize: 6, bold: true },
                              { margin: [10, 5], text: key !== 0 ? key+'/'+this.awb.packages.length: this.awb.packages.length, fontSize: 12, bold: true },
                            ],
                            border: [true, false, false, true],
                          },
                        ],
                      ], //end table body
                    },
                  },
                  {
                    table: {
                      margin: [0, 0],
                      headerRows: 0,
                      widths: ['*'],
                      body: [
                        [
                          {
                            margin: [1, 1],
                            stack: [
                              {
                                margin: [0, 5],
                                image: 'data:image/jpeg;base64,' + png.toString('base64'),
                                width: 180,
                                height: 30,
                                alignment: 'left',
                              },
                              // {margin:[0,5],text:"PK"+this.awb.id, fontSize:12,bold:true},
                            ],
                            border: [false, false, false, true],
                          }, //barcode for lbl
                        ],
                      ], //end table body
                    },
                  },
                  {
                    table: {
                      margin: [0, 0],
                      headerRows: 0,
                      widths: ['*', 50],
                      body: [
                        [
                          {
                            margin: [0, 0],
                            stack: [
                              { margin: [0, 2], text: noDocs, fontSize: 11, bold: true },
                              //table here
                              {
                                margin: [0, 0],
                                table: {
                                  margin: [0, 0],
                                  headerRows: 0,
                                  widths: ['*'],
                                  body: [
                                    [
                                      {
                                        margin: [1, 1],
                                        stack: [
                                          { text: 'NOTES', fontSize: 7, bold: true },
                                          { margin: [0, 10], text: '', fontSize: 7, bold: true },
                                        ],
                                        border: [true, true, true, true],
                                      }, //logo for lbl
                                    ],
                                  ], //end table body
                                },
                              },
                            ],
                            border: [false, false, false, true],
                          }
                        ],
                      ], //end table body
                    },
                  },
                ],
                defaultStyle: {
                  font: 'Helvetica',
                  fontSize: 11,
                },
              };
              var filestream;
              var pdfDoc = printer.createPdfKitDocument(docDefinition);
              var filename = '/pkg.' + pkg.id +'.'+ key + '.pdf';
              var filepath = global.uploadRoot + filename;
              pdfDoc.pipe((filestream = fs.createWriteStream(filepath)));
              pdfDoc.end();
              filestream.on('finish', async function () {
                resolve({ success: true, path: filepath, filename: filename });
              });
            } catch (error) {
              reject(error);
            }
          })
          .catch((err) => {
            resolve({ success: false, message: "Can't create the barcode because of invalid information" });
          });
      });
    }
    calculateDimensionalWeight(dimensions) {
      var dimensionparts = dimensions.split('x');
      var numerator = 1;
      dimensionparts.forEach((part) => (numerator *= Number(part.trim())));
      var dimWeight = numerator / 139;
      return Number(dimWeight).formatMoney(2, '.', ',');
    }
    generateShiperCosigneeTable(awb) {
      return {
        layout: 'lightHorizontallines',
        margin: [0, 20],
        table: {
          headerRows: 1,
          widths: ['*', '*'],
          body: [
            [
              { margin: [1, 1], text: 'Shipper Information', fillColor: '#cccccc' },
              { margin: [1, 1], text: 'Cosignee Infomation', fillColor: '#cccccc' },
            ],
            [
              { margin: [5, 5], stack: [awb.shipper.name, ''] },
              { margin: [5, 5], stack: [awb.customer.firstName + ' ' + awb.customer.lastName, awb.customer.pmb, awb.customer.address] },
            ],
          ],
        },
      };
    }
    generateBarcode(text) {
      console.log('Generating Barcode of ' + text);
      return new Promise((resolve, reject) => {
        bwipjs.toBuffer(
          {
            bcid: 'code128',
            text: text,
            scale: 5,
            height: 10,
            includetext: true,
            textxalign: 'right',
          },
          (err, png) => {
            if (err) reject(err);
            else resolve(png);
          }
        );
      });
    }
  }
  
  module.exports = CUBEGeneration;
  