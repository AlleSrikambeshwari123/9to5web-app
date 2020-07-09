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
        else if (emailType == "noDocsFl")
            epath = "public/emails/no_docs/fl.html"
        else if (emailType == "store")
            epath = "public/emails/no_docs/store.html"            
        else if (emailType == "nodocspackage")
            epath = "public/emails/no_docs_package/index.html"
        else if (emailType == "storepackage")
            epath = "public/emails/store_package/index.html"        
        console.log('using email:',epath)
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
function generatePackage(pkg){
    var packageTemplate =  `
    <table width="380" align="left" class="res-full" style="padding: 23px 20px 0px 20px;" border="0" cellpadding="0" cellspacing="0">
    <!-- title -->
    <tr >
        <td class="res-center" style="text-align: left; color: white; font-family: 'Raleway', Arial, Sans-serif; font-size: 23px; letter-spacing: 0.9px; word-break: break-word;" >
            AWB: ${pkg.awb.id}
        </td>
    </tr>
    <!-- title end -->
    <tr><td height="5" style="font-size: 0px;" >&nbsp;</td></tr>
    <!-- subtitle -->
    <tr >
        <td class="res-center" style="text-align: left; color: white; font-family: 'Open sans', Arial, Sans-serif; font-size: 14px; letter-spacing: 0.7px; word-break: break-word; font-weight: 600;" >
            SHIPPER: ${pkg.awb.shipper} <br/>
            Description:
            ${pkg.package.description}
        </td>
    </tr>
    <!-- subtitle end -->
    <tr><td height="10" style="font-size: 0px;" >&nbsp;</td></tr>
    <!-- paragraph -->
    <tr >
        <td class="res-center" style="text-align: left; color: white; font-family: 'Open sans', Arial, Sans-serif; font-size: 16px; letter-spacing: 0.4px; line-height: 23px; word-break: break-word" >
            TRACKING #
            ${pkg.package.trackingNo}
        </td>
    </tr>
    <tr><td height="30" style="font-size: 0px;" >&nbsp;</td></tr>
    <!-- paragraph end -->
</table>
    `; 
    return packageTemplate;
}
async function sendNoDocsEmail(awb){
    console.log("ABOUT TO SEND EMAIL",awb)
    var emailBody = await readEmailTemplate("noDocs"); 
    emailBody = emailBody.replace("{{NAME}}",awb.awb.customer.name)
    
    emailBody = emailBody.replace("{{AWB}}",awb.awb.id)
    emailBody = emailBody.replace("{{PACKAGES}}",generatePackages(awb))
    message = {
        to : "kim@postboxesetc.com", 
        from : 'nodocsnas@postboxesetc.com ',
        subject: `Invoice required AWB No(${awb.awb.id})`,
        html:emailBody
    }; 
    var result = await sendGrid.send(message);

    return result; 
    
    
}
async function sendNoDocsFl(awb){
    console.log("ABOUT TO SEND EMAIL",awb)
    var emailBody = await readEmailTemplate("noDocsFl"); 
    emailBody = emailBody.replace("{{NAME}}",awb.awb.customer.name)
    
    emailBody = emailBody.replace("{{AWB}}",awb.awb.id)
    emailBody = emailBody.replace("{{PACKAGES}}",generatePackages(awb))
    message = { 
        to : "kim@postboxesetc.com", 
        from : 'nodocsnas@postboxesetc.com ',
        subject: `Invoice required AWB No(${awb.awb.id})`,
        html:emailBody
    }; 
    var result = await sendGrid.send(message);

    return result; 
}
async function sendAtStoreEmail(store,pkg){
    console.log(pkg,"sending at store package.")
    console.log("ABOUT TO SEND EMAIL",pkg)
    var emailBody = await readEmailTemplate("store"); 
    emailBody = emailBody.replace("{{NAME}}",pkg.awb.customer.name)
    emailBody = emailBody.replace("{{LOCATION}}",store)
    emailBody = emailBody.replace("{{LOCNAME}}",store)
    
    emailBody = emailBody.replace("{{AWB}}",pkg.awb.id)
    
    emailBody = emailBody.replace("{{PACKAGES}}",generatePackage(pkg))
    message = { 
        to : "kim@postboxesetc.com", 
        from : 'info@postboxesetc.com ',
        subject: `Package is at Postboxes Etc. ${store}`,
        html:emailBody
    }; 
    var result = await sendGrid.send(message);

    return result; 
}

async function sendNoDocsPackageEmail(pkg){
    console.log(pkg,"sending at no docx package.")
    console.log("ABOUT TO SEND EMAIL",pkg)
    var emailBody = await readEmailTemplate("nodocspackage"); 
    emailBody = emailBody.replace("{{HOST}}","https://9to5-qa.sprocket.solutions/");
    let customerName = '';
    if(pkg && pkg.customerId && pkg.customerId.firstName){
        customerName = pkg.customerId.firstName;
        customerName = customerName +' '+(pkg.customerId.lastName?pkg.customerId.lastName:'')
    }
    const awbId = (pkg.awbId && pkg.awbId.awbId)?pkg.awbId.awbId:'';    
    const shipperName = (pkg && pkg.shipperId &&  pkg.shipperId.name)? pkg.shipperId.name:'';
    const description = (pkg.awbId && pkg.awbId.note)?pkg.awbId.note:'';
    const trackingNo = pkg.trackingNo?pkg.trackingNo:'';

    emailBody = emailBody.replace("{{CUSTOMERNAME}}",customerName);
    emailBody = emailBody.replace("{{AWBID}}",awbId);
    emailBody = emailBody.replace("{{SHIPPERNAME}}",shipperName);
    emailBody = emailBody.replace("{{AWBDESCRIPTION}}",description);
    emailBody = emailBody.replace("{{TRACKINGNUMBER}}",trackingNo);
    emailBody = emailBody.replace("{{AWBNUMBER}}",awbId);
    
    
    message = { 
        to : (pkg && pkg.customerId && pkg.customerId.email)?pkg.customerId.email:'', 
        from : 'info@postboxesetc.com ',
        subject: `Package Update`,
        html:emailBody
    }; 
    var result = await sendGrid.send(message);

    return result; 
}

async function sendStorePackageEmail(pkg){
    // console.log(pkg,"sending at no docx package.")
    // console.log("ABOUT TO SEND EMAIL",pkg)
    var emailBody = await readEmailTemplate("storepackage"); 
    emailBody = emailBody.replace("{{HOST}}","https://9to5-qa.sprocket.solutions/");
    let customerName = '';
    if(pkg && pkg.customerId && pkg.customerId.firstName){
        customerName = pkg.customerId.firstName;
        customerName = customerName +' '+(pkg.customerId.lastName?pkg.customerId.lastName:'')
    }
    const awbId = (pkg.awbId && pkg.awbId.awbId)?pkg.awbId.awbId:'';    
    const shipperName = (pkg && pkg.shipperId &&  pkg.shipperId.name)? pkg.shipperId.name:'';
    const description = (pkg.awbId && pkg.awbId.note)?pkg.awbId.note:'';
    const trackingNo = pkg.trackingNo?pkg.trackingNo:'';
    const totalPrice = pkg.totalPrice?pkg.totalPrice:0;

    emailBody = emailBody.replace("{{TOTALPRICE}}",totalPrice);
    emailBody = emailBody.replace("{{CUSTOMERNAME}}",customerName);
    emailBody = emailBody.replace("{{AWBID}}",awbId);
    emailBody = emailBody.replace("{{SHIPPERNAME}}",shipperName);
    emailBody = emailBody.replace("{{AWBDESCRIPTION}}",description);
    emailBody = emailBody.replace("{{TRACKINGNUMBER}}",trackingNo);
    emailBody = emailBody.replace("{{AWBNUMBER}}",awbId);
    message = { 
        to : (pkg && pkg.customerId && pkg.customerId.email)?pkg.customerId.email:'', 
        from : 'info@postboxesetc.com ',
        subject: `Package Update`,
        html:emailBody
    }; 
    var result = await sendGrid.send(message);

    return result; 
}
module.exports = { 
    sendNoDocsEmail : sendNoDocsEmail,
    sendAtStoreEmail: sendAtStoreEmail,
    sendNoDocsFL : sendNoDocsFl,
    sendNoDocsPackageEmail:sendNoDocsPackageEmail,
    sendStorePackageEmail:sendStorePackageEmail
    
}