

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
export class LBLGeneration
{
    constructor(){
            this.companies = {
            nineTofive: {
                logo:'public/img/logo.jpg',
                name: "NINE TO FIVE IMPORT EXPORT"
            }, 
            postBoxes: {
                logo:'public/img/pbe-logo.png', 
                name : "POST BOXES ETC"
            }
        }
    }

    generatePackageLabels(awb){
        return new Promise((resolve,reject)=>{
            this.awb = awb.awb; 
            var srv  = this; 
            var company  = this.companies.nineTofive; 
            if (Number(srv.awb.customer.pmb)>=9000){
                company = this.companies.nineTofive; 
            }
            else company = this.companies.postBoxes
            console.log("generating",awb.awb); 
            console.log(this.awb.packages.length,"- no of labels to generate."); 
            Promise.all(srv.awb.packages.map(pkg=>this.GernerateAWBLabel(pkg,company))).then(results=>{
                console.log(results);
                resolve(results)
            })
        })
       
    }
    GernerateAWBLabel(pkg , company){
        return new Promise((resolve,reject)=>{
            
            var srv = this; 
            //this needs to bee in a loop 
           
            this.generateBarcode(srv.awb.customer.pmb+"-"+srv.awb.id.toString()+"-"+pkg.id).then(png=>{
                var docDefinition = {
                    pageSize: {
                        width: 288.00,
                        height: 432.00
                      },
                      pageMargins: [ 10, 10, 10, 10 ],
                    content: [
                        {
                            // margin:[0,20],
                            table:{
                                headerRows:0, 
                                widths:['*','*',"*"],
                                body:[
                                    
                                    [{margin:[1,5],stack:[{
                                        image:company.logo,width:70, alignment:'center'
                                    },{text:''},
                                    {margin:[5,6],qr:srv.awb.customer.pmb+"-"+srv.awb.id.toString()+"-"+pkg.id, fit:'60',alignment:'center'}
                                ]   ,border:[false,false,false,true]},
                                  
                                     //logo for lbl 
                                     {colSpan:2,border:[false,false,false,true],stack:[
                                        {margin:[1,5],text:company.name,fontSize:10,bold:true},
                                        {margin:[1,2],text:"1811 51st Street"},
                                        {margin:[1,2],text:"Hanger 42 D"},
                                        {margin:[1,2],text:"Fort Lauderdale, FL 33309 "},
                                        {margin:[1,2],text:"UNITED STATES "}
                                     ]}
                                ]
                                ]//end table body 
                            }
                        },
                        {
                            table:{
                                margin:[0,0],
                                headerRows:0, 
                                widths:['*',60],
                                body:[
                                    [{margin:[1,1],stack:[
                                        {text:"CONSIGNEE", fontSize:4,bold:true},
                                        {margin:[2,5],text:srv.awb.customer.name, fontSize:8,bold:true},

                                    ],border:[false,false,false,true]}, //logo for lbl 
                                     {border:[true,false,false,true],stack:[
                                        {text:"Account No", fontSize:8,bold:true},
                                        {margin:[2,5],text:srv.awb.customer.pmb, fontSize:9,bold:true}
                                        // {margin:[1,1],text:"NINE TO FIVE IMPORT EXPORT",fontSize:9,bold:true},
                                        // {margin:[1,1],text:"1811 51st Street"},
                                        // {margin:[1,1],text:"Hanger 42 D"},
                                        // {margin:[1,1],text:"Fort Lauderdale, FL 33309 UNITED STATES"}
                                     ]}
                                ]
                                ]//end table body 
                            }

                                            
                        },
                        {
                            table:{
                                margin:[0,0],
                                headerRows:0, 
                                widths:['*'],
                                body:[
                                    [{margin:[1,1],stack:[
                                        {text:"AWB No", fontSize:4,bold:true},
                                        {margin:[0,5],text:"AWB"+srv.awb.id, fontSize:13,bold:true},

                                    ],border:[false,false,false,true]}, //logo for lbl 
                                     
                                ]
                                ]//end table body 
                            }

                                            
                        },
                        {
                            table:{
                                margin:[0,0],
                                headerRows:0, 
                                widths:['*'],
                                body:[
                                    [{margin:[1,1],stack:[
                                        {text:"SHIPPER", fontSize:7,bold:true},
                                        {margin:[0,5],text:srv.awb.shipper, fontSize:8,bold:true},

                                    ],border:[false,false,false,true]}, //logo for lbl 
                                     
                                ]
                                ]//end table body 
                            }

                                            
                        },
                        {
                            table:{
                                margin:[0,0],
                                headerRows:0, 
                                widths:['*',30,50],
                                body:[
                                    [{margin:[1,1],stack:[
                                        {text:"PACKAGE NO", fontSize:6,bold:true},
                                        {margin:[0,5],text:"PK00"+pkg.id, fontSize:12,bold:true},

                                    ],border:[false,false,false,true]}, //logo for lbl 
                                    {margin:[1,1],stack:[
                                        {text:"PIECE", fontSize:6,bold:true},
                                        {margin:[10,5],text:pkg.packageIndex, fontSize:12,bold:true},

                                    ],border:[true,false,false,true]},
                                    {margin:[1,1],stack:[
                                        {text:"TOTAL PIECES", fontSize:6,bold:true},
                                        {margin:[10,5],text:srv.awb.packages.length, fontSize:12,bold:true},

                                    ],border:[true,false,false,true]}
                                     
                                ]
                                ]//end table body 
                            }
                            

                                            
                        },
                        {
                            table:{
                                margin:[0,0],
                                headerRows:0, 
                                widths:['*'],
                                body:[
                                    [{margin:[1,1],stack:[
                                        {margin:[0,5],image: 'data:image/jpeg;base64,'+png.toString('base64'),width:180,height:30,alignment:"left"}
                                        // {margin:[0,5],text:"PK"+srv.awb.id, fontSize:12,bold:true},

                                    ],border:[false,false,false,true]}, //barcode for lbl 
                                    
                                     
                                ]
                                ]//end table body 
                            }
                            

                                            
                        },
                        {
                            table:{
                                margin:[0,0],
                                headerRows:0, 
                                widths:['*',50],
                                body:[
                                    [
                                        {margin:[0,0 ],stack:[
                                        
                                         {margin:[0,5],text:"DESCRIPTION", fontSize:7,bold:true},
                                         {margin:[0,5],text:pkg.description, fontSize:7,bold:true},
                                        //table here 
                                        {
                                            margin:[0,0],
                                            table:{
                                                margin:[0,0],
                                                headerRows:0, 
                                                widths:['*'],
                                                body:[
                                                    [{margin:[1,1],stack:[
                                                        {text:"NOTES", fontSize:7,bold:true},
                                                        {margin:[0,10],text:"Class 3", fontSize:7,bold:true},
                
                                                    ],border:[true,true,true,true]}, //logo for lbl 
                                                     
                                                ]
                                                ]//end table body 
                                            }
                
                                                            
                                        },

                                    ],border:[false,false,false,true]}, //barcode for lbl 
                                    {margin:[1,1],stack:[
                                        
                                        {margin:[0,1],text:"WEIGHT", fontSize:6,bold:true},
                                        {margin:[0,2],text:`${pkg.weight} lbs.`, fontSize:8,bold:true},
                                        {margin:[0,1],text:"DIMENSIONS", fontSize:6,bold:true},
                                        {margin:[0,1],text:`${pkg.dimensions} ins.`, fontSize:8,bold:true},
                                        {margin:[0,1],text:"VOL. WEIGHT", fontSize:6,bold:true},
                                        {margin:[0,2],text:`${srv.calculateDimensionalWeight(pkg.dimensions)} Vlbs`, fontSize:5,bold:true},
                                       //table here 

                                   ],border:[true,false,false,true]}
                                     
                                ]
                                ]//end table body 
                            }
                            

                                            
                        }
                    ],
              
                    defaultStyle: {
                      font: 'Helvetica',
                      fontSize:11
                    },
                    
                  };
                  var pdfDoc = printer.createPdfKitDocument(docDefinition);
                  var filename = srv.awb.id+'-'+pkg.id+'-lbl.pdf'; 
                  pdfDoc.pipe(fs.createWriteStream(filename));
                  pdfDoc.end();
                  resolve({generated:true,filename:filename})
            })
            
        })
        // return new Promise ((resolve,reject)=>{
        //     this.awb = awb.awb; 

        //     var docDefinition = { 
        //         content: [
        //             {
        //                 text:"HEY"
        //             },
        //             // {
        //             //     layout : 'lightHorizontallines',
        //             //     margin:[0,20],
        //             //     table: {
        //             //         headerRows:1,
        //             //         widths:['*',"*","*"],
        //             //         body:[
        //             //             [{margin:[1,1],text:"",}, //logo for lbl 
        //             //             [{margin:[1,1],stack:
        //             //                 [
        //             //                     {text:"NINE TO FIVE IMPORT EXPORT",fontSize:13},
        //             //                     {text:"1811 51st Street"},
        //             //                     {text:"Hanger 42 D"},
        //             //                     {text:"Fort Lauderdale, FL 33309 UNITED STATES"}
        //             //                 ]
    
        //             //             ,colSpan:2}, 
        //             //             {margin:[1,1],text:""}] //ROW 1 END 
        //             //             // [{margin:[5,5],stack:[
        //             //             //     {text:"CONSIGNEE"},this.awb.customer.name]}, //customer name 
        //             //             // {margin:[5,5],stack:["Account No",this.awb.customer.pmb]},{text:""}], //ROW 2 
        //             //             // [
        //             //             //     {margin:[1,1],
        //             //             //         stack:[
        //             //             //         {text:"AWB NO"},
        //             //             //         {text:this.awb.id}
                                    
        //             //             //         ],
        //             //             //     colSpan:3},
        //             //             //     {text:""},{text:""}
        //             //             // ], //end row 3
        //             //             // [
        //             //             //     {margin:[1,1],
        //             //             //         stack:[
        //             //             //         {text:"Shipper"},
        //             //             //         {text:this.awb.shipper}
        //             //             //         ],
        //             //             //     colSpan:3},
        //             //             //     {text:""},
        //             //             //     {text:""}
        //             //             // ], //end row 4
        //             //             // [
        //             //             //     {margin:[1,1],
        //             //             //         stack:[
        //             //             //         {text:"PACKAGE NO"},
        //             //             //         {text:this.awb.shipper}
        //             //             //         ]
        //             //             //     },
        //             //             //     { stack:[
        //             //             //         {text:"PIECE"},
        //             //             //         {text:this.awb.shipper}
        //             //             //         ]},
        //             //             //     { stack:[
        //             //             //         {text:"TOTAL PIECES"},
        //             //             //         {text:this.awb.shipper}
        //             //             //         ]}
        //             //             // ],//end row 5 
        //             //             // [
        //             //             //     {margin:[1,1],image:{},colSpan:3},//BARCODE
        //             //             //     {text:""},
        //             //             //     {text:""}
        //             //             // ],
        //             //             // [
        //             //             //    {
        //             //             //        margin:[1,1],text:"",colSpan:3,
        //             //             //    }
        //             //             // ]
        //             //         ]
        //             //     ],
        //             //     defaultStyle: {
        //             //         font: 'Helvetica',
        //             //         fontSize:7
        //             //       },
        //             // }}
        //         ],
        //     }
        //     console.log('trying to create PDF....')
        //     var pdfDoc = printer.createPdfKitDocument(docDefinition);
        //     pdfDoc.pipe(fs.createWriteStream('lbl.pdf'));
        //     pdfDoc.end();
        // })
       
    }
    calculateDimensionalWeight(dimensions){
        var dimensionparts = dimensions.split('x'); 
        var numerator = 1; 
        for(var i = 0; i < dimensionparts.length ; i++){
            numerator = numerator * Number(dimensionparts[i].trim())
            
        }
        var dimWeight = numerator / 139; 
        return Number(dimWeight).formatMoney(2, '.', ',')

    }
    generateShiperCosigneeTable(awb){
       return {
            layout : 'lightHorizontallines',
            margin:[0,20],
            table: {
                headerRows:1,
                widths:['*',"*"],
                body:[
                    [{margin:[1,1],text:"Shipper Information",fillColor:"#cccccc"}, {margin:[1,1],text:"Cosignee Infomation",fillColor:'#cccccc'}],
                    [{margin:[5,5],stack:[awb.shipper,""]},{margin:[5,5],stack:[awb.customer.name,awb.customer.pmb,awb.customer.address]}]
                ]
        }}
    }
    generateBarcode (text){
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
  
}