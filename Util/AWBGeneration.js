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
var services = require('../Services/RedisDataServices');
var aws = require('../Util/aws')
var fetch = require('node-fetch')
var toPdf = require("office-to-pdf");
const imagesToPdf = require("images-to-pdf");
var path = require('path');
const merge = require('easy-pdf-merge');

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
                    content: [{
                            columns: this.generateHeader(png)
                        },
                        this.generateShiperCosigneeTable(awb),
                        this.generateCarrierandShipper(),
                        {
                            layout: 'lightHorizontallines',
                            margin: [0, 10],
                            table: {
                                headerRows: 2,
                                widths: ["*", "*", "*", 80, "*", "*"],
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
                filestream.on('finish', async function() {
                    resolve({ filename: filename, path: filepath })
                })
            })
        })
    }

    async getPdfArrayAirCargo(flightManifest,manifestId,packages){
        return new Promise(async(resolve,reject)=>{
            let pdfArray = []
            let pdfDoc = await flightManifest.generateAwb();

             var filestream;
            var filename = '/'+manifestId +'-ACM'+ '.pdf';
            var filepath = global.uploadRoot + filename;
            pdfDoc.pipe((filestream = fs.createWriteStream(filepath)));
            pdfDoc.end();
            let obj = await this.getFileStream(filestream,filepath,filename)
            pdfArray.push(obj);

             let awbArray = []
            for(let pkg of packages){
                await services.printService.getAWBHistoryDataForAllRelatedEntities(pkg.awbId._id).then(async(awb) => {
                    let priceLabelAwb  =  await services.AwbPriceLabelService.getPriceLabel(awb._id)
                    let flag = 0
                    for(let arr of awbArray){
                        if(String(arr) == String(awb._id))
                            flag = 1
                    }
                    if(flag == 0){
                        awbArray.push(awb._id)
                        if(priceLabelAwb){
                            awb.express = priceLabelAwb.Express
                        }
                        let responses = await this.generateAWbPrint(awb)
                        let filestream;
                        let filename = '/'+awb._id +'-AWB'+ '.pdf';
                        let filepath = global.uploadRoot + filename;
                        responses.pipe((filestream = fs.createWriteStream(filepath)));
                        responses.end();
                        let awbRes = await this.getFileStream(filestream,filepath,filename)
                        pdfArray.push(awbRes)
                        // for(let invoice of awb.invoices){
                        //     if(invoice.filename){
                        //         await this.invoiceResult(invoice).then(async(arr)=>{
                        //             console.log('arr',arr)
                        //             if(arr.success){
                        //                 pdfArray.push(arr)
                        //             }
                        //         })
                        //     }
                        // }
                    }
    			})
            }
            resolve(pdfArray)
        })
    }

    async getPdfArray(flightManifest,manifestId,packages){
        return new Promise(async(resolve,reject)=>{
            let pdfArray = []
            let pdfDoc = await flightManifest.generate();

             var filestream;
            var filename = '/'+manifestId +'-FM'+ '.pdf';
            var filepath = global.uploadRoot + filename;
            pdfDoc.pipe((filestream = fs.createWriteStream(filepath)));
            pdfDoc.end();
            let obj = await this.getFileStream(filestream,filepath,filename)
            pdfArray.push(obj);

             let awbArray = []
            for(let pkg of packages){
                await services.printService.getAWBHistoryDataForAllRelatedEntities(pkg.awbId._id).then(async(awb) => {
                    let priceLabelAwb  =  await services.AwbPriceLabelService.getPriceLabel(awb._id)
                    let flag = 0
                    for(let arr of awbArray){
                        if(String(arr) == String(awb._id))
                            flag = 1
                    }
                    if(flag == 0){
                        awbArray.push(awb._id)
                        if(priceLabelAwb){
                            awb.express = priceLabelAwb.Express
                        }
                        let responses = await this.generateAWbPrint(awb)
                        let filestream;
                        let filename = '/'+awb._id +'-AWB'+ '.pdf';
                        let filepath = global.uploadRoot + filename;
                        responses.pipe((filestream = fs.createWriteStream(filepath)));
                        responses.end();
                        let awbRes = await this.getFileStream(filestream,filepath,filename)
                        pdfArray.push(awbRes)
                        for(let invoice of awb.invoices){
                            if(invoice.filename){
                                await this.invoiceResult(invoice).then(async(arr)=>{
                                    console.log('arr',arr)
                                    if(arr.success){
                                        pdfArray.push(arr)
                                    }
                                })
                            }
                        }
                    }
    			})
            }
            resolve(pdfArray)
        })
    }

    async convertinsinglepdf(pdfArray){
        let datetime = (new Date()).getTime();
        return new Promise(async (resolve,reject)=>{
            var pdfdata = [];
            for(let i=0; i< pdfArray.length; i++){
                var pdf = pdfArray[i];
                if(!pdfArray[i].type){
                    var filepath  = pdf.path;
                    var fileName = filepath.substring(filepath.lastIndexOf('/')+1);
                    var filearr = fileName.split('.');
                    var fileName = filearr[0];
                    var ext = filepath.split('.').pop();
                    if(ext == 'jpeg' || ext == 'png' || ext == 'jpg' || ext == 'gif'){
                        if (fs.existsSync(filepath)){
                            await imagesToPdf([filepath], path.resolve(process.cwd(), `airCaroDownload/${fileName}_${datetime}_invoice.pdf`));
                            if (fs.existsSync(`airCaroDownload/${fileName}_${datetime}_invoice.pdf`)) {
                                pdfdata.push(path.resolve(process.cwd(), `airCaroDownload/${fileName}_${datetime}_invoice.pdf`))
                            }
                        }
                    }else{
                        if(ext == 'pdf'){
                            pdfdata.push(filepath) 
                        }else{
                            if (fs.existsSync(filepath)){
                                var abPath = path.resolve(process.cwd(), `airCaroDownload/${fileName}_${datetime}_invoice.pdf`)
                                let pPath =  await this.convertexceptImagetopdf(filepath, abPath);
                                pdfdata.push(pPath);
                            }
                            // await toPdf([filepath], path.resolve(process.cwd(), `airCaroDownload/${fileName}_${datetime}_invoice.pdf`));
                            // if (fs.existsSync(`airCaroDownload/${fileName}_${datetime}_invoice.pdf`)) {
                            // pdfdata.push(path.resolve(process.cwd(), `airCaroDownload/${fileName}_${datetime}_invoice.pdf`))
                            // }
                        }
                    }
                }
            }
            if(pdfdata && pdfdata.length>1){
                merge(pdfdata, path.resolve(process.cwd(), `public/uploads/${datetime}-FM.pdf`), function (err) {
                    if(err){
                        console.log(err);
                    }
                    console.log(pdfdata);
                    console.log('Successfully merged!')
                    resolve(path.resolve(process.cwd(), `public/uploads//${datetime}-FM.pdf`))
                })
            }else{
                resolve(pdfdata[0]);
            }
        }) 
    }

    async convertexceptImagetopdf(filePath, abPath){
        return new Promise(async (resolve,reject)=>{
            var wordBuffer = fs.readFileSync(filePath)
            toPdf(wordBuffer).then(
                (pdfBuffer) => {
                  fs.writeFileSync(abPath, pdfBuffer)
                  resolve( abPath)
                }, (err) => {
                  resolve(err)
                  console.log(err)
                }
              )
        })
    }

     async getFileStream(filestream,filepath,filename){
        return new Promise(async (resolve,reject)=>{
            await filestream.on('finish',async function(resp)  {
                resolve({ success: true, path: filepath, name: filename });
            })
        })
    }

     async invoiceResult(invoice) {
        return new Promise(async (resolve,reject)=>{
            let invoiceResult = await this.invoicePipe(invoice)
            if(invoiceResult == 'Success')
                resolve({ success: true, path: global.uploadRoot +'/'+ invoice.filename, name: invoice.filename, type:'INVOICE' })
            else
                resolve({ success: false, message: 'File not found' })
        })
    }

     async invoicePipe(invoice){
        return new Promise(async (resolve,reject)=>{
            try{
                let filestream
                let invoiceFile = await aws.getObjectReadStream(invoice.filename)
                let path = global.uploadRoot +'/'+ invoice.filename
                invoiceFile.pipe(filestream = fs.createWriteStream(path))
                filestream.on('finish', async function() {
                    if(fs.existsSync(path)){
                        resolve('Success')
                    }else{
                        resolve('Error')
                    }
                })
            }
            catch(error){
                console.log("err",error)
                reject(error)
            }
        })
    }

     async generateAWbPrint(awb) {
        this.awb = awb;
            let png = await this.generateBarcode(awb._id)

                 var docDefinition = {
                    footer: this.generateFooter,
                    content: [{
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
                return printer.createPdfKitDocument(docDefinition);
    }

    async generatePackagesTable() {
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

        for (let pkg of this.awb.packages) {
            var ptype = "Box"
            if (pkg.packageType) {
                ptype = pkg.packageType;
            }
            if(pkg.packageType == 'Cube' && pkg.masterWeight && pkg.masterDimensions && pkg.masterDescription){
                pkg.weight = pkg.masterWeight
                pkg.dimensions = pkg.masterDimensions
                pkg.description = pkg.masterDescription
            }

            var dimWeight = calculateDimensionalWeight(pkg.packageType == 'Cube' && pkg.masterDimensions ? pkg.masterDimensions : pkg.dimensions)
            totalWeight += Number(pkg.weight)
            dimWeight = dimWeight.replace(",","")
            totaldimWeight += parseFloat(dimWeight);
            if(pkg.express){
                body.push([
                    { text: ptype, colSpan: 2 ,bold: true}, "",
                    { text: pkg.dimensions ,bold: true},
                    { text: pkg.description ,bold: true},
                    { text: pkg.weight + " lbs" ,bold: true},
                    { text: dimWeight ,bold: true}
                ])
            }else{
                body.push([
                    { text: ptype, colSpan: 2 }, "",
                    { text: pkg.dimensions },
                    { text: pkg.description },
                    { text: pkg.weight + " lbs" },
                    { text: dimWeight }
                ])
            }

            let barcode = await this.generateBarcode(`${pkg.trackingNo}`);
            body.push([{
                image: 'data:image/jpeg;base64,' + barcode.toString('base64'),
                width: 150,
                alignment: 'right',
                colSpan: 6,
            }, ]);
        }
        totalWeight = totalWeight.toFixed(2)
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
            { text: this.awb.packages.length, },
            totalWeight,
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
        
        var purchaseOrders = this.awb.purchaseOrders ? this.awb.purchaseOrders : [];
        var totalPO = 0;
        var po_number = ''
        if(purchaseOrders && purchaseOrders.length>0){
            for(var i=0; i< purchaseOrders.length; i++){
                totalPO = totalPO+ parseFloat(purchaseOrders[i].amount);
            }
        }
        if(totalPO>0){
            po_number = this.awb.po_number;
        }

        let pdfObject = {
            layout: 'lightHorizontallines',
            margin: [0, 10],
            table: {
                headerRows: 1,
                widths: ['*', '*', '*', '*'],
                body: [
                    [{ margin: [1, 1], text: "Inland Carrier and Shipper Information", colSpan: 4, alignment: 'center', fillColor: '#cccccc', bold: true }, '', '', ''],
                    [{ text: 'Carrier Name:' }, { text: this.awb.carrier.name }, { text: 'P.O. Number (Nine to Five)' }, { text: po_number }],
                    [{ text: 'Notes:',  bold: true }, { text: notes }, { text: 'External Invoice No', bold: true }, { text: 'External PO', bold: true }],
                    [{ text: this.awb.no, colSpan: 2 }, { text: '' }, { text: (this.awb.invoices || []).map(i => i.number).join(', '), fontSize: 9, bold: true }, { text: '' }]
                ]
            }
        }
        if(express > 0)
            pdfObject.table.body.splice(2,0,[{ text: 'Express', bold: true ,colSpan: 4 }])
        else{
            pdfObject.table.body.splice(2,0,[{ text: 'MAWB#' ,colSpan: 4}, { text: '' }])
        }
        return pdfObject
    }
    generateHeader(png) {
         var header= [{
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
                                    { margin: [-3, 0], text: "AWB" + this.awb.awbId, bold: true, fontSize: 11 },
                                    { margin: [-1, 5], text: moment(this.awb.createdAt).format("MM/DD/YYYY hh:mm A"), bold: false, fontSize: 9 },
                                    { margin: [-1, 0], text: (this.awb.createdBy && this.awb.createdBy.username) || '', bold: false, fontSize: 9 }
                                ]
                            }
                        ]
                    }
                ],
            }
        ]
        var purchaseOrders = this.awb.purchaseOrders ? this.awb.purchaseOrders : [];
        var totalPO = 0;
        if(purchaseOrders && purchaseOrders.length>0){
            for(var i=0; i< purchaseOrders.length; i++){
                totalPO = totalPO+ parseFloat(purchaseOrders[i].amount);
            }
        }
        // if(totalPO > 0){
        //  header[1].stack[2].columns[0].stack.splice(1,0,{ margin: [0, 3], text: 'Purchase Order:', bold: true, fontSize: 9 });
        //  header[1].stack[2].columns[1].stack.splice(1,0,{ margin: [-1, 2], text: (this.awb.po_number?this.awb.po_number:''), bold: true, fontSize: 9 })
        // }
        return header;
    }
    
    generateShiperCosigneeTable(awb) {
        // In DB some shippers have zip field instead of zipcode
        let shipperZipcode,shipperName,awbShipperAddress,awbShipperCity,awbShipperState;
        if(awb.shipper){
            shipperZipcode = awb.shipper.zipcode || awb.shipper.zip;
            shipperName = awb.shipper.name ? awb.shipper.name : ''
            awbShipperAddress = awb.shipper.address ? awb.shipper.address : ''
            awbShipperCity = awb.shipper.city ? awb.shipper.city : ''
            awbShipperState = awb.shipper.state ? awb.shipper.state : ''
        }
        let shipperAddress = [
            shipperName,
            awbShipperAddress, [awbShipperCity, awbShipperState, shipperZipcode].filter(Boolean).join(', '),
        ].filter(Boolean).join('\n');

        var shipperDetails = `${shipperAddress} \n`;
        if (awb.shipper && awb.shipper.taxId)
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
        return { text: "Page No: " + currentPage.toString() + '/' + pageCount, alignment: 'right', margin: [50, 10] }
    }

    generatePurchaseOrder(awb) {
        this.awb = awb;
        var purchaseOrders = this.awb.purchaseOrders ? this.awb.purchaseOrders : [];
        var totalPO = 0;
        if(purchaseOrders && purchaseOrders.length>0){
            for(var i=0; i< purchaseOrders.length; i++){
                totalPO = totalPO+ parseFloat(purchaseOrders[i].amount);
            }
        }

        return new Promise((resolve, reject) => {
            this.generateBarcode(awb._id).then(async png => {

                var docDefinition = {
                    footer: this.generateFooter,
                    content: [{
                            columns: this.generatePurchaseOrderHeader(png)
                        },                        
                        {
                            layout: 'lightHorizontallines',
                            margin: [0, 10],
                            table: {
                                headerRows: 1,
                                widths: [65, 100, 80, 50, 90, 60],
                                body: await this.generatePurchaseOrderTable()
                            }
                        },
                        {
                            
                            columns:[
                                { text: 'Total:',bold:true, margin: [ 220, 2, 2, 2 ] },
                                { text: '$'+totalPO, bold:true, margin: [ 30, 2, 2, 2 ] }
                            ]
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
                filestream.on('finish', async function() {
                    resolve({ filename: filename, path: filepath })
                })
            })
        })
    }
    async generatePurchaseOrderTable(){
        let body = [
            [{ text: "Date", fillColor: "#cccccc" },
                { text: "Description", fillColor: "#cccccc" },
                { text: "Payment Method", fillColor: "#cccccc" },
                { text: "Amount", fillColor: "#cccccc" },
                { text: "Created By", fillColor: "#cccccc" },
                { text: "Invited By", fillColor: "#cccccc" }
            ],           
        ]
        var purchaseOrders = this.awb.purchaseOrders ? this.awb.purchaseOrders : [];
        var totalPO = 0;
        if(purchaseOrders && purchaseOrders.length>0){
            for(var i=0; i< purchaseOrders.length; i++){
                totalPO = totalPO+ parseFloat(purchaseOrders[i].amount);
                body.push([
                    { text: moment(purchaseOrders[i].createdAt).format("MMM/D/YYYY"),bold: false},
                    { text: purchaseOrders[i].serviceTypeText ,bold: false},
                    { text: purchaseOrders[i].paidTypeText ,bold: false},
                    { text: '$'+(purchaseOrders[i].amount).toFixed(2) ,bold: false},
                    { text: purchaseOrders[i].createdBy.username ,bold: false},
                    { text: purchaseOrders[i].source ,bold: false}
                ]) 
            }
            
        }        
        return body;
    }
    generatePurchaseOrderHeader(png) {
        return [{
                width: '*',
                stack: [
                    { text: 'Nine To Five Import Export \n', fontSize: 15, bold: true },
                    { text: '2801 NW 55th Court \r\n', fontSize: 10, margin: [0, 5, 5, 0] },
                    { text: 'Building 6W\r\n', fontSize: 10, margin: [0, 0] },
                    { text: 'Ft Lauderdale, FL 33309\r\n', fontSize: 10, margin: [0, 0] },
                    { text: 'UNITED STATES \r\n', fontSize: 10, margin: [0, 0] },
                    { text: 'Tel: 954-958-9970, Fax:954-958-9071', fontSize: 10, margin: [0, 5, 5, 0] }
                ]
            },
            {
                width: '*',
                stack: [
                    { text: 'Purchase Order:', fontSize: 11, margin: [10, 5],  bold: true },
                    //{ image: 'data:image/jpeg;base64,' + png.toString('base64'), margin: [15, 1], width: 150, alignment: "right" },
                    {
                        columns: [{
                                width: '*',
                                margin: [10, 5],
                                stack: [
                                    { text: 'Airway Bill No:', bold: true, fontSize: 9 },
                                    { margin: [0, 2], text: 'PO Number:', bold: true, fontSize: 9 },
                                    //{ margin: [0, 5], text: 'Received Date/Time:', bold: false, fontSize: 9 },
                                    { margin: [0, 3], text: 'Created By:', bold: false, fontSize: 9 },
                                    
                                   
                                ]
                            },
                            {
                                width: '*',
                                margin: [0, 5],
                                stack: [
                                    { margin: [-3, 0], text: "AWB" + this.awb.awbId, bold: true, fontSize: 11 },
                                    { margin: [-1, 2], text: (this.awb.po_number ) || '', bold: true, fontSize: 9 },
                                    //{ margin: [-1, 5], text: moment(this.awb.createdAt).format("MM/DD/YYYY hh:mm A"), bold: false, fontSize: 9 },
                                    { margin: [-1, 0], text: (this.awb.createdBy && this.awb.createdBy.username) || '', bold: false, fontSize: 9 },
                                   
                                ]
                            }
                        ]
                    },
                    {
                        columns: [{
                                width: '*',
                                margin: [10, 5],
                                stack: [
                                    { text: 'No Of Pieces:', bold: true, fontSize: 9 },
                                    //{ margin: [0, 5], text: 'Received Date/Time:', bold: false, fontSize: 9 },
                                    { margin: [0, 3], text: 'Total Weight (lbs):', bold: true, fontSize: 9 },
                                    { margin: [-1, 3], text: 'Total Weight (vlbs):', bold: true, fontSize: 9 },
                                   
                                ]
                            },
                            {
                                width: '*',
                                margin: [0, 5],
                                stack: [
                                    { margin: [-3, 0], text: this.awb.no_of_pieces, bold: false, fontSize: 9 },
                                    //{ margin: [-1, 5], text: moment(this.awb.createdAt).format("MM/DD/YYYY hh:mm A"), bold: false, fontSize: 9 },
                                    { margin: [-1, 3], text: (this.awb.weightAwb).toFixed(2), bold: false, fontSize: 9 },
                                    { margin: [-1, 3], text: (this.awb.volumetricWeight).toFixed(2), bold: false, fontSize: 9 }
                                ]
                            }
                        ]
                    }
                ],
            }
        ]
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