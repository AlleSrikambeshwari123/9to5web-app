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
  generateBarcode('12345678').then(png=>{
    var docDefinition = {
        footer: function (currentPage, pageCount) {
            return        { text: "Page No: " + currentPage.toString() + '/' + pageCount, alignment: 'right', margin:[50,10] }
               
                            // { image: 'sampleImage.jpg', alignment: 'center', fit: [400, 400] },
                            // {text:"C" ,alignment:'center'},
                     
                    
                    },
        content: [
            {
                columns :[
                    {
                        width:'*',
                        stack: [
                            {text:'Nine To Five Import Export \n',fontSize:15,bold:true},
                          
                            {text:'1181 NW 51st St.\r\n',fontSize:7,margin: [5,1]},
                            {text:'Hanger 42D\r\n',fontSize:7,margin: [5,1]},
                            {text:'Ft. Lauderdate, FL 33309\r\n',fontSize:7,margin:[5,1]},
                            {text:'UNITED STATES \r\n',fontSize:7,margin: [5,1]},
                            {text:'Tel: 954-958-9970, Fax:954-958-9701',fontSize:7,margin: [5,1]}
                        ]
                },
                {
                    width:'*',
                    stack:[
                        {text:'Airway Bill',alignment:'right', fontSize:15,bold:true},
                        {image: 'data:image/jpeg;base64,'+png.toString('base64'),width:150,alignment:"right"},
                        {
                            
                            columns :[
                            {
                                width:'*',
                                margin:[30,5],
                                stack:[
                                    {text:'Airway Bill No:',bold:true,fontSize:7},
                                    {text:'Received Date/Time:',bold:false,fontSize:7},
                                    {text:'Received By:',bold:false,fontSize:7}
                                ]
                            },
                            {
                                width:'*',
                                margin:[0,5],
                                stack:[
                                    {text:'12345678',bold:true,fontSize:7},
                                    {text:'7/31/2019 12: 49 PM',bold:false,fontSize:7},
                                    {text:'HECTOR SAPONAR',bold:false,fontSize:7}
                                ]
                            }
                        ]}
                        // {text:'Airway Bill No:        12345678',alignment:'left',bold:true, fontSize:7,margin:[80,5]},
                        // {text:'Received Date/Time: 7/31/2019 12: 49 PM',alignment:'left',bold:false, fontSize:7,margin:[80,5]},
                        // {text:'Received By:    HECTOR SAPONAR',alignment:'left',bold:false, fontSize:7,margin:[80,5]}
                ],
                
                    
                }]//end top columns 
            },
            {
                layout : 'lightHorizontallines',
                margin:[0,20],
                table: {
                    headerRows:1,
                    widths:['*',"*"],
                    body:[
                        [{margin:[1,1],text:"Shipper Information",fillColor:"#cccccc"}, {margin:[1,1],text:"Cosignee Infomation",fillColor:'#cccccc'}],
                        [{margin:[5,5],stack:['HOME DEPOT #249',"EIN NO"]},{margin:[5,5],stack:['Colin Degregory',"Account No: 9250","#19 Airport Industrial Park, Nassau New Providence, Bahamas"]}]
                    ]
            }},
           
            {
               layout:'lightHorizontallines',
               margin:[0,10],
               table:{
                   headerRows:1,
                   widths:['*','*','*','*'],
                   body:[
                       [{margin:[1,1],text:"Inland Carrier and Shipper Information",colSpan:4,alignment:'center',fillColor:'#cccccc',bold:true},'','',''],
                       [ {text:'Carrier Name:'},{text:'DELIVERED'},{text:'P.O. Number (Nine to Five)'},{text:'1234'}],
                       [ {text:'Secondary Carrier:'},{text:''},{text:'MAWB#'},{text:''}],
                       [ {text:'Notes:',colSpan:2,bold:true},{text:''},{text:'External Invoice No',bold:true},{text:'External PO',bold:true}],
                       [ {text:' ',colSpan:2},{text:''},{text:''},{text:''}]
                        //    {text:'P.O. Number (Nine to Five)'},
                        //    {text:'XXXX'}
                    //],
                      

                   ]
               }
            },
            {
                layout:'lightHorizontallines',
                margin:[0,10],
                table:{
                    headerRows:2,
                    widths:["*","*","*","*","*","*"],
                    body:[
                        [{text:"Pcs",fillColor:"#cccccc"},
                        {text:"Package",fillColor:"#cccccc"},
                        {text:"Dimensions",fillColor:"#cccccc"},
                        {text:"Description",fillColor:"#cccccc"},
                        {text:"Weight",fillColor:"#cccccc"},
                        {text:"Volume",fillColor:"#cccccc"}],
                        [{text:"Quantity",fillColor:"#cccccc",colSpan:2},
                        "",
                        {text:"Invoice Number",fillColor:"#cccccc"}
                        ,{text:"Notes",fillColor:"#cccccc"}
                        ,"",
                        {text:"Volume Weight",fillColor:"#cccccc"}],
                        [{margin:[0,5],text:"Received by Signature:_________________________",fillColor:"",colSpan:3,rowSpan:2},
                        "",
                        {text:""}
                        ,{text:"Pieces",fillColor:"#cccccc"}
                        ,"Weight",
                        {text:"Volume",fillColor:"#cccccc"}],
                        [{text:"",fillColor:"",colSpan:3},
                        "",
                        {text:""}
                        ,{text:" ",}
                        ," ",
                        {text:" "}]
                    ]
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
                fillColor:"#cccccc"

            }
        },
        defaultStyle: {
          font: 'Helvetica',
          fontSize:7
        },
        
      };
      
      var pdfDoc = printer.createPdfKitDocument(docDefinition);
      pdfDoc.pipe(fs.createWriteStream('document.pdf'));
      pdfDoc.end();
  })


  function generateBarcode (text){
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