
var fs = require('fs');
var path = require('path');
const aws = require('aws-sdk');
var accessKeyId = 'ZUCGQ6ERKLI7JHJULMA5';
var secretAccessKey = 'gjNffDxIkWyB7ydmrH8MS5t1ZaUN9TGp/Zj2sNjyOqw';
const spacesEndpoint = new aws.Endpoint('nyc3.digitaloceanspaces.com');
const s3 = new aws.S3({
  accessKeyId: accessKeyId,
  secretAccessKey: secretAccessKey,
  endpoint: spacesEndpoint
});

const bucket = '9to5';
const signedUrlExpireSeconds = 60 * 5;

exports.uploadFile = (filePath, fileName) => {
  console.log('Uploading File', fileName);
  return new Promise((resolve, reject) => {
    if (fileName == undefined || typeof fileName == "undefined" || fileName == "undefined" || fileName === "undefined") {
      console.log("Invalid filename");
      resolve({});
    } else {
      var fileContent = fs.readFileSync(filePath);
      console.log(fileContent);
      var params = {
        Bucket: bucket,
        Key: fileName,
        Body: fileContent
      }
      s3.upload(params, function (err, data) {
        if (err) {
          console.log("ERROR", err);
          reject(err);
        } else {
          // fs.writeFile(global.uploadRoot + '/' + fileName, fileContent, err => console.error(err));
          resolve(data);
        }
      })
    }
  })
}

exports.deleteFile = (fileName) => {
  return new Promise((resolve, reject) => {
    if (fileName == undefined || typeof fileName == "undefined" || fileName == "undefined" || fileName === "undefined") {
      resolve("");
    } else {
      var params = {
        Bucket: bucket,
        Key: fileName
      }
      s3.deleteObject(params, function (err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      })
    }
  })
}

exports.getObjectData = (filename) => {
  return new Promise((resolve, reject) => {
    var file = {
      Bucket: bucket,
      Key: filename
    };
    s3.getObject(file, (err, data) => {
      if (!err) {
        resolve(data);
      } else {
        console.log(err)
      }
    })
  })
}

exports.getObjectReadStream = (filename) => {
  var file = {
    Bucket: bucket,
    Key: filename
  };
  return s3.getObject(file).createReadStream();
}

exports.getSignedUrl = (filename) => {
  if (!filename || filename == undefined || filename == 'undefined')
    return "";
  else
    return s3.getSignedUrl('getObject', {
      Bucket: bucket,
      Key: filename,
      Expires: signedUrlExpireSeconds
    });
}