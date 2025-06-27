function customDrawCallback() {
    

   let cluster_table = $('#dc_data_table').DataTable();
   
   
   const cutoffValue = parseFloat(document.getElementById("core-v-acc-piechart-cutoff-slider").value);
   
   
   const maxBGCs = Math.max(...cluster_handler.getOriginalClusterData().map(item => item.total_BGCs));

   cluster_table.rows().every(function() {
       let row = this.data();
       let rowNode = $(this.node());
       
       
       rowNode.attr('class', '');

       
       
       
       
       
       if (row.BGC_count === 1) {
           rowNode.addClass('unique_coloring'); 
       } else if (row.BGC_count / maxBGCs >= cutoffValue) {
           rowNode.addClass('core_coloring'); 
       } else {
           rowNode.addClass('acc_coloring'); 
       }
   });

   
   $('#dc_data_table, .dataTables_scrollHeadInner, .dataTables_scrollHeadInner table, .dataTables_scrollBody, .dataTables_scrollBody table').css({
       'width': '100%',
       'min-width': '1000px'
   });
}

function onPageChange() {
    
    
    setTimeout(function() {
        $('#dc_data_table').DataTable().columns.adjust();
        enforceTableWidth();
    }, 100);
}

var only_run_once = false;

function draw_cluster_datatable() {
    const cluster_table = $('#dc_data_table').DataTable();
    cluster_table.clear();
    cluster_table.rows.add(cluster_handler.getClusterData());
    cluster_table.draw();
    
    
    setTimeout(enforceTableWidth, 100);
}

function create_cluster_datatable_menu() {
    
    
    return '_MENU_ records per page';
}

function enforceTableWidth() {
    
    $('#dc_data_table, .dataTables_scrollHeadInner, .dataTables_scrollHeadInner table, .dataTables_scrollBody, .dataTables_scrollBody table').css({
        'width': '100%',
        'min-width': '1000px'
    });

    
    $('.gene_cluster_table_data_area').css({
        'width': '100%',
        'max-width': 'none'
    });

    
    $('#dc_data_table_wrapper').css({
        'width': '100%',
        'max-width': 'none'
    });

    
    $('#dc_data_table').DataTable().columns.adjust();
}

function create_cluster_datatable() {
    $(document).ready(function() {
        
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            
            .core_coloring {
                background-color: rgba(156, 202, 127, 0.8) !important; 
            }
            .acc_coloring {
                background-color: rgba(255, 158, 102, 0.8) !important; 
            }
            .unique_coloring {
                background-color: rgba(84, 112, 198, 0.8) !important; 
            }
            
            
            .core_coloring:nth-child(even) {
                background-color: rgba(156, 202, 127, 0.65) !important;
            }
            .acc_coloring:nth-child(even) {
                background-color: rgba(255, 158, 102, 0.65) !important;
            }
            .unique_coloring:nth-child(even) {
                background-color: rgba(84, 112, 198, 0.65) !important;
            }
            
            
            #dc_data_table tbody tr:hover {
                filter: brightness(1.1);
                cursor: default;
            }
        `;
        document.head.appendChild(styleElement);

        if (!$.fn.DataTable.isDataTable('#dc_data_table')) {
            const cluster_table = $('#dc_data_table').DataTable({
                "language": {
                    "lengthMenu": create_cluster_datatable_menu()
                },
                "scrollY": "380px",
                
                "select": false,
                "hover": true,
                "scrollX": true,
                "scrollCollapse": false,
                "paging": true,
                "autoWidth": true,
                data: cluster_handler.getClusterData(),
                columns: [
                    { 
                        'data': 'Ortholog_Group_OG_ID', 
                        'name': 'gene id',
                        'width': '10%' 
                    },
                    { 
                        'data': 'OG_Consensus_Order', 
                        'name': 'Order',
                        'width': '10%' 
                    },
                    {
                        'data': null,
                        'name': 'Annotation',
                        'width': '40%',
                        'render': function (data, type, row) {
                            if (!SELECTED_ANNOTATION) {
                                return "Please select an annotation library on top of the page";
                            }
                            return row[SELECTED_ANNOTATION] || "No annotation available";
                        }
                    },
                    { 
                        'data': 'BGC_count', 
                        'name': '#Strains',
                        'width': '10%' 
                    },
                    { 
                        'data': 'OG_is_Single_Copy', 
                        'name': 'Duplicated',
                        'width': '10%' 
                    },
                    {
                        'data': 'Entropy',
                        'name': 'Diversity',
                        'width': '10%',
                        'render': function (data, type, row) {
                            return parseFloat(data).toFixed(2);
                        }
                    },
                    { 
                        'data': 'OG_Median_Length_bp', 
                        'name': 'Length',
                        'width': '10%' 
                    }
                ],
                "drawCallback": customDrawCallback
            });

            
            setTimeout(enforceTableWidth, 100);

            
            cluster_table.on('page', onPageChange);
            
            
            $('#core-v-acc-piechart-cutoff-slider').on('input change', function() {
                
                cluster_table.draw();
            });
        }

        var toggleButton_cluster_table = document.getElementById('cluster_table_hide_btn');

        
        $('#cluster_table_hide_btn').on('click', function() {
            var window_cluster_table_data_area = document.querySelector('.gene_cluster_table_data_area');

            if (window_cluster_table_data_area.classList.contains('collapsed')) {
                window_cluster_table_data_area.classList.remove('collapsed');
                toggleButton_cluster_table.textContent = '-';
                
                setTimeout(enforceTableWidth, 100);
            } else {
                window_cluster_table_data_area.classList.add('collapsed');
                toggleButton_cluster_table.textContent = '+';
            }
        });
    });

    
    $(window).on('resize', function() {
        setTimeout(enforceTableWidth, 100);
    });
}

function updateClusterDataTable() {
    let cluster_table = $('#dc_data_table').DataTable();
    cluster_table.clear();
    cluster_table.rows.add(cluster_handler.getClusterData());
    cluster_table.draw();
    
    
    setTimeout(enforceTableWidth, 100);
}


$(document).ready(function() {
    
    setTimeout(function() {
        if ($.fn.DataTable.isDataTable('#dc_data_table')) {
            enforceTableWidth();
        }
    }, 500);
});