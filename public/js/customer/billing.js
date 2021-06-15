function showPriceBreakupModal(id){
    console.log(`price_breakup_${id}`);
    const modal = $("#priceBreakupModal");
    modal.find('.modal-body').html($(`#price_breakup_${id}`).html());
    modal.modal("show");
   
}