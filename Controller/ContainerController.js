var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');
var helpers = require('../views/helpers');

exports.get_container_list = (req, res, next) => {
  //services.containerService.getAllContainers().then((containers) => {
    res.render('pages/warehouse/container/list', {
      page: req.originalUrl,
      title: 'Containers',
      user: res.user,
      containers: [],//containers.map(utils.formattedRecord),
      daterange:req.query.daterange?req.query.daterange:'',
      clear:req.query.clear
    });
  //});
};

exports.get_all_container_list = (req, res, next) => {
  services.containerService.getAllContainer(req).then((containersResult) => {
    var dataTable = {
      draw: req.query.draw,
      recordsTotal: containersResult.total,
      recordsFiltered: containersResult.total,
      data:[]
    }
    var data = [];
    var containers = containersResult.containers ? containersResult.containers : [];
    for(var i=0; i< containers.length; i++){
      var containerDetail = [];
      containerDetail.push(containers[i].name ? containers[i].name : '');
      containerDetail.push(helpers.formatDate(containers[i].createdAt));
      containerDetail.push(containers[i].number ? containers[i].number : '');
      containerDetail.push(containers[i].size ? containers[i].size : '');
      containerDetail.push(containers[i].weight ? containers[i].weight : '');
      containerDetail.push(containers[i].seal ? containers[i].seal : '');
      containerDetail.push(`<a href="manage/${containers[i]._id}/get"><i class="fas fa-pen"></i></a>`)
      data.push(containerDetail);
    }
    dataTable.data = data;
    res.json(dataTable);
  })
}

exports.create_container = (req, res, next) => {
  res.render('pages/warehouse/container/create', {
    page: req.originalUrl,
    title: 'Add New Container',
    user: res.user,
  });
};

exports.add_new_container = (req, res, next) => {
  req.body['createdBy'] = req['userId'];
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
