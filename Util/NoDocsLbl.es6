

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
  var moment = require('moment')
  var fs = require('fs');
//   const userDataPath = (electron.app || electron.remote.app).getPath('userData');
export class LBLNoDocs{
    
    constructor(){
        this.companies = {
             nineTofive: {
                logo:'public/img/pbe-logo.png',
                name: "NINE TO FIVE IMPORT EXPORT"
            }, 
            postBoxes: {
                logo:'public/img/pbe-logo.png', 
                name : "POST BOXES ETC"
            }
        }
    }
    printNoDocsLabel(awb,fees){
        var srv = this; 
        srv.awb = awb.awb; 
        if (!fees.express)
            fees.express = 0; 
            
            
            var company  = this.companies.nineTofive; 
            console.log("awb",awb,"customer",srv.awb.customer)
            if (Number(srv.awb.customer.pmb)>=9000){
                company = this.companies.nineTofive; 
            }
            else if (srv.awb.customer.pmb =="")
            {
                srv.awb.customer.pmb = 9000;
                company = this.companies.nineTofive;
            }
            else company = this.companies.postBoxes
        return new Promise ((resolve,reject)=>{
            var dd = { 
                pageSize: {
                    width: 288.00,
                    height: 216.00
                  },
                  pageOrientation: 'portrait',
                  pageMargins: [ 2, 5, 2, 2 ],
                content: [
                     {
                         width:'*',
                         stack:[
                            {margin:[5,5],image:company.logo, alignment:'center',width:100},
                            {margin:[5,10],text:"No Docs Package            "+srv.awb.id,alignment:'left',bold:true,fontSize:11,margin:[1,1]},
                            {text:"Customer",bold:true,alignment:'left',fontSize:9,margin:[2,10,2,1]},
                            {text:`${srv.awb.customer.name}`, bold:true,alignment:'left',fontSize:8,margin:[2,2]},
                            {text:`Vendor`,alignment:'left',fontSize:9,bold:true,margin:[2,10,2,1]},
                            {text:`${srv.awb.shipper}`,alignment:'left',fontSize:9,bold:true,margin:[2,2]},
                            {text:`Ref No`,bold:true, alignment:'left',fontSize:9,bold:true,margin:[2,10,2,1]},
                            {text:`1100`,bold:true, alignment:'left',fontSize:9,bold:true,margin:[2,2]},
                            {text:`${moment().format("MM/DD/YY hh:mm A")}`,bold:true, alignment:'left',fontSize:9,bold:true,margin:[2,10]},
                         ]
                        
                      
                    },

                  
                   

                ],
                defaultStyle: {
                    font: 'Helvetica',
                    fontSize:8
                  },
            }
            var filename =  srv.awb.id+''+'-no-doc.pdf'; 
            var pdfDoc = printer.createPdfKitDocument(dd);
            pdfDoc.pipe(fs.createWriteStream(filename));
            pdfDoc.end();
            resolve({generated:true,filename:filename})
        })
    }
}