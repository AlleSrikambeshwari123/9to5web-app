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
  var moment = require('moment')
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
        this.packages = []; 
        this.manifest = {};
    }

    generateManifestLoadSheet(manifest,packages){
        return new Promise((resolve,reject)=>{
            var srv = this; 
            srv.manifest = manifest; 
            srv.packages = packages; 
            var docDefinition = { 
                pageOrientation: 'landscape',
                footer: srv.generateFooter,
                header :{ margin:8 ,
                    stack :[
                        {text:"NINE TO FIVE IMPORT EXPORT",bold:true,fontSize:11,alignment:"center"},
                        {margin:[0,3],text:"1811 N.W. 51 Street Hanger 42 D",bold:true,fontSize:9,alignment:"center"},
                        {margin:[0,3],text:"Ft. Lauderale, Florida 33309",bold:true,fontSize:9,alignment:"center"},
                        {margin:[0,3],text:"FLIGHT LOAD SHEET",bold:true,fontSize:11,alignment:"center"},
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
                                    {border:[false,false,false,false],text:moment.unix(manifest.shipDate).format("MM/DD/YYYY"),fontSize:8},
                                    {border:[false,false,false,false],text:'Departure Time:',fontSize:8,bold:true},
                                    {border:[false,false,false,false],text:moment.unix(manifest.shipDate).format("hh:mm A"),fontSize:8},
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
                    },
                    ]
                },
                content: [
                      
                      
                        srv.displayData(),

                       
                       
                       
                       
                ],
                pageMargins: [120, 150, 40, 60],
                defaultStyle: {
                    font: 'Helvetica',
                    fontSize:9
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
    displayData(){
        var srv = this;
        var data = {
            stack: []
        }; 
        srv.manifest.plane.compartments.forEach(compartment => {
            var pkgs = srv.packages.filter(function(item){
                return item.compartment === compartment.name; 
            })

            srv.generateSectionData(compartment,pkgs,data)
        });
       
       return data; 
       
    }
    
    generateSectionData(section,packages,data){
        data.stack.push({margin:[0,5],text:"Section:     "+section.name,bold:true})
        console.log('adding section:' ,section.name );
        var sectionFooter =
        { margin:[0,5],
            table:{
            headerRows:0,
            widths:['*','*','*','*'],
            body:[
                [
                    {border:[false,false,false,false],text:"Piece Count",alignment:"right",bold:true},
                    {border:[false,false,false,false],text:packages.length ,bold:true},
                    {border:[false,false,false,false],text:"Section Total",alignment:"right",bold:true},
                    {border:[false,false,false,false],text:"0 lbs", bold:true},
                   
                ]
           
            ]}
        }
        if(packages.length == 0 ){
            data.stack.push(sectionFooter); 
            return; 
        }
        else {
            var section =
            { margin:[0,5],
                table:{
                headerRows:0,
                widths:['*','*','*','*','*','*'],
                // body:[
                //     [
                //         {border:[false,false,false,false],stack:["AWB1234","17.00lbs"]},
                //         {border:[false,false,false,false],stack:["AWB1234","17.00lbs"]},
                //         {border:[false,false,false,false],stack:["AWB1234","17.00lbs"]},
                //         {border:[false,false,false,false],stack:["AWB1234","17.00lbs"]},
                //         {border:[false,false,false,false],stack:["AWB1234","17.00lbs"]},
                //         {border:[false,false,false,false],stack:["AWB1234","17.00lbs"]}] 
                //     ]
                body: this.displayPackagesforSection(packages)
                }
            }
            var sectionFooter =
            { margin:[0,5],
                table:{
                headerRows:0,
                widths:['*','*','*','*'],
                body:[
                    [
                        {border:[false,false,false,false],text:"Piece Count",alignment:"right",bold:true},
                        {border:[false,false,false,false],text:packages.length,bold:true},
                        {border:[false,false,false,false],text:"Section Total",alignment:"right",bold:true},
                        {border:[false,false,false,false],bold:true,text:packages.reduce(function(x,y){
                            
                            console.log(x.weight,y.weight, "weights")
                            
                                var b = Number(y.weight);                                  
                            return x + b;
                        },0)+" lbs"},
                       
                    ]
               
                ]}
            }
            data.stack.push(section)
              data.stack.push(sectionFooter); 
        }
      
       
        
       
        
        return section 
    }
    displayPackagesforSection(packages){
        //here we need to create an array 
        var body = []; 
        var row = []; 
        console.log("packs:",packages.length)
        for(var i =0; i < packages.length;i++){
            var pkg = {}

            pkg = {border:[false,false,false,false],stack:["AWB"+packages[i].awb+"-\nPK00"+packages[i].id,packages[i].weight+ " lbs"]}
            
             row.push(pkg);
             console.log(row);
            if (i%6 == 1 && i > 1){
                if (row.length<6){
                    console.log('adding',row)
                    for(var j =0 ; j < (6 - row.length );j++ ){
                        row.push({border:[false,false,false,false],stack:["",""]})
                    }
                    console.log("the row",row)
                    
                }
                body.push(row)   
                row = []; 
            }
        }
        if (body.length == 0)
            body.push(row); 
        console.log(body,"The body");
        return body;
        
    }

    generateFooter(currentPage, pageCount){
        return        { text: "Page No: " + currentPage.toString() + '/' + pageCount, alignment: 'right', margin:[50,10] }
                     
  }
}