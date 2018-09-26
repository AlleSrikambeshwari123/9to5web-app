$(function(){
    var colDef = [
        {
            title: "Box",
            data: null,
            render: function (data, type, row, meta) {
                // console.log(data);
                return "T-"+data.skybox; 
            }
        },
        {
            title: "Name",
            data: null,
            render: function (data, type, row, meta) {
                // console.log(data);
                return `${data.name} `;
            }
        },
        {
            title: "Email",
            data: null,
            render: function (data, type, row, meta) {
                // console.log(data);
                return `${data.email} `;
            }
        },
        {
            title: "mobile",
            data: null,
            render: function (data, type, row, meta) {
                // console.log(data);
                return `${data.mobile} `;
            }
        },
        {
            title: "Location",
            data: null,
            render: function (data, type, row, meta) {
                // console.log(data);
                return `${data.area} `;
            }
        },
        
    ];
     $("#customerTable").DataTable({

        data: rpackages,
        paging: true,

        columns: colDef,
        //bInfo:false,

        "language": {
            "decimal": ",",
            "thousands": "."
        },

        "deferRender": true,
        initComplete: function () {
         
        },

    });
});