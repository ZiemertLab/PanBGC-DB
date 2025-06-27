function create_meta_info_datatable_menu(){
    const htmlString = `
<div class="cluster_menu_container">
  <div style="visibility:hidden;width:0;height:0;overflow:hidden;">_MENU_</div>
  <div id="cluster_menu_details">
    <button class="cluster_button" id="downloadButton_meta_info">Download JSON</button>
  </div>
</div>
<script>
    document.getElementById('downloadButton_meta_info').addEventListener('click', function() {
        
        const jsonObject = meta_info_handler.getMetaInfoData();

        
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

        
        const filename = 'BGC_meta_info_'+day+'_'+month+'_'+year+'__'+hours+'.'+minutes+'.'+seconds+'.json';

        a.download = filename; 

        
        document.body.appendChild(a);

        
        a.click();

        
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    });
</script>
`;

return htmlString;
}