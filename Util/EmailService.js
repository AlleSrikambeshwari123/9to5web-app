const sendGrid = require('@sendgrid/mail'); 
sendGrid.setApiKey("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");
var path = require('path'); 
var fs = require('fs');
var moment = require('moment'); 

 function readEmailTemplate(emailType){
    return  new Promise((resolve,reject)=>{
        var epath = "public/emails/no_docs/index.html"
        if (emailType == "noDocs")
            epath = "public/emails/no_docs/index.html"
        fs.readFile(path.join(__dirname.replace("Util",""),epath), "UTF8", function(err, data) {
            if (err)
                console.log("couldn't read the file"); 
            else {
                resolve(data); 
                //load  up the message 
            }
        });
    })
}
function generatePackages(awb){
    var packages = ""; 
    awb.awb.packages.forEach(pkg => {
        var packageTemplate =  `
    <table width="380" align="left" class="res-full" style="padding: 23px 20px 0px 20px;" border="0" cellpadding="0" cellspacing="0">
    <!-- title -->
    <tr >
        <td class="res-center" style="text-align: left; color: white; font-family: 'Raleway', Arial, Sans-serif; font-size: 23px; letter-spacing: 0.9px; word-break: break-word;" >
            AWB: ${awb.awb.id}
        </td>
    </tr>
    <!-- title end -->
    <tr><td height="5" style="font-size: 0px;" >&nbsp;</td></tr>
    <!-- subtitle -->
    <tr >
        <td class="res-center" style="text-align: left; color: white; font-family: 'Open sans', Arial, Sans-serif; font-size: 14px; letter-spacing: 0.7px; word-break: break-word; font-weight: 600;" >
            SHIPPER: ${awb.awb.shipper} <br/>
            Description:
            ${pkg.description}
        </td>
    </tr>
    <!-- subtitle end -->
    <tr><td height="10" style="font-size: 0px;" >&nbsp;</td></tr>
    <!-- paragraph -->
    <tr >
        <td class="res-center" style="text-align: left; color: white; font-family: 'Open sans', Arial, Sans-serif; font-size: 16px; letter-spacing: 0.4px; line-height: 23px; word-break: break-word" >
            TRACKING #
            ${pkg.trackingNo}
        </td>
    </tr>
    <tr><td height="30" style="font-size: 0px;" >&nbsp;</td></tr>
    <!-- paragraph end -->
</table>
    `; 
    packages += packageTemplate;
    });
    return packages; 
}
async function sendNoDocsEmail(awb){
    console.log("ABOUT TO SEND EMAIL",awb)
    var emailBody = await readEmailTemplate("noDocs"); 
    emailBody = emailBody.replace("{{NAME}}",awb.awb.customer.name)
    
    emailBody = emailBody.replace("{{AWB}}",awb.awb.id)
    emailBody = emailBody.replace("{{PACKAGES}}",generatePackages(awb))
    message = {
        to : "stevan@vela.global", 
        from : 'nodocsnas@postboxesetc.com ',
        subject: `Invoice required AWB No(${awb.awb.id})`,
        html:emailBody
    }; 
    var result = await sendGrid.send(message);

    return result; 
    
    
}
async function sendAtStoreEmail(){
    console.log("ABOUT TO SEND EMAIL",awb)
    var emailBody = await readEmailTemplate("noDocs"); 
    emailBody = emailBody.replace("{{NAME}}",awb.awb.customer.name)
    
    emailBody = emailBody.replace("{{AWB}}",awb.awb.id)
    emailBody = emailBody.replace("{{PACKAGES}}",generatePackages(awb))
    message = { 
        to : "stevan@vela.global", 
        from : 'nodocsnas@postboxesetc.com ',
        subject: `Invoice required AWB No(${awb.awb.id})`,
        html:emailBody
    }; 
    var result = await sendGrid.send(message);

    return result; 
}
module.exports = { 
    sendNoDocsEmail : sendNoDocsEmail,
    sendAtStoreEmail: sendAtStoreEmail
    
}