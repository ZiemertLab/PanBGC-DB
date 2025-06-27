/**
 * bgc_tree.js
 * 
 * This script renders an interactive gene presence/absence tree visualization
 * for biosynthetic gene clusters (BGCs) using D3.js. It constructs a dendrogram
 * based on a Nexus-format phylogenetic tree and overlays presence/absence patterns
 * for each orthologous gene group across clusters.
 * 
 * Main functionalities:
 * - Loads tree and gene matrix data from JSON and Nexus files
 * - Parses and constructs a D3-based vertical or radial tree layout
 * - Aligns gene presence data as colored dots along the tree
 * - Handles responsive layout and dynamic SVG rendering
 */

document.addEventListener('DOMContentLoaded', function() {
    
    const controlBar = document.createElement('div');
    controlBar.classList.add('control-bar');

    const downloadBtn = document.createElement('button');
    downloadBtn.classList.add('download-btn');
    downloadBtn.textContent = 'Download Image';

    
    
    const downloadNexusBtn = document.createElement('button');
    downloadNexusBtn.classList.add('download-btn', 'nexus-download-btn'); 
    downloadNexusBtn.textContent = 'Download Nexus File';

    
    const customDropdown = document.createElement('div');
    customDropdown.classList.add('custom-dropdown');
    
    
    const dropdownHeader = document.createElement('div');
    dropdownHeader.classList.add('dropdown-header');
    
    const selectedText = document.createElement('span');
    selectedText.classList.add('selected-text');
    selectedText.textContent = 'Select OG Gene...';
    
    const dropdownArrow = document.createElement('span');
    dropdownArrow.classList.add('dropdown-arrow');
    dropdownArrow.innerHTML = '&#9662;';
    
    dropdownHeader.appendChild(selectedText);
    dropdownHeader.appendChild(dropdownArrow);
    
    
    const dropdownContent = document.createElement('div');
    dropdownContent.classList.add('dropdown-content');
    dropdownContent.style.display = 'none';
    
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search OG genes...';
    searchInput.classList.add('dropdown-search');
    dropdownContent.appendChild(searchInput);
    
    
    const optionsContainer = document.createElement('div');
    optionsContainer.classList.add('options-container');
    dropdownContent.appendChild(optionsContainer);
    
    
    customDropdown.appendChild(dropdownHeader);
    customDropdown.appendChild(dropdownContent);

    const treeViewContainer = document.querySelector('.tree_view'); 

    
    controlBar.appendChild(customDropdown);
    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add('button-container');
    
    
    buttonContainer.appendChild(downloadNexusBtn);
    buttonContainer.appendChild(downloadBtn);
    
    
    controlBar.insertBefore(buttonContainer, customDropdown);


    
    const openInNewWindowBtn = document.createElement('button');
    openInNewWindowBtn.classList.add('open-new-window-btn');
    openInNewWindowBtn.innerHTML = '<i class="fa fa-external-link"></i> Open in New Window';
    controlBar.appendChild(openInNewWindowBtn);

    
    treeViewContainer.parentElement.insertBefore(controlBar, treeViewContainer);

    
    const leftTitle = document.createElement('div');
    leftTitle.classList.add('svg-title', 'left-title');
    leftTitle.textContent = 'BGC Tree'; 

    const rightTitle = document.createElement('div');
    rightTitle.classList.add('svg-title', 'right-title');
    rightTitle.textContent = 'Selected OG Gene Tree';

    
    const titleContainer = document.createElement('div');
    titleContainer.classList.add('title-container');
    titleContainer.appendChild(leftTitle);
    titleContainer.appendChild(rightTitle);
    treeViewContainer.parentElement.insertBefore(titleContainer, treeViewContainer);

    
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.textContent = 'Loading tanglegram...';
    loadingIndicator.style.display = 'none';
    treeViewContainer.appendChild(loadingIndicator);

    
    const svgContainer = document.createElement('div');
    svgContainer.className = 'tanglegram-container';
    svgContainer.style.width = '100%';
    svgContainer.style.overflow = 'auto';
    treeViewContainer.appendChild(svgContainer);

    
    const statsDisplay = document.createElement('div');
    statsDisplay.className = 'tanglegram-stats';
    statsDisplay.style.marginTop = '10px';
    statsDisplay.style.textAlign = 'center';
    statsDisplay.style.fontSize = '12px';
    statsDisplay.style.fontFamily = 'sans-serif';
    treeViewContainer.appendChild(statsDisplay);
    
    
    svgContainer.style.width = '100%';
    svgContainer.style.maxWidth = '1800px'; 
    svgContainer.style.margin = '0 auto';
    svgContainer.style.height = '800px'; 
    svgContainer.style.overflow = 'auto'; 
    
    
    const resizeObserver = new ResizeObserver(entries => {
        const svg = svgContainer.querySelector('svg');
        if (!svg) return;
        
        for (let entry of entries) {
            const containerWidth = entry.contentRect.width;
            if (containerWidth < 900) {
                
                svgContainer.style.overflowX = 'auto';
                svg.style.minWidth = '900px';
            } else {
                
                svgContainer.style.overflowX = 'visible';
                svg.style.minWidth = 'auto';
            }
        }
    });
    
    
    dropdownHeader.addEventListener('click', function() {
        if (dropdownContent.style.display === 'none') {
            dropdownContent.style.display = 'block';
            searchInput.focus();
            dropdownArrow.innerHTML = '&#9652;'; 
        } else {
            dropdownContent.style.display = 'none';
            dropdownArrow.innerHTML = '&#9662;'; 
        }
    });
    
    
    document.addEventListener('click', function(event) {
        if (!customDropdown.contains(event.target)) {
            dropdownContent.style.display = 'none';
            dropdownArrow.innerHTML = '&#9662;'; 
        }
    });

    
    let currentSelection = null;
    
    
    function selectOption(value, text) {
        selectedText.textContent = text;
        currentSelection = value;
        dropdownContent.style.display = 'none';
        dropdownArrow.innerHTML = '&#9662;'; 
        
        
        rightTitle.textContent = text;
        
        
        if (window.insufficientTaxa) {
            return;
        }
        
        
        loadingIndicator.style.display = 'block';
        
        setTimeout(() => {
            renderTanglegram('1_BGC_tree', value);
            loadingIndicator.style.display = 'none';
        }, 50);
    }
    
    
    function renderDropdownOptions(options) {
        optionsContainer.innerHTML = '';
        
        if (options.length === 0) {
            const noResults = document.createElement('div');
            noResults.classList.add('no-results');
            noResults.textContent = 'No matching trees found';
            optionsContainer.appendChild(noResults);
            return;
        }
        
        options.forEach(option => {
            const optionElement = document.createElement('div');
            optionElement.classList.add('dropdown-option');
            
            if (option.value === currentSelection) {
                optionElement.classList.add('selected');
            }
            
            optionElement.textContent = option.text;
            optionElement.dataset.value = option.value;
            
            optionElement.addEventListener('click', function() {
                selectOption(option.value, option.text);
            });
            
            optionsContainer.appendChild(optionElement);
        });
    }

    

fetch(GENE_TANGLEGRAM)
    .then(response => response.text())
    .then(nexusContent => {
        
        const trees = parseNexusTrees(nexusContent);
        const ogTrees = Object.keys(trees).filter(name => name.startsWith('OG_'));
        
        
        ogTrees.sort((a, b) => {
            const numA = parseInt(a.replace('OG_', ''));
            const numB = parseInt(b.replace('OG_', ''));
            return numA - numB;
        });
        
        
        const allOptions = ogTrees.map(treeName => ({
            value: treeName,
            text: treeName
        }));
        
        
        window.nexusData = {
            content: nexusContent,
            trees: trees,
            options: allOptions
        };
        
        
        renderDropdownOptions(allOptions);
        
        
        searchInput.addEventListener('input', function() {
            const searchText = this.value.toLowerCase();
            
            
            const filteredOptions = allOptions.filter(option => 
                option.text.toLowerCase().includes(searchText)
            );
            
            
            renderDropdownOptions(filteredOptions);
        });
        
        
        let totalUniqueTaxa = 0;
        if (trees['1_BGC_tree']) {
            const bgcTreeData = parseNewickToJson(trees['1_BGC_tree']);
            if (bgcTreeData) {
                
                const getLeafNames = (node, names = []) => {
                    if (!node) return names;
                    if (!node.children || node.children.length === 0) {
                        if (node.name) names.push(node.name);
                    } else {
                        node.children.forEach(child => getLeafNames(child, names));
                    }
                    return names;
                };
                
                const bgcLeafNames = getLeafNames(bgcTreeData);
                const uniqueBgcLeafNames = new Set(bgcLeafNames);
                totalUniqueTaxa = uniqueBgcLeafNames.size;
            }
        }
        
        
        if (totalUniqueTaxa < 3) {
            const svgContainer = document.querySelector('.tanglegram-container');
            if (svgContainer) {
                
                svgContainer.innerHTML = '';
                
                
                const messageContainer = document.createElement('div');
                messageContainer.style.width = '100%';
                messageContainer.style.height = '400px';
                messageContainer.style.display = 'flex';
                messageContainer.style.alignItems = 'center';
                messageContainer.style.justifyContent = 'center';
                messageContainer.style.fontSize = '18px';
                messageContainer.style.fontWeight = 'bold';
                messageContainer.style.color = '#666';
                messageContainer.style.textAlign = 'center';
                messageContainer.style.padding = '20px';
                messageContainer.style.border = '1px dashed #ccc';
                messageContainer.style.borderRadius = '8px';
                messageContainer.style.backgroundColor = '#f9f9f9';
                messageContainer.innerHTML = 'Not enough BGC in this family to display a phylogenetic comparison.<br><small>(Minimum 3 unique BGCs required)</small>';
                
                svgContainer.appendChild(messageContainer);
                
                
                const statsDisplay = document.querySelector('.tanglegram-stats');
                if (statsDisplay) {
                    statsDisplay.textContent = 'Insufficient data for phylogenetic comparison';
                }
                
                
                window.insufficientTaxa = true;
            }
        } else {
            
            if (ogTrees.length > 0) {
                selectOption(ogTrees[0], ogTrees[0]);
                rightTitle.textContent = ogTrees[0];
            }
        }
    })
    .catch(error => {
        console.error('Error loading NEXUS file:', error);
        svgContainer.innerHTML = `<div style="color: red; padding: 20px;">Error loading NEXUS file: ${error.message}</div>`;
    });
    
    
    downloadBtn.addEventListener('click', function() {
        const svgElement = svgContainer.querySelector('svg');
        if (!svgElement) return;
        
        
        const svgCopy = svgElement.cloneNode(true);
        
        
        const style = document.createElement('style');
        style.textContent = `
            svg { background-color: #f8f9fa; }
            text { font-family: sans-serif; }
            .node circle { stroke: none; }
            .link { fill: none; }
        `;
        svgCopy.insertBefore(style, svgCopy.firstChild);
        
        
        const svgData = new XMLSerializer().serializeToString(svgCopy);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        
        
        const link = document.createElement('a');
        link.href = svgUrl;
        link.download = 'tanglegram.svg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(svgUrl);
    });

    downloadNexusBtn.addEventListener('click', function() {
        if (!window.nexusData || !window.nexusData.content) {
            alert('NEXUS data not loaded yet. Please try again in a moment.');
            return;
        }
    
        
        const nexusBlob = new Blob([window.nexusData.content], { type: 'text/plain' });
    
        
        const nexusUrl = URL.createObjectURL(nexusBlob);
    
        
        const link = document.createElement('a');
        link.href = nexusUrl;
        link.download = 'tanglegram.nexus';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(nexusUrl);
    });
    
    
    openInNewWindowBtn.addEventListener('click', function() {
        openTanglegramInNewWindow();
    });

    
    function openTanglegramInNewWindow() {
        
        const leftTreeName = '1_BGC_tree'; 
        const rightTreeName = currentSelection || window.nexusData?.options?.[0]?.value;
        
        if (!window.nexusData || !window.nexusData.trees || !rightTreeName) {
            alert('Tree data not loaded yet. Please try again in a moment.');
            return;
        }
        
        
        const newWindow = window.open('', '_blank', 'width=1600,height=900');
        
        if (!newWindow) {
            alert('Pop-up blocked! Please allow pop-ups for this site to use this feature.');
            return;
        }
        
        
        newWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>BGC Tree Tanglegram - Full View</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 20px;
                        background-color: #f5f5f5;
                    }
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                    }
                    h1 {
                        margin: 0;
                        font-size: 24px;
                    }
                    .close-btn {
                        background-color: #f44336;
                        color: white;
                        border: none;
                        padding: 8px 15px;
                        border-radius: 4px;
                        cursor: pointer;
                    }
                    .tanglegram-container {
                        width: 100%;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        background-color: white;
                        padding: 10px;
                        box-sizing: border-box;
                        overflow: auto;
                    }
                    svg {
                        display: block;
                        margin: 0 auto;
                    }
                    .title-container {
                        display: flex;
                        justify-content: space-around;
                        margin-bottom: 10px;
                    }
                    .svg-title {
                        font-weight: bold;
                        font-size: 16px;
                    }
                    text {
                        font-family: Arial, sans-serif;
                        font-weight: 500;
                        font-size: 16px;
                        paint-order: stroke;
                        stroke: white;
                        stroke-width: 2px;
                        stroke-linecap: round;
                        stroke-linejoin: round;
                    }
                    .node circle {
                        stroke: none;
                    }
                    .link {
                        fill: none;
                        stroke: #555;
                        stroke-width: 1.5;
                    }
                    .connection {
                        stroke-width: 1.5;
                        stroke-dasharray: 3,3;
                        opacity: 0.8;
                    }
                    .connection:hover {
                        stroke-width: 2.5;
                        opacity: 1;
                    }
                    .highlighted-leaf {
                        font-weight: bold;
                        fill: #ff6600;
                        font-size: 17px;
                        stroke: #fff;
                        stroke-width: 0.8px;
                    }
                    .highlighted-connection {
                        stroke-width: 3px !important;
                        opacity: 1 !important;
                        stroke-dasharray: none !important;
                    }
                </style>
                <script src="https:
            </head>
            <body>
                <div class="header">
                    <h1>Tanglegram: BGC Tree vs ${rightTreeName}</h1>
                    <button class="close-btn" onclick="window.close()">Close</button>
                </div>
                <div class="title-container">
                    <div class="svg-title">BGC Tree</div>
                    <div class="svg-title">${rightTreeName}</div>
                </div>
                <div class="tanglegram-container" id="full-tanglegram">
                    <p>Loading full tree view...</p>
                </div>
                
                <script>
                    
                    const leftTreeNewick = ${JSON.stringify(window.nexusData.trees[leftTreeName])};
                    const rightTreeNewick = ${JSON.stringify(window.nexusData.trees[rightTreeName])};
                    
                    
                    ${parseNewickToJson.toString()}
                    ${optimizeLeafOrder.toString()}
                    
                    
                    function renderFullTanglegram() {
                        const container = document.getElementById('full-tanglegram');
                        container.innerHTML = '';
                        
                        
                        const leftData = parseNewickToJson(leftTreeNewick);
                        const rightData = parseNewickToJson(rightTreeNewick);
                        
                        if (!leftData || !rightData) {
                            container.innerHTML = '<p style="color:red">Error parsing tree data</p>';
                            return;
                        }
                        
                        
                        const getLeafCount = (node) => {
                            if (!node.children || node.children.length === 0) return 1;
                            return node.children.reduce((sum, child) => sum + getLeafCount(child), 0);
                        };
                        
                        const leftLeafCount = getLeafCount(leftData);
                        const rightLeafCount = getLeafCount(rightData);
                        const maxLeafCount = Math.max(leftLeafCount, rightLeafCount);
                        
                        
                        
                        const dynamicHeight = Math.max(800, maxLeafCount * 25);
                        
                        
                        const svg = document.createElementNS('http:
                        svg.setAttribute('width', '100%');
                        svg.setAttribute('height', dynamicHeight);
                        svg.setAttribute('viewBox', \`0 0 1800 \${dynamicHeight}\`);
                        container.appendChild(svg);
                        
                        
                        const d3Svg = d3.select(svg);
                        
                        
                        d3Svg.append('rect')
                            .attr('width', 1800)
                            .attr('height', dynamicHeight)
                            .attr('fill', '#ffffff');
                        
                        
                        optimizeLeafOrder(rightData, leftData);
                        
                        
                        const width = 1800;
                        const height = dynamicHeight;
                        const margin = { top: 40, right: 260, bottom: 40, left: 260 };
                        const innerWidth = width - margin.left - margin.right;
                        const innerHeight = height - margin.top - margin.bottom;
                        const middleGap = 260;
                        
                        
                        const g = d3Svg.append('g')
                            .attr('transform', \`translate(\${margin.left},\${margin.top})\`);
                        
                        
                        const linesGroup = g.append('g').attr('class', 'lines-group');
                        const nodesGroup = g.append('g').attr('class', 'nodes-group');
                        const connectionsGroup = g.append('g').attr('class', 'connections-group');
                        const labelsGroup = g.append('g').attr('class', 'labels-group');
                        
                        
                        const treeWidth = (innerWidth - middleGap) / 2;
                        
                        
                        const leftRoot = d3.hierarchy(leftData);
                        const rightRoot = d3.hierarchy(rightData);
                        
                        
                        const calculateTotalLength = (node) => {
                            if (!node.parent) return 0;
                            return (node.data.length || 0) + calculateTotalLength(node.parent);
                        };
                        
                        
                        const leftTree = d3.cluster().size([innerHeight, treeWidth]);
                        leftTree(leftRoot);
                        
                        const rightTree = d3.cluster().size([innerHeight, treeWidth]);
                        rightTree(rightRoot);
                        
                        
                        const leftMap = new Map();
                        const rightMap = new Map();
                        
                        
                        const leftMaxLength = d3.max(leftRoot.descendants(), d => calculateTotalLength(d));
                        const rightMaxLength = d3.max(rightRoot.descendants(), d => calculateTotalLength(d));
                        
                        
                        const leftScale = d3.scaleLinear()
                            .domain([0, leftMaxLength || 1])
                            .range([0, treeWidth * 0.8]);
                        
                        const rightScale = d3.scaleLinear()
                            .domain([0, rightMaxLength || 1])
                            .range([0, treeWidth * 0.8]);
                        
                        
                        leftRoot.descendants().forEach(d => {
                            if (d.parent) {
                                const totalParentLength = calculateTotalLength(d.parent);
                                const totalNodeLength = calculateTotalLength(d);
                                
                                linesGroup.append('line')
                                    .attr('x1', leftScale(totalParentLength))
                                    .attr('y1', d.parent.x)
                                    .attr('x2', leftScale(totalParentLength))
                                    .attr('y2', d.x)
                                    .attr('stroke', '#555')
                                    .attr('stroke-width', 1.5)
                                    .attr('class', 'link');
                                
                                linesGroup.append('line')
                                    .attr('x1', leftScale(totalParentLength))
                                    .attr('y1', d.x)
                                    .attr('x2', leftScale(totalNodeLength))
                                    .attr('y2', d.x)
                                    .attr('stroke', '#555')
                                    .attr('stroke-width', 1.5)
                                    .attr('class', 'link');
                            }
                        });
                        
                        
                        const rightOffset = treeWidth + middleGap;
                        rightRoot.descendants().forEach(d => {
                            if (d.parent) {
                                const totalParentLength = calculateTotalLength(d.parent);
                                const totalNodeLength = calculateTotalLength(d);
                                
                                linesGroup.append('line')
                                    .attr('x1', rightOffset + (treeWidth - rightScale(totalParentLength)))
                                    .attr('y1', d.parent.x)
                                    .attr('x2', rightOffset + (treeWidth - rightScale(totalParentLength)))
                                    .attr('y2', d.x)
                                    .attr('stroke', '#555')
                                    .attr('stroke-width', 1.5)
                                    .attr('class', 'link');
                                
                                linesGroup.append('line')
                                    .attr('x1', rightOffset + (treeWidth - rightScale(totalParentLength)))
                                    .attr('y1', d.x)
                                    .attr('x2', rightOffset + (treeWidth - rightScale(totalNodeLength)))
                                    .attr('y2', d.x)
                                    .attr('stroke', '#555')
                                    .attr('stroke-width', 1.5)
                                    .attr('class', 'link');
                            }
                        });
                        
                        
                        leftRoot.descendants().forEach(d => {
                            const totalLength = calculateTotalLength(d);
                            nodesGroup.append('circle')
                                .attr('cx', leftScale(totalLength))
                                .attr('cy', d.x)
                                .attr('r', 3)
                                .attr('fill', '#4682B4')
                                .attr('class', 'node');
                        });
                        
                        
                        rightRoot.descendants().forEach(d => {
                            const totalLength = calculateTotalLength(d);
                            nodesGroup.append('circle')
                                .attr('cx', rightOffset + (treeWidth - rightScale(totalLength)))
                                .attr('cy', d.x)
                                .attr('r', 3)
                                .attr('fill', '#D2691E')
                                .attr('class', 'node');
                        });
                        
                        
                        leftRoot.leaves().forEach(d => {
                            const totalLength = calculateTotalLength(d);
                            const label = d.data.name ? d.data.name.split('.region')[0] : '';
                            
                            
                            const labelWidth = label.length * 7;
                            leftMap.set(d.data.name, { 
                                x: d.x, 
                                y: leftScale(totalLength) + labelWidth + 5
                            });
                        });

                        
                        rightRoot.leaves().forEach(d => {
                            const totalLength = calculateTotalLength(d);
                            const label = d.data.name ? d.data.name.split('.region')[0] : '';
                            
                            
                            const labelWidth = label.length * 7;
                            const position = {
                                x: d.x,
                                y: rightOffset + (treeWidth - rightScale(totalLength)) - labelWidth - 5,
                                node: d 
                            };
                            
                            
                            if (rightMap.has(d.data.name)) {
                                rightMap.get(d.data.name).push(position);
                            } else {
                                
                                rightMap.set(d.data.name, [position]);
                            }
                        });
                        
                        
                        Array.from(leftMap.entries()).forEach(([taxon, leftPos]) => {
                            if (rightMap.has(taxon)) {
                                const rightPositions = rightMap.get(taxon);
                                
                                
                                rightPositions.forEach((rightPos, index) => {
                                    
                                    const normalizedY = leftPos.x / innerHeight;
                                    const hue = Math.floor(normalizedY * 240);
                                    
                                    connectionsGroup.append('line')
                                        .attr('x1', leftPos.y)
                                        .attr('y1', leftPos.x)
                                        .attr('x2', rightPos.y)
                                        .attr('y2', rightPos.x)
                                        .attr('stroke', \`hsl(\${hue}, 80%, 50%)\`)
                                        .attr('stroke-width', 1.5)
                                        .attr('stroke-dasharray', '3,3')
                                        .attr('opacity', 0.8)
                                        .attr('data-taxon', taxon)
                                        .attr('data-index', index) 
                                        .attr('class', 'connection')
                                        .on('click', function(event) {
                                            event.stopPropagation();
                                            highlightConnection(taxon);
                                        });
                                });
                            }
                        });
                        
                        
                        leftRoot.leaves().forEach(d => {
                            const totalLength = calculateTotalLength(d);
                            const label = d.data.name ? d.data.name.split('.region')[0] : '';
                            
                            labelsGroup.append('text')
                                .attr('x', leftScale(totalLength) + 5)
                                .attr('y', d.x + 4)
                                .attr('font-size', '16px')
                                .attr('text-anchor', 'start')
                                .attr('data-taxon', d.data.name)
                                .attr('class', 'leaf-label left-label')
                                .text(label)
                                .on('click', function(event) {
                                    event.stopPropagation();
                                    highlightConnection(d.data.name);
                                });
                        });
                        
                        
                        rightRoot.leaves().forEach(d => {
                            const totalLength = calculateTotalLength(d);
                            const label = d.data.name ? d.data.name.split('.region')[0] : '';
                            
                            labelsGroup.append('text')
                                .attr('x', rightOffset + (treeWidth - rightScale(totalLength)) - 5)
                                .attr('y', d.x + 4)
                                .attr('font-size', '16px')
                                .attr('text-anchor', 'end')
                                .attr('data-taxon', d.data.name)
                                .attr('class', 'leaf-label right-label')
                                .text(label)
                                .on('click', function(event) {
                                    event.stopPropagation();
                                    highlightConnection(d.data.name);
                                });
                        });
                        
                        
                        function bringLabelsToFront() {
                            const textElements = labelsGroup.selectAll('text').nodes();
                            textElements.forEach(textElem => {
                                const parent = textElem.parentNode;
                                parent.removeChild(textElem);
                                parent.appendChild(textElem);
                            });
                        }
                        
                        
                        bringLabelsToFront();
                        
                        
                        d3Svg.on('click', function() {
                            
                            g.selectAll('.leaf-label').classed('highlighted-leaf', false);
                            g.selectAll('.connection').classed('highlighted-connection', false);
                        });
                        
                        
                        function highlightConnection(taxonName) {
                            
                            g.selectAll('.leaf-label').classed('highlighted-leaf', false);
                            g.selectAll('.connection').classed('highlighted-connection', false);
                            
                            
                            g.selectAll(\`.leaf-label[data-taxon="\${taxonName}"]\`)
                                .classed('highlighted-leaf', true);
                                
                            
                            g.selectAll(\`.connection[data-taxon="\${taxonName}"]\`)
                                .classed('highlighted-connection', true);
                        }
                        
                        
                        const calculateCrossings = () => {
                            const connections = [];
                            
                            Array.from(leftMap.entries()).forEach(([taxon, leftPos]) => {
                                if (rightMap.has(taxon)) {
                                    const rightPositions = rightMap.get(taxon);
                                    
                                    
                                    rightPositions.forEach(rightPos => {
                                        connections.push({
                                            left: leftPos.x,
                                            right: rightPos.x
                                        });
                                    });
                                }
                            });
                            
                            
                            connections.sort((a, b) => a.left - b.left);
                            
                            
                            let crossings = 0;
                            for (let i = 0; i < connections.length; i++) {
                                for (let j = i + 1; j < connections.length; j++) {
                                    if (connections[i].right > connections[j].right) {
                                        crossings++;
                                    }
                                }
                            }
                            
                            return crossings;
                        };
                        
                        
                        let connectionsCount = 0;
                        Array.from(leftMap.entries()).forEach(([taxon]) => {
                            if (rightMap.has(taxon)) {
                                connectionsCount += rightMap.get(taxon).length;
                            }
                        });
                        
                        const crossingCount = calculateCrossings();
                        
                        d3Svg.append('text')
                            .attr('x', width / 2)
                            .attr('y', height - 10)
                            .attr('text-anchor', 'middle')
                            .attr('font-size', '12px')
                            .text(\`Taxa: \${leftRoot.leaves().length} | Connections: \${connectionsCount} | Crossings: \${crossingCount}\`);
                    }
                    
                    
                    window.onload = renderFullTanglegram;
                </script>
            </body>
            </html>
        `);
        
        newWindow.document.close();
    }

    
    function parseNexusTrees(nexusContent) {
        const trees = {};
        const treeLines = nexusContent.split('\n').filter(line => 
            line.trim().startsWith('Tree ')
        );

        
        treeLines.forEach(line => {
            const match = line.match(/Tree\s+([^\s=]+)\s*=\s*(.*?);/);
            if (match) {
                const treeName = match[1];
                const treeData = match[2];
                trees[treeName] = treeData;
            }
        });

        return trees;
    }

    
    function renderTanglegram(leftTreeName, rightTreeName) {
        if (!window.nexusData || !window.nexusData.trees) return;
        
        const leftTreeNewick = window.nexusData.trees[leftTreeName];
        const rightTreeNewick = window.nexusData.trees[rightTreeName];
        
        if (!leftTreeNewick || !rightTreeNewick) return;
        
        
        const svgContainer = document.querySelector('.tanglegram-container');
        svgContainer.innerHTML = '';
        
        
        const leftData = parseNewickToJson(leftTreeNewick);
        const rightData = parseNewickToJson(rightTreeNewick);
        
        if (!leftData || !rightData) return;
        
        
        const getLeafNames = (node, names = []) => {
            if (!node) return names;
            if (!node.children || node.children.length === 0) {
                if (node.name) names.push(node.name);
            } else {
                node.children.forEach(child => getLeafNames(child, names));
            }
            return names;
        };
        
        const leftLeafNames = getLeafNames(leftData);
        
        
        const uniqueLeftLeafNames = new Set(leftLeafNames);
        if (uniqueLeftLeafNames.size < 3) {
            
            const messageContainer = document.createElement('div');
            messageContainer.style.width = '100%';
            messageContainer.style.height = '400px';
            messageContainer.style.display = 'flex';
            messageContainer.style.alignItems = 'center';
            messageContainer.style.justifyContent = 'center';
            messageContainer.style.fontSize = '18px';
            messageContainer.style.fontWeight = 'bold';
            messageContainer.style.color = '#666';
            messageContainer.style.textAlign = 'center';
            messageContainer.style.padding = '20px';
            messageContainer.style.border = '1px dashed #ccc';
            messageContainer.style.borderRadius = '8px';
            messageContainer.style.backgroundColor = '#f9f9f9';
            messageContainer.innerHTML = 'Not enough BGC in this family to display a phylogenetic comparison.<br><small>(Minimum 3 unique BGCs required)</small>';
            
            svgContainer.appendChild(messageContainer);
            
            
            document.querySelector('.tanglegram-stats').textContent = 'Insufficient data for phylogenetic comparison';
            
            return; 
        }
        
        const rightLeafNames = getLeafNames(rightData);
        
        
        const fixedHeight = 800; 
        
        
        optimizeLeafOrder(rightData, leftData);
        
        
        const width = 1800;
        const height = fixedHeight; 
        const margin = { top: 40, right: 260, bottom: 40, left: 260 }; 
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        const middleGap = 260; 
        
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', height);
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svgContainer.appendChild(svg);
        
        
        const d3Svg = d3.select(svg);
        
        
        d3Svg.append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', '#ffffff');
        
        
        const g = d3Svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        
        const linesGroup = g.append('g').attr('class', 'lines-group');
        const nodesGroup = g.append('g').attr('class', 'nodes-group');
        const connectionsGroup = g.append('g').attr('class', 'connections-group');
        const labelsGroup = g.append('g').attr('class', 'labels-group');
        
        
        const treeWidth = (innerWidth - middleGap) / 2;
        
        
        const leftRoot = d3.hierarchy(leftData);
        const rightRoot = d3.hierarchy(rightData);
        
        
        const calculateTotalLength = (node) => {
            if (!node.parent) return 0;
            return (node.data.length || 0) + calculateTotalLength(node.parent);
        };
        
        
        const leftTree = d3.cluster().size([innerHeight, treeWidth]);
        leftTree(leftRoot);
        
        const rightTree = d3.cluster().size([innerHeight, treeWidth]);
        rightTree(rightRoot);
        
        
        const leftMap = new Map();
        const rightMap = new Map();
        
        
        const leftMaxLength = d3.max(leftRoot.descendants(), d => calculateTotalLength(d));
        const rightMaxLength = d3.max(rightRoot.descendants(), d => calculateTotalLength(d));
        
        
        const leftScale = d3.scaleLinear()
            .domain([0, leftMaxLength || 1])
            .range([0, treeWidth * 0.8]);
        
        const rightScale = d3.scaleLinear()
            .domain([0, rightMaxLength || 1])
            .range([0, treeWidth * 0.8]);
        
        
        leftRoot.descendants().forEach(d => {
            if (d.parent) {
                const totalParentLength = calculateTotalLength(d.parent);
                const totalNodeLength = calculateTotalLength(d);
                
                linesGroup.append('line')
                    .attr('x1', leftScale(totalParentLength))
                    .attr('y1', d.parent.x)
                    .attr('x2', leftScale(totalParentLength))
                    .attr('y2', d.x)
                    .attr('stroke', '#555')
                    .attr('stroke-width', 1.5)
                    .attr('class', 'link');
                
                linesGroup.append('line')
                    .attr('x1', leftScale(totalParentLength))
                    .attr('y1', d.x)
                    .attr('x2', leftScale(totalNodeLength))
                    .attr('y2', d.x)
                    .attr('stroke', '#555')
                    .attr('stroke-width', 1.5)
                    .attr('class', 'link');
            }
        });
        
        
        const rightOffset = treeWidth + middleGap;
        
        rightRoot.descendants().forEach(d => {
            if (d.parent) {
                const totalParentLength = calculateTotalLength(d.parent);
                const totalNodeLength = calculateTotalLength(d);
                
                linesGroup.append('line')
                    .attr('x1', rightOffset + (treeWidth - rightScale(totalParentLength)))
                    .attr('y1', d.parent.x)
                    .attr('x2', rightOffset + (treeWidth - rightScale(totalParentLength)))
                    .attr('y2', d.x)
                    .attr('stroke', '#555')
                    .attr('stroke-width', 1.5)
                    .attr('class', 'link');
                
                linesGroup.append('line')
                    .attr('x1', rightOffset + (treeWidth - rightScale(totalParentLength)))
                    .attr('y1', d.x)
                    .attr('x2', rightOffset + (treeWidth - rightScale(totalNodeLength)))
                    .attr('y2', d.x)
                    .attr('stroke', '#555')
                    .attr('stroke-width', 1.5)
                    .attr('class', 'link');
            }
        });
        
        
        leftRoot.descendants().forEach(d => {
            const totalLength = calculateTotalLength(d);
            nodesGroup.append('circle')
                .attr('cx', leftScale(totalLength))
                .attr('cy', d.x)
                .attr('r', 3)
                .attr('fill', '#4682B4')
                .attr('class', 'node');
        });
        
        
        rightRoot.descendants().forEach(d => {
            const totalLength = calculateTotalLength(d);
            nodesGroup.append('circle')
                .attr('cx', rightOffset + (treeWidth - rightScale(totalLength)))
                .attr('cy', d.x)
                .attr('r', 3)
                .attr('fill', '#D2691E')
                .attr('class', 'node');
        });
        
        
        leftRoot.leaves().forEach(d => {
            const totalLength = calculateTotalLength(d);
            const label = d.data.name ? d.data.name.split('.region')[0] : '';
            
            
            const labelWidth = label.length * 7; 
            leftMap.set(d.data.name, { 
                x: d.x, 
                y: leftScale(totalLength) + labelWidth + 5
            });
        });
        
        
        rightRoot.leaves().forEach(d => {
            const totalLength = calculateTotalLength(d);
            const label = d.data.name ? d.data.name.split('.region')[0] : '';
            
            
            const labelWidth = label.length * 7;
            const position = {
                x: d.x,
                y: rightOffset + (treeWidth - rightScale(totalLength)) - labelWidth - 5,
                node: d 
            };
            
            
            if (rightMap.has(d.data.name)) {
                rightMap.get(d.data.name).push(position);
            } else {
                
                rightMap.set(d.data.name, [position]);
            }
        });
        
        
        Array.from(leftMap.entries()).forEach(([taxon, leftPos]) => {
            if (rightMap.has(taxon)) {
                const rightPositions = rightMap.get(taxon);
                
                
                rightPositions.forEach((rightPos, index) => {
                    
                    const normalizedY = leftPos.x / innerHeight;
                    const hue = Math.floor(normalizedY * 240);
                    
                    connectionsGroup.append('line')
                        .attr('x1', leftPos.y)
                        .attr('y1', leftPos.x)
                        .attr('x2', rightPos.y)
                        .attr('y2', rightPos.x)
                        .attr('stroke', `hsl(${hue}, 80%, 50%)`)
                        .attr('stroke-width', 1.5)
                        .attr('stroke-dasharray', '3,3')
                        .attr('opacity', 0.8)
                        .attr('data-taxon', taxon)
                        .attr('data-index', index) 
                        .attr('class', 'connection')
                        .on('click', function(event) {
                            event.stopPropagation();
                            highlightConnection(taxon);
                        });
                });
            }
        });
        
        
        leftRoot.leaves().forEach(d => {
            const totalLength = calculateTotalLength(d);
            const label = d.data.name ? d.data.name.split('.region')[0] : '';
            
            labelsGroup.append('text')
                .attr('x', leftScale(totalLength) + 5)
                .attr('y', d.x + 4)
                .attr('font-size', '16px')
                .attr('text-anchor', 'start')
                .attr('data-taxon', d.data.name)
                .attr('class', 'leaf-label left-label')
                .text(label)
                .on('click', function(event) {
                    event.stopPropagation();
                    highlightConnection(d.data.name);
                });
        });
        
        
        rightRoot.leaves().forEach(d => {
            const totalLength = calculateTotalLength(d);
            const label = d.data.name ? d.data.name.split('.region')[0] : '';
            
            labelsGroup.append('text')
                .attr('x', rightOffset + (treeWidth - rightScale(totalLength)) - 5)
                .attr('y', d.x + 4)
                .attr('font-size', '16px')
                .attr('text-anchor', 'end')
                .attr('data-taxon', d.data.name)
                .attr('class', 'leaf-label right-label')
                .text(label)
                .on('click', function(event) {
                    event.stopPropagation();
                    highlightConnection(d.data.name);
                });
        });
        
        
        function bringLabelsToFront() {
            const textElements = labelsGroup.selectAll('text').nodes();
            textElements.forEach(textElem => {
                const parent = textElem.parentNode;
                parent.removeChild(textElem);
                parent.appendChild(textElem);
            });
        }
        
        
        bringLabelsToFront();
        
        
        d3Svg.on('click', function() {
            
            g.selectAll('.leaf-label').classed('highlighted-leaf', false);
            g.selectAll('.connection').classed('highlighted-connection', false);
        });
        
        
        function highlightConnection(taxonName) {
            
            g.selectAll('.leaf-label').classed('highlighted-leaf', false);
            g.selectAll('.connection').classed('highlighted-connection', false);
            
            
            g.selectAll(`.leaf-label[data-taxon="${taxonName}"]`)
                .classed('highlighted-leaf', true);
                
            
            g.selectAll(`.connection[data-taxon="${taxonName}"]`)
                .classed('highlighted-connection', true);
        }
        
        
        const style = document.createElement('style');
        style.textContent = `
            .leaf-label {
                paint-order: stroke;
                stroke: white;
                stroke-width: 2px;
                stroke-linecap: round;
                stroke-linejoin: round;
            }
        `;
        document.head.appendChild(style);
        
        
        function calculateCrossings() {
            const connections = [];
            
            Array.from(leftMap.entries()).forEach(([taxon, leftPos]) => {
                if (rightMap.has(taxon)) {
                    const rightPositions = rightMap.get(taxon);
                    
                    
                    rightPositions.forEach(rightPos => {
                        connections.push({
                            left: leftPos.x,
                            right: rightPos.x
                        });
                    });
                }
            });
            
            
            connections.sort((a, b) => a.left - b.left);
            
            
            let crossings = 0;
            for (let i = 0; i < connections.length; i++) {
                for (let j = i + 1; j < connections.length; j++) {
                    if (connections[i].right > connections[j].right) {
                        crossings++;
                    }
                }
            }
            
            return crossings;
        }
        
        
        const crossingCount = calculateCrossings();
        
        
        let connectionsCount = 0;
        Array.from(leftMap.entries()).forEach(([taxon]) => {
            if (rightMap.has(taxon)) {
                connectionsCount += rightMap.get(taxon).length;
            }
        });
        
        document.querySelector('.tanglegram-stats').textContent = 
            `Taxa: ${leftRoot.leaves().length} | Connections: ${connectionsCount} | Crossings: ${crossingCount}`;
            
        
        window.currentLeftMap = leftMap;
        window.currentRightMap = rightMap;
        
        
        resizeObserver.observe(svgContainer);
    }
    
    
    function calculateCrossings() {
        
        if (!window.nexusData || !window.currentLeftMap || !window.currentRightMap) return 0;
        
        const connections = [];
        Array.from(window.currentLeftMap.entries()).forEach(([taxon, leftPos]) => {
            if (window.currentRightMap.has(taxon)) {
                const rightPositions = window.currentRightMap.get(taxon);
                
                
                rightPositions.forEach(rightPos => {
                    connections.push({
                        left: leftPos.x,
                        right: rightPos.x
                    });
                });
            }
        });
        
        
        connections.sort((a, b) => a.left - b.left);
        
        
        let crossings = 0;
        for (let i = 0; i < connections.length; i++) {
            for (let j = i + 1; j < connections.length; j++) {
                if (connections[i].right > connections[j].right) {
                    crossings++;
                }
            }
        }
        
        return crossings;
    }

    
    function parseNewickToJson(newickString) {
        if (!newickString) return null;

        
        newickString = newickString.trim();
        if (newickString.endsWith(';')) {
            newickString = newickString.slice(0, -1);
        }

        const findClosingParenthesis = (str, openIndex) => {
            let depth = 1;
            for (let i = openIndex + 1; i < str.length; i++) {
                if (str[i] === '(') depth++;
                else if (str[i] === ')') {
                    depth--;
                    if (depth === 0) return i;
                }
            }
            return -1;
        };

        const parseNode = (str) => {
            let node = {};
            let i = 0;
            
            
            if (str[i] === '(') {
                const endIndex = findClosingParenthesis(str, i);
                const childrenStr = str.substring(i + 1, endIndex);
                node.children = parseChildren(childrenStr);
                i = endIndex + 1;
            }
            
            
            let parts = str.substring(i).split(':');
            if (parts.length > 0 && parts[0]) {
                node.name = parts[0].trim();
            }
            
            if (parts.length > 1) {
                
                const lengthStr = parts[1].trim();
                node.length = parseFloat(lengthStr);
            } else {
                
                node.length = 0;
            }
            
            return node;
        };
        
        const parseChildren = (str) => {
            const children = [];
            let depth = 0;
            let start = 0;
            
            for (let i = 0; i <= str.length; i++) {
                if (i === str.length || (str[i] === ',' && depth === 0)) {
                    const childStr = str.substring(start, i).trim();
                    if (childStr) {
                        children.push(parseNode(childStr));
                    }
                    start = i + 1;
                } else if (str[i] === '(') {
                    depth++;
                } else if (str[i] === ')') {
                    depth--;
                }
            }
            
            return children;
        };
        
        
        return parseNode(newickString);
    }

    
    function optimizeLeafOrder(rightTree, leftTree) {
        if (!rightTree || !leftTree) return;
        
        
        const getLeafOrder = (node, order = [], level = 0) => {
            if (!node) return order;
            if (!node.children || node.children.length === 0) {
                if (node.name) order.push({ name: node.name, level });
            } else {
                node.children.forEach(child => getLeafOrder(child, order, level + 1));
            }
            return order;
        };
        
        
        const leftOrder = getLeafOrder(leftTree);
        const leftOrderMap = new Map();
        
        
        leftOrder.forEach((item, index) => {
            leftOrderMap.set(item.name, { index, level: item.level });
        });
        
        
        const getLeafNames = (node, names = []) => {
            if (!node) return names;
            if (!node.children || node.children.length === 0) {
                if (node.name) names.push(node.name);
            } else {
                node.children.forEach(child => getLeafNames(child, names));
            }
            return names;
        };
        
        
        const sortNodes = (node) => {
            if (!node) return;
            
            
            if (node.children && node.children.length > 0) {
                node.children.forEach(child => sortNodes(child));
            }
            
            
            if (node.children && node.children.length >= 2) {
                
                const childPositions = node.children.map(child => {
                    const leaves = getLeafNames(child);
                    
                    
                    const positions = leaves
                        .map(leaf => leftOrderMap.get(leaf))
                        .filter(pos => pos !== undefined);
                    
                    
                    if (positions.length === 0) return { child, avgPos: Number.MAX_SAFE_INTEGER };
                    
                    const avgPos = positions.reduce((sum, pos) => sum + pos.index, 0) / positions.length;
                    return { child, avgPos };
                });
                
                
                childPositions.sort((a, b) => a.avgPos - b.avgPos);
                
                
                node.children = childPositions.map(item => item.child);
            }
        };
        
        
        sortNodes(rightTree);
    }
});