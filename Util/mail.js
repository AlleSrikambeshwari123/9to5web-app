var domain = 'mg.coral.media';
// var api_key = process.env.MAILGUN_KEY;
// var api_key = 'key-26b3924502603002f75c25ebde19be8e';

// var mailgun = require('mailgun-js')({ apiKey: api_key, domain: domain });
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const axios = require('axios')

// NOTE: Don't forget to change it before push.
// http://paylanes-dev.sprocket.solutions:3000/
const URL = 'http://paylanes-dev.sprocket.solutions:3000/'

exports.sendEmail = (toEmail, subject, html) => {
  return new Promise(function (resolve, reject) {
    contactService.getInfo().then(contacts => {
      html = html.replace(/{{CONTACT_EMAIL}}/g, contacts.email);
      html = html.replace(/{{CONTACT_LOCATION}}/g, contacts.location);
      html = html.replace(/{{CONTACT_PHONE}}/g, contacts.phone);

      let data = {
        from: '9-5 Import <no-reply@95import.com>',
        to: toEmail,
        subject: subject,
        html: html
      };
      mailgun.messages().send(data, function (error, body) {
        if (error) reject(error);
        else resolve(body);
      })
    })
  })
};


exports.send = (filePath, mailData) => {
  try{
  filePath = path.join(`${appRoot}/public/emails/`, filePath);
  console.log(filePath);
  fs.readFile(filePath, "UTF8", (err, html) => {
    if (err) {
      console.error(err);
    } else {
      if (mailData.NAME)
        html = html.replace(/{{NAME}}/g, mailData.NAME);
      if (mailData.CONFIRM_LINK)
        html = html.replace(/{{CONFIRM_LINK}}/g, mailData.CONFIRM_LINK);
      if (mailData.REF_LINK)
        html = html.replace(/{{REF_LINK}}/g, mailData.REF_LINK);
      if (mailData.MESSAGE)
        html = html.replace(/{{MESSAGE}}/g, mailData.MESSAGE);
      if (mailData.CODE)
        html = html.replace(/{{CODE}}/g, mailData.CODE);
      if (mailData.CARD_NUMBER)
        html = html.replace(/{{CARD_NUMBER}}/g, mailData.CARD_NUMBER);
      if (mailData.PASS)
        html = html.replace(/{{PASS}}/g, mailData.PASS);
      if (mailData.EMAIL)
        html = html.replace(/{{EMAIL}}/g, mailData.EMAIL);
      if (mailData.TRANSACTION)
        html = html.replace(/{{TRANSACTION}}/g, mailData.TRANSACTION);
        const contacts = {
          email:'',
          location:'',
          phone:''
        }
       // contactService.getInfo().then(contacts => {
       // html = html.replace(/{{HOST}}/g, (mailData.HOST ? mailData.HOST : HOST));
        html = html.replace(/{{CONTACT_EMAIL}}/g, contacts.email);
        html = html.replace(/{{CONTACT_LOCATION}}/g, contacts.location);
        html = html.replace(/{{CONTACT_PHONE}}/g, contacts.phone);
        html = html.replace(/{{HOST}}/g, process.env.BASE_URL_WEB);

        // html = setLogoAndColorsForPlatform(html, platformId)
        // html = setPlatformId(html, platformId);

        let data = {
          from: '9-5 Import <no-reply@9to5.com>',
          to: mailData.email,
          subject: mailData.subject,
          html: html
        };
        axios.post(`${process.env.BASE_URL_WEB}/email/nodemail`,data).then(result=>{
          const {data} = result
          if(data.success){
            console.log("Message sent successfully to " + mailData.email);
          }else{
            console.error(data.error ? data.error: data.message);
          }
        })
        .catch((e)=>console.log("errorr" , e))

        axios.get(`${process.env.BASE_URL_WEB}`).then(token=>{
          if(token.data.success){
            setAuthToken(token.data.token)
            axios.post(`${process.env.BASE_URL_WEB}/email/nodemail`,data).then(result=>{
              const {data} = result
              if(data.success){
                console.log("Message sent successfully to " + mailData.email);
              }else{
                console.error(data.error ? data.error: data.message);
              }
            })
          }
        })
       
        // mailgun.messages().send(data, function (error, body) {
        //   if (error) {
        //     console.error(error);
        //   } else {
        //     console.log("Message sent successfully to " + mailData.email);
        //   }
        // })
      //})
    }
  })
}
catch(e){
  console.log("error " , e)
}
}

const setAuthToken = token => {
  if (token) {
    const newToken = `Bearer ${token}`;
    axios.defaults.headers.common["Authorization"] = newToken;
  }
};