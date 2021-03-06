const PDFPrinter = require('pdfmake');
const moment = require('moment');

const TABLE_LAYOUT = {
  hLineColor: (i, node) => 'black',
  vLineColor: (i, node) => 'black',
  paddingLeft: () => 4,
  paddingRight: () => 4,
  paddingTop: () => 4,
  paddingBottom: () => 4,
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

const convertLbsToKg = (value) => value / 2.20462262185

class CUBE {
  constructor(data) {
    this.data = data;
  }

  async generate() {
    let definition = {
      pageSize: 'A4',
      pageMargins: 20,
      pageOrientation: 'landscape',
      footer: (currentPage, pageCount) => ({
        text: `${currentPage}/${pageCount}`,
        alignment: 'right',
        margin: [0, 0, 20, 0],
      }),

      content: [
        {
          columns: [
            {
              width: '30%',
              stack: [
                {
                  stack: [
                    { text: 'Nine To Five Import Export', bold: true },
                    { text: '2801 NW 55th Court', margin: [0, 10, 0, 0] },
                    'Building 6W',
                    'Ft Lauderdale, FL 33309',
                    'UNITED STATES',
                    'Tel: 954-958-9970, Fax:954-958-9071',
                  ],
                },
              ],
            },
            {
              width: '40%',
              text: 'Cube Manifest'.toUpperCase(),
              fontSize: 16,
              bold: true,
              alignment: 'center',
              margin: [0, 40, 0, 0],
            },
            {
              width: '30%',
              text: '',
            },
          ],
        },
        {
          layout: TABLE_LAYOUT,
          margin: [0, 20],
          table: {
            headerRows: 3,
            widths: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
            body: [
              [
                {
                  stack: [
                    { text: '2. Owner/Operator', fontSize: 9 },
                    { text: String(this.data.owner), fontSize: 12, bold: true },
                  ],
                  colSpan: 4,
                },
                {},
                {},
                {},
                {
                  stack: [
                    { text: '3. Cube Name', fontSize: 9 },
                    {
                      text: String(this.data.cubeName),
                      fontSize: 12,
                      bold: true,
                    },
                  ],
                  colSpan: 2,
                },
                {},
                {
                  stack: [
                    { text: '4. AWB #', fontSize: 9 },
                    { text: String(this.data.awbId), fontSize: 12, bold: true },
                  ],
                },
              ],
              [
                {
                  stack: [
                    { text: '5. Port Of Lading', fontSize: 9 },
                    { text: String(this.data.portOfLading), fontSize: 12, bold: true },
                  ],
                  colSpan: 4,
                },
                {},
                {},
                {},
                {
                  stack: [
                    { text: '6. Port Of Onlading', fontSize: 9 },
                    { text: String(this.data.portOfOnlading), fontSize: 12, bold: true },
                  ],
                  colSpan: 2,
                },
                {},
                {
                  stack: [
                    { text: '7. Date', fontSize: 9 },
                    {
                      text: this.data.date ? moment(this.data.date).format('MMM/DD/YYYY') : '',
                      fontSize: 12,
                      bold: true,
                    },
                  ],
                  colSpan: 1,
                },
              ],
              [
                { stack: ['10. Air Waybill Type', '11. Air Waybill No'], fontSize: 9 },
                { stack: ['12.', 'NO. of', 'Pieces'], fontSize: 9, alignment: 'center' },
                { stack: ['13.', 'Weight', '(Lb.)'], fontSize: 9, alignment: 'center' },
                { stack: ['14.', 'Weight', '(Kg.)'], fontSize: 9, alignment: 'center' },
                { stack: ['14. Shipper Name and Address'], fontSize: 9, alignment: 'left' },
                { stack: ['16. Consignee Name and Address'], fontSize: 9, alignment: 'left' },
                { stack: ['17. Nature of Goods'], fontSize: 9, alignment: 'left' },
              ],
              ...this.data.rows.map((pkg) => [
                { text: "AWB#"+pkg.awb, alignment: 'center', bold: pkg.isInvoice ? true : false},
                { text: pkg.pieces, alignment: 'center', bold: pkg.isInvoice ? true : false},
                { text: pkg.weight.toFixed(2), alignment: 'center', bold: pkg.isInvoice ? true : false},
                { text: convertLbsToKg(pkg.weight).toFixed(2), alignment: 'center', bold: pkg.isInvoice ? true : false},
                { text : [pkg.shipper.name, pkg.shipper.address], bold: pkg.isInvoice ? true : false},
                {text : [pkg.consignee.name , pkg.consignee.address], bold: pkg.isInvoice ? true : false},
                { text: pkg.natureOfGoods + (pkg.isInvoice ? '*' : ''), bold: pkg.isInvoice ? true : false },
              ]),
            ],
          },
        },
        {
          columns: [
            {
              width: '50%',
              alignment: 'center',
              bold: true,
              text: `Total Weight: ${this.data.rows
                .reduce((acc, i) => acc + i.weight, 0)
                .toFixed(2)} lbs`,
            },
            {
              width: '50%',
              alignment: 'center',
              bold: true,
              text: `Piece Count: ${this.data.rows.reduce((acc, i) => acc + i.pieces, 0)}`,
            },
          ],
        },
      ],
      styles: {},
      defaultStyle: {
        font: 'Helvetica',
        fontSize: 11,
        lineHeight: 1.2,
      },
    };

    return printer.createPdfKitDocument(definition);
  }
}

module.exports = CUBE;
