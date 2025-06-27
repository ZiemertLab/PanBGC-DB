const OVERVIEW_JSON = '../../data/Overview.json';

document.addEventListener('DOMContentLoaded', function() {
    const overviewTableArea = document.getElementById('overview_table_area');
    
    
    overviewTableArea.innerHTML = `
        <h2><i class="fas fa-database" style="color: #1abc9c;"></i> Gene Cluster Families</h2>
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <div class="loading-text">Loading data...</div>
            <div class="loading-progress">
                <div class="progress-bar"></div>
            </div>
            <div class="loading-status">Initializing...</div>
        </div>
        <table id="overviewTable" class="display" style="width:100%; display:none">
            <thead>
                <tr>
                    <th>Gene Cluster Family</th>
                    <th>BGC classes</th>
                    <th>Number of BGCs</th>
                    <th>Number of genes</th>
                    <th>Gene distribution</th>
                    <th>Link</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>`;
    
    
    const tooltipDiv = document.createElement('div');
    tooltipDiv.id = 'geneTooltip';
    document.body.appendChild(tooltipDiv);
    
    
    document.addEventListener('mousemove', function(e) {
        const tooltip = document.getElementById('geneTooltip');
        if (tooltip.dataset.isVisible === 'true') {
            
            tooltip.style.left = (e.clientX + 15) + 'px';
            tooltip.style.top = (e.clientY + 15) + 'px';
        }
    });
    
    
    window.showTooltip = function(text) {
        const tooltip = document.getElementById('geneTooltip');
        tooltip.textContent = text;
        tooltip.style.opacity = '1';
        tooltip.dataset.isVisible = 'true';
    };
    
    window.hideTooltip = function() {
        const tooltip = document.getElementById('geneTooltip');
        tooltip.style.opacity = '0';
        tooltip.dataset.isVisible = 'false';
    };
    
    
    if (!window.jQuery) {
        const script = document.createElement('script');
        script.src = 'https://code.jquery.com/jquery-3.6.4.min.js';
        script.onload = loadDataTablesAndData;
        document.head.appendChild(script);
    } else {
        loadDataTablesAndData();
    }
    
    function loadDataTablesAndData() {
        
        const dtScript = document.createElement('script');
        dtScript.src = 'https://cdn.datatables.net/1.13.5/js/jquery.dataTables.min.js';
        dtScript.onload = function() {
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = 'https://cdn.datatables.net/1.13.5/css/jquery.dataTables.min.css';
            document.head.appendChild(cssLink);
            
            
            fetchAndProcessData();
        };
        document.head.appendChild(dtScript);
    }
    
    
    function createGeneBar(core, accessory, singleton, total_BGCs) {
        
        if (total_BGCs === 1) {
            
            const totalGenes = core + accessory + singleton;
            core = totalGenes;
            accessory = 0;
            singleton = 0;
        }
        
        const total = core + accessory + singleton;
        if (total === 0) return '';
        
        function segment(width, color, label, value) {
            
            return `<div class="gene-segment ${color}" style="width:${width}%;" 
                onmouseover="showTooltip('${label}: ${value}')" 
                onmouseout="hideTooltip()"></div>`;
        }
        
        const corePct = (core / total) * 100;
        const accessoryPct = (accessory / total) * 100;
        const singletonPct = (singleton / total) * 100;
        
        return `
            <div class="gene-bar">
                ${segment(corePct, 'core', 'Core (100%)', core)}
                ${segment(accessoryPct, 'accessory', 'Accessory', accessory)}
                ${segment(singletonPct, 'singleton', 'Singletons', singleton)}
            </div>
        `;
    }
    
    
    async function fetchAndProcessData() {
        try {
            updateLoadingStatus('Fetching data...', 5);
            
            
            const response = await fetch(OVERVIEW_JSON);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            
            const reader = response.body.getReader();
            const contentLength = +response.headers.get('Content-Length') || 0;
            
            let receivedLength = 0;
            const chunks = [];
            
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                chunks.push(value);
                receivedLength += value.length;
                
                
                const downloadProgress = Math.min(40, Math.round((receivedLength / contentLength) * 40));
                updateLoadingStatus(`Downloading data: ${Math.round((receivedLength / contentLength) * 100)}%`, downloadProgress);
            }
            
            updateLoadingStatus('Processing data...', 45);
            
            
            const allChunks = new Uint8Array(receivedLength);
            let position = 0;
            for (const chunk of chunks) {
                allChunks.set(chunk, position);
                position += chunk.length;
            }
            
            
            const jsonText = new TextDecoder('utf-8').decode(allChunks);
            updateLoadingStatus('Parsing JSON...', 50);
            
            
            setTimeout(() => {
                try {
                    const data = JSON.parse(jsonText);
                    initializeTableWithData(data);
                } catch (error) {
                    console.error('Error parsing JSON:', error);
                    updateLoadingStatus(`Error parsing JSON: ${error.message}`, 100, true);
                }
            }, 50);
            
        } catch (error) {
            console.error('Error fetching data:', error);
            updateLoadingStatus(`Error: ${error.message}`, 100, true);
        }
    }
    
    
    function initializeTableWithData(data) {
        updateLoadingStatus('Preparing table...', 60);
        
        
        const table = $('#overviewTable').DataTable({
            paging: true,
            ordering: true,
            searching: true,
            deferRender: true,
            pageLength: 10,
            lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],
            columnDefs: [
                {width: '15%', targets: 0},
                {width: '15%', targets: 1},
                {width: '10%', targets: 2},
                {width: '10%', targets: 3},
                {width: '30%', targets: 4},
                {width: '10%', targets: 5}
            ],
            language: {
                processing: "Loading data, please wait..."
            },
            dom: '<"top"lf>rt<"bottom"ip>',
            renderer: 'bootstrap'
        });
        
        
        const batchSize = 50;
        const totalBatches = Math.ceil(data.length / batchSize);
        
        function processBatch(batchIndex) {
            if (batchIndex >= totalBatches) {
                
                updateLoadingStatus('Finalizing table...', 95);
                
                setTimeout(() => {
                    
                    document.getElementById('overviewTable').style.display = 'table';
                    
                    
                    const loadingContainer = document.querySelector('.loading-container');
                    if (loadingContainer) {
                        loadingContainer.remove();
                    }
                    
                    
                    table.draw();
                    
                    
                    $(window).trigger('resize');
                }, 100);
                
                return;
            }
            
            const start = batchIndex * batchSize;
            const end = Math.min(start + batchSize, data.length);
            const batch = data.slice(start, end);
            
            
            const rows = batch.map(item => {
                const totalGenes = (item['100_core_genes'] || 0) + 
                                  (item.accessory_genes || 0) + 
                                  (item.singletons || 0);
                
                return [
                    item.Family_name || '',
                    item.protocluster_categories || '',
                    item.total_BGCs || 0,
                    totalGenes,
                    createGeneBar(
                        item['100_core_genes'] || 0, 
                        item.accessory_genes || 0, 
                        item.singletons || 0, 
                        item.total_BGCs || 0
                    ),
                    `<a href="/bgc/${item.Family_name}">View</a>`
                ];
            });
            
            
            table.rows.add(rows);
            
            
            const progress = 60 + Math.floor((batchIndex / totalBatches) * 35);
            updateLoadingStatus(
                `Processing data: ${Math.min(100, Math.floor((batchIndex + 1) / totalBatches * 100))}%`, 
                progress
            );
            
            
            setTimeout(() => processBatch(batchIndex + 1), 0);
        }
        
        
        processBatch(0);
    }
    
    
    function updateLoadingStatus(message, progressPercent, isError = false) {
        const statusElement = document.querySelector('.loading-status');
        const progressBar = document.querySelector('.progress-bar');
        const loadingText = document.querySelector('.loading-text');
        
        if (statusElement) {
            statusElement.textContent = message;
        }
        
        if (progressBar) {
            progressBar.style.width = `${progressPercent}%`;
            if (isError) {
                progressBar.style.backgroundColor = '#e74c3c';
            }
        }
        
        if (loadingText && isError) {
            loadingText.textContent = 'Error Loading Data';
            loadingText.style.color = '#e74c3c';
        }
    }
});