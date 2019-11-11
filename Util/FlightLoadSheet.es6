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
  var printer = new PdfPrinter(fonts);
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
export class FlightLoadSheet{
    constructor(){

    }

    generateManifestLoadSheet(manifest){
        return new Promise((resolve,reject)=>{
            var srv = this; 
            var docDefinition = { 
                footer: srv.generateFooter(),
                
                content: [
                           {
                               stack :[
                                   {text:"NINE TO FIVE IMPORT EXPORT",bold:true,fontSize:11,alignment:center},
                                   {text:"1811 N.W. 51 Street Hanger 42 D",bold:true,fontSize:9,alignment:center},
                                   {text:"Ft. Lauderale, Florida 33309",bold:true,fontSize:9,alignment:center},
                                   {text:"FLIGHT LOAD SHEET",bold:true,fontSize:11,alignment:center}
                               ]
                           },
                           {
                            table:{
                                headerRows:0,
                                alignment:center,
                                
                                widths:['*','*'],
                                body:[
                                    [{text:"For Shipment",fontSize:9},
                                    {text:mainfest.tailNum,fontSize:9}]
                                ]
                            }
                        },
                        {
                            table:{
                                headerRows:0,
                                alignment:center,
                                
                                widths:['*','*','*','*'],
                                body:[
                                    [
                                        {text:'Departure Date',fontSize:8},
                                        {text:manifest.shipDate,fontSize:8},
                                        {text:'Departure Time',fontSize:8},
                                        {text:manifest.shipDate,fontSize:8},
                                    ],
                                    [
                                        {text:'Carrier',fontSize:8},
                                        {text:manifest.plane.company,fontSize:8},
                                        {text:'Airline Flight#',fontSize:8},
                                        {text:manifest.tailNum,fontSize:8},
                                    ],
    
                                ]
                            }
                        },
                        {
                            stack:[
                                {text:"Flight Notes:",fontSize:9,bold:true}
                            ]
                        }

                       
                       
                       
                       
                ]
            }; 
          
    
            var pdfDoc = printer.createPdfKitDocument(docDefinition);
            pdfDoc.pipe(fs.createWriteStream(manifest.id+'-load-heet.pdf'));
            pdfDoc.end();
        })
    
    }
    generateHeader(){
      
       
    }
   
    generateFooter(currentPage, pageCount){
        return        { text: "Page No: " + currentPage.toString() + '/' + pageCount, alignment: 'right', margin:[50,10] }
                     
  }
}