const PDFPrinter = require('pdfmake');
const moment = require('moment');
var bwipjs = require('bwip-js')
var currencyFormatter = require('currency-formatter');
var fs = require('fs');
const merge = require('easy-pdf-merge');
var path = require('path');



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

class AirCargoManifest {
    constructor(data) {
        this.data = data;
    }

    async generateAwb (){
        let datetime = (new Date()).getTime();

        let definition = {
            pageSize: 'A4',
            pageMargins: 20,
            footer: (currentPage, pageCount) => ({
                text: '',//`${currentPage}/${pageCount}`,
                alignment: 'right',
                margin: [0, 0, 20, 0],
            }),

            content: [{
                    columns: [{
                            width: '30%',
                            stack: [{
                                stack: [
                                    { text: 'Nine To Five Import Export', bold: true },
                                    { text: '2801 NW 55th Court', margin: [0, 10, 0, 0] },
                                    'Building 6W',
                                    'Ft Lauderdale, FL 33309',
                                    'UNITED STATES',
                                    'Tel: 954-958-9970, Fax:954-958-9071',
                                ],
                            }, ],
                        },
                        {
                            width: '40%',
                            text: 'Air Cargo Manifest'.toUpperCase(),
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
                        widths: ['auto', 'auto', 20, 'auto', 'auto', 'auto', 'auto'],
                        body: [
                            [{
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
                                        { text: '3. Marks Of Nationality and Registration', fontSize: 9 },
                                        {
                                            text: String(this.data.marksOfNationalityAndRegistration),
                                            fontSize: 12,
                                            bold: true,
                                        },
                                    ],
                                    colSpan: 2,
                                },
                                {},
                                {
                                    stack: [
                                        { text: '4. Flight No', fontSize: 9 },
                                        { text: String(this.data.flightNumber), fontSize: 12, bold: true },
                                    ],
                                },
                            ],
                            [{
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
                                { text: "AWB#" + pkg.awb, alignment: 'center', bold: pkg.isInvoice ? true : false },
                                { text: pkg.pieces, alignment: 'center', bold: pkg.isInvoice ? true : false },
                                { text: pkg.weight.toFixed(2), alignment: 'center', bold: pkg.isInvoice ? true : false },
                                { text: convertLbsToKg(pkg.weight).toFixed(2), alignment: 'center', bold: pkg.isInvoice ? true : false },
                                { text: [pkg.shipper.name, pkg.shipper.address], bold: pkg.isInvoice ? true : false },
                                { text: [pkg.consignee.name, pkg.consignee.address], bold: pkg.isInvoice ? true : false },
                                { text: pkg.natureOfGoods + (pkg.isInvoice ? '*' : ''), bold: pkg.isInvoice ? true : false },
                            ]),
                        ],
                    },
                },
                {
                    columns: [{
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

        let otherDefinition;
        otherDefinition = {
            footer: this.generateFooter,
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
            content: [{
                    columns: [{
                            width: '30%',
                            stack: [{
                                stack: [
                                    { text: 'Nine To Five Import Export', bold: true },
                                    { text: '2801 NW 55th Court', margin: [0, 10, 0, 0] },
                                    'Building 6W',
                                    'Ft Lauderdale, FL 33309',
                                    'UNITED STATES',
                                    'Tel: 954-958-9970, Fax:954-958-9071',
                                ],
                            }, ],
                        },
                        {
                            width: '40%',
                            text: 'Air Cargo Manifest'.toUpperCase(),
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
                            [{
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
                                        { text: '3. Marks Of Nationality and Registration', fontSize: 9 },
                                        {
                                            text: String(this.data.marksOfNationalityAndRegistration),
                                            fontSize: 12,
                                            bold: true,
                                        },
                                    ],
                                    colSpan: 2,
                                },
                                {},
                                {
                                    stack: [
                                        { text: '4. Flight No', fontSize: 9 },
                                        { text: String(this.data.flightNumber), fontSize: 12, bold: true },
                                    ],
                                },
                            ],
                            [{
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
                                { text: "AWB#" + pkg.awb, alignment: 'center', bold: pkg.isInvoice ? true : false },
                                { text: pkg.pieces, alignment: 'center', bold: pkg.isInvoice ? true : false },
                                { text: pkg.weight.toFixed(2), alignment: 'center', bold: pkg.isInvoice ? true : false },
                                { text: convertLbsToKg(pkg.weight).toFixed(2), alignment: 'center', bold: pkg.isInvoice ? true : false },
                                { text: [pkg.shipper.name, pkg.shipper.address], bold: pkg.isInvoice ? true : false },
                                { text: [pkg.consignee.name, pkg.consignee.address], bold: pkg.isInvoice ? true : false },
                                { text: pkg.natureOfGoods + (pkg.isInvoice ? '*' : ''), bold: pkg.isInvoice ? true : false },
                            ]),
                        ],
                    },
                },
                {
                    columns: [{
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
                            pageBreak: 'after'
                        },
                    ],
                },
            ],
            //pageBreakBefore: true,
            defaultStyle: {
                font: 'Helvetica',
                fontSize: 11
            },
        }

        return printer.createPdfKitDocument(definition);
    }

    async generate() {

        let datetime = (new Date()).getTime();

        let definition = {
            pageSize: 'A4',
            pageMargins: 20,
            footer: (currentPage, pageCount) => ({
                text: '',//`${currentPage}/${pageCount}`,
                alignment: 'right',
                margin: [0, 0, 20, 0],
            }),

            content: [{
                    columns: [{
                            width: '30%',
                            stack: [{
                                stack: [
                                    { text: 'Nine To Five Import Export', bold: true },
                                    { text: '2801 NW 55th Court', margin: [0, 10, 0, 0] },
                                    'Building 6W',
                                    'Ft Lauderdale, FL 33309',
                                    'UNITED STATES',
                                    'Tel: 954-958-9970, Fax:954-958-9071',
                                ],
                            }, ],
                        },
                        {
                            width: '40%',
                            text: 'Air Cargo Manifest'.toUpperCase(),
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
                        widths: ['auto', 'auto', 20, 'auto', 'auto', 'auto', 'auto'],
                        body: [
                            [{
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
                                        { text: '3. Marks Of Nationality and Registration', fontSize: 9 },
                                        {
                                            text: String(this.data.marksOfNationalityAndRegistration),
                                            fontSize: 12,
                                            bold: true,
                                        },
                                    ],
                                    colSpan: 2,
                                },
                                {},
                                {
                                    stack: [
                                        { text: '4. Flight No', fontSize: 9 },
                                        { text: String(this.data.flightNumber), fontSize: 12, bold: true },
                                    ],
                                },
                            ],
                            [{
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
                                { text: "AWB#" + pkg.awb, alignment: 'center', bold: pkg.isInvoice ? true : false },
                                { text: pkg.pieces, alignment: 'center', bold: pkg.isInvoice ? true : false },
                                { text: pkg.weight.toFixed(2), alignment: 'center', bold: pkg.isInvoice ? true : false },
                                { text: convertLbsToKg(pkg.weight).toFixed(2), alignment: 'center', bold: pkg.isInvoice ? true : false },
                                { text: [pkg.shipper.name, pkg.shipper.address], bold: pkg.isInvoice ? true : false },
                                { text: [pkg.consignee.name, pkg.consignee.address], bold: pkg.isInvoice ? true : false },
                                { text: pkg.natureOfGoods + (pkg.isInvoice ? '*' : ''), bold: pkg.isInvoice ? true : false },
                            ]),
                        ],
                    },
                },
                {
                    columns: [{
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

        let otherDefinition;
        otherDefinition = {
            footer: this.generateFooter,
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
            content: [{
                    columns: [{
                            width: '30%',
                            stack: [{
                                stack: [
                                    { text: 'Nine To Five Import Export', bold: true },
                                    { text: '2801 NW 55th Court', margin: [0, 10, 0, 0] },
                                    'Building 6W',
                                    'Ft Lauderdale, FL 33309',
                                    'UNITED STATES',
                                    'Tel: 954-958-9970, Fax:954-958-9071',
                                ],
                            }, ],
                        },
                        {
                            width: '40%',
                            text: 'Air Cargo Manifest'.toUpperCase(),
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
                            [{
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
                                        { text: '3. Marks Of Nationality and Registration', fontSize: 9 },
                                        {
                                            text: String(this.data.marksOfNationalityAndRegistration),
                                            fontSize: 12,
                                            bold: true,
                                        },
                                    ],
                                    colSpan: 2,
                                },
                                {},
                                {
                                    stack: [
                                        { text: '4. Flight No', fontSize: 9 },
                                        { text: String(this.data.flightNumber), fontSize: 12, bold: true },
                                    ],
                                },
                            ],
                            [{
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
                                { text: "AWB#" + pkg.awb, alignment: 'center', bold: pkg.isInvoice ? true : false },
                                { text: pkg.pieces, alignment: 'center', bold: pkg.isInvoice ? true : false },
                                { text: pkg.weight.toFixed(2), alignment: 'center', bold: pkg.isInvoice ? true : false },
                                { text: convertLbsToKg(pkg.weight).toFixed(2), alignment: 'center', bold: pkg.isInvoice ? true : false },
                                { text: [pkg.shipper.name, pkg.shipper.address], bold: pkg.isInvoice ? true : false },
                                { text: [pkg.consignee.name, pkg.consignee.address], bold: pkg.isInvoice ? true : false },
                                { text: pkg.natureOfGoods + (pkg.isInvoice ? '*' : ''), bold: pkg.isInvoice ? true : false },
                            ]),
                        ],
                    },
                },
                {
                    columns: [{
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
                            pageBreak: 'after'
                        },
                    ],
                },
            ],
            //pageBreakBefore: true,
            defaultStyle: {
                font: 'Helvetica',
                fontSize: 11
            },
        }

        var doc = printer.createPdfKitDocument(definition);
        var mainFilePath = path.resolve(process.cwd(), `airCaroDownload/${this.data._id}_${datetime}_main.pdf`)
        doc.pipe(await fs.createWriteStream(mainFilePath));
        doc.end();
        if(this.data.awbsArray.length == 0){
            var docs = printer.createPdfKitDocument(definition);
            let acmPdf = path.resolve(process.cwd(), `airCaroDownload/${this.data._id}-ACM.pdf`)
            merge([mainFilePath, mainFilePath], path.resolve(process.cwd(), `airCaroDownload/${this.data._id}-ACM-${datetime}.pdf`), async(err) => {
                if (err) {
                    return console.log(err)
                }
                this.removefile(mainFilePath);
            });
            return {id : this.data._id,stream : docs}
        }

        var dynamicAWBFilesPath = [];
        await Promise.all(
            this.data.awbsArray.map(async(awb, ind) => {
                let invoiceFilePath = [];
                this.data.invoicesArray.map((singleInvoice) => {
                    if((singleInvoice.awbId).toString() == (awb._id).toString() && singleInvoice.isFile) {
                        invoiceFilePath.push(singleInvoice.filePath);
                    }
                })

                
                if(invoiceFilePath.length === 0) {
                    dynamicAWBFilesPath.push({
                        awbFilePath : path.resolve(process.cwd(), `airCaroDownload/${this.data._id}_${ind}_${datetime}_awb.pdf`)
                    }); 
                } else {                    
                    invoiceFilePath.map((d, i) => {
                        dynamicAWBFilesPath.push({
                            awbFilePath : i == 0 ? path.resolve(process.cwd(), `airCaroDownload/${this.data._id}_${ind}_${datetime}_awb.pdf`) : null,
                            invoiceFilePath : d
                        });
                    })
                }
                let png = await this.generateBarcode(awb._id)
                let shipplerCosignee = await this.generateShiperCosigneeTable(awb);
                let generateCarrierandShipper = await this.generateCarrierandShipper(awb)
                let generatePackagesTable = await this.generatePackagesTable(awb);
                otherDefinition.content = [];
                otherDefinition.content.push({
                        columns: await this.generateHeader(png, awb)
                    },
                    shipplerCosignee,
                    generateCarrierandShipper, {
                        layout: 'lightHorizontallines',
                        margin: [0, 10],
                        table: {
                            headerRows: 2,
                            widths: [40, 80, 90, 80, 80, 80],
                            body: generatePackagesTable
                        }
                    }
                )
                var doc = await printer.createPdfKitDocument(otherDefinition);
                doc.pipe(await fs.createWriteStream(path.resolve(process.cwd(), `airCaroDownload/${this.data._id}_${ind}_${datetime}_awb.pdf`)));
                doc.end();
            }));
            
        return new Promise((resolve, reject) => {
           
            var mainArray = [];
            if(mainFilePath){
                mainArray.push(mainFilePath) 
            }
            for(var i=0;i<dynamicAWBFilesPath.length;i++){
                //&& dynamicAWBFilesPath[i].invoiceFilePath
                if(dynamicAWBFilesPath[i].awbFilePath ){
                    mainArray.push(dynamicAWBFilesPath[i].awbFilePath)                
                    //mainArray.push(dynamicAWBFilesPath[i].invoiceFilePath)
                }
            }
           /* for(var i=0;i<dynamicAWBFilesPath.length;i++){
                if(dynamicAWBFilesPath[i].invoiceFilePath){
                    mainArray.push(dynamicAWBFilesPath[i].invoiceFilePath)
                }
            }*/
            var idm = this.data._id;
            merge(mainArray, path.resolve(process.cwd(), `airCaroDownload/${this.data._id}-ACM.pdf`), function (err) {
                if(err){
                    console.log(err);
                }
                console.log(mainArray);
                console.log('Successfully merged!')
                resolve(path.resolve(process.cwd(), `airCaroDownload/${idm}-ACM.pdf`))
            })
            //return resolve(dynamicAWBFilesPath);
            //this.processCombinePdf(dynamicAWBFilesPath[0], dynamicAWBFilesPath, 0, this.data._id, resolve, reject, mainFilePath);
        })
    }

    processCombinePdf(singleFilePath, dynamicAWBFilesPath, i, id, resolve, reject, mainFilePath) {
        i++;
        if (i > dynamicAWBFilesPath.length) {
            console.log("Final file process done")
            return resolve(path.resolve(process.cwd(), `airCaroDownload/${id}-ACM.pdf`));
        } else {
            if (mainFilePath) {
                merge([mainFilePath, singleFilePath.awbFilePath], path.resolve(process.cwd(), `airCaroDownload/${id}-ACM.pdf`), async(err) => {
                    if (err) {
                        return console.log(err)
                    }
                    this.removefile(mainFilePath);
                    this.removefile(singleFilePath.awbFilePath);
                    if(singleFilePath.invoiceFilePath) {
                        merge([path.resolve(process.cwd(), `airCaroDownload/${id}-ACM.pdf`), singleFilePath.invoiceFilePath], path.resolve(process.cwd(), `airCaroDownload/${id}-ACM.pdf`), (err) => {
                            if (err) {
                                return console.log(err)
                            }
                            this.removefile(singleFilePath.invoiceFilePath);
                            this.processCombinePdf(dynamicAWBFilesPath[i], dynamicAWBFilesPath, i, id, resolve, reject)
                        });
                    } else {
                        this.processCombinePdf(dynamicAWBFilesPath[i], dynamicAWBFilesPath, i, id, resolve, reject)
                    }
                });
            } else {
                merge([path.resolve(process.cwd(), `airCaroDownload/${id}-ACM.pdf`), singleFilePath.awbFilePath ? singleFilePath.awbFilePath : singleFilePath.invoiceFilePath], path.resolve(process.cwd(), `airCaroDownload/${id}-ACM.pdf`), async(err) => {
                    if (err) {
                        return console.log(err)
                    }
                    this.removefile(singleFilePath.awbFilePath ? singleFilePath.awbFilePath : singleFilePath.invoiceFilePath);
                    if(singleFilePath.invoiceFilePath && singleFilePath.awbFilePath) {
                        merge([path.resolve(process.cwd(), `airCaroDownload/${id}-ACM.pdf`), singleFilePath.invoiceFilePath], path.resolve(process.cwd(), `airCaroDownload/${id}-ACM.pdf`), (err) => {
                            if (err) {
                                return console.log(err)
                            }
                            this.removefile(singleFilePath.invoiceFilePath);
                            this.processCombinePdf(dynamicAWBFilesPath[i], dynamicAWBFilesPath, i, id, resolve, reject)
                        });
                    } else {
                        this.processCombinePdf(dynamicAWBFilesPath[i], dynamicAWBFilesPath, i, id, resolve, reject)
                    }
                });
            }
        }
    }

    removefile(filePath) {
        fs.unlink(filePath, (d)=>{})
    }


    generateCarrierandShipper(awb) {
        var notes = ""
        var express = ""
        var po = ""
        if (awb.po)
            po = awb.po;
        if (awb.note)
            notes = awb.note;
        if (awb.express)
            express = awb.express
        return {
            layout: 'lightHorizontallines',
            margin: [0, 10],
            table: {
                headerRows: 1,
                widths: ['*', '*', '*', '*'],
                body: [
                    [{ margin: [1, 1], text: "Inland Carrier and Shipper Information", colSpan: 4, alignment: 'center', fillColor: '#cccccc', bold: true }, '', '', ''],
                    [{ text: 'Carrier Name:' }, { text: awb.carrier.name }, { text: 'P.O. Number (Nine to Five)' }, { text: po }],
                    [{ text: 'Express:' }, { text: express }, { text: 'MAWB#' }, { text: '' }],
                    [{ text: 'Notes:', colSpan: 2, bold: true }, { text: notes }, { text: 'External Invoice No', bold: true }, { text: 'External PO', bold: true }],
                    [{ text: awb.no, colSpan: 2 }, { text: '' }, { text: (awb.invoices || []).map(i => i.number).join(', '), fontSize: 9, bold: true }, { text: '' }]
                ]
            }
        }
    }
    generateHeader(png, awb) {
        return [{
                width: '*',
                stack: [
                    { text: 'Nine To Five Import Export \n', fontSize: 15, bold: true },
                    { text: '2801 NW 55th Court \r\n', fontSize: 11, margin: [5, 1] },
                    { text: 'Building 6W\r\n', fontSize: 11, margin: [5, 1] },
                    { text: 'Ft Lauderdale, FL 33309\r\n', fontSize: 11, margin: [5, 1] },
                    { text: 'UNITED STATES \r\n', fontSize: 11, margin: [5, 1] },
                    { text: 'Tel: 954-958-9970, Fax:954-958-9071', fontSize: 11, margin: [5, 1] }
                ]
            },
            {
                width: '*',
                stack: [
                    { text: 'Airway Bill', alignment: 'right', fontSize: 15, margin: [65, 1], bold: true },
                    { image: 'data:image/jpeg;base64,' + png.toString('base64'), margin: [15, 1], width: 150, alignment: "right" },
                    {
                        columns: [{
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
                                    { margin: [-3, 0], text: "AWB" + awb.awbId, bold: true, fontSize: 11 },
                                    { margin: [-1, 5], text: moment(awb.createdAt).format("MM/DD/YYYY hh:mm A"), bold: false, fontSize: 9 },
                                    { margin: [-1, 0], text: (awb.createdBy && awb.createdBy.username) || '', bold: false, fontSize: 9 }
                                ]
                            }
                        ]
                    }
                ],
            }
        ]
    }
    generateShiperCosigneeTable(awb) {
        // In DB some shippers have zip field instead of zipcode
        let shipperZipcode = awb.shipper.zipcode || awb.shipper.zip;
        let shipperAddress = [
            awb.shipper.name,
            awb.shipper.address, [awb.shipper.city, awb.shipper.state, shipperZipcode].filter(Boolean).join(', '),
        ].filter(Boolean).join('\n');

        var shipperDetails = `${ shipperAddress }\n `;
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
                        { margin: [1, 1], text: "Consignee Information", fillColor: '#cccccc' }
                    ],
                    [{ margin: [5, 5], stack: [shipperDetails, ""] },
                        { margin: [5, 5], stack: [awb.customer.firstName + ' ' + awb.customer.lastName, getConsigneeAddress(awb.customer)] }
                    ]
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
                } else resolve(png);
            });
        });
    }
    generateFooter(currentPage, pageCount) {
        //return { text: "Page No: " + currentPage.toString() + '/' + pageCount, alignment: 'right', margin: [50, 10] }
        return { text: '', alignment: 'right', margin: [50, 10] }
    }

    async generatePackagesTable(awb) {
        let body = [
                [{ text: "Pcs", fillColor: "#cccccc" },
                    { text: "Package", fillColor: "#cccccc" },
                    { text: "Dimensions", fillColor: "#cccccc" },
                    { text: "Description", fillColor: "#cccccc" },
                    { text: "Weight", fillColor: "#cccccc" },
                    { text: "Volume", fillColor: "#cccccc" }
                ],
                [{ text: "Quantity", fillColor: "#cccccc", colSpan: 2 }, "",
                    { text: "Invoice Number", fillColor: "#cccccc" },
                    { text: "Notes", fillColor: "#cccccc" }, "",
                    { text: "Volume Weight", fillColor: "#cccccc" }
                ]
            ]
            //add packages here 
        var totalWeight = 0;
        var totaldimWeight = 0;

        for (let pkg of awb.packages) {
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
                { text: pkg.weight.toFixed(2) + " lbs" },
                { text: dimWeight }
            ])

            let barcode = await this.generateBarcode(`${ pkg.trackingNo }`);
            body.push([{
                image: 'data:image/jpeg;base64,' + barcode.toString('base64'),
                width: 150,
                lineHeight: 50,
                height: 25,
                alignment: 'right',
                colSpan: 6,
            }, ]);
        }

        var dimw = currencyFormatter.format(totaldimWeight, {
                symbol: '',
                decimal: '.',
                thousand: ',',
                precision: 2,
                format: '%v %s' // %s is the symbol and %v is the value
            })
            // console.log(totaldimWeight)
        body.push([
            { margin: [0, 5], text: "Received by Signature:_________________________", fillColor: "", colSpan: 3, rowSpan: 2 }, "",
            { text: "" },
            { text: "Pieces", fillColor: "#cccccc" }, "Weight",
            { text: "Volume", fillColor: "#cccccc" }
        ])
        body.push([
            { text: "", fillColor: "", colSpan: 3 }, "",
            { text: "" },
            { text: awb.packages.length, },
            totalWeight.toFixed(2),
            { text: dimw }
        ])
        return body;
    }
}

function calculateDimensionalWeight(dimensions) {
    var dimensionparts = dimensions.split('x');
    var numerator = 1;
    dimensionparts.forEach(part => numerator *= Number(part.trim()));
    var dimWeight = numerator / 166;
    return Number(dimWeight).formatMoney(2, '.', ',')
}

function getConsigneeAddress(customer) {
    let pmb = Number(customer.pmb);
    let addresses = [{
            pmbMin: 1,
            pmbMax: 1999,
            address: `PMB ${ pmb }\n Cable Beach, Nassau Bahamas `,
        },
        {
            pmbMin: 2000,
            pmbMax: 2999,
            address: `PMB ${ pmb }\n Village Road, Nassau Bahamas `,
        },
        {
            pmbMin: 3000,
            pmbMax: 3999,
            address: `PMB ${ pmb }\n Albany, Nassau Bahamas `,
        },
        {
            pmbMin: 9000,
            pmbMax: 9000,
            address: String(customer.address).trim() || `PMB ${ pmb }\n .#19 Industrial Park`,
        },
    ];

    const item = addresses.find((i) => i.pmbMin <= pmb && pmb <= i.pmbMax);
    return (item && item.address) || '';
}

module.exports = AirCargoManifest;
module.exports = AirCargoManifest;