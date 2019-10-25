

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
  var fs = require('fs');

export class GenerateProcessedLabel{
    
    constructor(){

    }
    printProcessedLabel(awb,fees){
        var srv = this; 
        return new Promise ((resolve,reject)=>{
            var dd = { 
                pageSize: {
                    width: 288.00,
                    height: 216.00
                  },
                  pageMargins: [ 10, 10, 10, 10 ],
                content: [
                     {
                         width:'*',
                         stack:[
                            {text: "Track Your Packages Now",alignment:'center', fontSize:10},
                            {text:"@",alignment:'center',fontSize:10,margin:[1,1]},
                            {text:"www.postboxesetc.com",alignment:'center',fontSize:10,margin:[1,1]},
                            {text:`Invoice $${fees.value}`,alignment:'center',fontSize:8,margin:[1,1]},
                            {text:`Charges`,alignment:'left',fontSize:10,bold:true,margin:[1,5]},
                         ]
                        
                      
                    },

                    {
                        border: [false, false, false, false],
                        table:{
                            margin:[1,1],
                            headerRows:0,
                            border: [false, false, false, false],
                            widths:['*','*'],
                            body:[
                                [
                                    {
                                        margin:[1,1],
                                        border: [false, false, false, false],
                                        table:{
                                            margin:[0,0],
                                            headerRows:0, 
                                            widths:['*','*'],
                                            border: [false, false, false, false],
                                            body:[
                                                
                                            [{border: [false, false, false, false],text:"Duty",bold:false,fontSize:7},{border: [false, false, false, false],text:`${fees.duty}`,fontSize:7}],
                                            [{border: [false, false, false, false],text:"Customer Proc",bold:false,fontSize:7},{border: [false, false, false, false],text:`${fees.processing}`,fontSize:7}],
                                            [{border: [false, false, false, false],text:"Env. Levy",bold:false,fontSize:7},{border: [false, false, false, false],text:`${fees.envLevy}`,fontSize:7}],
                                            [{border: [false, false, false, false],text:"Customs VAT",bold:false,fontSize:7},{border: [false, false, false, false],text:`${fees.cvat}`,fontSize:7}],
                                            [{border: [false, false, false, false],text:"",bold:false,fontSize:7},{border: [false, false, false, false],text:"",fontSize:7}],
                                            [{border: [false, false, false, false],text:"",bold:false,fontSize:7},{border: [false, false, false, false],text:"",fontSize:7}],
                                            
                                            [{border: [false, false, false, false],colSpan:2,text:"Service VAT:",bold:true,fontSize:10},{border: [false, false, false, false],text:"$0.00",fontSize:7}],
                                            [{border: [false, false, false, false],colSpan:2,text:`${fees.svat}`,bold:true,fontSize:10},{border: [false, false, false, false],text:"",fontSize:7}],
                                            [{margin:[0,10,0,0],border: [false, false, false, false],colSpan:2,text:"Total:",bold:true,fontSize:10},{border: [false, false, false, false],text:"",fontSize:7}],
                                            [{border: [false, false, false, false],colSpan:2,text:`${fees.total}`,bold:true,fontSize:10},{border: [false, false, false, false],text:"",fontSize:7}]
                                        ]}
                                    },
                                    { margin:[1,1],
                                        border: [false, false, false, false],
                                        table:{
                                            margin:[0,0],
                                            headerRows:0, 
                                            widths:['*','*'],
                                            border: [false, false, false, false],
                                            body:[
                                            [{border: [false, false, false, false],text:"Freight",bold:false,fontSize:7},{border: [false, false, false, false],text:`${fees.freight}`,fontSize:7}],
                                            [{border: [false, false, false, false],text:"No Docs",bold:false,fontSize:7},{border: [false, false, false, false],text:`${fees.nodocs}`,fontSize:7}],
                                            [{border: [false, false, false, false],text:"Insurance",bold:false,fontSize:7},{border: [false, false, false, false],text:`${fees.insurance}`,fontSize:7}],
                                            [{border: [false, false, false, false],text:"Storage",bold:false,fontSize:7},{border: [false, false, false, false],text:`${fees.storage}`,fontSize:7}],
                                            [{border: [false, false, false, false],text:"Brokerage",bold:false,fontSize:7},{border: [false, false, false, false],text:`${fees.brokerage}`,fontSize:7}],
                                            [{border: [false, false, false, false],text:"SED",bold:false,fontSize:7},{border: [false, false, false, false],text:`${fees.sed}`,fontSize:7}],
                                            [{border: [false, false, false, false],text:"Express",bold:false,fontSize:7},{border: [false, false, false, false],text:`${fees.express}`,fontSize:7}],
                                            [{border: [false, false, false, false],text:"Delivery",bold:false,fontSize:7},{border: [false, false, false, false],text:`${fees.delivery}`,fontSize:7}],
                                            [{border: [false, false, false, false],text:"Pickup",bold:false,fontSize:7},{border: [false, false, false, false],text:`${fees.pickup}`,fontSize:7}],
                                            [{border: [false, false, false, false],text:"Haz Mat",bold:false,fontSize:7},{border: [false, false, false, false],text:`${fees.hazmat}`,fontSize:7}],
                                        ]}
                                       }
                                ],
                            ]
                        }
                    }
                   

                ],
                defaultStyle: {
                    font: 'Helvetica',
                    fontSize:7
                  },
            }
            var filename = awb.id+'-'+'-lbl-proc.pdf'; 
            var pdfDoc = printer.createPdfKitDocument(dd);
            pdfDoc.pipe(fs.createWriteStream(filename));
            pdfDoc.end();
            resolve({generated:true,filename:filename})
        })
    }
}