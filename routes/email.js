var Router = require('express')()
var email = require('../Util/EmailService');


Router.post('/nodemail',(req,res)=>{
    // put this in file 
    const{to,subject,html} = req.body;
    email.sendResetPassword(to,subject,html = "Reset Your Password").then(data=>{
      console.log(data)
      return data;
      
    })
    })

    module.exports = Router;