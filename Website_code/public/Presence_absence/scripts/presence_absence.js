
function loadJsonWithWorker(jsonPath) {
    return new Promise((resolve, reject) => {
        const worker = new Worker('/data_loader/json_worker.js');
        
        fetch(jsonPath)
            .then(response => response.json())
            .then(jsonData => {
                worker.postMessage({ jsonData });
            })
            .catch(error => reject('Error loading JSON: ' + error));

        worker.onmessage = function (event) {
            if (event.data.error) {
                reject('Error processing JSON in worker: ' + event.data.error);
            } else {
                resolve(event.data);
            }
            worker.terminate();
        };

        worker.onerror = function (error) {
            reject('Worker error: ' + error.message);
            worker.terminate();
        };
    });
}


async function loadJsonAndGenerateHeatmap(jsonPath) {
    try {
        const { xLabels, yLabels, matrix } = await loadJsonWithWorker(jsonPath);
        generateHeatmapD3(matrix, xLabels, yLabels);
    } catch (error) {
        console.error(error);
    }
}

function generateHeatmapD3(matrix, xLabels, yLabels) {
    const margin = { top: 50, right: 100, bottom: 50, left: 250 };
    const container = d3.select('.heatmap_data');
    
    
    container.style('background-color', '#fff');
    
    
    let containerWidth = container.node().clientWidth || 960;
    
    containerWidth = containerWidth - 56; 
    
    const fixedSquareWidth = 35; 
    const padding = 2;
    const minSquareHeight = 17; 
    const maxYLabelWidth = 300;
    
    
    const visibleRows = 20;
    
    
    const rowHeight = Math.max(minSquareHeight, minSquareHeight) + padding;
    const visibleHeight = rowHeight * visibleRows;
    
    
    const totalMatrixHeight = rowHeight * yLabels.length;
    
    
    const scrollbarHeight = 10;
    const totalHeight = visibleHeight + margin.top + margin.bottom + scrollbarHeight;

    
    container.html('');
    container.style('height', `${totalHeight}px`);
    container.style('position', 'relative');

    
    const heatmapContainer = container.append('div')
        .style('display', 'flex')
        .style('align-items', 'flex-start')
        .style('height', `${totalHeight}px`)
        .style('width', '100%'); 

    
    const yAxisContainer = heatmapContainer.append('div')
        .style('width', `${margin.left}px`)
        .style('height', `${visibleHeight + margin.top}px`)
        .style('overflow-y', 'hidden') 
        .style('overflow-x', 'hidden'); 

    const yAxisSvg = yAxisContainer.append('svg')
        .attr('width', margin.left)
        .attr('height', totalMatrixHeight + margin.top)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    
    const scrollWrapper = heatmapContainer.append('div')
        .style('width', `calc(100% - ${margin.left}px)`) 
        .style('height', `${visibleHeight + margin.top}px`)
        .style('overflow-y', 'scroll') 
        .style('overflow-x', 'hidden') 
        .style('position', 'relative');

    
    const heatmapSvg = scrollWrapper.append('svg')
        .attr('width', fixedSquareWidth * xLabels.length + margin.right)
        .attr('height', totalMatrixHeight + margin.top)
        .append('g')
        .attr('transform', `translate(0,${margin.top})`);

    
    const xAxisContainer = container.append('div')
        .style('position', 'absolute')
        .style('bottom', `${scrollbarHeight}px`) 
        .style('left', `${margin.left}px`)
        .style('width', `calc(100% - ${margin.left}px)`) 
        .style('height', `${margin.bottom}px`)
        .style('overflow-x', 'hidden') 
        .style('overflow-y', 'hidden'); 

    const xAxisSvg = xAxisContainer.append('svg')
        .attr('width', fixedSquareWidth * xLabels.length + margin.right)
        .attr('height', margin.bottom)
        .append('g');

    
    const xScale = d3.scaleBand()
        .range([0, fixedSquareWidth * xLabels.length])
        .domain(xLabels);

    
    xAxisSvg.append('g')
        .call(d3.axisBottom(xScale).tickSize(0))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .style('font-size', '16px')
        .style('font-family', 'Roboto, sans-serif')
        .style('fill', '#333');

    
    const yScale = d3.scaleBand()
        .range([0, totalMatrixHeight])
        .domain(yLabels)
        .padding(0.05);

    
    yAxisSvg.append('g')
        .call(d3.axisLeft(yScale).tickSize(0))
        .selectAll('text')
        .style('font-size', '12px')
        .style('max-width', `${maxYLabelWidth}px`)
        .style('white-space', 'nowrap')
        .style('overflow', 'hidden')
        .style('text-overflow', 'ellipsis')
        .style('font-family', 'Roboto, sans-serif')
        .style('fill', '#333');

    
    heatmapSvg.selectAll()
        .data(matrix)
        .enter()
        .append('g')
        .attr('class', 'row')
        .selectAll('.cell')
        .data((d, i) => d.map((val, j) => ({
            x: xLabels[j],
            y: yLabels[i],
            value: val
        })))
        .enter()
        .append('rect')
        .attr('x', d => xScale(d.x))
        .attr('y', d => yScale(d.y))
        .attr('width', fixedSquareWidth - padding)
        .attr('height', rowHeight - padding)
        .style('fill', d => d.value ? '#9eca7f' : '#e9e9ed') 
        .style('stroke', 'white')
        .style('stroke-width', '1px')
        .style('transition', 'fill 0.2s ease-in-out')
        .on('mouseover', function(event, d) {
            d3.select(this).attr('original-color', d3.select(this).style('fill'));
            d3.select(this).style('fill', '#FFA500');

            tooltip.transition().duration(200).style('opacity', 0.9);
            tooltip.html(`
                <div style="font-weight: 500; margin-bottom: 5px; color: #444;">Cluster Details</div>
                <div><span style="font-weight: 500;">Cluster:</span> ${d.y}</div>
                <div><span style="font-weight: 500;">Ortholog Group:</span> ${d.x}</div>
                <div><span style="font-weight: 500;">Status:</span> ${d.value ? 'Present' : 'Absent'}</div>
            `);

            const tooltipWidth = tooltip.node().offsetWidth;
            const tooltipHeight = tooltip.node().offsetHeight;
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            let left = event.pageX + 10;
            let top = event.pageY + 10;

            if (left + tooltipWidth > windowWidth) {
                left = event.pageX - tooltipWidth - 10;
            }

            if (top + tooltipHeight > windowHeight) {
                top = event.pageY - tooltipHeight - 10;
            }

            tooltip.style('left', `${left}px`).style('top', `${top}px`);
        })
        .on('mouseout', function() {
            const originalColor = d3.select(this).attr('original-color');
            d3.select(this).style('fill', originalColor);
            tooltip.transition().duration(500).style('opacity', 0);
        });

    
    const viewportWidth = scrollWrapper.node().clientWidth;
    const totalWidth = fixedSquareWidth * xLabels.length;

    
    const scrollbarHoverArea = container.append('div')
        .style('position', 'absolute')
        .style('bottom', '0px')
        .style('left', `${margin.left}px`)
        .style('width', `calc(100% - ${margin.left}px)`) 
        .style('height', `${scrollbarHeight}px`);

    const scrollbarContainer = scrollbarHoverArea.append('div')
        .style('position', 'absolute')
        .style('top', '1px')
        .style('width', '100%')
        .style('height', '8px')
        .style('background', '#e0e0e0')
        .style('border-radius', '9px')
        .style('transition', 'height 0.2s ease');

    
    if (totalWidth > viewportWidth) {
        const scrollbar = scrollbarContainer.append('div')
            .style('position', 'absolute')
            .style('height', '100%')
            .style('background', '#9eca7f')
            .style('width', `${(viewportWidth / totalWidth) * 100}%`)
            .style('left', '0')
            .style('cursor', 'pointer')
            .style('border-radius', '9px');

        let isDragging = false;
        let startX = 0;
        let scrollLeft = 0;

        
        scrollbarHoverArea
            .on('mouseover', function() {
                scrollbarContainer.style('height', '16px');
                scrollbarContainer.style('top', '0px');
            })
            .on('mouseout', function() {
                if (!isDragging) {
                    scrollbarContainer.style('height', '8px');
                    scrollbarContainer.style('top', '1px');
                }
            });

        scrollbar.on('mousedown', function(event) {
            isDragging = true;
            startX = event.pageX;
            scrollLeft = parseFloat(scrollbar.style('left')) || 0;
            scrollbarContainer.style('height', '16px');
            scrollbarContainer.style('top', '0px');
            
            
            event.preventDefault();
            
            d3.select(window).on('mousemove', onMouseMove).on('mouseup', onMouseUp);
        });

        function onMouseMove(event) {
            if (isDragging) {
                const deltaX = event.pageX - startX;
                const maxOffset = viewportWidth - (viewportWidth * viewportWidth / totalWidth);
                const newLeft = Math.max(0, Math.min(maxOffset, scrollLeft + deltaX));
                
                
                scrollbar.style('left', `${newLeft}px`);
                
                
                const scrollPercentage = newLeft / maxOffset;
                const maxScroll = totalWidth - viewportWidth;
                const newScrollLeft = scrollPercentage * maxScroll;
                
                
                heatmapSvg.attr('transform', `translate(${-newScrollLeft},${margin.top})`);
                xAxisSvg.attr('transform', `translate(${-newScrollLeft},0)`);
            }
        }

        function onMouseUp() {
            isDragging = false;
            scrollbarContainer.style('height', '8px');
            scrollbarContainer.style('top', '1px');
            d3.select(window).on('mousemove', null).on('mouseup', null);
        }

        
        scrollWrapper.on('scroll', function() {
            const scrollTop = scrollWrapper.node().scrollTop;
            
            yAxisSvg.attr('transform', `translate(${margin.left},${margin.top - scrollTop})`);
        });
    }

    
    const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0)
        .style('position', 'absolute')
        .style('background-color', '#f4f4f4')
        .style('padding', '10px')
        .style('border', `1px solid #9eca7f`)
        .style('border-radius', '4px')
        .style('font-size', '14px')
        .style('pointer-events', 'none')
        .style('max-width', '300px')
        .style('box-shadow', '0 4px 8px rgba(0, 0, 0, 0.15)');
}


loadJsonAndGenerateHeatmap(GENECLUSTER_LOCATION);