var ROOT_DOMAIN = "/data/";
var SPECIES_FILES_LOCATION = ROOT_DOMAIN + global_species_abbreviation;
var GENECLUSTER_LOCATION = SPECIES_FILES_LOCATION + "/Report.json";
var METAINFO_LOCATION = SPECIES_FILES_LOCATION + "/gbk_info.json";
var GENE_TANGLEGRAM = SPECIES_FILES_LOCATION + "/nexus.nex";
var CLINKER_HTML = SPECIES_FILES_LOCATION + "/original_plot.html";
var CLUSTER_VISUALIZATION = SPECIES_FILES_LOCATION + "/genbank_data.json";
var HEAPS_LAW_DATA = SPECIES_FILES_LOCATION + "/heaps_law.json";
var UNIQUE_BGC = SPECIES_FILES_LOCATION + "/unique_bgc_curve.json";
var DOMAIN_STATS = ROOT_DOMAIN + "BGC_Domain_Analysis.xlsx"



let REPORT_JSON_CACHE = null;


async function loadReportJSON() {
    if (REPORT_JSON_CACHE) {
        console.log("Using cached Report.json data");
        return REPORT_JSON_CACHE;
    }

    console.log("Fetching Report.json...");
    try {
        const response = await fetch(GENECLUSTER_LOCATION);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        REPORT_JSON_CACHE = await response.json();
        return REPORT_JSON_CACHE;
    } catch (error) {
        console.error("Error loading Report.json:", error);
        return null;
    }
}


async function getCachedReportJSON() {
    return loadReportJSON();
}


document.addEventListener("DOMContentLoaded", () => {
    loadReportJSON();
});