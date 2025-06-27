class MetaInfoDataHandler {
    constructor(data) {
        this.meta_info_data = data;
        this.initialisation = true;
    }

    setMetaInfoData(data) {
        this.meta_info_data = data;
    }

    getMetaInfoData() {
        return this.meta_info_data;
    }

    setInitialisationStatus() {
        this.initialisation = false;
    }
    
    getInitialisationStatus() {
        return this.initialisation;
    }
}


const meta_info_handler = new MetaInfoDataHandler([]);
const meta_info_loader = new JSONLoader('loader', 'progressBar');


///////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////
meta_info_loader.loadAndDisplay(METAINFO_LOCATION, (data) => {
    meta_info_handler.setMetaInfoData(data);

    
    $(document).ready(function() {
        create_meta_info_datatable();
        draw_meta_info_datatable();

        meta_info_handler.setInitialisationStatus();
        console.log('initialisation meta info data... ended successfully');
    });
});