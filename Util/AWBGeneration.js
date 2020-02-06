
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
var currencyFormatter = require('currency-formatter');
var printer = new PdfPrinter(fonts);
var fs = require('fs');
var bwipjs = require('bwip-js')
var moment = require('moment');

class AWBGeneration {
  constructor() {
    this.awb = {}
  }

  generateAWb(awb) {
    this.awb = awb;
    return new Promise((resolve, reject) => {
      this.generateBarcode(awb.id).then(png => {
        var docDefinition = {
          footer: this.generateFooter,
          content: [
            {
              columns: this.generateHeader(png)
            },
            this.generateShiperCosigneeTable(awb),
            this.generateCarrierandShipper(),
            {
              layout: 'lightHorizontallines',
              margin: [0, 10],
              table: {
                headerRows: 2,
                widths: ["*", "*", "*", "*", "*", "*"],
                body: this.generatePackagesTable()
              }
            }
          ],
          styles: {
            header: {
              fontSize: 18,
              bold: true,
              margin: [0, 0, 0, 10]
            },
            subheader: {
              fontSize: 16,
              bold: true,
              margin: [0, 10, 0, 5]
            },
            tableExample: {
              margin: [0, 5, 0, 15]
            },
            tableHeader: {
              bold: true,
              fontSize: 13,
              color: 'black',
              fillColor: "#cccccc"
            }
          },
          defaultStyle: {
            font: 'Helvetica',
            fontSize: 11
          },
        };
        var filestream;
        var filename = '/awb.' + awb.id + '.pdf';
        var filepath = global.uploadRoot + filename;
        var pdfDoc = printer.createPdfKitDocument(docDefinition);
        pdfDoc.pipe(filestream = fs.createWriteStream(filepath));
        pdfDoc.end();
        filestream.on('finish', async function () {
          resolve({ filename: filename, path: filepath })
        })
      })
    })
  }
  generatePackagesTable() {
    let body = [
      [{ text: "Pcs", fillColor: "#cccccc" },
      { text: "Package", fillColor: "#cccccc" },
      { text: "Dimensions", fillColor: "#cccccc" },
      { text: "Description", fillColor: "#cccccc" },
      { text: "Weight", fillColor: "#cccccc" },
      { text: "Volume", fillColor: "#cccccc" }],
      [{ text: "Quantity", fillColor: "#cccccc", colSpan: 2 }, "",
      { text: "Invoice Number", fillColor: "#cccccc" },
      { text: "Notes", fillColor: "#cccccc" }, "",
      { text: "Volume Weight", fillColor: "#cccccc" }]
    ]
    //add packages here 
    var totalWeight = 0;
    var totaldimWeight = 0;

    this.awb.packages.forEach(pkg => {
      var ptype = "Box"
      if (pkg.packageType) {
        ptype = pkg.packageType;
      }
      var dimWeight = calculateDimensionalWeight(pkg.dimensions.toLowerCase())
      totalWeight += Number(pkg.weight)
      totaldimWeight += Number(dimWeight);
      body.push([
        { text: ptype, colSpan: 2 }, "",
        { text: pkg.dimensions },
        { text: pkg.description },
        { text: pkg.weight + " lbs" },
        { text: dimWeight }
      ])
    });
    var dimw = currencyFormatter.format(totaldimWeight, {
      symbol: '',
      decimal: '.',
      thousand: ',',
      precision: 2,
      format: '%v %s' // %s is the symbol and %v is the value
    })
    console.log(totaldimWeight)
    body.push([
      { margin: [0, 5], text: "Received by Signature:_________________________", fillColor: "", colSpan: 3, rowSpan: 2 }, "",
      { text: "" },
      { text: "Pieces", fillColor: "#cccccc" }, "Weight",
      { text: "Volume", fillColor: "#cccccc" }
    ])
    body.push([
      { text: "", fillColor: "", colSpan: 3 }, "",
      { text: "" },
      { text: this.awb.packages.length, }, totalWeight,
      { text: dimw }
    ])
    return body;
  }
  generateCarrierandShipper() {
    var notes = ""
    var express = ""
    var po = ""
    if (this.awb.po)
      po = this.awb.po;
    if (this.awb.note)
      notes = this.awb.note;
    if (this.awb.express)
      express = this.awb.express
    return {
      layout: 'lightHorizontallines',
      margin: [0, 10],
      table: {
        headerRows: 1,
        widths: ['*', '*', '*', '*'],
        body: [
          [{ margin: [1, 1], text: "Inland Carrier and Shipper Information", colSpan: 4, alignment: 'center', fillColor: '#cccccc', bold: true }, '', '', ''],
          [{ text: 'Carrier Name:' }, { text: this.awb.carrier.name }, { text: 'P.O. Number (Nine to Five)' }, { text: po }],
          [{ text: 'Express:' }, { text: express }, { text: 'MAWB#' }, { text: '' }],
          [{ text: 'Notes:', colSpan: 2, bold: true }, { text: notes }, { text: 'External Invoice No', bold: true }, { text: 'External PO', bold: true }],
          [{ text: this.awb.no, colSpan: 2 }, { text: '' }, { text: this.awb.invoiceNumber, fontSize: 9, bold: true }, { text: '' }]
        ]
      }
    }
  }
  generateHeader(png) {
    return [
      {
        width: '*',
        stack: [
          { text: 'Nine To Five Import Export \n', fontSize: 15, bold: true },
          { text: '1181 NW 51st St.\r\n', fontSize: 11, margin: [5, 1] },
          { text: 'Hanger 42D\r\n', fontSize: 11, margin: [5, 1] },
          { text: 'Ft. Lauderdate, FL 33309\r\n', fontSize: 11, margin: [5, 1] },
          { text: 'UNITED STATES \r\n', fontSize: 11, margin: [5, 1] },
          { text: 'Tel: 954-958-9970, Fax:954-958-9701', fontSize: 11, margin: [5, 1] }
        ]
      },
      {
        width: '*',
        stack: [
          { text: 'Airway Bill', alignment: 'right', fontSize: 15, bold: true },
          { image: 'data:image/jpeg;base64,' + png.toString('base64'), width: 150, alignment: "right" },
          {
            columns: [
              {
                width: '*',
                margin: [30, 5],
                stack: [
                  { text: 'Airway Bill No:', bold: true, fontSize: 9 },
                  { margin: [0, 2], text: 'Received Date/Time:', bold: false, fontSize: 9 },
                  { margin: [0, 2], text: 'Received By:', bold: false, fontSize: 9 }
                ]
              },
              {
                width: '*',
                margin: [0, 5],
                stack: [
                  { text: this.awb.id, bold: true, fontSize: 11 },
                  { margin: [0, 5], text: moment.unix(this.awb.dateCreated).format("MM/DD/YYYY hh:mm A"), bold: false, fontSize: 9 },
                  { margin: [0, 3], text: this.awb.created_by, bold: false, fontSize: 9 }
                ]
              }
            ]
          }
        ],
      }]
  }
  generateShiperCosigneeTable(awb) {
    var shipperDetails = `${awb.shipper.name} \n`;
    if (awb.shipper.address)
      shipperDetails += awb.shipper.address + "\n"
    if (awb.shipper.state)
      shipperDetails += awb.shipper.state + "\n"
    if (awb.shipper.zipcode)
      shipperDetails += awb.shipper.zipcode + "\n"
    if (awb.shipper.taxId)
      shipperDetails += "TAX ID: " + awb.shipper.taxId + "\n"
    return {
      layout: 'lightHorizontallines',
      margin: [0, 20],
      table: {
        headerRows: 1,
        widths: ['*', "*"],
        body: [
          [{ margin: [1, 1], text: "Shipper Information", fillColor: "#cccccc" },
          { margin: [1, 1], text: "Consignee Information", fillColor: '#cccccc' }],
          [{ margin: [5, 5], stack: [shipperDetails, ""] },
          { margin: [5, 5], stack: [awb.customer.firstName + ' ' + awb.customer.lastName, awb.customer.pmb, awb.customer.address] }]
        ]
      }
    }
  }
  generateBarcode(text) {
    return new Promise((resolve, reject) => {
      bwipjs.toBuffer({
        bcid: 'code39',
        text,
        scale: 5,
        height: 10,
        includetext: true,
        textxalign: 'right'
      }, (err, png) => {
        if (err) reject(err);
        else resolve(png);
      });
    });
  }
  generateFooter(currentPage, pageCount) {
    return { text: "Page No: " + currentPage.toString() + '/' + pageCount, alignment: 'right', margin: [50, 10] }
  }

}
function calculateDimensionalWeight(dimensions) {
  var dimensionparts = dimensions.split('x');
  var numerator = 1;
  dimensionparts.forEach(part => numerator *= Number(part.trim()));
  var dimWeight = numerator / 139;
  return Number(dimWeight).formatMoney(2, '.', ',')
}

module.exports = AWBGeneration;