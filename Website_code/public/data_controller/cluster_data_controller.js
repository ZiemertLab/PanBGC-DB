class ClusterDataHandler {
    constructor(data) {
        this.original_cluster_data = data;
        this.selectedGene = ['', ''];
        this.acc_genes_mask = [];
        this.changeCallbacks = [];
        this.initialisation = true;
        this.cluster_data = this.createWatchedData(data);
        this.core_genome = [];
        this.acc_genome = [];
        this.update_charts = 'ABCD';
        this.isLoading = true;
    }

    createWatchedData(data) {
        const handler = {
            set: (target, property, value) => {
                target[property] = value;
                if (property === 'length' || !isNaN(property)) {
                    this.triggerChange();
                }
                return true;
            }
        };
        return new Proxy(data, handler);
    }

    triggerChange() {
        this.changeCallbacks.forEach(callback => callback(this.cluster_data));
    }

    onChange(callback) {
        this.changeCallbacks.push(callback);
    }

    setClusterData(data) {
        this.cluster_data = this.createWatchedData(data);
        this.triggerChange();
    }

    getClusterData() {
        return this.cluster_data;
    }

    setSelectedGeneData(selected_gene_data) {
        this.selectedGene = selected_gene_data;
    }

    getSelectedGeneData() {
        return this.selectedGene;
    }

    getOriginalClusterData() {
        return this.original_cluster_data;
    }

    setOriginalClusterData(data) {
        this.original_cluster_data = data;
    }

    update_core_acc_chart() {
        draw_core_acc_chart();
    }

    update_geneid_straincount_chart() {
        draw_geneid_straincount_chart();
    }

    update_genelength_genecount_chart() {
        draw_genelength_genecount_chart();
    }

    update_cluster_datatable() {
        draw_cluster_datatable();
    }

    setInitialisationStatus() {
        this.initialisation = false;
    }

    getInitialisationStatus() {
        return this.initialisation;
    }

    setCoreGenome(data) {
        this.core_genome = data;
    }

    getCoreGenome() {
        return this.core_genome;
    }

    setAccGenome(data) {
        this.acc_genome = data;
    }

    getAccGenome() {
        return this.acc_genome;
    }

    setLoading() {
        if (this.isLoading) { 
            this.isLoading = !this.isLoading;
            document.body.style.cursor = 'progress';
            console.log('starting loading');
        } else { 
            this.isLoading = !this.isLoading;
            document.body.style.cursor = 'default';
            console.log('loading finished');
        }
    }

    getLoading() {
        return this.isLoading;
    }

    ColorizeAccCore() {

        let SelectedGeneID = this.getSelectedGeneData();
        let cluster_table = $('#dc_data_table').DataTable();
        let colorMaskSet_ids = new Set(this.getAccGenome().map(item => item.geneId));

        const applyRowStyles = () => {
            cluster_table.rows().every(function() {
                let row = this.data();
                let rowNode = $(this.node());

                
                rowNode.attr('class', '');

                
                if (row.geneId === SelectedGeneID.geneId) {
                    this.select();
                }

                if (colorMaskSet_ids.size !== 0) {
                    if (colorMaskSet_ids.has(row.geneId)) {
                        rowNode.addClass('acc_coloring');
                    } else {
                        rowNode.addClass('core_coloring');
                    }
                }
            });
        };

        applyRowStyles();

    }

    setWhichChartsToUpdate(data) {
        this.update_charts = data;
    }

    getWhichChartsToUpdate() {
        return this.update_charts;
    }

    updateCharts() {
        if (this.getWhichChartsToUpdate().includes('A')) { this.update_cluster_datatable(); }
        if (this.getWhichChartsToUpdate().includes('B')) { this.update_geneid_straincount_chart(); }
        if (this.getWhichChartsToUpdate().includes('C')) { this.update_genelength_genecount_chart(); }
        if (this.getWhichChartsToUpdate().includes('D')) { this.ColorizeAccCore(); }
        this.setWhichChartsToUpdate('ABCD');
    }
}


const cluster_handler = new ClusterDataHandler([]);
const cluster_loader = new JSONLoader('loader', 'progressBar');

cluster_handler.setLoading();

cluster_loader.loadAndDisplay(GENECLUSTER_LOCATION, (data) => {
    cluster_handler.setClusterData(data);
    cluster_handler.setOriginalClusterData(data);
    create_cluster_datatable();
    cluster_handler.update_core_acc_chart();
    cluster_handler.update_geneid_straincount_chart();
    cluster_handler.update_genelength_genecount_chart();
    cluster_handler.setInitialisationStatus();
    cluster_handler.setLoading();
});

cluster_handler.onChange((newData) => {
    if (cluster_handler.getInitialisationStatus() === true) {
        console.log('initialisation cluster data... ended successfully');
    } else {
        cluster_handler.updateCharts();
    }
});
