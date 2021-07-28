var Router = require('express')()
var email = require('../Util/EmailService');


Router.post('/nodemail',async (req,res)=>{
    // put this in file 
    const{to,subject,html} = req.body;
  await  email.sendResetPassword(to,"Reset Your Password",html).then(data=>{
      console.log(data)
      return data;
      
    })
    })

    module.exports = Router;