const PDFPrinter = require('pdfmake');
const moment = require('moment');

const TABLE_LAYOUT = {
  hLineColor: (i, node) => 'black',
  vLineColor: (i, node) => 'black',
  fillColor: (rowIndex, node, columnIndex) => {
    if (rowIndex === 0) {
      return '#ccc';
    }
  },
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

class CUBE {
  constructor(data) {
    this.data = data;
  }

  async generate() {
    let definition = {
      pageSize: 'A4',
      pageMargins: 40,
      footer: (currentPage, pageCount) => ({
        text: `Page No: ${currentPage}/${pageCount}`,
        alignment: 'right',
        margin: [0, 0, 20, 0],
      }),

      content: [
        {
          stack: [
            { text: 'NINE TO FIVE IMPORT EXPORT', lineHeight: 2.0, fontSize: 14 },
            { text: '2801 NW 55th Court, Building 6W', fontSize: 10 },
            { text: 'Ft Lauderdale, FL 33309', fontSize: 10 },
            { text: 'Cube Details', lineHeight: 2.0, fontSize: 14, margin: [0, 10, 0, 0] },
          ],
          alignment: 'center',
          bold: true,
        },
        {
          text: [],
          alignment: 'center',
          margin: [0, 0, 0, 20],
        },
        {
            layout: 'noBorders',
            headerRows: 0,
            table: {
            widths: ['15%', '30%', '15%', '40%'],
              body: [
                [
                  { text: 'Cube Name:', bold: true, margin: [0, 0, 0, 0] },
                  { text: this.data.cubeDataObject.name, bold: true, margin: [0, 0, 0, 0] },
                  { text: 'Cube Id:', bold: true, margin: [20, 0, 0, 0] },
                  { text:  `Cub-${this.data.cubeDataObject._id}` },
                ]
              ],
            },
        },
        {
          layout: TABLE_LAYOUT,
          margin: [0, 20],
          table: {
            headerRows: 1,
            widths: ['*', '20%', '*', '30%'],
            body: [
              [
                { text: 'AWB Id', alignment: 'center' },
                { text: 'Weight', alignment: 'center' },
                { text: 'Tracking Number', alignment: 'center' },
                { text: 'Description', alignment: 'center' },
              ],
              ...this.data.cubeDataObject.packages.map((item) => [
                {text: `AWB-${this.data.cubeDataObject.awbId}`, alignment: 'center'},
                { text: `${Number(item.weight).toFixed(2)}(${item.packageCalculation})`, alignment: 'center'},
                `PK-${item.trackingNo}`,
                { text: item.description, alignment: 'center' },
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
              text: `Total Package Count: ${this.data.cubeDataObject.packages.length}`,
            }
          ],
        },
      ],
      styles: {},
      defaultStyle: {
        font: 'Helvetica',
        fontSize: 11,
      },
    };

    return printer.createPdfKitDocument(definition);
  }
}

module.exports = CUBE;
