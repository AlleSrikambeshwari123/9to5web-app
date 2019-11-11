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
                footer: srv.generateFooter,
                
                content: [
                           {
                               stack :[
                                   {text:"NINE TO FIVE IMPORT EXPORT",bold:true,fontSize:11,alignment:"center"},
                                   {margin:[0,3],text:"1811 N.W. 51 Street Hanger 42 D",bold:true,fontSize:9,alignment:"center"},
                                   {margin:[0,3],text:"Ft. Lauderale, Florida 33309",bold:true,fontSize:9,alignment:"center"},
                                   {margin:[0,3],text:"FLIGHT LOAD SHEET",bold:true,fontSize:11,alignment:"center"}
                               ]
                           },
                           {
                               margin:[0,3],
                            table:{
                                headerRows:0,
                                alignment:"center",
                                
                                widths:['*','*'],
                                body:[
                                    [{border:[false,false,false,false],text:"For Shipment:",fontSize:9, alignment:"right",bold:true},
                                    {border:[false,false,false,false],text:manifest.tailNum,fontSize:9}]
                                ]
                            }
                        },
                        {
                            margin:[0,3],
                            table:{
                                headerRows:0,
                                alignment:"center",
                                
                                widths:['*','*','*','*'],
                                body:[
                                    [
                                        {border:[false,false,false,false],text:'Departure Date:',fontSize:8,bold:true},
                                        {border:[false,false,false,false],text:manifest.shipDate,fontSize:8},
                                        {border:[false,false,false,false],text:'Departure Time:',fontSize:8,bold:true},
                                        {border:[false,false,false,false],text:manifest.shipDate,fontSize:8},
                                    ],
                                    [
                                        {border:[false,false,false,false],text:'Carrier:',fontSize:8,bold:true},
                                        {border:[false,false,false,false],text:manifest.plane.company,fontSize:8},
                                        {border:[false,false,false,false],text:'Airline Flight#:',fontSize:8,bold:true},
                                        {border:[false,false,false,false],text:manifest.tailNum,fontSize:8},
                                    ],
    
                                ]
                            }
                        },
                        {
                            margin:[0,3],
                            stack:[
                                {text:"Flight Notes:",fontSize:9,bold:true}
                            ]
                        }

                       
                       
                       
                       
                ],
                defaultStyle: {
                    font: 'Helvetica',
                    fontSize:8
                  }
            }; 
          
            var path1 = __dirname.replace("Util","data");   
            var filelocation = path1+"/"+manifest.id+'-load-sheet.pdf'; 
            console.log(filelocation,"file"); 
            var pdfDoc = printer.createPdfKitDocument(docDefinition);
            pdfDoc.pipe(fs.createWriteStream(filelocation));
            pdfDoc.end();
            resolve({completed:true, filename:filelocation})
        })
    
    }
    generateHeader(){
      
       
    }
   
    generateFooter(currentPage, pageCount){
        return        { text: "Page No: " + currentPage.toString() + '/' + pageCount, alignment: 'right', margin:[50,10] }
                     
  }
}