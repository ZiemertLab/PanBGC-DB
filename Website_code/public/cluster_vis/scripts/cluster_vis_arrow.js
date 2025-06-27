/**
 * Add cut sliders to a BGC - completely revised for better handling
 */
function addCutSliders(bgcGroup, bgcName, y, totalLength, scalingFactor) {
    
    const sliderGroup = bgcGroup.append("g")
        .attr("class", "cut-slider-group");
    
    
    const currentTransform = bgcGroup.attr("transform");
    const offsetX = currentTransform ? parseFloat(currentTransform.match(/translate\(([^,]+),/)?.[1] || 0) : 0;
    
    
    sliderGroup.append("line")
        .attr("x1", LEFT_PADDING)
        .attr("y1", y + ARROW_HEIGHT + 10)
        .attr("x2", LEFT_PADDING + (totalLength * scalingFactor))
        .attr("y2", y + ARROW_HEIGHT + 10)
        .attr("stroke", "#ccc")
        .attr("stroke-width", 2);
    
    
    if (!cutPoints[bgcName]) {
        cutPoints[bgcName] = {
            left: 0,
            right: totalLength
        };
    }
    
    
    const leftSliderX = LEFT_PADDING + (cutPoints[bgcName].left * scalingFactor);
    const rightSliderX = LEFT_PADDING + (cutPoints[bgcName].right * scalingFactor);
    
    
    createSlider("left", leftSliderX, bgcName, y, scalingFactor, totalLength, offsetX);
    
    
    createSlider("right", rightSliderX, bgcName, y, scalingFactor, totalLength, offsetX);
    
    
    function createSlider(side, initialX, bgcName, y, scalingFactor, totalLength, offsetX) {
        const slider = sliderGroup.append("g")
            .attr("class", `cut-slider-${side}`)
            .attr("transform", `translate(${initialX}, ${y + ARROW_HEIGHT + 10})`)
            .style("cursor", "ew-resize");
        
        
        slider.append("circle")
            .attr("r", 8)
            .attr("fill", "#4CAF50")
            .attr("stroke", "#388E3C")
            .attr("stroke-width", 2);
        
        
        slider.append("text")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("font-size", "10px")
            .attr("fill", "white")
            .attr("y", 0)
            .text("✂");
        
        
        const posLabel = slider.append("text")
            .attr("class", "slider-pos-label")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "hanging")
            .attr("y", 15)
            .attr("font-size", "10px")
            .attr("fill", "#333")
            .text(side === "left" ? cutPoints[bgcName].left : cutPoints[bgcName].right);
        
        
        const drag = d3.drag()
            .on("start", function() {
                d3.select(this).select("circle").attr("fill", "#81C784");
            })
            .on("drag", function(event) {
                
                const currentTransform = bgcGroup.attr("transform");
                const offsetX = currentTransform ? parseFloat(currentTransform.match(/translate\(([^,]+),/)?.[1] || 0) : 0;
                
                
                const minX = side === "left" ? LEFT_PADDING : LEFT_PADDING + 10;
                const maxX = side === "left" ? 
                    LEFT_PADDING + (cutPoints[bgcName].right - 10) * scalingFactor : 
                    LEFT_PADDING + (totalLength * scalingFactor);
                
                
                let newX = Math.max(minX, Math.min(maxX, event.x));
                
                
                d3.select(this).attr("transform", `translate(${newX}, ${y + ARROW_HEIGHT + 10})`);
                
                
                const seqPos = Math.round((newX - LEFT_PADDING) / scalingFactor);
                
                
                posLabel.text(seqPos);
                
                
                if (side === "left") {
                    cutPoints[bgcName].left = seqPos;
                } else {
                    cutPoints[bgcName].right = seqPos;
                }
                
                
                updateGeneVisibility(bgcName);
            })
            .on("end", function() {
                d3.select(this).select("circle").attr("fill", "#4CAF50");
                
                
                const position = (side === "left") ? cutPoints[bgcName].left : cutPoints[bgcName].right;
                showNotification(`Cut ${side} side of ${bgcName} at position ${position}`);
                
                
                resetCursorState();
            });
        
        
        slider.call(drag);
    }
}

/**
 * Update gene visibility based on cut points - completely revised for inverted clusters
 */
function updateGeneVisibility(bgcName) {
    try {
        const bgcGroup = d3.select(`#bgc-${bgcName.replace(/\./g, '_')}`);
        const left = cutPoints[bgcName].left;
        const right = cutPoints[bgcName].right;
        const isInverted = invertedBgcs.has(bgcName);
        const totalLength = bgcData[bgcName].total_length;
        
        
        bgcGroup.selectAll(".gene-group").each(function() {
            const geneGroup = d3.select(this);
            
            
            const origStart = +geneGroup.attr("data-start");
            const origEnd = +geneGroup.attr("data-end");
            
            
            let visibleStart, visibleEnd;
            
            if (isInverted) {
                
                
                visibleStart = origStart;
                visibleEnd = origEnd;
            } else {
                
                visibleStart = origStart;
                visibleEnd = origEnd;
            }
            
            
            if (visibleStart < left || visibleEnd > right) {
                geneGroup.style("display", "none");
            } else {
                geneGroup.style("display", "block");
            }
        });
    } catch (err) {
        console.error("Error in updateGeneVisibility:", err);
        resetCursorState();
    }
}

/**
 * Enhanced BGC Comparison Visualization
 * Simplified implementation with dynamic reordering and improved inversion
 */


let bgcData = {};                 
let sortedOGIDs = [];             
let selectedOGID = null;          
let originalPositions = {};       
let invertedBgcs = new Set();     
let draggedBgc = null;            
let bgcOrder = [];                
let cutPoints = {};               


const ARROW_HEIGHT = 24;
const BGC_VERTICAL_SPACING = 40;
const LEFT_PADDING = 120;


const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background", "#f9f9f9")
    .style("border", "1px solid #9eca7f")
    .style("padding", "10px")
    .style("border-radius", "5px")
    .style("font-size", "14px")
    .style("color", "#333")
    .style("z-index", "1000");


document.addEventListener('DOMContentLoaded', initVisualization);

/**
 * Main initialization function
 */
function initVisualization() {
    
    setupContainers();
    
    
    fetch(CLUSTER_VISUALIZATION)
        .then(response => response.json())
        .then(data => {
            console.time('Visualization');
            bgcData = data;
            
            
            bgcOrder = Object.keys(bgcData);
            
            
            extractOGIDs();
            
            
            createVisualization();
            
            
            addTopControls();
            
            
            setupAnnotationWatcher();
            
            
            
            
            console.timeEnd('Visualization');
        })
        .catch(error => console.error('Error loading BGC data:', error));
}

/**
 * Modified setupContainers function to add a better-styled Quick Guide button
 */
function setupContainers() {
    const mainContainer = document.getElementById("clinker_mainview");
    
    
    mainContainer.innerHTML = '';
    
    
    mainContainer.style.position = "relative";
    mainContainer.style.overflow = "hidden";
    mainContainer.style.height = "800px";
    
    
    const flexContainer = document.createElement("div");
    flexContainer.className = "flex-container";
    flexContainer.style.display = "flex";
    flexContainer.style.width = "100%";
    flexContainer.style.height = "100%";
    mainContainer.appendChild(flexContainer);
    
    
    const arrowsWrapper = document.createElement("div");
    arrowsWrapper.className = "arrows-container-wrapper";
    arrowsWrapper.style.width = "85%";
    arrowsWrapper.style.height = "100%";
    arrowsWrapper.style.overflow = "hidden";
    arrowsWrapper.style.position = "relative";
    flexContainer.appendChild(arrowsWrapper);
    
    
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", "main-svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    arrowsWrapper.appendChild(svg);
    
    
    const arrowsContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    arrowsContainer.setAttribute("id", "arrows-container");
    svg.appendChild(arrowsContainer);
    
    
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    svg.appendChild(defs);
    
    
    const legendContainer = document.createElement("div");
    legendContainer.className = "legend-container";
    legendContainer.style.width = "15%";
    legendContainer.style.height = "100%";
    legendContainer.style.overflowY = "auto";
    legendContainer.style.padding = "10px";
    legendContainer.style.borderLeft = "1px solid #e0e0e0";
    flexContainer.appendChild(legendContainer);
    
    
    const titleBar = document.querySelector("#cluster_vis_container .alert-info");
    if (titleBar) {
        
        if (!document.getElementById("quick-guide-title-button")) {
            
            const quickGuideButton = document.createElement("button");
            quickGuideButton.id = "quick-guide-title-button";
            quickGuideButton.innerHTML = '<i class="fas fa-book"></i> Quick Guide';
            
            
            quickGuideButton.style.marginLeft = "15px";
            quickGuideButton.style.padding = "8px 16px";
            quickGuideButton.style.backgroundColor = "#307f5a"; 
            quickGuideButton.style.color = "white";
            quickGuideButton.style.border = "none";
            quickGuideButton.style.borderRadius = "8px";
            quickGuideButton.style.cursor = "pointer";
            quickGuideButton.style.fontSize = "15px";
            quickGuideButton.style.fontWeight = "600";
            quickGuideButton.style.transition = "all 0.3s ease";
            quickGuideButton.style.boxShadow = "0 3px 8px rgba(48, 127, 90, 0.3)";
            quickGuideButton.style.display = "inline-flex";
            quickGuideButton.style.alignItems = "center";
            quickGuideButton.style.fontFamily = "'Roboto', sans-serif";
            
            
            quickGuideButton.addEventListener("mouseenter", function() {
                this.style.backgroundColor = "#27ae60";
                this.style.transform = "translateY(-2px)";
                this.style.boxShadow = "0 5px 12px rgba(48, 127, 90, 0.4)";
            });
            
            quickGuideButton.addEventListener("mouseleave", function() {
                this.style.backgroundColor = "#307f5a";
                this.style.transform = "translateY(0)";
                this.style.boxShadow = "0 3px 8px rgba(48, 127, 90, 0.3)";
            });
            
            quickGuideButton.addEventListener("click", function(e) {
                e.stopPropagation();
                addUsageInstructions();
            });
            
            const tooltipContainer = titleBar.querySelector(".tooltip-container");
            if (tooltipContainer) {
                tooltipContainer.parentNode.insertBefore(quickGuideButton, tooltipContainer.nextSibling);
            } else {
                titleBar.appendChild(quickGuideButton);
            }
        }
    }
}

/**
 * Extract unique ortholog group IDs from all BGCs
 */
function extractOGIDs() {
    const uniqueOGIDs = new Set();
    
    
    Object.values(bgcData).forEach(bgc => {
        bgc.genes.forEach(gene => {
            if (!gene.single_gene && gene.Ortholog_Group_OG_ID) {
                uniqueOGIDs.add(gene.Ortholog_Group_OG_ID);
            }
        });
    });
    
    
    sortedOGIDs = Array.from(uniqueOGIDs).sort((a, b) => a - b);
}

/**
 * Create the main visualization with all BGCs
 */
function createVisualization() {
    const svg = d3.select("#main-svg");
    const arrowsContainer = d3.select("#arrows-container");
    
    
    const totalHeight = bgcOrder.length * (ARROW_HEIGHT + BGC_VERTICAL_SPACING);
    svg.attr("height", totalHeight);
    
    
    const maxLength = getMaxBGCLength();
    
    
    const containerWidth = document.querySelector(".arrows-container-wrapper").clientWidth;
    const availableWidth = containerWidth - LEFT_PADDING - 20;
    
    
    let currentY = 20;
    bgcOrder.forEach(bgcName => {
        const bgcInfo = bgcData[bgcName];
        const totalLength = bgcInfo.total_length;
        const scalingFactor = availableWidth / maxLength;
        
        
        originalPositions[bgcName] = {
            y: currentY,
            offsetX: 0,
            scalingFactor: scalingFactor
        };
        
        
        const bgcGroup = createBGCGroup(
            arrowsContainer, 
            bgcName, 
            currentY, 
            scalingFactor, 
            totalLength
        );
        
        
        createBGCLabel(arrowsContainer, bgcName, currentY);
        
        
        addReorderingHandle(arrowsContainer, bgcName, currentY);
        
        
        currentY += ARROW_HEIGHT + BGC_VERTICAL_SPACING;
    });
    
    
    setupZoom(svg);
    
    
    createLegend();
    
    
    resetCursorState();
}

/**
 * Create a group for a BGC with all its genes
 */
function createBGCGroup(container, bgcName, y, scalingFactor, totalLength) {
    
    const bgcGroup = container.append("g")
        .attr("class", "bgc-group")
        .attr("id", `bgc-${bgcName.replace(/\./g, '_')}`)
        .attr("data-bgc", bgcName)
        .attr("transform", `translate(0, 0)`);
    
    
    const genesContainer = bgcGroup.append("g")
        .attr("class", "genes-container");
    
    
    if (!cutPoints[bgcName]) {
        cutPoints[bgcName] = {
            left: 0,
            right: totalLength
        };
    }
    
    
    addCutSliders(bgcGroup, bgcName, y, totalLength, scalingFactor);
    
    
    const genes = bgcData[bgcName].genes;
    
    
    genes.forEach(gene => {
        
        const geneStart = gene.start * scalingFactor;
        const geneLength = (gene.end - gene.start) * scalingFactor;
        
        
        let direction = gene.orientation === '+' ? 1 : -1;
        if (invertedBgcs.has(bgcName)) {
            direction *= -1; 
        }
        
        
        const points = geneLength > 20 ? 
            getArrowPoints(geneLength, ARROW_HEIGHT, direction) : 
            getTrianglePoints(geneLength, ARROW_HEIGHT, direction);
        
        
        const geneGroup = genesContainer.append("g")
            .attr("class", "gene-group")
            .attr("data-ogid", gene.Ortholog_Group_OG_ID)
            .attr("data-start", gene.start)
            .attr("data-end", gene.end)
            .attr("transform", `translate(${LEFT_PADDING + geneStart}, ${y})`);
        
        
        const arrow = geneGroup.append("polygon")
            .attr("points", points)
            .attr("fill", gene.single_gene ? "#CCCCCC" : getColorForOGID(gene.Ortholog_Group_OG_ID))
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("data-ogid", gene.Ortholog_Group_OG_ID)
            .attr("class", "gene-arrow");
        
        
        addGeneInteractivity(arrow, gene, bgcName);
    });
    
    
    updateGeneVisibility(bgcName);
    
    return bgcGroup;
}

/**
 * Create label for a BGC with more spacing for reordering handle
 */
function createBGCLabel(container, bgcName, y) {
    
    const labelGroup = container.append("g")
        .attr("class", "label-group")
        .attr("id", `label-${bgcName.replace(/\./g, '_')}`)
        .attr("transform", `translate(0, 0)`);
    
    
    labelGroup.append("foreignObject")
        .attr("x", 0)
        .attr("y", y + ARROW_HEIGHT / 2 - 10)
        .attr("width", LEFT_PADDING - 60) 
        .attr("height", 20)
        .append("xhtml:div")
        .style("white-space", "nowrap")
        .style("overflow", "hidden")
        .style("text-overflow", "ellipsis")
        .style("font-size", "12px")
        .style("font-family", "Arial")
        .style("text-align", "right")
        .text(bgcName)
        .on("mouseover", function(event) {
            tooltip.style("visibility", "visible").text(bgcName);
        })
        .on("mousemove", function(event) {
            tooltip.style("left", `${event.pageX + 10}px`)
                  .style("top", `${event.pageY + 10}px`);
        })
        .on("mouseout", function() {
            tooltip.style("visibility", "hidden");
        });
    
    
    addInvertButton(labelGroup, bgcName, y);
}

/**
 * Add reordering handle for a BGC with improved visibility but smaller size
 */
function addReorderingHandle(container, bgcName, y) {
    
    const handleGroup = container.append("g")
        .attr("class", "handle-group")
        .attr("id", `handle-${bgcName.replace(/\./g, '_')}`)
        .attr("transform", `translate(${LEFT_PADDING - 25}, ${y + ARROW_HEIGHT / 2})`)
        .style("cursor", "grab");
    
    
    const handleRect = handleGroup.append("rect")
        .attr("x", -10)
        .attr("y", -10)
        .attr("width", 20)
        .attr("height", 20)
        .attr("fill", "#4CAF50") 
        .attr("stroke", "#388E3C")
        .attr("stroke-width", 1.5)
        .attr("rx", 3)
        .attr("ry", 3)
        .attr("opacity", 0.85);
    
    
    for (let i = 0; i < 3; i++) {
        handleGroup.append("line")
            .attr("x1", -5)
            .attr("y1", i * 7 - 7)
            .attr("x2", 5)
            .attr("y2", i * 7 - 7)
            .attr("stroke", "white")
            .attr("stroke-width", 1.5)
            .attr("stroke-linecap", "round");
    }
    
    
    
    
    
    handleGroup.append("title")
        .text("Drag to reorder clusters");
    
    
    handleGroup.on("mouseover", function() {
        handleRect.attr("fill", "#66BB6A")
            .attr("opacity", 1);
    })
    .on("mouseout", function() {
        handleRect.attr("fill", "#4CAF50")
            .attr("opacity", 0.85);
    });
    
    
    handleGroup.call(d3.drag()
        .on("start", function() {
            
            draggedBgc = bgcName;
            d3.select(this).style("cursor", "grabbing");
            
            
            handleRect.attr("fill", "#81C784")
                .attr("stroke", "#4CAF50")
                .attr("opacity", 1);
                
            
            const svgHeight = d3.select("#main-svg").attr("height");
            d3.select("#arrows-container").append("line")
                .attr("class", "reorder-indicator")
                .attr("x1", 0)
                .attr("y1", 0)
                .attr("x2", LEFT_PADDING + 300) 
                .attr("y2", 0)
                .attr("stroke", "#4CAF50")
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "4,4");
        })
        .on("drag", function(event) {
            
            d3.select(".reorder-indicator")
                .attr("y1", event.y)
                .attr("y2", event.y);
                
            
            const mouseY = event.y;
            
            
            let closestIdx = 0;
            let closestDist = Infinity;
            
            bgcOrder.forEach((name, idx) => {
                const bgcY = originalPositions[name].y;
                const dist = Math.abs(mouseY - bgcY);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestIdx = idx;
                }
            });
            
            
            const currentIdx = bgcOrder.indexOf(draggedBgc);
            if (currentIdx !== closestIdx) {
                
                bgcOrder.splice(currentIdx, 1);
                bgcOrder.splice(closestIdx, 0, draggedBgc);
                
                
                updateBgcPositions();
            }
        })
        .on("end", function() {
            try {
                draggedBgc = null;
                d3.select(this).style("cursor", "grab");
                handleRect.attr("fill", "#4CAF50")
                    .attr("stroke", "#388E3C")
                    .attr("opacity", 0.85);
                
                
                d3.select(".reorder-indicator").remove();
                
                
                showNotification("Cluster order updated");
                
                
                resetCursorState();
            } catch (err) {
                console.error("Error in drag end:", err);
                resetCursorState();
            }
        })
    );
}

/**
 * Add an invert button for a BGC
 */
function addInvertButton(labelGroup, bgcName, y) {
    
    const buttonGroup = labelGroup.append("g")
        .attr("class", "invert-button")
        .attr("transform", `translate(10, ${y + ARROW_HEIGHT + 10})`)
        .style("cursor", "pointer");
    
    
    buttonGroup.append("rect")
        .attr("width", 90)
        .attr("height", 22)
        .attr("rx", 4)
        .attr("ry", 4)
        .attr("fill", "#f0f0f0")
        .attr("stroke", "#ccc")
        .attr("stroke-width", 1);
    
    
    buttonGroup.append("text")
        .attr("x", 45)
        .attr("y", 11)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-family", "Arial")
        .attr("font-size", "11px")
        .attr("pointer-events", "none")
        .text("Invert Cluster");
    
    
    buttonGroup.append("text")
        .attr("x", 16)
        .attr("y", 11)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", "10px")
        .attr("pointer-events", "none")
        .text("");
    
    
    buttonGroup.on("click", function() {
        invertBGC(bgcName);
    })
    .on("mouseover", function() {
        d3.select(this).select("rect").attr("fill", "#e0e0e0");
    })
    .on("mouseout", function() {
        d3.select(this).select("rect").attr("fill", "#f0f0f0");
    });
}

/**
 * Add interactivity to a gene arrow
 */
function addGeneInteractivity(arrow, gene, bgcName) {
    
    const onClick = debounce(function(event) {
        const clickedOGID = gene.Ortholog_Group_OG_ID;
        
        
        if (selectedOGID === clickedOGID) {
            selectedOGID = null;
            resetOpacity();
        } else {
            selectedOGID = clickedOGID;
            highlightOGID(clickedOGID);
            
            
            autoInvertForAlignment(clickedOGID);
        }
    }, 250);
    
    
    arrow.on("mouseover", function(event) {
        const annotationValue = gene[SELECTED_ANNOTATION] !== undefined ? 
            gene[SELECTED_ANNOTATION] : 'No annotation selected';
        
        tooltip.style("visibility", "visible")
            .html(`
                <strong>BGC:</strong> ${bgcName}<br>
                <strong>OG Group ID:</strong> ${gene.Ortholog_Group_OG_ID}<br>
                <strong>OG Annotation:</strong> <b>${annotationValue}</b><br>
                <strong>Location:</strong> (${gene.start} ... ${gene.end})<br>
                <strong>Length:</strong> ${gene.end - gene.start}
            `);
    })
    .on("mousemove", function(event) {
        tooltip.style("left", `${event.pageX + 10}px`)
              .style("top", `${event.pageY + 10}px`);
    })
    .on("mouseout", function() {
        tooltip.style("visibility", "hidden");
    });
    
    
    arrow.on("click", onClick);
    
    
    arrow.on("dblclick", function(event) {
        event.stopPropagation();
        invertBGC(bgcName);
    });
}

/**
 * Automatically invert BGCs where selected gene has opposite orientation
 */
function autoInvertForAlignment(ogID) {
    
    let referenceGene = null;
    let referenceBgc = null;
    
    
    for (const bgcName of bgcOrder) {
        const bgc = bgcData[bgcName];
        
        const gene = bgc.genes.find(g => g.Ortholog_Group_OG_ID == ogID);
        if (gene) {
            referenceGene = gene;
            referenceBgc = bgcName;
            break;
        }
    }
    
    if (!referenceGene) return;
    
    
    const referenceOrientation = invertedBgcs.has(referenceBgc) ? 
        (referenceGene.orientation === '+' ? '-' : '+') : 
        referenceGene.orientation;
    
    
    const bgcsToInvert = [];
    
    
    for (const bgcName of bgcOrder) {
        if (bgcName === referenceBgc) continue;
        
        const bgc = bgcData[bgcName];
        const gene = bgc.genes.find(g => g.Ortholog_Group_OG_ID == ogID);
        
        if (gene) {
            
            const currentOrientation = invertedBgcs.has(bgcName) ? 
                (gene.orientation === '+' ? '-' : '+') : 
                gene.orientation;
            
            
            if (currentOrientation !== referenceOrientation) {
                bgcsToInvert.push(bgcName);
            }
        }
    }
    
    
    if (bgcsToInvert.length > 0) {
        
        bgcsToInvert.forEach((bgcName, index) => {
            
            setTimeout(() => {
                invertBGC(bgcName, false); 
            }, index * 10); 
        });
        
        
        setTimeout(() => {
            alignClustersToGene(ogID);
        }, bgcsToInvert.length * 10 + 50); 
    } else {
        
        alignClustersToGene(ogID);
    }
}

/**
 * Get the maximum length of all BGCs for scaling
 */
function getMaxBGCLength() {
    let maxLength = 0;
    Object.values(bgcData).forEach(bgc => {
        if (bgc.total_length > maxLength) {
            maxLength = bgc.total_length;
        }
    });
    return maxLength;
}

/**
 * Setup zoom behavior for the SVG
 */
function setupZoom(svg) {
    const zoom = d3.zoom()
        .scaleExtent([0.2, 5])
        .on("zoom", function(event) {
            d3.select("#arrows-container").attr("transform", event.transform);
        });
    
    svg.call(zoom);
    
    
    svg.on("dblclick.zoom", null);
    
    
    document.querySelector(".arrows-container-wrapper")
        .addEventListener("wheel", function(e) {
            e.stopPropagation();
        }, { passive: false });
}

/**
 * This function is no longer called, keeping it for reference
 * Add a reset view button
 */
function addResetButton() {
    
    
}

/**
 * Reset view to original state with smoother animations
 */
function resetView() {
    
    selectedOGID = null;
    resetOpacity();
    
    
    d3.selectAll(".alignment-guideline")
        .transition()
        .duration(200)
        .style("opacity", "0")
        .remove();
    
    
    requestAnimationFrame(() => {
        try {
            
            d3.select("#main-svg")
                .transition()
                .duration(600)
                .ease(d3.easeQuadInOut)
                .call(d3.zoom().transform, d3.zoomIdentity);
            
            
            bgcOrder = Object.keys(bgcData).sort();
            
            
            const prevInvertedBgcs = new Set(invertedBgcs);
            
            
            Object.keys(originalPositions).forEach((bgcName, index) => {
                setTimeout(() => {
                    try {
                        const bgcGroup = d3.select(`#bgc-${bgcName.replace(/\./g, '_')}`);
                        
                        
                        bgcGroup.transition()
                            .duration(600)
                            .ease(d3.easeQuadInOut)
                            .attr("transform", "translate(0, 0)");
                            
                        
                        originalPositions[bgcName].offsetX = 0;
                        
                        
                        cutPoints[bgcName] = {
                            left: 0,
                            right: bgcData[bgcName].total_length
                        };
                        
                        
                        bgcGroup.selectAll(".cut-slider-group").remove();
                        
                        
                        
                        
                        
                        addCutSliders(
                            bgcGroup, 
                            bgcName, 
                            originalPositions[bgcName].y, 
                            bgcData[bgcName].total_length, 
                            originalPositions[bgcName].scalingFactor
                        );
                        
                        
                        updateGeneVisibility(bgcName);
                        
                        
                        if (index === Object.keys(originalPositions).length - 1) {
                            setTimeout(() => {
                                updateBgcPositions();
                                
                                
                                prevInvertedBgcs.forEach(bgcName => {
                                    
                                    if (invertedBgcs.has(bgcName)) {
                                        
                                        invertBGC(bgcName, false);
                                    }
                                });
                                
                                
                                invertedBgcs.clear();
                            }, 400);
                        }
                    } catch (err) {
                        console.error("Error resetting BGC:", bgcName, err);
                        resetCursorState();
                    }
                }, index * 20); 
            });
            
            
            showNotification("View reset to original state");
            
            
            setTimeout(resetCursorState, 700);
        } catch (err) {
            console.error("Error in resetView:", err);
            resetCursorState();
        }
    });
}

/**
 * Update BGC positions based on current order
 */
function updateBgcPositions() {
    let currentY = 20;
    
    
    bgcOrder.forEach(bgcName => {
        
        const bgcGroup = d3.select(`#bgc-${bgcName.replace(/\./g, '_')}`);
        if (bgcGroup.style("display") === "none") {
            return;
        }
        
        
        originalPositions[bgcName].y = currentY;
        
        
        const genesContainer = bgcGroup.select(".genes-container");
        
        
        genesContainer.selectAll(".gene-group").each(function() {
            const geneGroup = d3.select(this);
            const transform = geneGroup.attr("transform");
            const translateX = parseFloat(transform.match(/translate\(([^,]+),/)[1]);
            geneGroup.attr("transform", `translate(${translateX}, ${currentY})`);
        });
        
        
        const labelGroup = d3.select(`#label-${bgcName.replace(/\./g, '_')}`);
        labelGroup.select("foreignObject")
            .attr("y", currentY + ARROW_HEIGHT / 2 - 10);
        
        
        labelGroup.select(".invert-button")
            .attr("transform", `translate(10, ${currentY + ARROW_HEIGHT + 10})`);
        
        
        d3.select(`#handle-${bgcName.replace(/\./g, '_')}`)
            .attr("transform", `translate(${LEFT_PADDING - 25}, ${currentY + ARROW_HEIGHT / 2})`);
        
        
        bgcGroup.selectAll(".cut-slider-group").remove();
        addCutSliders(
            bgcGroup, 
            bgcName, 
            currentY, 
            bgcData[bgcName].total_length, 
            originalPositions[bgcName].scalingFactor
        );
        
        
        currentY += ARROW_HEIGHT + BGC_VERTICAL_SPACING;
    });
    
    
    const totalHeight = Math.max(currentY + 20, 800);
    d3.select("#main-svg").attr("height", totalHeight);
}

/**
 * Create the legend for OG groups
 */
function createLegend() {
    const legendContainer = document.querySelector(".legend-container");
    legendContainer.innerHTML = '';
    
    
    const title = document.createElement("h3");
    title.textContent = `Ortholog Groups (${SELECTED_ANNOTATION})`;
    title.style.fontSize = "16px";
    title.style.marginTop = "0";
    title.style.marginBottom = "15px";
    title.style.fontFamily = "Arial";
    title.style.color = "#333";
    legendContainer.appendChild(title);
    
    
    const resetButton = document.createElement("button");
    resetButton.textContent = "Reset View";
    resetButton.style.padding = "8px 12px";
    resetButton.style.marginBottom = "15px";
    resetButton.style.backgroundColor = "#f0f0f0";
    resetButton.style.border = "1px solid #ccc";
    resetButton.style.borderRadius = "4px";
    resetButton.style.cursor = "pointer";
    resetButton.style.width = "100%";
    resetButton.addEventListener("click", resetView);
    legendContainer.appendChild(resetButton);
    
    
    const searchBox = document.createElement("input");
    searchBox.type = "text";
    searchBox.placeholder = "Search genes...";
    searchBox.style.width = "100%";
    searchBox.style.padding = "8px";
    searchBox.style.marginBottom = "15px";
    searchBox.style.border = "1px solid #ccc";
    searchBox.style.borderRadius = "4px";
    searchBox.style.boxSizing = "border-box";
    legendContainer.appendChild(searchBox);
    
    
    const legendItems = document.createElement("div");
    legendItems.style.display = "flex";
    legendItems.style.flexDirection = "column";
    legendItems.style.gap = "8px";
    legendContainer.appendChild(legendItems);
    
    
    searchBox.addEventListener("input", function() {
        const searchTerm = this.value.toLowerCase();
        Array.from(legendItems.children).forEach(item => {
            const text = item.querySelector(".legend-text").textContent.toLowerCase();
            item.style.display = text.includes(searchTerm) ? "flex" : "none";
        });
    });
    
    
    const annotationLookup = createAnnotationLookup();
    
    
    sortedOGIDs.slice(0, 300).forEach(ogID => {
        const item = document.createElement("div");
        item.className = "legend-item";
        item.dataset.ogid = ogID;
        item.style.display = "flex";
        item.style.alignItems = "center";
        item.style.padding = "5px";
        item.style.borderRadsius = "4px";
        item.style.cursor = "pointer";
        
        
        const colorCircle = document.createElement("span");
        colorCircle.style.width = "12px";
        colorCircle.style.height = "12px";
        colorCircle.style.backgroundColor = getColorForOGID(ogID);
        colorCircle.style.borderRadius = "50%";
        colorCircle.style.display = "inline-block";
        colorCircle.style.marginRight = "8px";
        colorCircle.style.flexShrink = "0";
        
        
        const text = document.createElement("span");
        text.className = "legend-text";
        text.style.fontSize = "12px";
        text.style.fontFamily = "Arial";
        text.style.whiteSpace = "nowrap";
        text.style.overflow = "hidden";
        text.style.textOverflow = "ellipsis";
        text.style.flex = "1";
        
        
        const annotation = annotationLookup[ogID] || "No annotation found";
        text.textContent = `OG_${ogID}: ${annotation}`;
        
        
        item.appendChild(colorCircle);
        item.appendChild(text);
        legendItems.appendChild(item);
        
        
        item.addEventListener("mouseover", function() {
            this.style.backgroundColor = "#f0f0f0";
            highlightGenesWithId(ogID, true);
            
            
            tooltip.style("visibility", "visible").text(text.textContent);
        });
        
        item.addEventListener("mouseout", function() {
            this.style.backgroundColor = "transparent";
            if (selectedOGID !== ogID) {
                highlightGenesWithId(ogID, false);
            }
            tooltip.style("visibility", "hidden");
        });
        
        item.addEventListener("mousemove", function(event) {
            tooltip.style("left", `${event.pageX + 10}px`)
                  .style("top", `${event.pageY + 10}px`);
        });
        
        item.addEventListener("click", function() {
            if (selectedOGID === ogID) {
                selectedOGID = null;
                resetOpacity();
            } else {
                selectedOGID = ogID;
                highlightOGID(ogID);
                alignClustersToGene(ogID);
                
                
                autoInvertForAlignment(ogID);
            }
        });
    });
    
    
    if (sortedOGIDs.length > 300) {
        const moreItems = document.createElement("div");
        moreItems.style.textAlign = "center";
        moreItems.style.padding = "10px";
        moreItems.style.fontStyle = "italic";
        moreItems.style.color = "#666";
        moreItems.textContent = `...and ${sortedOGIDs.length - 300} more items`;
        legendContainer.appendChild(moreItems);
    }
}

/**
 * Create annotation lookup table for all OG IDs
 */
function createAnnotationLookup() {
    const lookup = {};
    
    
    Object.keys(bgcData).forEach(bgcName => {
        bgcData[bgcName].genes.forEach(gene => {
            if (!gene.single_gene && gene.Ortholog_Group_OG_ID) {
                const ogId = gene.Ortholog_Group_OG_ID;
                const annotation = gene[SELECTED_ANNOTATION] || 'No annotation found';
                
                
                if (!lookup[ogId] || annotation !== 'No annotation found') {
                    lookup[ogId] = annotation;
                }
            }
        });
    });
    
    return lookup;
}

/**
 * Align all clusters to a specific gene ortholog group with improved performance
 */
function alignClustersToGene(ogID) {
    console.time('Alignment');
    showNotification(`Aligning clusters to gene group OG_${ogID}`);
    
    
    const genePositions = [];
    
    
    const bgcPositionMap = new Map();
    
    
    const visibleBGCs = bgcOrder.filter(bgcName => {
        const checkbox = document.getElementById(`bgc-checkbox-${bgcName.replace(/\./g, '_')}`);
        return !checkbox || checkbox.checked;
    });
    
    
    for (const bgcName of visibleBGCs) {
        
        const bgcInfo = bgcData[bgcName];
        const sf = originalPositions[bgcName].scalingFactor;
        const isInverted = invertedBgcs.has(bgcName);
        const totalLength = bgcInfo.total_length;
        
        
        for (const gene of bgcInfo.genes) {
            if (gene.Ortholog_Group_OG_ID == ogID) {
                
                const geneStart = isInverted ? (totalLength - gene.end) : gene.start;
                
                genePositions.push({
                    bgcName: bgcName,
                    geneX: LEFT_PADDING + (geneStart * sf)
                });
                
                
                break;
            }
        }
    };
    
    
    if (genePositions.length === 0) {
        console.timeEnd('Alignment');
        return;
    }
    
    
    const maxGeneX = Math.max(...genePositions.map(g => g.geneX));
    
    
    d3.selectAll(".alignment-guideline").remove();
    
    
    const alignmentOperations = [];
    
    
    for (const {bgcName, geneX} of genePositions) {
        const newOffsetX = maxGeneX - geneX;
        alignmentOperations.push({bgcName, newOffsetX});
    }
    
    
    requestAnimationFrame(() => {
        try {
            
            const MAX_PARALLEL = 5; 
            const STAGGER_DELAY = 10; 
            const BATCH_SIZE = Math.ceil(alignmentOperations.length / MAX_PARALLEL);
            
            
            for (let i = 0; i < MAX_PARALLEL; i++) {
                setTimeout(() => {
                    try {
                        const startIdx = i * BATCH_SIZE;
                        const endIdx = Math.min((i + 1) * BATCH_SIZE, alignmentOperations.length);
                        const batchOperations = alignmentOperations.slice(startIdx, endIdx);
                        
                        batchOperations.forEach(({bgcName, newOffsetX}) => {
                            
                            const bgcGroup = d3.select(`#bgc-${bgcName.replace(/\./g, '_')}`);
                            
                            
                            bgcGroup.transition()
                                .duration(500)
                                .ease(d3.easeQuadOut)
                                .attr("transform", `translate(${newOffsetX}, 0)`)
                                .on("end", function() {
                                    
                                    if (i === MAX_PARALLEL - 1) {
                                        const geneGroup = bgcGroup.select(`.gene-group[data-ogid='${ogID}']`);
                                        if (geneGroup.size()) {
                                            const arrow = geneGroup.select(".gene-arrow");
                                            arrow.attr("stroke-width", 2)
                                                 .attr("stroke", "#2196F3");
                                        }
                                        
                                        
                                        setTimeout(resetCursorState, 100);
                                    }
                                });
                            
                            
                            originalPositions[bgcName].offsetX = newOffsetX;
                        });
                    } catch (err) {
                        console.error("Error in alignment batch:", err);
                        resetCursorState(); 
                    }
                }, i * STAGGER_DELAY);
            }
        } catch (err) {
            console.error("Error in alignment:", err);
            resetCursorState(); 
        }
    });
    
    console.timeEnd('Alignment');
}

/**
 * This function previously added the vertical guideline
 * Now it does nothing since we don't want the guideline
 */
function addAlignmentGuideline(x, ogID) {
    
    
}

/**
 * Invert a BGC's gene directions with optimized performance
 */
function invertBGC(bgcName, doRealign = true) {
    
    const isInverting = !invertedBgcs.has(bgcName);
    
    if (isInverting) {
        invertedBgcs.add(bgcName);
        showNotification(`Using inverted orientation for cluster ${bgcName}`);
    } else {
        invertedBgcs.delete(bgcName);
        showNotification(`Restored normal orientation for cluster ${bgcName}`);
    }
    
    
    const bgcGroup = d3.select(`#bgc-${bgcName.replace(/\./g, '_')}`);
    const genesContainer = bgcGroup.select(".genes-container");
    const totalLength = bgcData[bgcName].total_length;
    const scalingFactor = originalPositions[bgcName].scalingFactor;
    const y = originalPositions[bgcName].y;
    
    
    const currentCutPoints = {...cutPoints[bgcName]};
    
    
    cutPoints[bgcName] = {
        left: totalLength - currentCutPoints.right,
        right: totalLength - currentCutPoints.left
    };
    
    
    requestAnimationFrame(() => {
        try {
            bgcGroup.selectAll(".cut-slider-group").remove();
            
            
            addCutSliders(bgcGroup, bgcName, y, totalLength, scalingFactor);
            
            
            genesContainer.selectAll("*").remove();
            
            
            const genesData = [];
            
            
            bgcData[bgcName].genes.forEach(gene => {
                
                let geneStart, geneEnd, orientation;
                
                if (isInverting) {
                    
                    geneStart = totalLength - gene.end;
                    geneEnd = totalLength - gene.start;
                    orientation = gene.orientation === '+' ? '-' : '+';
                } else {
                    
                    geneStart = gene.start;
                    geneEnd = gene.end;
                    orientation = gene.orientation;
                }
                
                
                const geneX = geneStart * scalingFactor;
                const geneLength = (geneEnd - geneStart) * scalingFactor;
                const direction = orientation === '+' ? 1 : -1;
                
                
                const points = geneLength > 20 ? 
                    getArrowPoints(geneLength, ARROW_HEIGHT, direction) : 
                    getTrianglePoints(geneLength, ARROW_HEIGHT, direction);
                
                
                genesData.push({
                    ogID: gene.Ortholog_Group_OG_ID,
                    start: geneStart,
                    end: geneEnd,
                    x: geneX,
                    points,
                    fill: gene.single_gene ? "#CCCCCC" : getColorForOGID(gene.Ortholog_Group_OG_ID),
                    gene
                });
            });
            
            
            const BATCH_SIZE = 50; 
            const batches = Math.ceil(genesData.length / BATCH_SIZE);
            
            function processBatch(batchIndex) {
                const start = batchIndex * BATCH_SIZE;
                const end = Math.min(start + BATCH_SIZE, genesData.length);
                
                for (let i = start; i < end; i++) {
                    const geneData = genesData[i];
                    
                    
                    const geneGroup = genesContainer.append("g")
                        .attr("class", "gene-group")
                        .attr("data-ogid", geneData.ogID)
                        .attr("data-start", geneData.start)
                        .attr("data-end", geneData.end)
                        .attr("transform", `translate(${LEFT_PADDING + geneData.x}, ${y})`);
                    
                    
                    const arrow = geneGroup.append("polygon")
                        .attr("points", geneData.points)
                        .attr("fill", geneData.fill)
                        .attr("stroke", "black")
                        .attr("stroke-width", 1)
                        .attr("data-ogid", geneData.ogID)
                        .attr("class", "gene-arrow");
                    
                    
                    addGeneInteractivity(arrow, geneData.gene, bgcName);
                }
                
                
                if (batchIndex < batches - 1) {
                    setTimeout(() => processBatch(batchIndex + 1), 0);
                } else {
                    
                    updateGeneVisibility(bgcName);
                    
                    
                    resetCursorState();
                    
                    
                    if (selectedOGID) {
                        highlightOGID(selectedOGID);
                        
                        
                        if (doRealign) {
                            
                            originalPositions[bgcName].offsetX = 0;
                            bgcGroup.attr("transform", "translate(0, 0)");
                            
                            
                            setTimeout(() => {
                                alignClustersToGene(selectedOGID);
                            }, 50);
                        }
                    }
                }
            }
            
            
            processBatch(0);
        } catch (err) {
            console.error("Error in invertBGC:", err);
            resetCursorState(); 
        }
    });
}

/**
 * Highlight all genes with specific OG ID
 */
function highlightOGID(ogID) {
    
    resetOpacity();
    
    
    d3.selectAll(".gene-arrow").style("opacity", function() {
        const thisOgid = d3.select(this).attr("data-ogid");
        return thisOgid == ogID ? 1 : 0.3;
    });
    
    
    d3.selectAll(".legend-item").style("opacity", function() {
        const thisOgid = d3.select(this).attr("data-ogid");
        return thisOgid == ogID ? 1 : 0.3;
    });
}

/**
 * Reset opacity for all elements
 */
function resetOpacity() {
    d3.selectAll(".gene-arrow").style("opacity", 1);
    d3.selectAll(".legend-item").style("opacity", 1);
}

/**
 * Temporarily highlight genes with a specific OG ID
 */
function highlightGenesWithId(ogID, highlight) {
    d3.selectAll(`.gene-group[data-ogid='${ogID}']`)
        .selectAll(".gene-arrow")
        .each(function() {
            if (highlight) {
                d3.select(this)
                    .attr("stroke-width", 3)
                    .attr("stroke", "#ffab40");
            } else {
                d3.select(this)
                    .attr("stroke-width", 1)
                    .attr("stroke", "black");
            }
        });
}

/**
 * Show a temporary notification with smoother animation
 */
function showNotification(message) {
    
    d3.selectAll(".notification")
        .transition()
        .duration(150)
        .style("opacity", "0")
        .remove();
    
    
    const notification = d3.select("body")
        .append("div")
        .attr("class", "notification")
        .style("position", "fixed")
        .style("bottom", "20px")
        .style("left", "50%")
        .style("transform", "translateX(-50%) translateY(20px)") 
        .style("background-color", "#323232")
        .style("color", "white")
        .style("padding", "12px 24px")
        .style("border-radius", "4px")
        .style("box-shadow", "0 3px 6px rgba(0,0,0,0.16)")
        .style("z-index", "1000")
        .style("opacity", "0")
        .text(message);
    
    
    notification
        .transition()
        .duration(250)
        .style("transform", "translateX(-50%) translateY(0)") 
        .style("opacity", "1")
        .transition()
        .delay(2800)
        .duration(450)
        .style("opacity", "0")
        .style("transform", "translateX(-50%) translateY(10px)") 
        .remove();
}

/**
 * Get color for an ortholog group ID
 */
function getColorForOGID(ogID) {
    
    const index = sortedOGIDs.indexOf(ogID);
    return getDistinctColor(index, sortedOGIDs.length);
}

/**
 * Generate a visually distinct color for an index
 */
function getDistinctColor(index, total) {
    
    const hueStep = 360 / Math.min(total, 30); 
    const hue = (index % 30) * hueStep;
    
    
    const saturation = 85 + (index % 2) * 15; 
    const lightness = 45 + (Math.floor(index / 10) % 3) * 10; 
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Setup watcher for annotation changes
 */
function setupAnnotationWatcher() {
    let previousAnnotation = SELECTED_ANNOTATION;
    
    
    setInterval(() => {
        if (previousAnnotation !== SELECTED_ANNOTATION) {
            previousAnnotation = SELECTED_ANNOTATION;
            createLegend();
        }
    }, 500);
}

/**
 * Generate arrow points for gene arrows
 */
function getArrowPoints(length, height, direction) {
    const bodyHeight = height * 0.6;
    const headHeight = height;
    const headWidth = height * 0.4;
    const bodyLength = length - headWidth;
    
    if (direction === 1) {
        return `0,${(headHeight - bodyHeight) / 2} ${bodyLength},${(headHeight - bodyHeight) / 2} ${bodyLength},0 ${length},${headHeight / 2} ${bodyLength},${headHeight} ${bodyLength},${(headHeight + bodyHeight) / 2} 0,${(headHeight + bodyHeight) / 2}`;
    } else {
        return `${length},${(headHeight - bodyHeight) / 2} ${headWidth},${(headHeight - bodyHeight) / 2} ${headWidth},0 0,${headHeight / 2} ${headWidth},${headHeight} ${headWidth},${(headHeight + bodyHeight) / 2} ${length},${(headHeight + bodyHeight) / 2}`;
    }
}

/**
 * Generate triangle points for small genes
 */
function getTrianglePoints(length, height, direction) {
    if (direction === 1) {
        return `0,0 0,${height} ${length},${height / 2}`;
    } else {
        return `${length},0 ${length},${height} 0,${height / 2}`;
    }
}

/**
 * Add initial usage instructions inside the main container with unique cluster explanation
 */
function addUsageInstructions() {
    
    const mainContainer = document.getElementById("clinker_mainview");
    
    
    const instructions = document.createElement("div");
    instructions.className = "usage-instructions";
    instructions.style.position = "absolute";
    instructions.style.top = "50%";
    instructions.style.left = "50%";
    instructions.style.transform = "translate(-50%, -50%)";
    instructions.style.background = "rgba(255,255,255,0.97)";
    instructions.style.border = "1px solid #9eca7f";
    instructions.style.borderRadius = "8px";
    instructions.style.padding = "20px";
    instructions.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    instructions.style.zIndex = "100";
    instructions.style.maxWidth = "400px";
    instructions.style.opacity = "0";
    instructions.style.transition = "opacity 400ms, transform 400ms";
    
    
    const title = document.createElement("h3");
    title.style.marginTop = "0";
    title.style.color = "#333";
    title.style.fontFamily = "Arial";
    title.textContent = "Quick Guide";
    instructions.appendChild(title);
    
    const list = document.createElement("ul");
    list.style.margin = "15px 0";
    list.style.paddingLeft = "20px";
    list.style.fontFamily = "Arial";
    list.style.fontSize = "14px";
    list.style.lineHeight = "1.5";
    instructions.appendChild(list);
    
    const items = [
        "<b>Reorder Clusters:</b> Drag the <span style='background:#4CAF50;color:white;padding:2px 5px;border-radius:3px;'>≡</span> green handle",
        "<b>Align Genes:</b> Click on any gene to align all instances",
        "<b>Invert Orientation:</b> Double-click a gene or use the \"Invert Cluster\" button",
        "<b>Zoom:</b> Use mouse wheel or trackpad to zoom in/out",
        "<b>Navigate:</b> Click and drag in empty space to move the visualization",
        "<b>Unique Clusters:</b> Enable the checkbox to show only one representative per identical gene composition"
    ];
    
    items.forEach(itemHTML => {
        const li = document.createElement("li");
        li.innerHTML = itemHTML;
        list.appendChild(li);
    });
    
    
    const button = document.createElement("button");
    button.style.display = "block";
    button.style.margin = "0 auto";
    button.style.marginTop = "20px"; 
    button.style.padding = "10px 20px"; 
    button.style.backgroundColor = "#4CAF50";
    button.style.color = "white";
    button.style.border = "none";
    button.style.borderRadius = "4px";
    button.style.cursor = "pointer";
    button.style.fontFamily = "Arial";
    button.style.fontSize = "15px"; 
    button.style.fontWeight = "bold"; 
    button.textContent = "Got it!";
    instructions.appendChild(button);
    
    
    mainContainer.appendChild(instructions);
    
    
    button.addEventListener("click", function(event) {
        
        event.stopPropagation(); 
        
        
        instructions.style.opacity = "0";
        instructions.style.transform = "translate(-50%, -40%)";
        setTimeout(() => {
            if (mainContainer.contains(instructions)) {
                mainContainer.removeChild(instructions);
            }
        }, 400);
    });
    
    
    button.addEventListener("mouseenter", function(event) {
        event.stopPropagation();
    });
    
    button.addEventListener("mouseleave", function(event) {
        event.stopPropagation();
    });
    
    
    instructions.addEventListener("click", function(event) {
        
        if (event.target !== button) {
            event.stopPropagation();
        }
    });
    
    
    setTimeout(() => {
        instructions.style.opacity = "1";
    }, 800);
    
    
    
}

/**
 * Simple debounce function to prevent rapid repeated calls
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

/**
 * Reset cursor state - Add this function
 */
function resetCursorState() {
    
    d3.selectAll("g.handle-group").style("cursor", "grab");
    d3.selectAll(".invert-button").style("cursor", "pointer");
    d3.selectAll(".legend-item").style("cursor", "pointer");
    
    
    document.body.style.cursor = "default";
    
    
    const mainContainer = document.getElementById("clinker_mainview");
    if (mainContainer) {
        mainContainer.style.cursor = "default";
    }
    
    
    d3.select("#main-svg").style("cursor", "default");
}

/**
 * Modified addTopControls function to properly apply unique clusters filtering on initialization
 */
function addTopControls() {
    const mainContainer = document.getElementById("clinker_mainview");
    
    
    const controls = document.createElement("div");
    controls.className = "top-controls";
    controls.style.position = "absolute";
    controls.style.top = "10px";
    controls.style.left = "10px";
    controls.style.zIndex = "100";
    controls.style.display = "flex";
    controls.style.gap = "10px";
    controls.style.alignItems = "center";
    controls.style.background = "rgba(255,255,255,0.8)";
    controls.style.padding = "5px 10px";
    controls.style.borderRadius = "4px";
    controls.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)";
    mainContainer.appendChild(controls);
    
    
    const checkboxContainer = document.createElement("label");
    checkboxContainer.style.display = "flex";
    checkboxContainer.style.alignItems = "center";
    checkboxContainer.style.cursor = "pointer";
    checkboxContainer.style.userSelect = "none";
    checkboxContainer.style.fontFamily = "Arial";
    checkboxContainer.style.fontSize = "14px";
    controls.appendChild(checkboxContainer);
    
    
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "unique-clusters-toggle";
    checkbox.style.margin = "0 8px 0 0";
    checkbox.style.cursor = "pointer";
    checkbox.checked = true; 
    checkboxContainer.appendChild(checkbox);
    
    
    const labelText = document.createElement("span");
    labelText.textContent = "Show only unique clusters";
    checkboxContainer.appendChild(labelText);
    
    
    let clusterGroups = null;
    let showingUniqueOnly = false; 
    
    
    checkbox.addEventListener("change", function() {
        if (this.checked) {
            showingUniqueOnly = true;
            if (!clusterGroups) {
                clusterGroups = calculateUniqueClusterGroups();
            }
            filterToUniqueRepresentatives(clusterGroups);
            showNotification("Showing only one representative per unique cluster composition");
        } else {
            showingUniqueOnly = false;
            showAllClusters();
            showNotification("Showing all clusters");
        }
    });
    
    
    
    setTimeout(() => {
        try {
            
            if (checkbox.checked) {
                console.log("Applying initial unique clusters filter");
                clusterGroups = calculateUniqueClusterGroups();
                filterToUniqueRepresentatives(clusterGroups);
                showingUniqueOnly = true;
                
            }
        } catch (error) {
            console.error("Error applying initial unique clusters filter:", error);
        }
    }, 500); 
}

/**
 * Calculate unique cluster groups based on gene composition
 * UPDATED: Now includes single genes in the signature calculation
 */
function calculateUniqueClusterGroups() {
    console.log("Calculating unique cluster groups");
    
    const bgcGroups = {};
    
    
    Object.keys(bgcData).forEach(bgcName => {
        
        const geneSignatures = bgcData[bgcName].genes.map(gene => {
            if (!gene.single_gene && gene.Ortholog_Group_OG_ID) {
                
                return `OG_${gene.Ortholog_Group_OG_ID}`;
            } else {
                
                
                const annotation = gene[SELECTED_ANNOTATION] ? 
                    gene[SELECTED_ANNOTATION].toString().replace(/[,\s]/g, '_') : 'unknown';
                const length = gene.end - gene.start;
                return `SG_${annotation}_${length}_${gene.orientation}`;
            }
        }).sort(); 
        
        
        const signature = geneSignatures.join(',');
        
        
        if (!bgcGroups[signature]) {
            bgcGroups[signature] = [];
        }
        bgcGroups[signature].push(bgcName);
    });
    
    console.log(`Found ${Object.keys(bgcGroups).length} unique cluster compositions`);
    return bgcGroups;
}

/**
 * Filter the display to show only one representative per unique cluster composition
 */
function filterToUniqueRepresentatives(clusterGroups) {
    console.log("Filtering to show only unique representatives");
    
    
    window.bgcRepresentativeMap = {};
    
    
    Object.keys(bgcData).forEach(bgcName => {
        const bgcGroup = d3.select(`#bgc-${bgcName.replace(/\./g, '_')}`);
        bgcGroup.style("display", "none");
        
        
        d3.select(`#label-${bgcName.replace(/\./g, '_')}`).style("display", "none");
        d3.select(`#handle-${bgcName.replace(/\./g, '_')}`).style("display", "none");
    });
    
    
    Object.values(clusterGroups).forEach(group => {
        if (group.length > 0) {
            const representativeBgc = group[0];
            const bgcGroup = d3.select(`#bgc-${representativeBgc.replace(/\./g, '_')}`);
            bgcGroup.style("display", "block");
            
            
            d3.select(`#label-${representativeBgc.replace(/\./g, '_')}`).style("display", "block");
            d3.select(`#handle-${representativeBgc.replace(/\./g, '_')}`).style("display", "block");
            
            
            window.bgcRepresentativeMap[representativeBgc] = group;
            
            
            updateLabelTooltip(representativeBgc, group);
        }
    });
    
    
    updateBgcPositions();
}

/**
 * Update a label's tooltip to show all cluster members with improved formatting
 */
function updateLabelTooltip(representativeBgc, clusterGroup) {
    const sanitizedBgcName = representativeBgc.replace(/\./g, '_');
    const labelGroup = d3.select(`#label-${sanitizedBgcName}`);
    
    
    const textElement = labelGroup.select("foreignObject div");
    
    if (!textElement.empty()) {
        
        textElement
            .on("mouseover", function(event) {
                
                const count = clusterGroup.length;
                let tooltipContent = `<strong>Representative of ${count} clusters:</strong><br>`;
                
                
                clusterGroup.forEach((member, index) => {
                    
                    if (member === representativeBgc) {
                        tooltipContent += `• <b>${member}</b> (representative)`;
                    } else {
                        tooltipContent += `• ${member}`;
                    }
                    
                    
                    if (index < clusterGroup.length - 1) {
                        tooltipContent += '<br>';
                    }
                });
                
                tooltip.style("visibility", "visible")
                      .html(tooltipContent)
                      .style("max-width", "400px") 
                      .style("white-space", "normal"); 
            })
            .on("mousemove", function(event) {
                tooltip.style("left", `${event.pageX + 15}px`)
                      .style("top", `${event.pageY + 10}px`);
            })
            .on("mouseout", function() {
                tooltip.style("visibility", "hidden");
            });
            
        
        if (clusterGroup.length > 1) {
            
            textElement
                .style("cursor", "help")
                .style("font-weight", "bold") 
                .style("text-decoration", "underline dotted")
                .style("text-underline-offset", "3px")
                .style("color", "#307f5a"); 
                
            
            const labelContainer = labelGroup.select("foreignObject");
            if (!labelContainer.empty()) {
                labelContainer.selectAll("div:not(:first-child)").remove();
            }
        }
    }
}

/**
 * Show all clusters and reset tooltips
 */
function showAllClusters() {
    console.log("Showing all clusters");
    
    
    window.bgcRepresentativeMap = {};
    
    
    Object.keys(bgcData).forEach(bgcName => {
        const sanitizedBgcName = bgcName.replace(/\./g, '_');
        const bgcGroup = d3.select(`#bgc-${sanitizedBgcName}`);
        bgcGroup.style("display", "block");
        
        
        const labelGroup = d3.select(`#label-${sanitizedBgcName}`);
        labelGroup.style("display", "block");
        d3.select(`#handle-${sanitizedBgcName}`).style("display", "block");
        
        
        const textElement = labelGroup.select("foreignObject div");
        if (!textElement.empty()) {
            textElement
                .style("cursor", "default")
                .style("text-decoration", "none")
                .style("font-weight", "normal") 
                .style("color", "inherit") 
                .on("mouseover", function(event) {
                    tooltip.style("visibility", "visible").text(bgcName);
                })
                .on("mousemove", function(event) {
                    tooltip.style("left", `${event.pageX + 10}px`)
                          .style("top", `${event.pageY + 10}px`);
                })
                .on("mouseout", function() {
                    tooltip.style("visibility", "hidden");
                });
                
            
            labelGroup.select("foreignObject").selectAll("div:not(:first-child)").remove();
        }
    });
    
    
    updateBgcPositions();
}