var express = require('express');
var toPdf = require("office-to-pdf")
var fs = require("fs")
var router = express.Router();
var path = require('path');
var mime = require('mime');
var _ = require('lodash');
var formidable = require('formidable');
var moment = require('moment');
var uniqid = require('uniqid')
var aws = require('../Util/aws');

router.get('/download-file/:filename', (req, res, next) => {
  var filename = req.params.filename;
  res.attachment(filename);
  var filestream = aws.getObjectReadStream(filename);
  filestream.pipe(res);
})

router.post('/upload', function (req, res) {
  console.log("Uploading file...");
  var form = new formidable.IncomingForm();
  form.parse(req, (err, fields, files) => {
    if (err) res.send({});
    if (!_.isEmpty(files['upload'])) {
      let name = files['upload'].name
      let filePath = files['upload'].path;
      let ext = files.upload.type.split('/')[1]
      var fileName = uniqid() + '_' + moment().utc().unix() +'.'+ ext;
      var wordBuffer = fs.readFileSync(filePath)
      toPdf(wordBuffer).then(
        (pdfBuffer) => {
          fs.writeFileSync("Templates/"+uniqid() + '_' + moment().utc().unix()+".pdf", pdfBuffer)
        }, (err) => {
          console.log(err)
        }
      )
      // Upload to Cloud && Write to server's upload folder
      aws.uploadFile(filePath, fileName).then(data => {
        console.log(`File Uploaded successfully. ${data.Location}`);
        res.send({
          fileName: fileName,
          filePath: data.Location,
          name : name
        })
      }).catch(err => {
        console.error(err);
        res.send({});
      })
    }
  });
});

router.get('/pdf/:pdfname', (req, res, next) => {
    // res.download(global.uploadRoot + '/' + req.params.pdfname);
    let file = global.uploadRoot + '/' + req.params.pdfname;
    var filename = path.basename(file);
    var mimetype = mime.lookup(file);

    res.setHeader('Content-disposition', 'attachment; filename=' + filename);
    res.setHeader('Content-type', mimetype);

    var filestream = fs.createReadStream(file);
    filestream.pipe(res);
})


module.exports = router;