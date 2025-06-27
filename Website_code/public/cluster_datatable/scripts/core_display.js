console.log("GENECLUSTER_LOCATION for Cluster Display:", GENECLUSTER_LOCATION);  


getCachedReportJSON().then(clusterData => {
    console.log("Cluster Data Loaded:", clusterData);

    if (Array.isArray(clusterData)) {
        console.log("Cluster data is an array of genes.");
        console.log("Number of Genes Loaded for Cluster:", clusterData.length);

        clusterTotalBGCs = clusterData[0]?.total_BGCs || 100;  

        
        const initialCutoffValue = parseFloat(document.getElementById("core-v-acc-piechart-cutoff-slider").value);
        drawFilteredClusterGeneCluster(clusterData, initialCutoffValue);

        
        const cutoffSlider = document.getElementById("core-v-acc-piechart-cutoff-slider");
        cutoffSlider.addEventListener("input", function () {
            const cutoffValue = parseFloat(cutoffSlider.value);
            document.getElementById("core-v-acc-piechart-cutoff-text-field").textContent = cutoffValue.toFixed(2);
            drawFilteredClusterGeneCluster(clusterData, cutoffValue);
        });
    } else {
        console.error("Cluster data is not an array. Please check the structure of your JSON.");
    }
}).catch(error => {
    console.error("Error loading JSON data from GENECLUSTER_LOCATION:", GENECLUSTER_LOCATION);
    console.error("Error Details:", error);
});

function drawFilteredClusterGeneCluster(genes, cutoffValue) {
    const svg = d3.select(".core_bgc_data_area svg");
    svg.selectAll("*").remove();  

    const container = d3.select(".core_bgc_data_area").node();
    const svgWidth = Math.max(container.getBoundingClientRect().width, 1000);  
    const svgHeight = 95; 

    svg.attr("width", svgWidth).attr("height", svgHeight);

    const arrowHeight = 30; 
    const maxGeneLength = d3.max(genes, d => d.OG_Median_Length_bp || 0);
    const maxDisplayLength = 300;
    const scalingFactor = maxDisplayLength / maxGeneLength;

    
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "#f9f9f9")
        .style("border", "1px solid #9eca7f")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("font-size", "14px")
        .style("color", "#333");

    
    let totalWidth = 0;
    genes.forEach((gene) => {
        const geneRatio = gene.BGC_count / clusterTotalBGCs;
        if (geneRatio >= cutoffValue) {
            const geneLength = (gene.OG_Median_Length_bp || 0) * scalingFactor;
            totalWidth += Math.max(geneLength, 15) + 5;  
        }
    });

    
    let currentX;
    if (totalWidth <= svgWidth) {
        
        currentX = (svgWidth - totalWidth) / 2;
    } else {
        
        currentX = 0;
    }

    
    genes.forEach((gene) => {
        const geneRatio = gene.BGC_count / clusterTotalBGCs;
        if (geneRatio >= cutoffValue) {
            const geneLength = (gene.OG_Median_Length_bp || 0) * scalingFactor;
            const finalGeneLength = Math.max(geneLength, 15);  
            const arrowDirection = gene.OG_Consensus_Direction === "+" ? 1 : -1;

            
            const geneGroup = svg.append("g")
                .attr("class", "gene-group")
                .attr("transform", `translate(${currentX},${svgHeight / 2 - arrowHeight / 2})`) 
                .on("mouseover", function(event) {

                    const annotationValue = gene[SELECTED_ANNOTATION] !== undefined ? gene[SELECTED_ANNOTATION] : 'No annotation selected';

                    tooltip.style("visibility", "visible")
                        .html(`Orthologous group: <b>${gene.Ortholog_Group_OG_ID}</b><br>
                            Annotation: <b>${annotationValue}</b><br>
                            Gene in: <b>${gene.BGC_count}</b> BGCs<br>
                            Single copy: <b>${gene.OG_is_Single_Copy}</b><br>
                            Median Length: <b>${gene.OG_Median_Length_bp}</b>`);
                })
                .on("mousemove", function(event) {
                    const tooltipWidth = tooltip.node().offsetWidth;
                    const tooltipHeight = tooltip.node().offsetHeight;

                    let tooltipX = event.pageX + 10;
                    let tooltipY = event.pageY + 10;

                    
                    if (tooltipX + tooltipWidth > window.innerWidth) {
                        tooltipX = event.pageX - tooltipWidth - 10;
                    }
                    if (tooltipY + tooltipHeight > window.innerHeight) {
                        tooltipY = event.pageY - tooltipHeight - 10;
                    }

                    tooltip.style("top", tooltipY + "px").style("left", tooltipX + "px");
                })
                .on("mouseout", function() {
                    tooltip.style("visibility", "hidden");
                });

            
            geneGroup.append("polygon")
                .attr("points", createFlatArrowPoints(finalGeneLength, arrowHeight, arrowDirection))
                .attr("class", "gene-arrow")
                .attr("fill", "#9eca7f");  

            
            geneGroup.append("text")
                .attr("y", arrowHeight + 20) 
                .attr("x", finalGeneLength / 2)
                .attr("class", "label")
                .attr("text-anchor", "middle")
                .attr("transform", `rotate(45, ${finalGeneLength / 2}, ${arrowHeight + 20})`)
                .text(gene.Ortholog_Group_OG_ID);

            currentX += finalGeneLength + 5;  
        }
    });

    
    if (totalWidth > svgWidth) {
        svg.attr("width", totalWidth);  
    }
}


function createFlatArrowPoints(length, height, direction) {
    const halfHeight = height / 2;
    return direction === 1
        ? `0,0 ${length - halfHeight},0 ${length},${halfHeight} ${length - halfHeight},${height} 0,${height}`
        : `0,${halfHeight} ${halfHeight},0 ${length},0 ${length},${height} ${halfHeight},${height}`;
}


window.addEventListener('DOMContentLoaded', function() {
    
    
    
    
    const containers = ['.core_bgc_data_area', '.maximum_bgc_data_area'];
    containers.forEach(selector => {
        const container = document.querySelector(selector);
        if (container) {
            
            const oldRightIndicator = container.querySelector('.scroll-indicator');
            if (oldRightIndicator) oldRightIndicator.remove();
            
            
            container.style.overflow = 'auto';
        }
    });
    
    
    setTimeout(() => {
        if (typeof highlightScrollableContainers === 'function') {
            highlightScrollableContainers();
        }
    }, 500);
});