function showPriceBreakupModal(id){
    console.log(`price_breakup_${id}`);
    const modal = $("#priceBreakupModal");
    modal.find('.modal-body').html($(`#price_breakup_${id}`).html());
    modal.modal("show");
   
}


function showAwbModal(id){
    console.log(`price_breakup_${id}`);
    const modal = $("#priceBreakupModal");
    modal.find('.modal-body').html($(`#awb_${id}`).html());
    modal.modal("show");
   
}

function showUploadInvoiceModal(id=""){
    const modal = $("#uploadInvoiceModal");
    modal.find("form").trigger("reset");
    modal.find("button[type='submit']").html("Submit").prop("disabled",false);
    modal.find('[name="awbId"]').val(id);
    modal.modal("show");
    
}
