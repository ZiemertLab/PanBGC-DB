
const COMPOUNDS_JSON = '../../data/mibig_compound.json';


window.compoundDataLoaded = false;


function loadCompoundData() {
    const compoundContainer = document.getElementById('compound-search-container');
    
    
    compoundContainer.innerHTML = `
        <h2><i class="fas fa-flask" style="color: #1abc9c;"></i> MIBiG Compounds</h2>
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <div class="loading-text">Loading compound data...</div>
            <div class="loading-progress">
                <div class="progress-bar"></div>
            </div>
            <div class="loading-status">Initializing...</div>
        </div>
        <table id="compoundTable" class="display" style="width:100%; display:none">
            <thead>
                <tr>
                    <th>BGC ID</th>
                    <th>Compounds</th>
                    <th>BGC Categories</th>
                    <th>Number of BGCs</th>
                    <th>Gene Cluster Family</th>
                    <th>Link</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>`;
    
    
    if (!window.jQuery) {
        const script = document.createElement('script');
        script.src = 'https://code.jquery.com/jquery-3.6.4.min.js';
        script.onload = loadDataTablesAndData;
        document.head.appendChild(script);
    } else {
        loadDataTablesAndData();
    }
    
    function loadDataTablesAndData() {
        
        const style = document.createElement('style');
        style.textContent = `
            #compoundTable td:nth-child(2) {
                white-space: normal;
                word-break: break-word;
            }
        `;
        document.head.appendChild(style);
        if (!$.fn.DataTable) {
            const dtScript = document.createElement('script');
            dtScript.src = 'https://cdn.datatables.net/1.13.5/js/jquery.dataTables.min.js';
            dtScript.onload = function() {
                const cssLink = document.createElement('link');
                cssLink.rel = 'stylesheet';
                cssLink.href = 'https://cdn.datatables.net/1.13.5/css/jquery.dataTables.min.css';
                document.head.appendChild(cssLink);
                
                
                fetchAndProcessCompoundData();
            };
            document.head.appendChild(dtScript);
        } else {
            
            fetchAndProcessCompoundData();
        }
    }
    
    
    async function fetchAndProcessCompoundData() {
        try {
            updateLoadingStatus('Fetching compound data...', 5);
            
            
            const response = await fetch(COMPOUNDS_JSON);
            
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
                    processCompoundDataForTable(data);
                } catch (error) {
                    console.error('Error parsing JSON:', error);
                    updateLoadingStatus(`Error parsing JSON: ${error.message}`, 100, true);
                }
            }, 50);
            
        } catch (error) {
            console.error('Error fetching compound data:', error);
            updateLoadingStatus(`Error: ${error.message}`, 100, true);
        }
    }
    
    
    function processCompoundDataForTable(data) {
        updateLoadingStatus('Preparing compound data...', 60);
        
        
        const tableData = [];
        
        
        Object.entries(data).forEach(([bgcId, bgcData]) => {
            
            let compoundsList = '';
            if (bgcData.compounds && bgcData.compounds.length > 0) {
                compoundsList = bgcData.compounds.join(', ');
            }
            
            
            tableData.push({
                bgcId: bgcId,
                compounds: compoundsList,
                categories: bgcData.protocluster_categories || '',
                totalBGCs: bgcData.total_BGCs || 1,
                familyName: bgcData.family_name || '',
                link: `/bgc/${bgcData.family_name}`
            });
        });
        
        
        initializeCompoundTable(tableData);
    }
    
    
    function initializeCompoundTable(data) {
        updateLoadingStatus('Setting up table...', 75);
        
        
        const table = $('#compoundTable').DataTable({
            paging: true,
            ordering: true,
            searching: true,
            deferRender: true,
            pageLength: 10,
            lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],
            columnDefs: [
                {width: '15%', targets: 0}, 
                {width: '25%', targets: 1}, 
                {width: '15%', targets: 2}, 
                {width: '10%', targets: 3}, 
                {width: '25%', targets: 4}, 
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
                    
                    document.getElementById('compoundTable').style.display = 'table';
                    
                    
                    const loadingContainer = compoundContainer.querySelector('.loading-container');
                    if (loadingContainer) {
                        loadingContainer.remove();
                    }
                    
                    
                    table.draw();
                    
                    
                    window.compoundDataLoaded = true;
                    
                    
                    $(window).trigger('resize');
                }, 100);
                
                return;
            }
            
            const start = batchIndex * batchSize;
            const end = Math.min(start + batchSize, data.length);
            const batch = data.slice(start, end);
            
            
            const rows = batch.map(item => {
                return [
                    item.bgcId || 'Unknown',
                    item.compounds || 'None',
                    item.categories || '',
                    item.totalBGCs || 0,
                    item.familyName || '',
                    `<a href="${item.link}">View</a>`
                ];
            });
            
            
            table.rows.add(rows);
            
            
            const progress = 75 + Math.floor((batchIndex / totalBatches) * 20);
            updateLoadingStatus(
                `Processing data: ${Math.min(100, Math.floor((batchIndex + 1) / totalBatches * 100))}%`, 
                progress
            );
            
            
            setTimeout(() => processBatch(batchIndex + 1), 0);
        }
        
        
        processBatch(0);
    }
    
    
    function updateLoadingStatus(message, progressPercent, isError = false) {
        const statusElement = compoundContainer.querySelector('.loading-status');
        const progressBar = compoundContainer.querySelector('.progress-bar');
        const loadingText = compoundContainer.querySelector('.loading-text');
        
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
            loadingText.textContent = 'Error Loading Compound Data';
            loadingText.style.color = '#e74c3c';
        }
    }
}