const PDFPrinter = require('pdfmake');
const moment = require('moment');
const _ = require('lodash');

const PACKAGES_PER_ROW = 6;

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

class FlightLoadSheet {
  constructor(data) {
    this.data = data;
  }

  async generate() {
    let definition = {
      pageSize: 'A4',
      pageMargins: 40,
      pageOrientation: 'portrait',
      footer: (currentPage, pageCount) => ({
        text: `Page No: ${currentPage}/${pageCount}`,
        alignment: 'right',
        margin: [0, 0, 20, 0],
        bold: true,
      }),

      content: [
        {
          stack: [
            { text: 'NINE TO FIVE IMPORT EXPORT', lineHeight: 2.0, fontSize: 14 },
            { text: '2801 NW 55th Court, Building 6W', fontSize: 10 },
            { text: 'Ft Lauderdale, FL 33309', fontSize: 10 },
            { text: 'FLIGHT LOAD SHEET', lineHeight: 2.0, fontSize: 14, margin: [0, 10, 0, 0] },
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
            widths: ['20%', '40%', '25%', '25%'],
            body: [
              [
                { text: 'Departure Date:', bold: true, margin: [0, 0, 0, 0] },
                { text: moment(this.data.departureDate).format('MM/DD/YYYY') },
                { text: 'Departure Time:', bold: true, margin: [30, 0, 0, 0] },
                { text: moment(this.data.departureDate).format('hh:mm A') },
              ],
              [
                { text: 'Carrier:', bold: true, margin: [0, 0, 0, 0] },
                { text: String(this.data.carrier) },
                { text: 'Airline Flight #:', bold: true, margin: [30, 0, 0, 0] },
                { text: String(this.data.flightNumber) },
              ],
              [
                { text: 'Flight Notes:', bold: true, margin: [0, 10, 0, 0] },
                { text: String(this.data.flightNotes || '') },
                '',
                '',
              ],
            ],
          },
        },
        ...this.data.sections.map((section) => ({
          layout: 'noBorders',
          margin: [0, 10],
          table: {
            headerRows: 0,
            // widths: ['*', '*', '*', '*', '*', '*'],
            body: [
              [
                {
                  text: `Section: ${section.name}`,
                  colSpan: PACKAGES_PER_ROW,
                  bold: true,
                  margin: [0, 0, 0, 5],
                  fontSize: 13,
                },
                ..._.times(PACKAGES_PER_ROW - 1, _.constant({})),
              ],
              ..._.chunk(section.packages, 1).map((packages) =>
                _.times(PACKAGES_PER_ROW, (i) => packages[i] || null).map((pkg) => {
                  if (pkg) {
                    return {
                      columns: [
                        {  text:`AWB-${pkg.awb}`, alignment: "left"},
                        {  text: `PK-${pkg.id}`, alignment: "center"},
                        {  text: `${Number(pkg.weight).toFixed(2)} lbs`, alignment:"center" },
                      ],
                    };
                  }
                  return {};
                }),
              ),
              [ 
                {
                  text: `Piece Count: ${section.packages.length}`,
                  bold: true,
                  colSpan: 1,
                  // alignment: 'center',
                  margin: [70, 0, 0, 0],
                  fontSize: 13,
                },{},
                {
                  text: `Section Total: ${section.packages
                    .reduce((acc, i) => acc + i.weight, 0)
                    .toFixed(2)} lbs`,
                  bold: true,
                  colSpan: 1,
                  alignment: 'center',
                  margin: [0, 0, 0, 0],
                  fontSize: 13,
                },
                {},
                {},
                {}
              ],
            ],
          },
        }
        )),
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

module.exports = FlightLoadSheet;
