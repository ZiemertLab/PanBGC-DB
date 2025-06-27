self.onmessage = function (event) {
    const { jsonData } = event.data;

    try {
        console.log("Processing heatmap data in Web Worker...");

        
        const xLabels = [...new Set(jsonData.map(d => d.Ortholog_Group_OG_ID))];
        const yLabels = [...new Set(
            jsonData.flatMap(d => d.CDS_Locus_Tags.split(';').map(tag => tag.split('|')[0].trim()))
        )];

        
        const presenceMap = new Map();
        jsonData.forEach(entry => {
            const ogID = entry.Ortholog_Group_OG_ID;
            entry.CDS_Locus_Tags.split(';').forEach(tag => {
                const locus = tag.split('|')[0].trim();
                if (!presenceMap.has(locus)) {
                    presenceMap.set(locus, new Set());
                }
                presenceMap.get(locus).add(ogID);
            });
        });

        
        const matrix = yLabels.map(yTag =>
            xLabels.map(xID => presenceMap.get(yTag)?.has(xID) ? 1 : 0)
        );

        
        self.postMessage({ xLabels, yLabels, matrix });

    } catch (error) {
        self.postMessage({ error: error.message });
    }
};