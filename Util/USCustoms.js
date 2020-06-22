const PDFPrinter = require('pdfmake');
const moment = require('moment');
const _ = require('lodash');

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

class USCustoms {
  constructor(data) {
    this.data = data;
  }

  generateItem(item, natureOfGood, addressblock1, addressblock2, i) {
    //console.log("@@@@@@", i, address)
    return [
      {
        text: item.awb,
        fontSize: 11,
        alignment: 'right',
        bold: true,
        margin: [0, 5],
      },
      {
        layout: TABLE_LAYOUT,
        table: {
          headerRows: 0,
          widths: ['50%', '50%'],
          body: [
            [
              {
                margin: 4,
                stack: [
                  { text: 'Shipper Name and Address', margin: [0, 0, 0, 5] },
                  addressblock1
                ],
                rowSpan: 2,
              },
              {
                layout: 'noBorders',
                margin: 4,
                table: {
                  headerRows: 0,
                  widths: ['40%', '60%'],
                  body: [
                    [
                      {
                        stack: [
                          { text: 'Not Negotiable' },
                          { text: 'Air Waybill', fontSize: 15, bold: true, margin: [0, 10] },
                          { text: 'Issued By' },
                        ],
                      },
                      {
                        stack: [
                          'Nine To Five Import Export',
                          '2801 NW 55th Court',
                          'Building 6W',
                          'Ft Lauderdale, FL 33309',
                        ],
                        fontSize: 10,
                      },
                    ],
                  ],
                },
              },
            ],
            [
              {},
              {
                text: 'Copies 1, 2 and 3 of this Air Waybill are originals and ahve same validity.',
                margin: 2,
              },
            ],
            [
              {
                margin: 4,
                stack: [
                  { text: 'Consignee Name and Address', margin: [0, 0, 0, 5] },
                  addressblock2
                ],
              },
              {
                stack: [
                  "It is agreed that goods described herein are accepted in apparent good order and condition (except as noted) for carriage SUBJECT TO THE CONDITIONS OF CONTRACT ON THE REVERSE HEREOF, ALL GOODS MAY BE CARRIED BY ANY OTHER MEANS INCLUDING ROAD OR ANY OTHER CARRIER UNLESS SPECIFIC CONTRARY INSTRUCTIONS ARE GIVEN HEREON BY THE SHIPPER AGREES THAT THE SHIPMENT MAYBE CARRIED VIA INTERMEDIATE STOPPING PLACES WHICH THE CARRIER DEEMS APPROPRIATE THE SHIPPER'S ATTENTION IS DRAWN TO THE NOTICE CONCERNING CARRIER'S LIMITATION OF LIABILITY. Shipper may increase such limitation of liability by declaring a higher value for carriage and paying a suplemental charge if required.",
                ],
                margin: 4,
                fontSize: 6,
                alignment: 'justify',
              },
            ],
            [
              {
                stack: [
                  {
                    stack: [
                      { text: "Issuing Carrier's Agent Name and City", margin: [0, 0, 0, 5] },
                      {
                        stack: [
                          'Nine To Five Import Export',
                          '2801 NW 55th Court',
                          'Building 6W',
                          'Ft Lauderdale, FL 33309'
                        ],
                        fontSize: 10,
                      },
                    ],
                    margin: 4,
                  },
                  {
                    table: {
                      widths: ['50%', '50%'],
                      body: [
                        [
                          {
                            text: "Agent's AITA Code\n\n",
                            margin: [0, 0, 0, 5],
                            border: [false, true, true, false],
                          },
                          {
                            text: 'Account No',
                            margin: [0, 0, 0, 5],
                            border: [true, true, false, false],
                          },
                        ],
                      ],
                    },
                  },
                ],
              },
              {
                stack: [
                  { text: 'Accounting Information', margin: [0, 0, 0, 5] },
                  { text: "AWB# : "+item.accountingInformation, fontSize: 10 },
                ],
                margin: 4,
              },
            ],
            [
              {
                stack: [
                  {
                    text: 'Airport of Departure (Addr. of First Carrier) and Requested Routing',
                    margin: [0, 0, 0, 5],
                  },
                  { text: this.data.airportFrom.name, fontSize: 10 },
                ],
                margin: 4,
              },
              {
                table: {
                  widths: ['50%', '50%'],
                  body: [
                    [
                      {
                        text: 'Reference Number\n\n\n',
                        margin: [0, 0, 0, 5],
                        border: [false, false, true, false],
                      },
                      {
                        text: 'Optional Shipping Info',
                        alignment: 'center',
                        margin: [0, 0, 0, 5],
                        border: [true, false, false, false],
                      },
                    ],
                  ],
                },
              },
            ],
            [
              {
                layout: TABLE_NO_OUTER_BORDER_LAYOUT,
                table: {
                  widths: ['20%', '80%'],
                  heights: [30],
                  body: [
                    [
                      {
                        stack: [
                          { text: 'To', margin: [0, 0, 0, 5] },
                          { text: this.data.to, fontSize: 10 },
                        ],
                      },
                      {
                        stack: [
                          { text: 'By First Carrier', margin: [0, 0, 0, 5] },
                          { text: this.data.byFirstCarrier, fontSize: 10 },
                        ],
                      },
                    ],
                  ],
                },
              },
              {
                layout: {
                  ...TABLE_NO_OUTER_BORDER_LAYOUT,
                  ...TABLE_NO_PADDING,
                },
                margin: 0,
                table: {
                  widths: ['50%', '50%'],
                  body: [
                    [
                      {
                        margin: 0,
                        layout: {
                          ...TABLE_NO_OUTER_BORDER_LAYOUT,
                          ...TABLE_NO_PADDING,
                        },
                        table: {
                          widths: ['25%', '19%', '14%', '14%', '14%', '14%'],
                          heights: [15, 20],
                          body: [
                            [
                              {
                                stack: [
                                  { text: 'Currency', margin: [0, 1, 0, 5] },
                                  { text: 'USD', fontSize: 10 },
                                ],
                                alignment: 'center',
                                rowSpan: 2,
                              },
                              {
                                stack: [
                                  { text: 'CHGS\nCode', margin: [0, 1, 0, 5] },
                                  { text: '', fontSize: 10 },
                                ],
                                alignment: 'center',
                                rowSpan: 2,
                              },
                              {
                                stack: [{ text: 'WT/VAL', margin: [0, 1, 0, 0] }],
                                alignment: 'center',
                                colSpan: 2,
                              },
                              {},
                              {
                                stack: [{ text: 'Other', margin: [0, 1, 0, 0] }],
                                alignment: 'center',
                                colSpan: 2,
                              },
                              {},
                            ],
                            [
                              {},
                              {},
                              { text: 'PPD\nX', alignment: 'center', margin: [0, 1, 0, 0] },
                              { text: 'CALL', alignment: 'center', margin: [0, 1, 0, 0] },
                              { text: 'PPD\nX', alignment: 'center', margin: [0, 1, 0, 0] },
                              { text: 'CALL', alignment: 'center', margin: [0, 1, 0, 0] },
                            ],
                          ],
                        },
                      },
                      {
                        table: {
                          widths: ['50%', '50%'],
                          heights: [30],
                          body: [
                            [
                              {
                                border: [false, false, true, false],
                                stack: [
                                  {
                                    text: 'Declared Value for Charge',
                                    margin: [0, 0, 0, 5],
                                  },
                                  {
                                    text: item.declaredValueForCharge,
                                    fontSize: 10,
                                    alignment: 'center',
                                  },
                                ],
                              },
                              {
                                border: [false, false, false, false],
                                stack: [
                                  {
                                    text: 'Declared Value for Customs',
                                    margin: [0, 0, 0, 5],
                                  },
                                  {
                                    text: item.declaredValueForCustoms,
                                    fontSize: 10,
                                    alignment: 'center',
                                  },
                                ],
                              },
                            ],
                          ],
                        },
                      },
                    ],
                  ],
                },
              },
            ],
            [
              {
                stack: [
                  {
                    text: 'Airport of Destination',
                    margin: [0, 0, 0, 5],
                  },
                  { text: this.data.airportTo.name, fontSize: 10 },
                ],
                margin: 4,
              },
              {},
            ],
            [
              {
                colSpan: 2,
                margin: [2, 5, 0, 2],
                columns: [
                  {
                    width: '50%',
                    stack: [
                      {
                        text: 'Handling Information\n\n',
                        margin: [0, 0, 0, 5],
                      },
                      {
                        text:
                          'These commodities, technology or software were exported from the United States in accordance with the export Administration Regulations. Ultimate destination',
                      },
                    ],
                  },
                  {
                    width: '15%',
                    stack: [
                      {
                        text: '\n\n\n' + item.ultimateDestination,
                        margin: [0, 0, 0, 5],
                        fontSize: 10,
                        alignment: 'center',
                        bold: true,
                      },
                    ],
                  },
                  {
                    width: '20%',
                    stack: [
                      {
                        text: '\n\n\nDeversion contrary to U.S. law prohibited.',
                        margin: [0, 0, 0, 5],
                      },
                    ],
                  },
                  {
                    width: '15%',
                    stack: [
                      {
                        table: {
                          widths: ['100%'],
                          heights: [35],
                          body: [
                            [
                              {
                                border: [true, true, false, false],
                                text: 'SCI',
                                alignment: 'center',
                              },
                            ],
                          ],
                        },
                      },
                    ],
                  },
                ],
              },
              {},
            ],
            [
              {
                colSpan: 2,
                layout: TABLE_NO_OUTER_BORDER_LAYOUT,
                table: {
                  widths: [..._.times(7, _.constant('auto')), '*'],
                  heights: ['auto', 140, 'auto'],
                  headerRows: 1,
                  body: [
                    [
                      { text: 'No. Of\nPieces\nRCP', alignment: 'center' },
                      { text: 'Gross Weight', alignment: 'center' },
                      { text: 'kg\nlb', alignment: 'center' },
                      { text: 'Rate Class\nCommodity\nItem No.', alignment: 'center' },
                      { text: 'Chargeable Weight', alignment: 'center' },
                      { text: 'Total / Charge', alignment: 'center' },
                      { text: 'Total', alignment: 'center' },
                      {
                        text: 'Nature and Quantity of Goods\n(Inc. Dimensions of Volume)',
                        alignment: 'center',
                      },
                    ],
                    [
                      { text: item.pieces, border: [true, false, true, false], fontSize: 10 },
                      {
                        text: [
                          Number(item.weight).toFixed(2),
                          (Number(item.weight) / 2.20462262185).toFixed(2),
                        ].join('\n'),
                        border: [true, false, true, false],
                        fontSize: 10,
                      },
                      { text: 'L\nK', border: [true, false, true, false], fontSize: 10 },
                      { text: '', border: [true, false, true, false], fontSize: 10 },
                      {
                        text: (Number(item.weight) / 2.20462262185).toFixed(2),
                        border: [true, false, true, false],
                        fontSize: 10,
                      },
                      { text: '0.00', border: [true, false, true, false], fontSize: 10 },
                      { text: '0.00', border: [true, false, true, false], fontSize: 10 },
                      natureOfGood
                    ],
                    _.times(8, _.constant({ text: '', border: [true, false, true, false] })),
                    [
                      { text: i==0 ? this.data.totalPieces:item.pieces, border: [true, true, true, false], fontSize: 10 },
                      {
                        text: Number(i==0 ? this.data.totalWeight:item.weight).toFixed(2),
                        border: [true, true, true, false],
                        fontSize: 10,
                      },
                      { text: 'L', border: [true, true, true, false], fontSize: 10 },
                      ..._.times(5, _.constant({ text: '', border: [true, false, true, false] })),
                    ],
                  ],
                },
              },
              {},
            ],
            [
              {},
              {
                stack: [
                  {
                    text: 'Other Charges\n\n\n\n\n\n\n\n\n',
                    margin: [0, 0, 0, 5],
                  },
                  { text: '', fontSize: 10 },
                ],
                margin: 4,
              },
            ],
            [
              {},
              {
                stack: [
                  {
                    text:
                      'Shipper certifies that the particulars on he face hereof are correct and that insofar as any part of the consignment contains dangerous goods, such part is properly described by name and is in proper condition for carriage by air according to the applicable Dangerous Goods Regulations.',
                    margin: [0, 0, 0, 5],
                  },
                  { text: 'Nine To Five Import Export', fontSize: 10 },
                  { text: 'Authorized Agent: Lavonda De Gregory', fontSize: 10 },
                  {
                    canvas: [
                      {
                        type: 'line',
                        x1: 0,
                        y1: 0,
                        x2: 260,
                        y2: 0,
                        dash: { length: 2, space: 2 },
                      },
                    ],
                  },
                  {
                    text: 'Signature of Shipper or his Agent',
                    alignment: 'center',
                    margin: [0, 2, 0, 0],
                  },
                ],
                margin: 4,
              },
            ],
            [
              {},
              {
                stack: [
                  {
                    text: '\n\n',
                    margin: [0, 0, 0, 5],
                  },
                  {
                    columns: [
                      {
                        width: '28%',
                        text: moment(item.executedOnDate).format('MM/DD/YYYY'),
                        fontSize: 10,
                      },
                      { width: '30%', text: 'Fort Launderdale', fontSize: 10 },
                      { width: '40%', text: '', fontSize: 10 },
                    ],
                  },
                  {
                    margin: [0, 4, 0, 0],
                    canvas: [
                      {
                        type: 'line',
                        x1: 0,
                        y1: 0,
                        x2: 260,
                        y2: 0,
                        dash: { length: 2, space: 2 },
                      },
                    ],
                  },
                  {
                    columns: [
                      { width: '26%', text: 'Executed On (date)' },
                      { width: '30%', text: 'at (place)', alignment: 'center' },
                      { width: '44%', text: 'Signature of Issuing Carrier or its Agent' },
                    ],
                  },
                ],
                margin: 4,
              },
            ],
          ],
        },
      },
      {
        text: item.awb,
        fontSize: 11,
        alignment: 'right',
        bold: true,
        margin: [0, 5],
        pageBreak: !item.isLast ? 'after' : null,
      },
    ];
  }

  async generate() {
    let definition = {
      pageSize: 'A4',
      pageMargins: 30,
      content: [
        ..._.flatMap(this.data.items, (item, i, array) => {
          
          let natureOfGood = {text: String(item.natureOfAwb.toUpperCase()), margin:[0,10,0,5], fontSize: 11, alignment: "center" };
          let addressblock1 = {
            stack: [
              'Nine To Five Import Export',
              '2801 NW 55th Court',
              'Building 6W',
              'Ft Lauderdale, FL 33309'
            ],
            fontSize: 10,
          };
          let addressblock2 = {
            stack: [
              'Nine To Five Import Export',
              '2801 NW 55th Court',
              'Building 6W',
              'Ft Lauderdale, FL 33309'
            ],
            fontSize: 10,
          };

          if (i==0) {
            natureOfGood = { 
              stack: [
              {text: "AS PER ATTACHED MANIFEST", margin: [0,0,0,20], fontSize: 10},
              {text: "No of AWBs:      " + String(this.data.natureOfGoods.awbCount), margin:[0,0,0,5], fontSize: 10 },
              {text: "No of SEDs:      " + String(this.data.natureOfGoods.isSed), margin:[0,0,0,5], fontSize: 10 },
              {text: "No of Hazmat:   " + String(this.data.natureOfGoods.hazmat), margin:[0,0,0,5], fontSize: 10 },
              {text: "Total Weight:   " + String(this.data.totalWeight.toFixed(2)), margin:[0,0,0,5], fontSize: 10 },
              {text: "Total Pieces:   " + String(this.data.totalPieces), margin:[0,0,0,5], fontSize: 10 }
            ]
            , margin: [10,20,0,0]}
            item.consignee = {}
          }
          if (i==1) {
            natureOfGood = { 
              stack: [
              {text: "",},
              {text: "",},
              {text: "",},
              {text: "",},
            ], margin: [10,20,0,0]}
          }
          
          return this.generateItem({
            ...item,
            isLast: i === array.length - 1,
          }, natureOfGood, addressblock1, addressblock2, i)}
        ),
      ],
      styles: {},
      defaultStyle: {
        font: 'Helvetica',
        fontSize: 7,
      },
    };

    return printer.createPdfKitDocument(definition);
  }
}

module.exports = USCustoms;
