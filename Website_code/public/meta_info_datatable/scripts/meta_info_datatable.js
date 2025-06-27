function draw_meta_info_datatable() {
    const meta_info_table = $('#mi_data_table').DataTable();
    const data = meta_info_handler.getMetaInfoData().data;

    meta_info_table.clear();
    meta_info_table.rows.add(data);
    meta_info_table.draw();
}

function create_meta_info_datatable() {
    if (!$.fn.DataTable.isDataTable('#mi_data_table')) {
        const meta_info_table = $('#mi_data_table').DataTable({
            "stripeClasses": ['odd', 'even'],
            "language": {
                "lengthMenu": create_meta_info_datatable_menu()
            },
            "scrollY": "400px",
            "select": true,
            "hover": true,
            "scrollX": true,
            "lengthChange": false, 
            "pageLength": 10, 
            data: meta_info_handler.getMetaInfoData().data,
            columns: [
                { 'data': 'accession', 'name': 'Accession', className: 'dt-left' },
                { 'data': 'organism', 'name': 'Strain', className: 'dt-left' },
                { 'data': 'protocluster_category', 'name': 'BGC type', className: 'dt-left' },
                { 'data': 'geneNr', 'name': 'Number of genes', className: 'dt-left' },
                { 'data': 'PKS_NRPS_prediction', 'name': 'NRPS / PKS', className: 'dt-left' }
            ]
        });

        
        meta_info_table.on('select', function(e, dt, type, indexes) {
            console.log('row selected');
            
        });

        
        meta_info_table.on('deselect', function() {
            console.log('row deselected');
            
        });
    }

    
    var toggleButton_meta = document.getElementById('meta_info_hide_btn'); 

    if (!toggleButton_meta._clickListenerAttached) 
    { 
        toggleButton_meta.addEventListener('click', toggle_meta_hide); 	
        toggleButton_meta._clickListenerAttached = true; 
    }
    function toggle_meta_hide()  { 
        var window_meta = document.getElementById('meta_data_area'); 

        if (window_meta.style.display === 'none') { 
            window_meta.style.display = 'block'; 
            toggleButton_meta.textContent = '-'; 
            } 
            else { 
                window_meta.style.display = 'none'; 
                toggleButton_meta.textContent = '+'; 
            }
        }
}