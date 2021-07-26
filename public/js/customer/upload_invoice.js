function showUploadInvoiceModal(id=""){
    const modal = $("#uploadInvoiceModal");
    modal.find("form").trigger("reset");
    modal.find("button[type='submit']").html("Submit").prop("disabled",false);
    modal.find('[name="awbId"]').val(id);
    modal.modal("show");
    
}

$(document).ready(function(){
    const _spinner = "<i class='fa fa-spinner fa-spin'></i>";
    $("#uploadInvoiceModal").find("form").submit(async function(event){
        event.preventDefault();
        const form = $(this);
        const button = form.find("button[type='submit']");
        button.prop("disabled",true).html(_spinner);
        const formD = new FormData(this);
        try{
            await postFormData('/customer/upload/invoice',formD);
            $("#uploadInvoiceModal").modal("hide");
            showNotify('Sucess', "Invoice uploaded successfully !", 'fa fa-info', 'success');
        }catch(err){
            showNotify('Failed', "Internal Server Error", 'fa fa-info', 'danger');
        }
        button.html("Submit").prop("disabled",false);
    });
});