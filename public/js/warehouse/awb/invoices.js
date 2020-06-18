window.AWBInvoices = (() => {
  let template = $('#invoice-row-template').html();
  let container = $('#invoices-container');
  let cidcnt = Date.now();

  function addInvoceRow(data) {
    data = data || {};
    let cid = cidcnt++;
    let row = $(template.replace(/{CID}/g, cid).replace(/{ID}/g, data.id || ''));

    Object.keys(data).forEach((key) => {
      row.find(`[name="invoice.${key}"]`).val(data[key] || '');
    });

    container.append(row);
    new FileUploadWithPreview('invoice-upload-field-' + cid);
  }

  function removeLastInvoiceRow() {
    container
      .find('.invoice-upload-row')
      .last()
      .remove();
  }

  function getInvoices() {
    const data = container
      .find('.invoice-upload-row')
      .toArray()
      .map((container) => {
        return {
          id:
            $(container)
              .find('[name="invoice.id"]')
              .val() || undefined,
          number: $(container)
            .find('[name="invoice.number"]')
            .val(),
          value: $(container)
            .find('[name="invoice.value"]')
            .val(),
          file: $(container).find('[name="invoice.file"]'),
        };
      });
    
    // console.error('data ', data);  

    return data;  
  }

  $('#awb-form-add-invoice').click(function() {
    addInvoceRow();
  });

  $('#awb-form-remove-invoice').click(function() {
    removeLastInvoiceRow();
  });

  return {
    addInvoceRow,
    removeLastInvoiceRow,
    getInvoices,
  };
})();
