function uploadContentFile(fileInputctrl,  completeHandler){
    var files = fileInputctrl.get(0).files;

    if (files.length > 0){
        // create a FormData object which will be sent as the data payload in the
        // AJAX request
        var formData = new FormData();

        // loop through all the selected files and add them to the formData object
        for (var i = 0; i < files.length; i++) {
            var file = files[i];

            // add the files to formData object for the data payload
            formData.append('uploads[]', file, file.name);
        }

        $.ajax({
            url: '/util/upload',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(data){
                //we want to get the filename uploaded here
                //we are expecting data to be an array of files uploaded now

                //now that we have uploaded lets send it to azure storage
                console.log('upload successful!\n' + data);
                $("#pindecator").css('width',0+'%')
                if (completeHandler !== undefined){
                    completeHandler(data);
                }
            },
            xhr: function() {
                // create an XMLHttpRequest
                var xhr = new XMLHttpRequest();

                // listen to the 'progress' event
                xhr.upload.addEventListener('progress', function(evt) {

                    if (evt.lengthComputable) {
                        // calculate the percentage of upload completed
                        var percentComplete = evt.loaded / evt.total;
                        percentComplete = parseInt(percentComplete * 100);
                        $("#pindecator").css('width',percentComplete+'%')
                        //Materialize.toast("percent complete" + percentComplete);
                        // update the Bootstrap progress bar with the new percentage
                        //$('.progress-bar').text(percentComplete + '%');
                        //$('.progress-bar').width(percentComplete + '%');

                        // once the upload reaches 100%, set the progress bar text to done
                        //if (percentComplete === 100) {
                        //    $('.progress-bar').html('Done');
                        //}

                    }

                }, false);

                return xhr;
            }
        });

    }
}
