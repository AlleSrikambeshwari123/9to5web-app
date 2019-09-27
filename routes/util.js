var express = require('express');
var router = express.Router();
var middleware = require('../middleware.js'); 

var fs = require('fs'); 
var path = require('path'); 
var formidable = require('formidable');
var mv = require('mv');
var moment = require('moment'); 
var delfile = ''; 
var uniqid = require('uniqid')

const aws = require('aws-sdk');
// const multer = require('multer');
// const multerS3 = require('multer-s3');
var accessKeyId = 'GP7BVXDKARIP6RZDPOJA';
var secretAccessKey = '3Z4gwjLptLFsUhhzWVh9mI2FfbdMG6/EXqdMpnNjyvY';
const spacesEndpoint = new aws.Endpoint('sfo2.digitaloceanspaces.com');
const s3 = new aws.S3({
    accessKeyId: accessKeyId,
  secretAccessKey: secretAccessKey,
    endpoint: spacesEndpoint
  });
router.get('/download-file/:filename',(req,res,next)=>{
    var filename = req.params.filename; 
    var params = {
        Bucket: 'vela-space',
        Key: filename
    };
    res.attachment(filename); 
    var filestream = s3.getObject(params).createReadStream(); 
    filestream.pipe(res);  
    // s3.getObject(params,(err,data)=>{
    //     if (!err){
    //         console.log(data)

    //         res.setHeader('Content-Length', data.ContentLength);
    //         res.write(data.body, 'binary');
    //         res.end();
    //     }
    // })
})
router.post('/upload/', function (req, res) {
    // create an incoming form object
    var body = req.body; 
    var section = req.params.section; 
    var section = 'uploads'
    console.log("yes sur we got a file uploaded! check the upload dir.")
    var uploadedFiles = [];
    var index = 0;
    var form = new formidable.IncomingForm();
    var orignalFiles = []; 
    var uniqueId = uniqid(); 
    // specify that we want to allow the user to upload multiple files in a single request
    form.multiples = false;
    console.log(__dirname);
    // store all uploads in the /uploads directory
    form.uploadDir = path.join(__dirname.replace("routes", ""), '/public/'+section);
    var imagesDir = path.join(__dirname.replace("routes", ""), '/public/images');
    // every time a file has been uploaded successfully,
    // rename it to it's orginal name
    var IMAGES_PATH = path.join(form.uploadDir, '*.{png,jpeg,jpg,svg,gif}');
    form.on('file', function (field, file) {
        //mv(file.path, path.join(form.uploadDir, file.name));
        var content;
        orignalFiles[index] = file.path; 
        // First I want to read the file
        fs.readFile(file.path, function read(err, data) {
            if (err) {
                throw err;
            }
            content = data;
  
            fs.writeFile(path.join(form.uploadDir, uniqueId+file.name), content, function (err) {
                if (err) throw err;
                /!*do something else.*!/
               // fs.unlink(file.path);
            });
        });
  
  
        //fs.rename(file.path, path.join(form.uploadDir, file.name));
        console.log('BIG file uploaded yee-haaaa!');
        uploadedFiles[index] = {
            'uploadedFile': uniqueId+file.name
        };
        var filename = file.name;
  
        console.log("images:" + IMAGES_PATH);
        console.log("publish:" + imagesDir);
  
  
    });
  
    // log any errors that occur
    form.on('error', function (err) {
        console.log('An error has occured: \n' + err);
    });
  
    // once all the files have been uploaded, send a response to the client
    form.on('end', function () {
        //we want to upload to azure storage from here
        console.log(uploadedFiles);
        delfile = orignalFiles[0]; 
       // fs.unlink(orignalFiles[0]);

       //we should store on DO now and then pass the filename back 
        
        var fileLocation = orignalFiles[0]; 
        //var fileLocation = path.join(__dirname.replace("routes", ""), '/public/uploads/') +orignalFiles[0]; 
       
        console.log('file upload ...'+ fileLocation); 
        var params = {
            Body: fs.createReadStream(fileLocation),
            Bucket: "vela-space",
            Key: uploadedFiles[0].uploadedFile,
            //ACL: 'public-read'
        };
        console.log(params)
        
        s3.putObject(params, function(err, data) {
            if (err) console.log(err, err.stack);
            else     console.log(data);
    
            res.end(JSON.stringify(uploadedFiles));
    
        });
  
    });
  
    // parse the incoming request containing the form data
    form.parse(req);
  });

router.post('/upload/:section', function (req, res) {
    // create an incoming form object
    var body = req.body; 
    var section = req.params.section; 
    console.log("yes sur we got a file uploaded! check the upload dir.")
    var uploadedFiles = [];
    var index = 0;
    var form = new formidable.IncomingForm();
    var orignalFiles = []; 
    // specify that we want to allow the user to upload multiple files in a single request
    form.multiples = false;
    console.log(__dirname);
    // store all uploads in the /uploads directory
    form.uploadDir = path.join(__dirname.replace("routes", ""), '/public/uploads/'+section);
    var imagesDir = path.join(__dirname.replace("routes", ""), '/public/images');
    // every time a file has been uploaded successfully,
    // rename it to it's orginal name
    var IMAGES_PATH = path.join(form.uploadDir, '*.{png,jpeg,jpg,svg,gif}');
    form.on('file', function (field, file) {
        //mv(file.path, path.join(form.uploadDir, file.name));
        var content;
        orignalFiles[index] = file.path; 
        var ufilename = uniqid()+file.name
        // First I want to read the file
        fs.readFile(file.path, function read(err, data) {
            if (err) {
                throw err;
            }
            content = data;
  
            fs.writeFile(path.join(form.uploadDir, ufilename), content, function (err) {
                if (err) throw err;
                /!*do something else.*!/
               // fs.unlink(file.path);
            });
        });
  
  
        //fs.rename(file.path, path.join(form.uploadDir, file.name));
        console.log('BIG file uploaded yee-haaaa!');
        uploadedFiles[index] = {
            'uploadedFile': ufilename
        };
        var filename = file.name;
  
        console.log("images:" + IMAGES_PATH);
        console.log("publish:" + imagesDir);
  
  
    });
  
    // log any errors that occur
    form.on('error', function (err) {
        console.log('An error has occured: \n' + err);
    });
  
    // once all the files have been uploaded, send a response to the client
    form.on('end', function () {
        //we want to upload to azure storage from here
        console.log(uploadedFiles);
        delfile = orignalFiles[0]; 
       // fs.unlink(orignalFiles[0]);
        res.end(JSON.stringify(uploadedFiles));
  
    });
  
    // parse the incoming request containing the form data
    form.parse(req);
  });


  module.exports = router;