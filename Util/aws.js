
const aws = require('aws-sdk');
var accessKeyId = 'GP7BVXDKARIP6RZDPOJA';
var secretAccessKey = '3Z4gwjLptLFsUhhzWVh9mI2FfbdMG6/EXqdMpnNjyvY';
const spacesEndpoint = new aws.Endpoint('sfo2.digitaloceanspaces.com');
const s3 = new aws.S3({
  accessKeyId: accessKeyId,
  secretAccessKey: secretAccessKey,
  endpoint: spacesEndpoint
});

const bucket = 'vela-space';
const signedUrlExpireSeconds = 60 * 5;

exports.getSignedUrl = (filename) => {
  return s3.getSignedUrl('getObject', {
    Bucket: bucket,
    Key: filename,
    Expires: signedUrlExpireSeconds
  });
}