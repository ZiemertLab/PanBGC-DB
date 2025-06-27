
var SELECTED_ANNOTATION = null;  


function updateSelectedAnnotation(selectedOption) {
    switch (selectedOption) {
        case 'KO Annotation':
            SELECTED_ANNOTATION = 'KO_Annotation_Evalue';
            break;
        case 'PGAP Annotation':
            SELECTED_ANNOTATION = 'PGAP_Annotation_Evalue';
            break;
        case 'PaperBLAST Annotation':
            SELECTED_ANNOTATION = 'PaperBLAST_Annotation_Evalue';
            break;
        case 'CARD Annotation':
            SELECTED_ANNOTATION = 'CARD_Annotation_Evalue';
            break;
        case 'IS Finder':
            SELECTED_ANNOTATION = 'IS_Finder_Evalue';
            break;
        case 'MIBig Annotation':
            SELECTED_ANNOTATION = 'MIBiG_Annotation_Evalue';
            break;
        case 'VOG Annotation':
            SELECTED_ANNOTATION = 'VOG_Annotation_Evalue';
            break;
        case 'VFDB Annotation':
            SELECTED_ANNOTATION = 'VFDB_Annotation_Evalue';
            break;
        case 'Pfam Domains':
            SELECTED_ANNOTATION = 'Pfam_Domains';
            break;
    }

    updateClusterDataTable();
    
    console.log(`SELECTED_ANNOTATION set to: ${SELECTED_ANNOTATION}`);
}


document.getElementById('annotation-library-dropdown').addEventListener('change', function () {
    const selectedOption = this.value;

    
    if (selectedOption !== 'Select annotation database') {
        console.log(`Selected option changed to: ${selectedOption}`);
        updateSelectedAnnotation(selectedOption);
    }
});

window.onload = function() {
    var dropdown = document.getElementById("annotation-library-dropdown");
  
  
  dropdown.selectedIndex = 0;

  
  dropdown.value = "default";
  
  
  if(dropdown.form) {
    dropdown.form.reset(); 
  }

  
  if (performance.getEntriesByType("navigation")[0].type === "reload") {
    sessionStorage.clear(); 
  }
};