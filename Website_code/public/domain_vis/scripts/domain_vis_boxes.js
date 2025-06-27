document.addEventListener("DOMContentLoaded", function() {
    
    function truncateFileName(fileName, maxLength = 17) {
        return fileName.length > maxLength ? fileName.substring(0, maxLength) + '...' : fileName;
    }

    
    fetch(METAINFO_LOCATION)
        .then(response => response.json())
        .then(data => {
            
            window.domainData = data;

            
            data.data.forEach((dataPoint) => {
                
                const specificityArray = dataPoint.PKS_NRPS_prediction.split(', ');

                
                const rowDiv = domainContainer.append("div")
                    .style("margin-bottom", "10px");  

                
                const svg = rowDiv.append("svg")
                    .attr("width", "100%")  
                    .attr("height", 150);  

                
                const containerWidth = rowDiv.node().getBoundingClientRect().width;

                
                const availableWidth = containerWidth - 180;  

                
                let currentX = 170;
                let currentY = 80;
                const spacing = 5;  
                const rowHeight = 50;  
                const padding = 15;  
                const arrowOffset = 10;  
                const arrowHeight = 10;  

                
                const textYPosition = currentY + rowHeight / 2;  
                const truncatedName = truncateFileName(dataPoint.file_name);
                svg.append("text")
                    .attr("x", 10)  
                    .attr("y", textYPosition)  
                    .attr("fill", "black")
                    .attr("font-size", "12")
                    .attr("alignment-baseline", "middle")  
                    .text(truncatedName);

                
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

                
                dataPoint.NRPS_PKS_data.forEach((domainData, index) => {
                    const domainCount = domainData.domains.length;
                    const rectHeight = 30;  
                    const circleRadius = rectHeight / 2;  
                    const orientation = domainData.orientation;  

                    let requiredWidth;

                    if (domainCount === 1) {
                        
                        requiredWidth = rectHeight + padding * 2;
                    } else {
                        
                        const totalCirclesWidth = domainCount * (circleRadius * 2);
                        requiredWidth = totalCirclesWidth + padding * 2;
                    }

                    
                    if (currentX + requiredWidth + spacing > availableWidth) {
                        currentX = 170;
                        currentY += rowHeight;
                    }

                    
                    if (orientation === "+") {
                        
                        svg.append("line")
                            .attr("x1", currentX + arrowOffset)
                            .attr("y1", currentY - arrowHeight)
                            .attr("x2", currentX + requiredWidth - arrowOffset)
                            .attr("y2", currentY - arrowHeight)
                            .attr("stroke", "black")
                            .attr("stroke-width", 2);

                        
                        svg.append("line")
                            .attr("x1", currentX + requiredWidth - arrowOffset)
                            .attr("y1", currentY - arrowHeight)
                            .attr("x2", currentX + requiredWidth - arrowOffset - 5)
                            .attr("y2", currentY - arrowHeight - 5)
                            .attr("stroke", "black")
                            .attr("stroke-width", 2);

                        svg.append("line")
                            .attr("x1", currentX + requiredWidth - arrowOffset)
                            .attr("y1", currentY - arrowHeight)
                            .attr("x2", currentX + requiredWidth - arrowOffset - 5)
                            .attr("y2", currentY - arrowHeight + 5)
                            .attr("stroke", "black")
                            .attr("stroke-width", 2);
                    } else if (orientation === "-") {
                        
                        svg.append("line")
                            .attr("x1", currentX + arrowOffset)
                            .attr("y1", currentY - arrowHeight)
                            .attr("x2", currentX + requiredWidth - arrowOffset)
                            .attr("y2", currentY - arrowHeight)
                            .attr("stroke", "black")
                            .attr("stroke-width", 2);

                        
                        svg.append("line")
                            .attr("x1", currentX + arrowOffset)
                            .attr("y1", currentY - arrowHeight)
                            .attr("x2", currentX + arrowOffset + 5)
                            .attr("y2", currentY - arrowHeight - 5)
                            .attr("stroke", "black")
                            .attr("stroke-width", 2);

                        svg.append("line")
                            .attr("x1", currentX + arrowOffset)
                            .attr("y1", currentY - arrowHeight)
                            .attr("x2", currentX + arrowOffset + 5)
                            .attr("y2", currentY - arrowHeight + 5)
                            .attr("stroke", "black")
                            .attr("stroke-width", 2);
                    }

                    
                    let specificityIndex = 0;
                    domainData.domains.forEach((domainName, i) => {
                        let fillColor;
                        let displayText = "";

                        
                        if (domainName === "AMP-binding") {
                            fillColor = "rgba(186, 85, 211, 0.9)";  
                            displayText = "A";
                        } else if (domainName === "PCP") {
                            fillColor = "#87ceeb";  
                        } else if (domainName === "Condensation_LCL" || domainName === "Condensation_DCL" || domainName === "Condensation_Starter") {
                            fillColor = "#1f4f9c";  
                            displayText = "C";
                        } else if (domainName === "Thioesterase") {
                            fillColor = "orange";  
                            displayText = "TE";
                        } else if (domainName === "Epimerization") {
                            fillColor = "#3cb371";  
                            displayText = "E";
                        } else if (domainName === "PKS_PP") {
                            fillColor = "#87ceeb";
                        } else if (domainName === "PKS_AT") {
                            fillColor = "red";
                            displayText = "AT";
                        } else if (domainName === "PKS_KR") {
                            fillColor = "green";
                            displayText = "KR";
                        } else if (domainName === "PKS_DH") {
                            fillColor = "#CF9FFF";
                            displayText = "DH";
                        } else if (domainName === "PKS_ER") {
                            fillColor = "#30D5C8";
                            displayText = "ER";
                        } else if (domainName === "PKS_KS(Hybrid-KS)") {
                            fillColor = "Yellow";
                            displayText = "KS";
                        } else {
                            fillColor = "lightgray";  
                        }

                        
                        const specificity = (domainName === "AMP-binding" && specificityArray[specificityIndex]) || "N/A";
                        if (domainName === "AMP-binding") {
                            specificityIndex++;
                        }

                        
                        const circleGroup = svg.append("g")
                            .attr("transform", `translate(${currentX + padding + (i * (circleRadius * 2))}, ${currentY + rectHeight / 2})`);

                        const circle = circleGroup.append("circle")
                            .attr("r", circleRadius)
                            .attr("fill", fillColor)
                            .attr("stroke", "gray")
                            .attr("stroke-width", 1);

                        
                        if (displayText) {
                            const text = circleGroup.append("text")
                                .attr("x", 0)
                                .attr("y", 5)  
                                .attr("text-anchor", "middle")
                                .attr("fill", "white")
                                .attr("font-size", "16")
                                .attr("font-weight", "bold")
                                .text(displayText);
                        }

                        
                        circleGroup.on("mouseover", function(event) {
                            let tooltipContent = `<div style="display: inline-block; width: 10px; height: 10px; background-color: ${fillColor}; border-radius: 50%; margin-right: 5px;"></div> ${domainName}`;
                            if (domainName === "AMP-binding") {
                                tooltipContent += `<br>Specificity: ${specificity}`;
                            }

                            tooltip.style("visibility", "visible").html(tooltipContent);
                        })
                        .on("mousemove", function(event) {
                            tooltip.style("top", (event.pageY + 10) + "px")
                                   .style("left", (event.pageX + 10) + "px");
                        })
                        .on("mouseout", function() {
                            tooltip.style("visibility", "hidden");
                        });
                    });

                    
                    currentX += requiredWidth + spacing;
                });

                
                const totalHeight = currentY + rowHeight;
                svg.attr("height", totalHeight);
            });
        })
        .catch(error => console.error("Error loading the JSON file:", error));
});
