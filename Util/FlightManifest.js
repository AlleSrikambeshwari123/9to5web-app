const path = require('path');
const fs = require('fs');
const PDFPrinter = require('pdfmake');
const moment = require('moment');
const _ = require('lodash');

const TABLE_LAYOUT = {
  hLineColor: (i, node) => 'black',
  vLineColor: (i, node) => 'black',
  // paddingLeft: () => 4,
  // paddingRight: () => 4,
  // paddingTop: () => 4,
  // paddingBottom: () => 4,
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

class FlightManifest {
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
            { text: '1811 N.W. 51st Street Hnager 42D', fontSize: 10 },
            { text: 'Fort Lauderdate, Florida 33309', fontSize: 10 },
            { text: 'FLIGHT MANIFEST', lineHeight: 2.0, fontSize: 14, margin: [0, 10, 0, 0] },
          ],
          alignment: 'center',
          bold: true,
        },
        {
          text: [{ text: 'For Shipment: ', bold: true }, String(this.data.flightNumber)],
          alignment: 'center',
          margin: [0, 0, 0, 20],
        },
        {
          layout: 'noBorders',
          headerRows: 0,
          table: {
            widths: ['25%', '25%', '25%', '25%'],
            body: [
              [
                { text: 'Departure Date:', bold: true, margin: [20, 0, 0, 0] },
                { text: moment(this.data.departureDate).format('MM/DD/YYYY') },
                { text: 'Departure Time:', bold: true, margin: [20, 0, 0, 0] },
                { text: moment(this.data.departureDate).format('hh:mm A') },
              ],
              [
                { text: 'Carrier:', bold: true, margin: [20, 0, 0, 0] },
                { text: String(this.data.carrier) },
                { text: 'Airline Flight #:', bold: true, margin: [20, 0, 0, 0] },
                { text: String(this.data.flightNumber) },
              ],
            ],
          },
        },
        {
          layout: TABLE_LAYOUT,
          margin: [0, 20],
          table: {
            headerRows: 1,
            widths: ['auto', '*', 'auto', '*', 'auto'],
            body: [
              [
                { text: 'AWB #' },
                { text: 'Shipper' },
                { text: 'Package No' },
                { text: 'Consignee' },
                { text: 'Weight (lbs)', alignment: 'right' },
              ],
              ...this.data.rows.map((item) => [
                `AWB${item.awb}`,
                item.shipper.name,
                `PK${item.id}`,
                item.consignee.name,
                { text: Number(item.weight).toFixed(2), alignment: 'right' },
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
              text: `Total Piece Count: ${this.data.rows.length}`,
            },
            {
              width: '50%',
              alignment: 'center',
              bold: true,
              text: `Total Shipment Weight: ${this.data.rows
                .reduce((acc, i) => acc + i.weight, 0)
                .toFixed(2)} lbs`,
            },
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

async function test() {
  let printer = new FlightManifest({
    carrier: 'Test Carrier',
    departureDate: new Date(),
    flightNumber: 'N131J022820/2A',
    rows: [
      {
        id: 123,
        awb: 123454,
        weight: 10,
        shipper: {
          name: 'FEDEX',
        },
        consignee: {
          name: 'Vasya Pupkin',
        },
      },
      {
        id: 123,
        awb: 123454,
        weight: 10,
        shipper: {
          name: 'FEDEX',
        },
        consignee: {
          name: 'Vasya Pupkin',
        },
      },
      {
        id: 123,
        awb: 123454,
        weight: 10,
        shipper: {
          name: 'FEDEX',
        },
        consignee: {
          name: 'Vasya Pupkin',
        },
      },
    ],
  });

  let stream = await printer.generate();
  stream.pipe(fs.createWriteStream(path.resolve(__dirname, '../data/test.pdf')));
  stream.end();
}

test().catch((error) => console.error(error));

module.exports = FlightManifest;
