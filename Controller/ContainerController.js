var services = require('../RedisServices/RedisDataServices');
var utils = require('../Util/utils');

exports.get_container_list = (req, res, next) => {
  services.containerService.getAllContainers().then((containers) => {
    res.render('pages/warehouse/container/list', {
      page: req.originalUrl,
      title: 'Containers',
      user: res.user,
      containers: containers.map(utils.formattedRecord),
    });
  });
};

exports.create_container = (req, res, next) => {
  res.render('pages/warehouse/container/create', {
    page: req.originalUrl,
    title: 'Add New Container',
    user: res.user,
  });
};

exports.add_new_container = (req, res, next) => {
  services.containerService.addContainer(req.body).then((result) => {
    res.send(result);
  });
};

exports.get_container_detail = (req, res, next) => {
  services.containerService.getContainer(req.params.id).then((container) => {
    res.render('pages/warehouse/container/edit', {
      page: req.originalUrl,
      title: 'Container Details',
      user: res.user,
      container: container,
    });
  });
};

exports.update_container = (req, res, next) => {
  services.containerService.updateContainer(req.params.id, req.body).then((result) => {
    res.send(result);
  });
};

exports.delete_container = (req, res, next) => {
  services.containerService.removeContainer(req.params.id).then((result) => {
    res.send(result);
  });
};
