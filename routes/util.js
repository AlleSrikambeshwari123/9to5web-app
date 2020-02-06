var express = require('express');
var router = express.Router();

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
      let filePath = files['upload'].path;
      var fileName = uniqid() + '_' + moment().utc().unix() + ".png";
      // Upload to Cloud && Write to server's upload folder
      aws.uploadFile(filePath, fileName).then(data => {
        console.log(`File Uploaded successfully. ${data.Location}`);
        res.send({
          fileName: fileName,
          filePath: data.Location
        })
      }).catch(err => {
        console.error(err);
        res.send({});
      })
    }
  });
});

router.get('/pdf/:pdfname', (req, res, next) => {
  res.download(global.uploadRoot + '/' + req.params.pdfname);
})


module.exports = router;