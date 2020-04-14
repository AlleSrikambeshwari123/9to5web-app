let AWBPO = (() => {
  let items = [];
  let deletedItems = [];

  let hydratedItems = $('#awbPOTable tr[data-item]')
    .map(function() {
      return $(this).data('item');
    })
    .toArray();

  var table = $('#awbPOTable').DataTable({
    pageLength: 5,
    ordering: false,
    searching: false,
    lengthChange: false,
    width: '100%',
    columns: [
      { data: 'sourceText' },
      { data: 'paidTypeText' },
      { data: 'notes' },
      { data: 'serviceTypeText' },
      { data: 'amount' },
      {},
    ],
    columnDefs: [
      {
        data: null,
        defaultContent:
          '<a data-action="remove" class="btn btn-link btn-danger p-1"><i class="fa fa-trash"></i> </a>',
        targets: -1,
      },
    ],
  });

  table.on('click', 'a[data-action="remove"]', function() {
    var data = table.row($(this).parents('tr')).data();
    items = items.filter(function(item) {
      if (item.cid !== data.cid) {
        return true;
      } else {
        deletedItems.push({_id: item._id, deleted: true});
        return false;
      }
    });

    table
      .row($(this).parents('tr'))
      .remove()
      .draw();
  });

  table.clear();

  hydratedItems.forEach(addRow);
  table.draw();

  function addRow(item) {
    item.cid = Math.floor(Math.random() * 1e9);
    items.push(item);
    table.row.add(item);
  }

  function addItem(item) {
    addRow(item);
    table.draw();
  }

  function getItems() {
    return items;
  }

  function getDeletedItems() {
    return deletedItems;
  }

  return {
    addItem,
    getItems,
    getDeletedItems
  };
})();
