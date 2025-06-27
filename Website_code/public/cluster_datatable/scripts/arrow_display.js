console.log("GENECLUSTER_LOCATION:", GENECLUSTER_LOCATION);  

let totalBGCs = 0;  


getCachedReportJSON().then(data => {
    console.log("Raw Data Loaded:", data);

    if (Array.isArray(data)) {
        console.log("Data is an array of genes.");
        console.log("Number of Genes Loaded:", data.length);

        totalBGCs = data[0]?.total_BGCs || 100;  
        drawGeneCluster(data);  

        
        const cutoffSlider = document.getElementById("core-v-acc-piechart-cutoff-slider");
        cutoffSlider.addEventListener("input", function () {
            const cutoffValue = parseFloat(cutoffSlider.value);
            document.getElementById("core-v-acc-piechart-cutoff-text-field").textContent = cutoffValue.toFixed(2);
            updateGeneClusterColor(data, cutoffValue);
        });

        
        const initialCutoffValue = parseFloat(cutoffSlider.value);
        updateGeneClusterColor(data, initialCutoffValue);
    } else {
        console.error("Loaded data is not an array. Please check the structure of your JSON.");
    }
}).catch(error => {
    console.error("Error loading JSON data from GENECLUSTER_LOCATION:", GENECLUSTER_LOCATION);
    console.error("Error Details:", error);
});

window.onload = function() {
    const checkbox = document.getElementById('singleBGCCheckbox');
    checkbox.checked = true; 
    
    checkbox.dispatchEvent(new Event('change'));
    showScrollbarOnHover('.maximum_bgc_data_area');
    
    
    highlightScrollableContainers();
};

document.getElementById('singleBGCCheckbox').addEventListener('change', function() {
    const isChecked = this.checked;
    getCachedReportJSON().then(data => {
        if (Array.isArray(data)) {
            const filteredData = isChecked ? data : data.filter(gene => gene.BGC_count > 1);
            drawGeneCluster(filteredData);
            const initialCutoffValue = parseFloat(document.getElementById("core-v-acc-piechart-cutoff-slider").value);
            updateGeneClusterColor(filteredData, initialCutoffValue);
        }
    });
});

function drawGeneCluster(genes) {
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

    const container = d3.select(".maximum_bgc_data_area").node();
    const svgWidth = Math.max(container.getBoundingClientRect().width, 1000);
    const svgHeight = 80; 

    
    d3.select(".maximum_bgc_data_area").selectAll(".scroll-indicator").remove();

    
    const scrollContainer = d3.select(".maximum_bgc_data_area");
    
    
    scrollContainer.append("div")
        .attr("class", "scroll-indicator")
        .style("position", "absolute")
        .style("bottom", "5px")
        .style("right", "15px")
        .style("color", "#95a5a6")
        .style("font-size", "12px")
        .style("opacity", "0.8")
        .style("pointer-events", "none")
        .style("z-index", "10")
        .html('<i class="fas fa-arrows-alt-h"></i> Scroll to view more');

    const svg = d3.select("#gene-cluster-svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight);

    svg.selectAll("*").remove(); 

    if (!genes || genes.length === 0) {
        console.error("No genes to display.");
        return;
    }

    const totalGeneLength = d3.sum(genes, d => d.OG_Median_Length_bp || 0);
    const maxGeneLength = d3.max(genes, d => d.OG_Median_Length_bp || 0);
    const maxDisplayLength = 300;
    const scalingFactor = maxDisplayLength / maxGeneLength;

    let currentX = 5;
    const arrowHeight = 25; 

    genes.forEach((gene, index) => {
        const geneLength = (gene.OG_Median_Length_bp || 0) * scalingFactor;
        const finalGeneLength = Math.max(geneLength, 15);
        const arrowDirection = gene.OG_Consensus_Direction === "+" ? 1 : -1;

        const geneGroup = svg.append("g")
            .attr("class", "gene-group")
            .attr("transform", `translate(${currentX},${svgHeight / 2 - arrowHeight / 2})`) 
            .on("mouseover", function(event) {

                const annotationValue = gene[SELECTED_ANNOTATION] !== undefined ? gene[SELECTED_ANNOTATION] : 'No annotation selected';
                
                
                const geneRatio = gene.BGC_count / totalBGCs;
                const cutoffValue = parseFloat(document.getElementById("core-v-acc-piechart-cutoff-slider").value);
                
                let category = "Unique";
                if (gene.BGC_count === 1) {
                    category = "Unique";
                } else if (geneRatio >= cutoffValue) {
                    category = "Core";
                } else {
                    category = "Accessory";
                }

                tooltip.style("visibility", "visible")
                    .html(`Orthologous group: <b>${gene.Ortholog_Group_OG_ID}</b><br>
                           Annotation: <b>${annotationValue}</b><br>
                           Gene in: <b>${gene.BGC_count}</b> BGCs<br>
                           Category: <b>${category}</b><br>
                           Single copy: <b>${gene.OG_is_Single_Copy}</b><br>
                           Median Length: <b>${gene.OG_Median_Length_bp}</b>`);
            })
            .on("mousemove", function(event) {
                const tooltipWidth = tooltip.node().offsetWidth;
                const tooltipHeight = tooltip.node().offsetHeight;

                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;

                let tooltipX = event.pageX + 10;
                let tooltipY = event.pageY + 10;

                if (tooltipX + tooltipWidth > windowWidth) {
                    tooltipX = event.pageX - tooltipWidth - 10;
                }

                if (tooltipY + tooltipHeight > windowHeight) {
                    tooltipY = event.pageY - tooltipHeight - 10;
                }

                tooltip.style("top", tooltipY + "px").style("left", tooltipX + "px");
            })
            .on("mouseout", function() {
                tooltip.style("visibility", "hidden");
            });

        geneGroup.append("polygon")
            .attr("id", `gene-arrow-${index}`)
            .attr("points", createFlatArrowPoints(finalGeneLength, arrowHeight, arrowDirection))
            .attr("class", "gene-arrow")
            .attr("fill", "gray");

        geneGroup.append("text")
            .attr("y", arrowHeight + 20) 
            .attr("x", finalGeneLength / 2)
            .attr("class", "label")
            .attr("text-anchor", "middle")
            .attr("transform", `rotate(45, ${finalGeneLength / 2}, ${arrowHeight + 20})`)
            .text(gene.Ortholog_Group_OG_ID);

        currentX += finalGeneLength + 5;
    });

    if (currentX > svgWidth) {
        svg.attr("width", currentX);
    }
}


function createFlatArrowPoints(length, height, direction) {
    const halfHeight = height / 2;
    return direction === 1
        ? `0,0 ${length - halfHeight},0 ${length},${halfHeight} ${length - halfHeight},${height} 0,${height}`
        : `0,${halfHeight} ${halfHeight},0 ${length},0 ${length},${height} ${halfHeight},${height}`;
}


function updateGeneClusterColor(genes, cutoffValue) {
    
    const CORE_COLOR = "#9eca7f";         
    const UNIQUE_COLOR = "#5470c6";       
    const ACCESSORY_COLOR = "#ff9e66";    

    genes.forEach((gene, index) => {
        let fillColor;
        
        
        
        
        
        
        if (gene.BGC_count === 1) {
            fillColor = UNIQUE_COLOR; 
        } else if ((gene.BGC_count / totalBGCs) >= cutoffValue) {
            fillColor = CORE_COLOR; 
        } else {
            fillColor = ACCESSORY_COLOR; 
        }
        
        
        d3.select(`#gene-arrow-${index}`)
            .attr("fill", fillColor);
    });
}


function showScrollbarOnHover(containerSelector) {
    const container = document.querySelector(containerSelector);

    if (container) {
        container.addEventListener('mouseenter', function() {
            this.style.overflow = 'scroll';  
        });

        container.addEventListener('mouseleave', function() {
            this.style.overflow = 'hidden';  
        });
    }
}


showScrollbarOnHover('.maximum_bgc_data_area');


function highlightScrollableContainers() {
    const containers = ['.maximum_bgc_data_area', '.core_bgc_data_area'];
    
    containers.forEach(selector => {
        const container = document.querySelector(selector);
        if (!container) return;
        
        
        const checkScrollNeeded = () => {
            const isScrollable = container.scrollWidth > container.clientWidth;
            
            
            const existingIndicator = container.querySelector('.scroll-hint');
            if (existingIndicator) existingIndicator.remove();
            
            
            const oldIndicator = container.querySelector('.scroll-indicator');
            if (oldIndicator) oldIndicator.remove();
            
            if (isScrollable) {
                
                
                
                
                if (window.getComputedStyle(container).position === 'static') {
                    container.style.position = 'relative';
                }
                
                
                const hintContainer = document.createElement('div');
                hintContainer.className = 'scroll-hint-container';
                hintContainer.style.cssText = `
                    position: absolute;
                    left: 0;
                    right: 0;
                    bottom: 5px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    pointer-events: none;
                    z-index: 10;
                `;
                
                
                const hint = document.createElement('div');
                hint.className = 'scroll-hint';
                hint.style.cssText = `
                    padding: 3px 8px;
                    font-size: 12px;
                    color: #95a5a6;
                    text-align: center;
                    white-space: nowrap;
                    opacity: 0.75;
                    background-color: rgba(255, 255, 255, 0.5);
                    border-radius: 10px;
                `;
                
                hint.innerHTML = '<i class="fas fa-arrows-alt-h"></i> Scroll left or right to examine full cluster';
                
                
                hintContainer.appendChild(hint);
                container.appendChild(hintContainer);
                
                
            }
        };
        
        
        checkScrollNeeded();
        window.addEventListener('resize', checkScrollNeeded);
        
        
        container.style.overflow = 'auto';
    });
}