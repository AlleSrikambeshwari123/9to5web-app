
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
      this.generateBarcode(awb._id).then(async png => {

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
                body: await this.generatePackagesTable()
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
  async generatePackagesTable() {
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

    for (let pkg of this.awb.packages) {
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

      let barcode = await this.generateBarcode(`${this.awb.customer.pmb}-${this.awb.id}-${pkg.id}`);
      body.push([
        {
          image: 'data:image/jpeg;base64,' + barcode.toString('base64'),
          width: 150,
          alignment: 'right',
          colSpan: 6,
        },
      ]);
    }

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
          [{ text: this.awb.no, colSpan: 2 }, { text: '' }, { text: (this.awb.invoices || []).map(i => i.number).join(', '), fontSize: 9, bold: true }, { text: '' }]
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
          { text: 'Airway Bill', alignment: 'right', fontSize: 15, margin: [65, 1], bold: true },
          { image: 'data:image/jpeg;base64,' + png.toString('base64'), margin: [15, 1], width: 150, alignment: "right" },
          {
            columns: [
              {
                width: '*',
                margin: [10, 5],
                stack: [
                  { text: 'Airway Bill No:', bold: true, fontSize: 9 },
                  { margin: [0, 5], text: 'Received Date/Time:', bold: false, fontSize: 9 },
                  { margin: [0, 3], text: 'Received By:', bold: false, fontSize: 9 }
                ]
              },
              {
                width: '*',
                margin: [0, 5],
                stack: [
                  { margin: [-3, 0], text: "AWB"+this.awb.awbId, bold: true, fontSize: 11 },
                  { margin: [-1, 5], text: moment(this.awb.createdAt).format("MM/DD/YYYY hh:mm A"), bold: false, fontSize: 9 },
                  { margin: [-1, 0], text: (this.awb.createdBy && this.awb.createdBy.username) || '', bold: false, fontSize: 9 }
                ]
              }
            ]
          }
        ],
      }]
  }
  generateShiperCosigneeTable(awb) {
    // In DB some shippers have zip field instead of zipcode
    let shipperZipcode = awb.shipper.zipcode || awb.shipper.zip;
    let shipperAddress = [
      awb.shipper.name,
      awb.shipper.address,
      [awb.shipper.city, awb.shipper.state, shipperZipcode].filter(Boolean).join(', '),
    ].filter(Boolean).join('\n');

    var shipperDetails = `${shipperAddress} \n`;
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
          { margin: [5, 5], stack: [awb.customer.firstName + ' ' + awb.customer.lastName, getConsigneeAddress(awb.customer)] }]
        ]
      }
    }
  }
  generateBarcode(text) {
    return new Promise((resolve, reject) => {
      const str = text && text.toString();
      bwipjs.toBuffer({
        bcid: 'code128',
        text: str,
        scale: 5,
        height: 10,
        includetext: true,
        textxalign: 'right'
      }, (err, png) => {
        if (err) {
          reject(err);
        }
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

function getConsigneeAddress(customer) {
  let pmb = Number(customer.pmb);
  let addresses = [
    {
      pmbMin: 1,
      pmbMax: 1999,
      address: `PMB ${pmb}\nCable Beach, Nassau Bahamas`,
    },
    {
      pmbMin: 2000,
      pmbMax: 2999,
      address: `PMB ${pmb}\nVillage Road, Nassau Bahamas`,
    },
    {
      pmbMin: 3000,
      pmbMax: 3999,
      address: `PMB ${pmb}\nAlbany, Nassau Bahamas`,
    },
    {
      pmbMin: 9000,
      pmbMax: 9000,
      address: String(customer.address).trim() || `PMB ${pmb}\n.#19 Industrial Park`,
    },
  ];

  const item = addresses.find((i) => i.pmbMin <= pmb && pmb <= i.pmbMax);
  return (item && item.address) || '';
}

module.exports = AWBGeneration;