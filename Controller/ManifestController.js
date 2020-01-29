var services = require('../RedisServices/RedisDataServices');
var utils = require('../Util/utils');

exports.get_manifest_list = (req, res, next) => {

}

exports.create_manifest = (req, res, next) => {
  res.render('pages/warehouse/manifest/create', {
    page: req.url,
    user: res.user,
    title: 'Create New Manifest',
  })
}