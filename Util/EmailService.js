require('dotenv').config();
var nodemailer = require('nodemailer');
// const transport = nodemailer.createTransport({
//     host: process.env.SMTP_HOST,
//     port: process.env.SMTP_PORT,
//     tls: { ciphers: 'SSLv3' },
//     auth: {
//         user: process.env.SMTP_USER,
//         pass: process.env.SMTP_PASSWORD
//     }
//     });

    const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        tls: { ciphers: 'SSLv3' },
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
        });

        console.log("env",process.env,"HOST" , process.env.SMTP_HOST  , "SMTP PORT" , process.env.SMTP_PORT ,"user" , process.env.SMTP_USER , "pass" ,process.env.SMTP_PASSWORD, "db", process.env.MONGO_USERNAME );

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
        else if (emailType == "invoice")
            epath = "public/emails/invoices/index.html"
        else if (emailType == "resetpass")
            epath = "public/emails/reset_password/user1.html"
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
    if(awb.awb.customer.email){
        message = {
            to : awb.awb.customer.email, 
            from : 'nodocsnas@postboxesetc.com ',
            subject: `Invoice required AWB No(${awb.awb.id})`,
            html:emailBody
        };
    }else{
        message = {
            to : "kim@postboxesetc.com", 
            from : 'nodocsnas@postboxesetc.com ',
            subject: `Invoice required AWB No(${awb.awb.id})`,
            html:emailBody
        };
    }
     
    var result = await transport.sendMail(message);

    return result; 
    
    
}
async function sendNoDocsFl(awb){
    console.log("ABOUT TO SEND EMAIL",awb)
    var emailBody = await readEmailTemplate("noDocsFl"); 
    emailBody = emailBody.replace("{{NAME}}",awb.awb.customer.name)
    
    emailBody = emailBody.replace("{{AWB}}",awb.awb.id)
    emailBody = emailBody.replace("{{PACKAGES}}",generatePackages(awb))
    if(awb.awb.customer.email){
        message = { 
            to : awb.awb.customer.email, 
            from : 'nodocsnas@postboxesetc.com ',
            subject: `Invoice required AWB No(${awb.awb.id})`,
            html:emailBody
        };
    }else{
        message = { 
            to : "kim@postboxesetc.com", 
            from : 'nodocsnas@postboxesetc.com ',
            subject: `Invoice required AWB No(${awb.awb.id})`,
            html:emailBody
        };
    }
     
    var result = await transport.sendMail(message);

    return result; 
}
async function sendAtStoreEmail(store,pkg){
    console.log("sending at store package.")
    console.log("ABOUT TO SEND EMAIL")
    var emailBody = await readEmailTemplate("store"); 
    emailBody = emailBody.replace("{{NAME}}",pkg.awb.customer.name)
    emailBody = emailBody.replace("{{LOCATION}}",store)
    emailBody = emailBody.replace("{{LOCNAME}}",store)
    
    emailBody = emailBody.replace("{{AWB}}",pkg.awb.id)
    
    emailBody = emailBody.replace("{{PACKAGES}}",generatePackage(pkg))
    if(pkg.awb.customer.email){
        message = { 
            to : pkg.awb.customer.email, 
            from : 'info@postboxesetc.com ',
            subject: `Package is at Postboxes Etc. ${store}`,
            html:emailBody
        };
    }else{
        message = { 
            to : "kim@postboxesetc.com", 
            from : 'info@postboxesetc.com ',
            subject: `Package is at Postboxes Etc. ${store}`,
            html:emailBody
        };
    }
     
    var result = await transport.sendMail(message);

    return result; 
}

async function sendInvoicesEmail(invoice,customer,awbId){
    console.log("sending at invoices mail.")
    console.log("ABOUT TO SEND EMAIL")
    var emailBody = await readEmailTemplate("invoice"); 
    let customerName = customer.firstName;

     customerName = customerName +' '+(customer.lastName?customer.lastName:'')
    emailBody = emailBody.replace("{{HOST}}","https://9to5-qa.sprocket.solutions/");
    emailBody = emailBody.replace("{{CUSTOMERNAME}}",customerName)
    emailBody = emailBody.replace("{{AWBID}}",awbId)
    emailBody = emailBody.replace("{{PMB}}",invoice.pmb)
    emailBody = emailBody.replace("{{TRACKINGID}}",invoice.courierNo)
    if(customer.email){
        message = { 
            to : customer.email, 
            from : 'info@postboxesetc.com ',
            subject: `Invoice Uploaded`,
            html:emailBody
        }; 
    }else{
        message = { 
            to : "kim@postboxesetc.com", 
            from : 'info@postboxesetc.com ',
            subject: `Invoice Uploaded`,
            html:emailBody
        };
    }
    
    var result = await transport.sendMail(message);

     return result; 
}

async function sendAgingEmail(pkg){
    console.log("sending at store package.")
    console.log("ABOUT TO SEND EMAIL")
    var emailBody = await readEmailTemplate("store");
    let customerName = '';
    let emailTo = '';
    if(pkg && pkg.customerId && pkg.customerId.firstName){
        customerName = pkg.customerId.firstName;
        customerName = customerName +' '+(pkg.customerId.lastName?pkg.customerId.lastName:'')
        emailTo = pkg.customerId.email ? pkg.customerId.email : 'kim@postboxesetc.com'
    }
    const awbId = (pkg.awbId && pkg.awbId.awbId)?pkg.awbId.awbId:'';    
    // const shipperName = (pkg && pkg.shipperId &&  pkg.shipperId.name)? pkg.shipperId.name:'';
    // const description = (pkg.awbId && pkg.awbId.note)?pkg.awbId.note:'';
    // const trackingNo = pkg.trackingNo?pkg.trackingNo:''; 
    emailBody = emailBody.replace("{{NAME}}",customerName)
    // emailBody = emailBody.replace("{{LOCATION}}",store)
    // emailBody = emailBody.replace("{{LOCNAME}}",store)
    
    emailBody = emailBody.replace("{{AWB}}",awbId)
    
    // emailBody = emailBody.replace("{{PACKAGES}}",generatePackage(pkg))
    message = { 
        to : emailTo, 
        from : 'info@postboxesetc.com ',
        subject: `Aging Started`,
        html:emailBody
    };
        
    var result = await transport.sendMail(message);

    return result; 
}

async function sendNoDocsPackageEmail(pkg){
    console.log("sending at no docx package.")
    console.log("ABOUT TO SEND EMAIL")
    var emailBody = await readEmailTemplate("nodocspackage"); 
    emailBody = emailBody.replace("{{HOST}}","https://9to5-qa.sprocket.solutions/");
    let customerName = '';
    if(pkg && pkg.customerId && pkg.customerId.firstName){
        customerName = pkg.customerId.firstName;
        customerName = customerName +' '+(pkg.customerId.lastName?pkg.customerId.lastName:'')
    }
    const awbId = (pkg.awbId && pkg.awbId.awbId)?pkg.awbId.awbId:'';    
    const shipperName = (pkg && pkg.shipperId &&  pkg.shipperId.name)? pkg.shipperId.name:'';
    const description = pkg.description ? pkg.description : '';
    // const trackingNo = pkg.trackingNo?pkg.trackingNo:'';
    const trackingNo = pkg.originBarcode.barcode
    emailBody = emailBody.replace("{{CUSTOMERNAME}}",customerName);
    emailBody = emailBody.replace("{{AWB}}",awbId);
    emailBody = emailBody.replace("{{AWBID}}",awbId);
    emailBody = emailBody.replace("{{SHIPPERNAME}}",shipperName);
    emailBody = emailBody.replace("{{AWBDESCRIPTION}}",description);
    emailBody = emailBody.replace("{{TRACKINGNUMBER}}",trackingNo);
    emailBody = emailBody.replace("{{AWBNUMBER}}",awbId);
    
    
    message = { 
        to : (pkg && pkg.customerId && pkg.customerId.email)?pkg.customerId.email:'kim@postboxesetc.com', 
        from : 'invoice@postboxesetc.com',
        subject: `Invoice needed AWB # `+ awbId,
        html:emailBody
    }; 
    var result = pkg && pkg.customerId && pkg.customerId.email ? await transport.sendMail(message):'Email Not Found';

    return result; 
}

async function sendStorePackageEmail(pkg){
    console.log("sending at Store package.")
    console.log("ABOUT TO SEND EMAIL")
    var emailBody = await readEmailTemplate("storepackage"); 
    emailBody = emailBody.replace("{{HOST}}","https://9to5-qa.sprocket.solutions/");
    let customerName = '';
    if(pkg && pkg.customerId && pkg.customerId.firstName){
        customerName = pkg.customerId.firstName;
        customerName = customerName +' '+(pkg.customerId.lastName?pkg.customerId.lastName:'')
    }
    const awbId = (pkg.awbId && pkg.awbId.awbId)?pkg.awbId.awbId:'';    
    const shipperName = (pkg && pkg.shipperId &&  pkg.shipperId.name)? pkg.shipperId.name:'';
    const description = pkg.description ? pkg.description : '';
    // const trackingNo = pkg.trackingNo?pkg.trackingNo:'';
    const trackingNo = pkg.originBarcode.barcode
    const totalPrice = pkg.totalPrice?pkg.totalPrice:0;

    emailBody = emailBody.replace("{{TOTALPRICE}}",totalPrice);
    emailBody = emailBody.replace("{{CUSTOMERNAME}}",customerName);
    emailBody = emailBody.replace("{{AWBID}}",awbId);
    emailBody = emailBody.replace("{{SHIPPERNAME}}",shipperName);
    emailBody = emailBody.replace("{{AWBDESCRIPTION}}",description);
    emailBody = emailBody.replace("{{TRACKINGNUMBER}}",trackingNo);
    emailBody = emailBody.replace("{{AWBNUMBER}}",awbId);
    message = { 
        to : (pkg && pkg.customerId && pkg.customerId.email)?pkg.customerId.email:'kim@postboxesetc.com', 
        from : 'info@postboxesetc.com ',
        subject: `Your order is at the store`,
        html:emailBody
    }; 
    var result = pkg && pkg.customerId && pkg.customerId.email ? await transport.sendMail(message): 'Email Not Found';

    return result; 
}
async function sendReportEmail(toEmail,subject, emailBody){
    console.log("sendReportEmail")
    
    message = { 
        to : toEmail?toEmail:'kim@postboxesetc.com', 
        from : '9-5 Import <no-reply@95import.com>',
        subject: subject,
        html:emailBody
    }; 
    var result = toEmail ? await transport.sendMail(message): 'Email Not Found';
    return result; 
}
async function sendResetPassword(toEmail,subject, emailBody){
    console.log("send Reset Password")
    console.log("HOST" , process.env.SMTP_HOST  , "SMTP PORT" , process.env.SMTP_PORT ,"user" , process.env.SMTP_USER , "pass" ,process.env.SMTP_PASSWORD );
    var emailBody1 = await readEmailTemplate("resetpass"); 
    
    message = { 
        to : toEmail?toEmail:'kim@postboxesetc.com', 
        from : '9-5 Import <no-reply@95import.com>',
        subject: "Reset Your Password",
        html:emailBody1
    }; 
    console.log("transport" , transport);
    transport.verify(function(error, success) {
        if (error) {
          console.log(error);
        } else {
          console.log("Server is ready to take our messages");
        }
      });
    var result = toEmail ? await transport.sendMail(message): 'Email Not Found';
    return result; 
}
module.exports = { 
    sendResetPassword:sendResetPassword,
    sendNoDocsEmail : sendNoDocsEmail,
    sendAtStoreEmail: sendAtStoreEmail,
    sendAgingEmail: sendAgingEmail,
    sendNoDocsFL : sendNoDocsFl,
    sendNoDocsPackageEmail:sendNoDocsPackageEmail,
    sendStorePackageEmail:sendStorePackageEmail,
    sendInvoicesEmail : sendInvoicesEmail,
    sendReportEmail:sendReportEmail
}
