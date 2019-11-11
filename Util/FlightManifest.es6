var currencyFormatter = require('currency-formatter'); 
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
  var pdffonts = require('pdfmake/build/vfs_fonts')
 var PdfPrinter = require('pdfmake');
  var printer = new PdfPrinter(fonts);
  var moment  = require('moment'); 
  var fs = require('fs');
  var bwipjs = require('bwip-js')
  Number.prototype.formatMoney = function (c, d, t) {
    var n = this,
        c = isNaN(c = Math.abs(c)) ? 2 : c,
        d = d == undefined ? "." : d,
        t = t == undefined ? "," : t,
        s = n < 0 ? "-" : "",
        i = String(parseInt(n = Math.abs(Number(n) || 0).toFixed(c))),
        j = (j = i.length) > 3 ? j % 3 : 0;
    return "" + s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};

export class FlightManifest { 
    constructor(){
        this.totalWeight  =0 ; 
        this.packageCount = 0 ; 
    }
    generateManifest(manifest,packages){
        var srv = this; 
       srv.packageCount = packages.length; 
        return new Promise((resolve,reject)=>{


            var docDefinition = { 
                footer: srv.generateFooter,
                content: [
                    {
                        stack :[
                            {text:"NINE TO FIVE IMPORT EXPORT",bold:true,fontSize:11,alignment:"center"},
                            {margin:[0,2],text:"1811 N.W. 51 Street Hanger 42 D",bold:true,fontSize:9,alignment:"center"},
                            {margin:[0,2],text:"Ft. Lauderale, Florida 33309",bold:true,fontSize:9,alignment:"center"},
                            {margin:[0,2],text:"FLIGHT MANIFEST",bold:true,fontSize:11,alignment:"center"}
                        ]
                    },
                    {
                        margin:[0,5,0,0],
                        table:{
                            headerRows:0,
                            alignment:"center",
                            width:400,
                            widths:['*','*'],
                            body:[
                                [{border:[false,false,false,false],text:"For Shipment:",fontSize:8,alignment:'right',margin:[0,0,2,0],bold:true},
                                {border:[false,false,false,false],text:manifest.tailNum,fontSize:8}]
                            ]
                        }
                    },
                    {
                        table:{
                            headerRows:0,
                            alignment:"center",
                            
                            widths:[100,100,100,100],
                            body:[
                                [
                                    {border:[false,false,false,false],text:'Departure Date:',fontSize:8,alignment:'left',margin:[0,0,2,0],bold:true},
                                    {border:[false,false,false,false],text:moment.unix(manifest.shipDate).format("MM/DD/YYYY"),fontSize:8},
                                    {border:[false,false,false,false],text:'Departure Time:',fontSize:8,alignment:'left',margin:[0,0,2,0],bold:true},
                                    {border:[false,false,false,false],text:moment.unix(manifest.shipDate).format("hh:mm A"),fontSize:8},
                                ],
                                [
                                    {border:[false,false,false,false],text:'Carrier:',fontSize:8,alignment:'left',margin:[0,0,2,0],bold:true},
                                    {border:[false,false,false,false],text:"",fontSize:8},
                                    {border:[false,false,false,false],text:'Airline Flight#:',fontSize:8,alignment:'left',margin:[0,0,2,0],bold:true},
                                    {border:[false,false,false,false],text:manifest.tailNum,fontSize:8},
                                ],

                            ]
                        }
                    },
                    {
                        margin:[0,5],
                        table:{
                            headerRows:1,
                            widths:['*','*','*','*','*'],
                            body:srv.generatePackagesTable(packages),
                        }
                    },

                    {
                        margin:[5,5],
                        table:{
                            headerRows:0,
                            widths:['*','*'],
                            body:[
                                [{text:"Total Peice Count:      "+srv.packageCount, border:[false,false,false,false],bold:true},{text:"Total Shipment Weight:   "+srv.totalWeight+" lbs",bold:true,border:[false,false,false,false]}]
                            ]

                            
                        }

                     }
                    
                ],
                defaultStyle: {
                    font: 'Helvetica',
                    fontSize:8
                  },
            }; 

            var pdfDoc = printer.createPdfKitDocument(docDefinition);
            pdfDoc.pipe(fs.createWriteStream(manifest.mid+'-manifest.pdf'));
            pdfDoc.end();
            resolve({completed:true})
        })
    }
    generateFooter(currentPage, pageCount){
        return        { text: "Page No: " + currentPage.toString() + '/' + pageCount, alignment: 'right', margin:[50,10] }
                     
    }
    generatePackagesTable(packages){
        var srv = this; 
        let body = [
            [{text:"AWB #",fillColor:"#cccccc"},
            {text:"Shipper",fillColor:"#cccccc"},
            {text:"Package No",fillColor:"#cccccc"},
            {text:"Consignee",fillColor:"#cccccc"},
            {text:"Weight lbs",fillColor:"#cccccc"},
            ],
            
            
            
        ]
        //add packages here 
        var totalWeight = 0 ; 
        var totaldimWeight = 0 ; 
        var displayweight = 0 ; 
        packages.forEach(pkg => {
            displayweight = currencyFormatter.format(pkg.weight, {
                    symbol: '',
                    decimal: '.',
                    thousand: ',',
                    precision: 2,
                    format: '%v %s' // %s is the symbol and %v is the value
                  })
                  totalWeight += Number(pkg.weight); 
            body.push([{text:"AWB"+pkg.awb},
            {text:pkg.awbInfo.shipper},{text:"PK00"+pkg.id},{text:pkg.awbInfo.customer.name},{text:displayweight+"lbs"},]) 
        });
        srv.totalWeight = totalWeight; 
        // var dimw = currencyFormatter.format(totaldimWeight, {
        //     symbol: '',
        //     decimal: '.',
        //     thousand: ',',
        //     precision: 2,
        //     format: '%v %s' // %s is the symbol and %v is the value
        //   })
        
        
        return body; 
    }
    generatePackages(pakcages){
        return Promise((resolve,reject)=>{

        })
    }

}