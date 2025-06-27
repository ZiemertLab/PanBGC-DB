function create_cluster_datatable_menu(){
    const htmlString = `
<div class="cluster_menu_container"> _MENU_ entries 
<div id="cluster_menu_details">
<div class='core_coloring' id='coreElem'>Core /</div><div class='acc_coloring' id='accElem'>Accessory</div>
  <button class="cluster_button" id="downloadButton_cluster">Download JSON</button> 
  <button class="cluster_button" id="resetButton_cluster">Reset Data</button> 
</div>
</div>
<script>
    document.getElementById('downloadButton_cluster').addEventListener('click', function() {
        
        const jsonObject = cluster_handler.getClusterData();

        
        const jsonString = JSON.stringify(jsonObject, null, 2); 

        
        const blob = new Blob([jsonString], { type: 'application/json' });

        
        const url = URL.createObjectURL(blob);

        
        const a = document.createElement('a');
        a.href = url;
        
        
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0'); 
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        
        const filename = 'BGCdata_'+day+'_'+month+'_'+year+'__'+hours+'.'+minutes+'.'+seconds+'.json';

        a.download = filename; 

        
        document.body.appendChild(a);

        
        a.click();

        
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    });

    document.getElementById('resetButton_cluster').addEventListener('click', function() {
                cluster_handler.setSelectedGeneData({ Ortholog_Group_OG_ID: '', geneLen: '' });
                cluster_handler.setWhichChartsToUpdate('ABC');
                cluster_handler.setClusterData(cluster_handler.getOriginalClusterData());
    });

</script>
`;

return htmlString;
}