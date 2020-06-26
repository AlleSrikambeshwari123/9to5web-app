const PDFPrinter = require('pdfmake');
const moment = require('moment');
const _ = require('lodash');
var fs = require('fs');
var bwipjs = require('bwip-js');

const TABLE_LAYOUT = {
  hLineColor: (i, node) => 'black',
  vLineColor: (i, node) => 'black',
  paddingLeft: () => 0,
  paddingRight: () => 0,
  paddingTop: () => 0,
  paddingBottom: () => 0,
};

const TABLE_NO_OUTER_BORDER_LAYOUT = {
  hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0 : 1),
  vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length ? 0 : 1),
};

const TABLE_NO_PADDING = {
  paddingLeft: () => 0,
  paddingRight: () => 0,
  paddingTop: () => 0,
  paddingBottom: () => 0,
};

const printer = new PDFPrinter({
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
});

class AllPackagesOnAwb {
  constructor(data) {
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
    this.data = data;
  }

  generateItem(item,i) {
    // console.log("@@@@@@", i, item,png)
    let pkg = item._doc;
    return  [
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
                    { image: this.company.logo, width: 70, alignment: 'center' },
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
                    { margin: [1, 5], text: this.company.name, fontSize: 10, bold: true },
                    { margin: [1, 2], text: '1811 51st Street', fontSize: 9 },
                    { margin: [1, 2], text: 'Hanger 42 D', fontSize: 9 },
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
                      text: this.awb.customer.firstName + ' ' + this.awb.customer.lastName,
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
                    { margin: [0, 5], text: this.awb.shipper.name, fontSize: 10, bold: true },
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
                    { text: 'PACKAGE NO', fontSize: 6, bold: true },
                    { margin: [0, 5], text: 'PK00' + pkg.id, fontSize: 14, bold: true },
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
                    {
                      margin: [5, 5],
                      text: i + '/' + this.awb.packages.length,
                      fontSize: 10,
                      bold: true,
                    },
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
                      image: 'data:image/jpeg;base64,' + pkg.png,
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
                    { margin: [0, 5], text: 'DESCRIPTION', fontSize: 7, bold: true },
                    { margin: [0, 5], text: pkg.description, fontSize: 7, bold: true },
                    { margin: [0, 2], text: this.noDocs, fontSize: 11, bold: true },
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
                                { margin: [0, 10], text: this.notes, fontSize: 7, bold: true },
                              ],
                              border: [true, true, true, true],
                            }, //logo for lbl
                          ],
                        ], //end table body
                      },
                    },
                  ],
                  border: [false, false, false, true],
                }, //barcode for lbl
                {
                  margin: [1, 1],
                  stack: [
                    { margin: [0, 1], text: 'WEIGHT', fontSize: 6, bold: true },
                    { margin: [0, 2], text: `${pkg.weight} lbs.`, fontSize: 8, bold: true },
                    { margin: [0, 1], text: 'DIMENSIONS', fontSize: 6, bold: true },
                    { margin: [0, 1], text: `${pkg.dimensions} ins.`, fontSize: 8, bold: true },
                    { margin: [0, 1], text: 'VOL. WEIGHT', fontSize: 6, bold: true },
                    { margin: [0, 2], text: `${pkg.calculateDimensionalWeight} Vlbs`, fontSize: 5, bold: true },
                    //table here
                  ],
                  border: [true, false, false, true],
                },
              ],
            ], //end table body
          },
        },
        {
            text: '',
            fontSize: 11,
            alignment: 'right',
            bold: true,
            margin: [0, 15],
            pageBreak: !item.isLast ? 'after' : null,
        },
      ]
  }
  
  async generate() {
    return new Promise(async (resolve, reject) => {
      this.awb = this.data
      this.awb['id'] = this.awb['_id'];

      if (this.awb.id == undefined) {
        resolve({ success: false, message: "Can't create the barcode because of invalid information" });
      }

      this.company = this.companies.nineTofive;
      if (Number(this.awb.customer.pmb) >= 9000) {
        this.company = this.companies.nineTofive;
      } else if (this.awb.customer.pmb == '') {
        this.awb.customer.pmb = 9000;
        this.company = this.companies.nineTofive;
      } else this.company = this.companies.postBoxes;

      console.log(this.awb.packages.length, '- no of labels to generate.');
      console.log('company logo' + this.company.logo);
      if ((this.awb.invoices || []).length === 0) {
        this.noDocs = '***';
      }

      if (this.awb.hazmat && this.awb.hazmat.description) {
        this.notes = this.awb.hazmat.description;
      }
      let definition = {
        pageSize: {
            width: 288.0,
            height: 432.0,
          },
        pageMargins: [10, 10, 10, 10],
        content: [
          ..._.flatMap(this.data.packages, (item, i, array) => {
            return this.generateItem(
              {
                ...item,
                isLast: i === array.length - 1,
              },
              i+1
            );
          }),
        ],
        styles: {},
        defaultStyle: {
          font: 'Helvetica',
          fontSize: 7,
        },
      };
    //   printer.createPdfKitDocument(definition);
      var filestream;
      var pdfDoc = printer.createPdfKitDocument(definition);
      var filename = '/pkg.' + this.data.id + '.pdf';
      var filepath = global.uploadRoot + filename;
      pdfDoc.pipe((filestream = fs.createWriteStream(filepath)));
      pdfDoc.end();
      filestream.on('finish', async function () {
        console.log({ success: true, path: filepath, filename: filename });
        resolve({ success: true, path: filepath, filename: filename });
      });
    });
  }
}

module.exports = AllPackagesOnAwb;
