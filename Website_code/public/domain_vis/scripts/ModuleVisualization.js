
function ModuleVisualization() {
  const [data, setData] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedBGCs, setSelectedBGCs] = React.useState([]);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [showLabels, setShowLabels] = React.useState(true);
  const [filterType, setFilterType] = React.useState('');
  
  const [reversedBGCs, setReversedBGCs] = React.useState({});
  
  React.useEffect(() => {
    const loadData = async () => {
      try {
        
        const response = await fetch(METAINFO_LOCATION);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const parsed = await response.json();
        
        
        const sortedData = parsed.data.sort((a, b) => {
          if (a.protocluster_category < b.protocluster_category) return -1;
          if (a.protocluster_category > b.protocluster_category) return 1;
          return 0;
        });
        
        setData(sortedData);
        
        
        if (sortedData.length > 0) {
          setSelectedBGCs(sortedData.map(item => item.file_name));
          
          
          const initialReversedState = {};
          sortedData.forEach(item => {
            initialReversedState[item.file_name] = false;
          });
          setReversedBGCs(initialReversedState);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  const domainColorMap = {
    
    'AMP-binding': '#BA55D3', 
    'PCP': '#87CEEB',         
    'Condensation_LCL': '#1F4F9C', 
    'Condensation_DCL': '#1F4F9C', 
    'Condensation_Starter': '#1F4F9C', 
    'Thioesterase': '#FFA500', 
    'Epimerization': '#3CB371', 
    
    
    'PKS_KS': '#FFD700',      
    'PKS_KS(Hybrid-KS)': '#FFD700', 
    'PKS_KS(Iterative-KS)': '#FFD700', 
    'PKS_AT': '#FF0000',      
    'PKS_PP': '#87CEEB',      
    'PKS_KR': '#2E8B57',      
    'PKS_DH': '#CF9FFF',      
    'PKS_ER': '#30D5C8',      
    'TD': '#FFA500',          
    'Heterocyclization': '#E6E6FA', 
    
    
    'default': '#CCCCCC'      
  };
  
  const getColor = (domain) => {
    return domainColorMap[domain] || domainColorMap.default;
  };
  
  const getDomainLabel = (domain) => {
    
    const domainLabels = {
      'AMP-binding': 'A',
      'PCP': 'PCP',
      'Condensation_LCL': 'C',
      'Condensation_DCL': 'C',
      'Condensation_Starter': 'C',
      'Thioesterase': 'TE',
      'TD': 'TD',
      'Epimerization': 'E',
      'PKS_KS': 'KS',
      'PKS_KS(Hybrid-KS)': 'KS',
      'PKS_KS(Iterative-KS)': 'KS',
      'PKS_AT': 'AT',
      'PKS_PP': 'ACP',
      'PKS_KR': 'KR',
      'PKS_DH': 'DH',
      'PKS_ER': 'ER',
    };
    
    return domainLabels[domain] || domain.slice(0, 2);
  };

  
  const groupIntoModules = (domains) => {
    const modules = [];
    let currentModule = [];
    
    domains.forEach((domain, index) => {
      currentModule.push(domain);
      
      
      
      if (
        domain === 'PCP' || 
        domain === 'PKS_PP' ||
        domain === 'Thioesterase' ||
        index === domains.length - 1
      ) {
        if (currentModule.length > 0) {
          modules.push([...currentModule]);
          currentModule = [];
        }
      }
    });
    
    
    if (currentModule.length > 0) {
      modules.push(currentModule);
    }
    
    return modules;
  };
  
  
  const toggleBGCSelection = (fileName) => {
    if (selectedBGCs.includes(fileName)) {
      setSelectedBGCs(selectedBGCs.filter(name => name !== fileName));
    } else {
      setSelectedBGCs([...selectedBGCs, fileName]);
    }
  };
  
  
  const toggleAllBGCs = () => {
    if (selectedBCs.length === filteredData.length) {
      setSelectedBGCs([]);
    } else {
      setSelectedBGCs(filteredData.map(item => item.file_name));
    }
  };
  
  
  const toggleBGCReversed = (fileName) => {
    setReversedBGCs(prev => ({
      ...prev,
      [fileName]: !prev[fileName]
    }));
  };
  
  function openExpandedView(bgcDataArray) {
    
    const newTab = window.open('', '_blank');
    if (!newTab) {
      alert('Pop-up blocked. Please allow pop-ups for this site to use the expanded view.');
      return;
    }
  
    
    newTab.document.write('<!DOCTYPE html>');
    newTab.document.write('<html>');
    newTab.document.write('<head>');
    newTab.document.write('<title>Expanded BGC View</title>');
    
    
    newTab.document.write(`
      <style>
        
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          margin: 0;
          background-color: #f9fafb;
          color: #2c3e50;
        }
  
        .expanded-view-container {
          max-width: 100%;
        }
  
        
        .bgc-container {
          margin-bottom: 40px;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          width: 98%;
          max-width: 98%;
          margin-left: auto;
          margin-right: auto;
        }
  
        .bgc-container:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.12);
        }
  
        
        .bgc-header {
          background-color: #f9f9f9;
          padding: 15px 25px;
          border-bottom: 2px solid #f0f0f0;
          position: sticky;
          left: 0;
          z-index: 100;
        }
  
        .bgc-title-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
  
        .bgc-title {
          font-size: 18px;
          color: #2c3e50;
          font-weight: 600;
          margin-right: 10px;
        }
  
        .bgc-info {
          font-size: 14px;
          color: #7f8c8d;
          line-height: 1.4;
          margin-bottom: 10px;
        }
  
        
        .sequence-info {
          font-size: 13px;
          color: #444;
          margin-top: 10px;
          padding: 12px;
          background-color: #f9f9f9;
          border-radius: 8px;
          border-left: 3px solid #4a6da7;
        }
  
        .sequence-label {
          font-weight: bold;
          margin-right: 5px;
          color: #2c3e50;
        }
  
        .sequence-value {
          font-family: monospace;
          word-break: break-all;
        }
  
        
        .expanded-container {
          display: flex;
          flex-direction: row;
          padding: 25px;
          overflow-x: auto;
          white-space: nowrap;
        }
  
        
        .cluster-container {
          display: inline-block;
          margin-right: 15px;
        }
  
        .locus-tag {
          font-size: 12px;
          color: #7f8c8d;
          margin-bottom: 5px;
          white-space: nowrap;
        }
  
        
        .vis-controls {
          display: flex;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 10px;
          position: relative;
          z-index: 200;
          padding: 0 25px;
        }
  
        
        .bgc-dropdown-container {
          position: relative;
          min-width: 200px;
          z-index: 200;
          margin-right: 15px;
        }
  
        .bgc-dropdown-header {
          background: linear-gradient(135deg, #5470c6, #3d58a8);
          color: white;
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 500;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 3px 8px rgba(84, 112, 198, 0.3);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
  
        .bgc-dropdown-header:hover {
          background: linear-gradient(135deg, #3d58a8, #304786);
          transform: translateY(-2px);
          box-shadow: 0 5px 12px rgba(84, 112, 198, 0.4);
        }
  
        .bgc-dropdown-content {
          position: absolute;
          top: 100%;
          left: 0;
          width: 400px;
          background-color: white;
          border: 1px solid #e0e5ec;
          border-radius: 0 0 8px 8px;
          max-height: 300px;
          overflow-y: auto;
          z-index: 200;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
          margin-top: 5px;
        }
  
        .select-all-option, .bgc-option {
          padding: 10px 15px;
          border-bottom: 1px solid #f0f0f0;
          transition: all 0.2s ease;
        }
  
        .select-all-option:hover, .bgc-option:hover {
          background-color: #e8f6f3;
        }
  
        .select-all-option {
          background-color: #f9f9f9;
          font-weight: 600;
          color: #2c3e50;
        }
  
        .bgc-option {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: #34495e;
        }
  
        
        .view-button, .label-button, .reverse-button {
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 500;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
          margin-right: 10px;
        }
  
        .label-button {
          background-color: #f0f0f0;
          color: #2c3e50;
          border: 1px solid #e0e5ec;
        }
  
        .label-button:hover {
          background-color: #e8f6f3;
          border-color: #1abc9c;
          transform: translateY(-2px);
          box-shadow: 0 5px 12px rgba(0, 0, 0, 0.15);
        }
  
        .label-button.active {
          background: linear-gradient(135deg, #1abc9c, #16a085);
          color: white;
          border: none;
        }
  
        .reverse-button {
          font-size: 12px;
          padding: 8px 12px;
          background-color: #f8f9fa;
          border: 1px solid #e0e5ec;
          border-radius: 6px;
          color: #2c3e50;
          transition: all 0.2s ease;
        }
  
        .reverse-button:hover {
          background-color: #e8f6f3;
          border-color: #1abc9c;
          transform: translateY(-2px);
        }
  
        .reverse-button.active {
          background: linear-gradient(135deg, #3498db, #2980b9);
          color: white;
          border: none;
          box-shadow: 0 3px 8px rgba(52, 152, 219, 0.2);
        }
  
        
        .no-info-message {
          padding: 20px;
          text-align: center;
          color: #7f8c8d;
          font-style: italic;
          background-color: rgba(236, 240, 241, 0.5);
          border-radius: 8px;
          margin: 25px;
          border: 1px dashed #bdc3c7;
        }
  
        
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
  
        ::-webkit-scrollbar-track {
          background: #f5f5f5;
          border-radius: 10px;
        }
  
        ::-webkit-scrollbar-thumb {
          background-color: #95a5a6;
          border-radius: 10px;
          border: 2px solid #f5f5f5;
        }
  
        ::-webkit-scrollbar-thumb:hover {
          background-color: #7f8c8d;
        }
  
        
        input[type="checkbox"] {
          margin-right: 8px;
          cursor: pointer;
          accent-color: #1abc9c;
        }
  
        
        .bgc-container {
          animation: fadeInUp 0.5s ease forwards;
          animation-delay: calc(0.1s * var(--animation-order, 0));
        }
  
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
  
        
        @media (max-width: 768px) {
          .vis-controls {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .bgc-dropdown-container {
            width: 100%;
            margin-bottom: 10px;
          }
          
          .bgc-dropdown-content {
            width: 90%;
          }
        }
      </style>
    `);
    
    newTab.document.write('</head>');
    newTab.document.write('<body>');
    newTab.document.write('<div class="expanded-view-container">');
    newTab.document.write('<div class="vis-controls">');
    newTab.document.write('<div class="bgc-dropdown-container" id="bgcDropdown">');
    newTab.document.write('<div class="bgc-dropdown-header" id="dropdownHeader">');
    newTab.document.write('<span id="dropdownLabel">Select BGCs (0/0)</span>');
    newTab.document.write('<span class="dropdown-arrow">▼</span>');
    newTab.document.write('</div>');
    newTab.document.write('<div class="bgc-dropdown-content" id="dropdownContent" style="display: none;"></div>');
    newTab.document.write('</div>');
    newTab.document.write('<div class="label-toggle">');
    newTab.document.write('<button id="labelToggleBtn" class="label-button active">Hide Labels</button>');
    newTab.document.write('</div>');
    newTab.document.write('</div>');
    newTab.document.write('<div id="bgcContainers"></div>');
    newTab.document.write('</div>');
    
    
    newTab.document.write('<script>');
    
    
    newTab.document.write('const allBGCData = ' + JSON.stringify(bgcDataArray) + ';');
    newTab.document.write('let selectedBGCs = ' + JSON.stringify(selectedBGCs) + ';');
    newTab.document.write('let reversedBGCs = ' + JSON.stringify(reversedBGCs) + ';');
    newTab.document.write('let showLabels = ' + showLabels + ';');
    
    
    newTab.document.write('const domainColorMap = ' + JSON.stringify(domainColorMap) + ';');
    
    
    newTab.document.write(`
      const domainLabels = {
        'AMP-binding': 'A',
        'PCP': 'PCP',
        'Condensation_LCL': 'C',
        'Condensation_DCL': 'C',
        'Condensation_Starter': 'C',
        'Thioesterase': 'TE',
        'Epimerization': 'E',
        'PKS_KS': 'KS',
        'PKS_KS(Hybrid-KS)': 'KS',
        'PKS_KS(Iterative-KS)': 'KS',
        'PKS_AT': 'AT',
        'PKS_PP': 'ACP',
        'PKS_KR': 'KR',
        'PKS_DH': 'DH',
        'PKS_ER': 'ER',
      };
    `);
    
    
    newTab.document.write(`
      
      const getColor = (domain) => {
        return domainColorMap[domain] || domainColorMap.default;
      };
      
      
      const getDomainLabel = (domain) => {
        return domainLabels[domain] || domain.slice(0, 2);
      };
      
      
      const createSvgElement = (tag, attrs = {}, children = []) => {
        const svgNS = "http://www.w3.org/2000/svg";
        const element = document.createElementNS(svgNS, tag);
        
        Object.entries(attrs).forEach(([key, value]) => {
          element.setAttribute(key, value);
        });
        
        children.forEach(child => {
          element.appendChild(child);
        });
        
        return element;
      };
      
      
      const groupIntoModules = (domains) => {
        const modules = [];
        let currentModule = [];
        
        domains.forEach((domain, index) => {
          currentModule.push(domain);
          
          if (
            domain === 'PCP' || 
            domain === 'PKS_PP' ||
            domain === 'Thioesterase' ||
            index === domains.length - 1
          ) {
            if (currentModule.length > 0) {
              modules.push([...currentModule]);
              currentModule = [];
            }
          }
        });
        
        if (currentModule.length > 0) {
          modules.push(currentModule);
        }
        
        return modules;
      };
      
      
      const toggleBGCSelection = (fileName) => {
        if (selectedBGCs.includes(fileName)) {
          selectedBGCs = selectedBGCs.filter(name => name !== fileName);
        } else {
          selectedBGCs.push(fileName);
        }
        updateDropdownLabel();
        renderVisualization();
      };
      
      
      const toggleAllBGCs = () => {
        if (selectedBGCs.length === allBGCData.length) {
          selectedBGCs = [];
        } else {
          selectedBGCs = allBGCData.map(item => item.file_name);
        }
        updateDropdownLabel();
        renderVisualization();
      };
      
      
      const toggleBGCReversed = (fileName) => {
        reversedBGCs[fileName] = !reversedBGCs[fileName];
        renderVisualization();
      };
      
      
      const toggleLabels = () => {
        showLabels = !showLabels;
        document.getElementById('labelToggleBtn').textContent = showLabels ? 'Hide Labels' : 'Show Labels';
        document.getElementById('labelToggleBtn').className = showLabels ? 'label-button active' : 'label-button';
        renderVisualization();
      };
      
      
      const updateDropdownLabel = () => {
        document.getElementById('dropdownLabel').textContent = 
          "Select BGCs (" + selectedBGCs.length + "/" + allBGCData.length + ")";
      };
      
      
      const initializeDropdown = () => {
        const dropdownHeader = document.getElementById('dropdownHeader');
        const dropdownContent = document.getElementById('dropdownContent');
        
        
        dropdownHeader.addEventListener('click', () => {
          const isOpen = dropdownContent.style.display !== 'none';
          dropdownContent.style.display = isOpen ? 'none' : 'block';
          dropdownHeader.querySelector('.dropdown-arrow').textContent = isOpen ? '▼' : '▲';
        });
        
        
        document.addEventListener('click', (event) => {
          if (!event.target.closest('#bgcDropdown') && dropdownContent.style.display !== 'none') {
            dropdownContent.style.display = 'none';
            dropdownHeader.querySelector('.dropdown-arrow').textContent = '▼';
          }
        });
        
        
        const selectAllOption = document.createElement('div');
        selectAllOption.className = 'select-all-option';
        
        const selectAllLabel = document.createElement('label');
        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.checked = selectedBGCs.length === allBGCData.length;
        selectAllCheckbox.addEventListener('change', toggleAllBGCs);
        
        selectAllLabel.appendChild(selectAllCheckbox);
        selectAllLabel.appendChild(document.createTextNode(' Select All'));
        selectAllOption.appendChild(selectAllLabel);
        dropdownContent.appendChild(selectAllOption);
        
        
        allBGCData.forEach((bgc, index) => {
          const bgcOption = document.createElement('div');
          bgcOption.className = 'bgc-option';
          
          const bgcLabel = document.createElement('label');
          const bgcCheckbox = document.createElement('input');
          bgcCheckbox.type = 'checkbox';
          bgcCheckbox.checked = selectedBGCs.includes(bgc.file_name);
          bgcCheckbox.addEventListener('change', () => toggleBGCSelection(bgc.file_name));
          
          bgcLabel.appendChild(bgcCheckbox);
          bgcLabel.appendChild(document.createTextNode(' ' + bgc.file_name));
          bgcOption.appendChild(bgcLabel);
          dropdownContent.appendChild(bgcOption);
        });
        
        
        document.getElementById('labelToggleBtn').addEventListener('click', toggleLabels);
        
        
        updateDropdownLabel();
      };
    `);
  
    
    newTab.document.write(`
      
      const renderVisualization = () => {
        const container = document.getElementById('bgcContainers');
        container.innerHTML = ''; 
        
        
        const filteredBGCs = allBGCData.filter(bgc => selectedBGCs.includes(bgc.file_name));
        
        
        if (filteredBGCs.length === 0) {
          const noInfoMessage = document.createElement('div');
          noInfoMessage.className = 'no-info-message';
          noInfoMessage.textContent = 'No information available';
          container.appendChild(noInfoMessage);
          return;
        }
        
        
        const domainRadius = 16;
        const domainGap = 5;
        const arrowExtension = 15;
        
        
        filteredBGCs.forEach((bgcData, bgcIndex) => {
          
          const bgcContainer = document.createElement('div');
          bgcContainer.className = 'bgc-container';
          bgcContainer.style.setProperty('--animation-order', bgcIndex); 
          
          
          const bgcHeader = document.createElement('div');
          bgcHeader.className = 'bgc-header';
          
          const titleContainer = document.createElement('div');
          titleContainer.className = 'bgc-title-container';
          
          const bgcTitle = document.createElement('div');
          bgcTitle.className = 'bgc-title';
          bgcTitle.textContent = bgcData.file_name;
          
          const reverseButton = document.createElement('button');
          reverseButton.className = reversedBGCs[bgcData.file_name] ? 'reverse-button active' : 'reverse-button';
          reverseButton.textContent = reversedBGCs[bgcData.file_name] ? 'Restore Order' : 'Reverse Order';
          reverseButton.addEventListener('click', () => toggleBGCReversed(bgcData.file_name));
          
          titleContainer.appendChild(bgcTitle);
          titleContainer.appendChild(reverseButton);
          
          const bgcInfo = document.createElement('div');
          bgcInfo.className = 'bgc-info';
          
          
          let infoHtml = '<span>Organism: ' + (bgcData.organism || "Unknown") + '</span>';
          infoHtml += '<span style="margin-left: 10px;">Type: ' + (bgcData.protocluster_category || "Unknown") + '</span>';
          
          if (bgcData.PKS_NRPS_prediction) {
            infoHtml += '<span style="margin-left: 10px;">Predicted: ' + bgcData.PKS_NRPS_prediction + '</span>';
          }
          
          bgcInfo.innerHTML = infoHtml;
          
          
          bgcHeader.appendChild(titleContainer);
          bgcHeader.appendChild(bgcInfo);
          
          bgcContainer.appendChild(bgcHeader);
          
          
          const expandedContainer = document.createElement('div');
          expandedContainer.className = 'expanded-container';
          bgcContainer.appendChild(expandedContainer);
          
          
          container.appendChild(bgcContainer);
          
          
          const isReversed = reversedBGCs[bgcData.file_name] || false;
          
          
          let clusters = [...bgcData.NRPS_PKS_data];
          
          
          if (isReversed) {
            clusters = [...clusters].reverse();
          }
          
          
          if (!clusters || clusters.length === 0) {
            const noInfoMessage = document.createElement('div');
            noInfoMessage.className = 'no-info-message';
            noInfoMessage.textContent = 'No information available';
            expandedContainer.appendChild(noInfoMessage);
            return;
          }
          
          
          let totalDomainCount = 0;
          let clusterInfos = [];
          
          clusters.forEach(cluster => {
            
            let modules = groupIntoModules(cluster.domains);
            
            
            let effectiveOrientation = cluster.orientation;
            if (isReversed) {
              effectiveOrientation = effectiveOrientation === "+" ? "-" : "+";
            }
            
            
            if (effectiveOrientation === "-") {
              modules.reverse();
              modules.forEach(module => module.reverse());
            }
            
            
            const allDomains = modules.flat();
            totalDomainCount += allDomains.length;
            
            clusterInfos.push({
              cluster,
              modules,
              effectiveOrientation,
              allDomains
            });
          });
          
          
          const domainWidth = domainRadius * 2;
          const totalWidth = (totalDomainCount * domainWidth) + 
                            ((totalDomainCount - 1) * domainGap) + 
                            (clusters.length * (arrowExtension * 2 + 40));
          
          
          const svg = createSvgElement('svg', {
            width: totalWidth,
            height: 140, 
            style: 'overflow: visible;'
          });
          
          
          const specificityArray = bgcData.PKS_NRPS_prediction ? 
                bgcData.PKS_NRPS_prediction.split(', ') : [];
          
          
          let currentX = 20;
          
          
          const locusTagPositions = [];
          const locusTagHeight = 15; 
          
          
          clusterInfos.forEach((info, clusterIndex) => {
            const { cluster, modules, effectiveOrientation, allDomains } = info;
            
            
            const clusterGroup = createSvgElement('g', {
              transform: 'translate(' + currentX + ', 0)'
            });
            
            
            const locusY = locusTagHeight;
            
            
            const domainPositions = [];
            const startXForDomains = 30;
            
            
            allDomains.forEach((domain, idx) => {
              const x = startXForDomains + idx * (domainRadius * 2 + domainGap);
              domainPositions.push({
                domain,
                x,
                moduleIdx: 0
              });
            });
            
            
            let domainIdx = 0;
            modules.forEach((module, moduleIdx) => {
              module.forEach(() => {
                domainPositions[domainIdx].moduleIdx = moduleIdx;
                domainIdx++;
              });
            });
            
            
            const firstDomainX = domainPositions[0]?.x || startXForDomains;
            const lastDomainX = domainPositions[domainPositions.length - 1]?.x || firstDomainX;
            const arrowStartX = Math.max(5, firstDomainX - domainRadius - arrowExtension);
            const arrowEndX = lastDomainX + domainRadius + arrowExtension;
            
            
            
            const clusterDisplayWidth = lastDomainX - firstDomainX + (domainRadius * 2) + (arrowExtension * 2);
            
            
            const maxLocusTextWidth = clusterDisplayWidth;
            
            
            const locusText = createSvgElement('text', {
              x: 0,
              y: locusY,
              'font-size': '12px',
              fill: '#7f8c8d',
              cursor: 'pointer', 
              'text-anchor': 'start'
            });
            
            
            const locusTagText = cluster.locus_tag;
            const textNode = document.createTextNode(locusTagText);
            locusText.appendChild(textNode);
            clusterGroup.appendChild(locusText);
            
            
            const titleElem = document.createElementNS("http://www.w3.org/2000/svg", "title");
            titleElem.textContent = locusTagText;
            locusText.appendChild(titleElem);
            
            
            const truncateTextIfNeeded = () => {
              
              setTimeout(() => {
                
                if (locusText.getComputedTextLength && locusText.getComputedTextLength() > maxLocusTextWidth) {
                  
                  const textLength = locusTagText.length;
                  let truncatedText = locusTagText;
                  
                  
                  while (truncatedText.length > 5) {
                    truncatedText = truncatedText.slice(0, -1);
                    locusText.textContent = truncatedText + "...";
                    
                    if (locusText.getComputedTextLength() <= maxLocusTextWidth) {
                      break;
                    }
                  }
                  
                  
                  
                  const newTitleElem = document.createElementNS("http://www.w3.org/2000/svg", "title");
                  newTitleElem.textContent = locusTagText;
                  locusText.appendChild(newTitleElem);
                }
              }, 0);
            };
            
            
            setTimeout(truncateTextIfNeeded, 10);
            
            
            clusterGroup.appendChild(createSvgElement('line', {
              x1: arrowStartX,
              y1: 40,
              x2: arrowEndX,
              y2: 40,
              stroke: "#444",
              'stroke-width': 3
            }));
            
            
            if (effectiveOrientation === "+") {
              clusterGroup.appendChild(createSvgElement('polygon', {
                points: arrowEndX + ',40 ' + (arrowEndX - 10) + ',32 ' + (arrowEndX - 10) + ',48',
                fill: "#444",
                stroke: "#444",
                'stroke-width': 1
              }));
            } else {
              clusterGroup.appendChild(createSvgElement('polygon', {
                points: arrowStartX + ',40 ' + (arrowStartX + 10) + ',32 ' + (arrowStartX + 10) + ',48',
                fill: "#444",
                stroke: "#444",
                'stroke-width': 1
              }));
            }
            
            
            const moduleGroups = [];
            modules.forEach((module, moduleIdx) => {
              const moduleDomains = domainPositions.filter(d => d.moduleIdx === moduleIdx);
              if (moduleDomains.length > 0) {
                moduleGroups.push({
                  moduleIdx,
                  startX: moduleDomains[0].x - domainRadius - 5,
                  width: (moduleDomains.length * (domainRadius * 2 + domainGap)) - domainGap + 10
                });
              }
            });
            
            
            moduleGroups.forEach((moduleGroup, idx) => {
              clusterGroup.appendChild(createSvgElement('rect', {
                x: moduleGroup.startX,
                y: 15,
                width: moduleGroup.width,
                height: 50,
                fill: "none",
                stroke: "#999",
                'stroke-dasharray': "0",
                'stroke-width': 0
              }));
            });
            
            
            const specificityMapping = [];
            let ampBindingCount = 0;
            
            cluster.domains.forEach((domain, idx) => {
              if ((domain === 'AMP-binding' || domain === 'PKS_AT') && ampBindingCount < specificityArray.length) {
                specificityMapping.push({
                  index: idx,
                  specificity: specificityArray[ampBindingCount]
                });
                ampBindingCount++;
              }
            });
            
            const originalDomainToSpecificity = new Map();
            specificityMapping.forEach(item => {
              originalDomainToSpecificity.set(item.index, item.specificity);
            });
            
            
            const domainToSpecificity = new Map();
            allDomains.forEach((domain, displayIndex) => {
              if (domain === 'AMP-binding' || domain === 'PKS_AT') {
                const domainsOfInterestBeforeCurrent = allDomains
                  .slice(0, displayIndex)
                  .filter(d => d === 'AMP-binding' || d === 'PKS_AT')
                  .length;
                  
                const domainsOfInterest = cluster.domains
                  .map((d, i) => ({ domain: d, index: i }))
                  .filter(d => d.domain === 'AMP-binding' || d.domain === 'PKS_AT');
                  
                let matchIndex;
                
                if ((cluster.orientation === "-") !== isReversed) {
                  matchIndex = domainsOfInterest[domainsOfInterest.length - 1 - domainsOfInterestBeforeCurrent]?.index;
                } else {
                  matchIndex = domainsOfInterest[domainsOfInterestBeforeCurrent]?.index;
                }
                
                if (matchIndex !== undefined && originalDomainToSpecificity.has(matchIndex)) {
                  domainToSpecificity.set(displayIndex, originalDomainToSpecificity.get(matchIndex));
                }
              }
            });
            
            
            domainPositions.forEach((position, idx) => {
              const domain = position.domain;
              const x = position.x;
              const specificity = domainToSpecificity.get(idx);
              
              
              clusterGroup.appendChild(createSvgElement('circle', {
                cx: x,
                cy: 40,
                r: domainRadius,
                fill: getColor(domain),
                stroke: "#333",
                'stroke-width': 1
              }));
              
              
              if (showLabels) {
                const labelText = createSvgElement('text', {
                  x: x,
                  y: 44,
                  'text-anchor': 'middle',
                  'font-size': 10,
                  fill: 'white',
                  'font-weight': 'bold'
                });
                labelText.textContent = getDomainLabel(domain);
                clusterGroup.appendChild(labelText);
              }
              
              
              if (specificity) {
                const specificityText = createSvgElement('text', {
                  x: x,
                  y: 80,
                  'text-anchor': 'middle',
                  'font-size': 11,
                  fill: '#333',
                  'font-weight': 'bold',
                  transform: 'rotate(45, ' + x + ', 80)'
                });
                specificityText.textContent = specificity;
                clusterGroup.appendChild(specificityText);
              }
              
              
              const tooltipOverlay = createSvgElement('circle', {
                cx: x,
                cy: 40,
                r: domainRadius,
                fill: 'transparent',
                cursor: 'pointer',
                'pointer-events': 'all'
              });
              
              
              const titleElem = document.createElementNS("http://www.w3.org/2000/svg", "title");
              titleElem.textContent = domain + (specificity ? ' (' + specificity + ')' : '');
              tooltipOverlay.appendChild(titleElem);
              
              clusterGroup.appendChild(tooltipOverlay);
            });
            
            
            svg.appendChild(clusterGroup);
            
            
            const clusterWidth = arrowEndX + 20;
            currentX += clusterWidth;
          });
          
          
          expandedContainer.appendChild(svg);
          
          
          if (bgcData.leader_sequence || bgcData.core_sequence) {
            const sequenceDisplay = document.createElement('div');
            sequenceDisplay.className = 'sequence-info';
            
            const sequenceHeader = document.createElement('div');
            sequenceHeader.style.fontWeight = 'bold';
            sequenceHeader.style.marginBottom = '5px';
            sequenceHeader.textContent = 'RiPP Sequence Information:';
            sequenceDisplay.appendChild(sequenceHeader);
            
            if (bgcData.leader_sequence) {
              const leaderContainer = document.createElement('div');
              
              const leaderLabel = document.createElement('span');
              leaderLabel.className = 'sequence-label';
              leaderLabel.textContent = 'Leader sequence:';
              
              const leaderValue = document.createElement('span');
              leaderValue.className = 'sequence-value';
              leaderValue.textContent = bgcData.leader_sequence;
              
              leaderContainer.appendChild(leaderLabel);
              leaderContainer.appendChild(leaderValue);
              sequenceDisplay.appendChild(leaderContainer);
            }
            
            if (bgcData.core_sequence) {
              const coreContainer = document.createElement('div');
              coreContainer.style.marginTop = '5px';
              
              const coreLabel = document.createElement('span');
              coreLabel.className = 'sequence-label';
              coreLabel.textContent = 'Core sequence:';
              
              const coreValue = document.createElement('span');
              coreValue.className = 'sequence-value';
              coreValue.textContent = bgcData.core_sequence;
              
              coreContainer.appendChild(coreLabel);
              coreContainer.appendChild(coreValue);
              sequenceDisplay.appendChild(coreContainer);
            }
            
            expandedContainer.appendChild(sequenceDisplay);
          }
        });
      };
      
      
      window.onload = () => {
        initializeDropdown();
        renderVisualization();
      };
    `);
    
    newTab.document.write('</script>');
    newTab.document.write('</body>');
    newTab.document.write('</html>');
    
    
    newTab.document.close();
  }
  
  
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && !event.target.closest('.bgc-dropdown-container')) {
        setDropdownOpen(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [dropdownOpen]);
  
  const filteredData = filterType ? 
    data.filter(item => item.protocluster_category && item.protocluster_category.includes(filterType)) : 
    data;
  
  const renderClusterView = () => {
    
    const domainWidth = 35; 
    const domainRadius = 16; 
    const domainGap = 5; 
    const arrowExtension = 15; 
    
    
    if (data.filter(item => selectedBGCs.includes(item.file_name)).length === 0) {
      return React.createElement('div', { 
        className: "no-info-message",
        style: {
          padding: '20px',
          textAlign: 'center',
          color: '#666',
          fontStyle: 'italic',
          border: '1px solid #ddd',
          borderRadius: '6px',
          margin: '20px 0'
        }
      }, "No information available");
    }
    
    return (
      React.createElement('div', { className: "bgc-vis-container" },
        data
          .filter(item => selectedBGCs.includes(item.file_name))
          .map((item, index) => (
            React.createElement('div', { key: index, className: "bgc-item" },
              React.createElement('div', { className: "bgc-header" },
                React.createElement('div', { className: "bgc-title-container" },
                  React.createElement('div', { className: "bgc-title" }, item.file_name),
                  
                  React.createElement('button', {
                    className: reversedBGCs[item.file_name] ? "reverse-button active" : "reverse-button",
                    onClick: () => toggleBGCReversed(item.file_name)
                  }, reversedBGCs[item.file_name] ? "Restore Order" : "Reverse Order")
                ),
                React.createElement('div', { className: "bgc-info" },
                  React.createElement('span', null, "Organism: ", item.organism || "Unknown"),
                  React.createElement('span', { style: { marginLeft: '10px' } }, 
                    "Type: ", item.protocluster_category || "Unknown"
                  ),
                  item.PKS_NRPS_prediction && (
                    React.createElement('span', { style: { marginLeft: '10px' } },
                      "Predicted: ", item.PKS_NRPS_prediction
                    )
                  )
                )
              ),
              
              
              (() => {
                
                if (!item.NRPS_PKS_data || item.NRPS_PKS_data.length === 0 || 
                    !item.NRPS_PKS_data.some(cluster => cluster.domains && cluster.domains.length > 0)) {
                  return React.createElement('div', { 
                    className: "no-info-message",
                    style: {
                      padding: '20px',
                      textAlign: 'center',
                      color: '#666',
                      fontStyle: 'italic'
                    }
                  }, "No information available");
                }
                
                return React.createElement('div', { className: "gene-clusters-row" }, 
                  (() => {
                    
                    let clusters = [...item.NRPS_PKS_data];
                    
                    
                    if (reversedBGCs[item.file_name]) {
                      clusters = [...clusters].reverse();
                    }
                    
                    return clusters.map((cluster, clusterIndex) => {
                      
                      let modules = groupIntoModules(cluster.domains);
                      
                      
                      
                      
                      let effectiveOrientation = cluster.orientation;
                      if (reversedBGCs[item.file_name]) {
                        
                        effectiveOrientation = effectiveOrientation === "+" ? "-" : "+";
                      }
                      
                      
                      if (effectiveOrientation === "-") {
                        modules.reverse();
                        modules.forEach(module => module.reverse());
                      }
                      
                      
                      const totalDomains = modules.flat().length;
                      
                      
                      const totalWidth = (totalDomains * (domainRadius * 2)) + ((totalDomains - 1) * domainGap);
                      const svgWidth = totalWidth + (arrowExtension * 2) + 40; 
                      
                      
                      const specificityArray = item.PKS_NRPS_prediction ? 
                        item.PKS_NRPS_prediction.split(', ') : [];
                      
                      
                      const specificityMapping = [];
                      let ampBindingCount = 0;
                      
                      cluster.domains.forEach((domain, idx) => {
                        if ((domain === 'AMP-binding' || domain === 'PKS_AT') && ampBindingCount < specificityArray.length) {
                          specificityMapping.push({
                            index: idx,
                            specificity: specificityArray[ampBindingCount]
                          });
                          ampBindingCount++;
                        }
                      });
                      
                      
                      const domainToSpecificity = new Map();
                      
                      
                      const originalTotalDomains = cluster.domains.length;
                      
                      
                      
                      
                      
                      const originalDomainToSpecificity = new Map();
                      specificityMapping.forEach(item => {
                        originalDomainToSpecificity.set(item.index, item.specificity);
                      });
                      
                      
                      const allDomainsInFinalOrder = modules.flat();
                      
                      
                      allDomainsInFinalOrder.forEach((domain, displayIndex) => {
                        if (domain === 'AMP-binding' || domain === 'PKS_AT') {
                          
                          
                          
                          
                          const domainsOfInterestBeforeCurrent = allDomainsInFinalOrder
                            .slice(0, displayIndex)
                            .filter(d => d === 'AMP-binding' || d === 'PKS_AT')
                            .length;
                            
                          
                          const domainsOfInterest = cluster.domains
                            .map((d, i) => ({ domain: d, index: i }))
                            .filter(d => d.domain === 'AMP-binding' || d === 'PKS_AT');
                            
                          
                          let matchIndex;
                          
                          if ((cluster.orientation === "-") !== (reversedBGCs[item.file_name])) {
                            
                            
                            matchIndex = domainsOfInterest[domainsOfInterest.length - 1 - domainsOfInterestBeforeCurrent]?.index;
                          } else {
                            
                            
                            matchIndex = domainsOfInterest[domainsOfInterestBeforeCurrent]?.index;
                          }
                          
                          
                          if (matchIndex !== undefined && originalDomainToSpecificity.has(matchIndex)) {
                            domainToSpecificity.set(displayIndex, originalDomainToSpecificity.get(matchIndex));
                          }
                        }
                      });
                      
                      
                      const allDomains = modules.flat();
                      const startXForDomains = 30; 
                      
                      
                      const domainPositions = [];
                      allDomains.forEach((domain, idx) => {
                        const x = startXForDomains + idx * (domainRadius * 2 + domainGap);
                        domainPositions.push({
                          domain,
                          x,
                          moduleIdx: 0 
                        });
                      });
                      
                      
                      let domainIdx = 0;
                      modules.forEach((module, moduleIdx) => {
                        module.forEach(() => {
                          domainPositions[domainIdx].moduleIdx = moduleIdx;
                          domainIdx++;
                        });
                      });
                      
                      
                      const firstDomainX = domainPositions[0]?.x || startXForDomains;
                      const lastDomainX = domainPositions[domainPositions.length - 1]?.x || firstDomainX;
                      
                      
                      const arrowStartX = Math.max(5, firstDomainX - domainRadius - arrowExtension);
                      
                      const arrowEndX = lastDomainX + domainRadius + arrowExtension;
                      
                      return React.createElement('div', { 
                        key: clusterIndex, 
                        className: "cluster-container",
                        style: { 
                          width: `${svgWidth}px`,
                          margin: '0 15px 15px 0'
                        }
                      },
                        React.createElement('div', { 
                          className: "locus-tag",
                          style: {
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            cursor: 'pointer',  
                            maxWidth: '100%'
                          },
                          title: cluster.locus_tag 
                        },
                          cluster.locus_tag
                        ),
                        
                        React.createElement('svg', { 
                          width: svgWidth, 
                          height: "100",
                          className: "cluster-svg",
                          style: { overflow: 'visible' }
                        },
                          
                          React.createElement('line', {
                            x1: arrowStartX,
                            y1: "40",
                            x2: arrowEndX,
                            y2: "40",
                            stroke: "#444",
                            strokeWidth: "3"
                          }),
                          
                          
                          effectiveOrientation === "+" ? (
                            
                            React.createElement('polygon', {
                              points: `${arrowEndX},40 ${arrowEndX - 10},32 ${arrowEndX - 10},48`,
                              fill: "#444",
                              stroke: "#444",
                              strokeWidth: "1"
                            })
                          ) : (
                            
                            React.createElement('polygon', {
                              points: `${arrowStartX},40 ${arrowStartX + 10},32 ${arrowStartX + 10},48`,
                              fill: "#444",
                              stroke: "#444",
                              strokeWidth: "1"
                            })
                          ),
                          
                          
                          (() => {
                            
                            const moduleGroups = [];
                            modules.forEach((module, moduleIdx) => {
                              const moduleDomains = domainPositions.filter(d => d.moduleIdx === moduleIdx);
                              if (moduleDomains.length > 0) {
                                moduleGroups.push({
                                  moduleIdx,
                                  startX: moduleDomains[0].x - domainRadius - 5,
                                  width: (moduleDomains.length * (domainRadius * 2 + domainGap)) - domainGap + 10
                                });
                              }
                            });
                            
                            
                            const moduleBoundaries = moduleGroups.map((moduleGroup, idx) => 
                              React.createElement('rect', {
                                key: `module-${idx}`,
                                x: moduleGroup.startX,
                                y: "15",
                                width: moduleGroup.width,
                                height: "50",
                                fill: "none",
                                stroke: "#999",
                                strokeDasharray: "3,3",
                                strokeWidth: "1"
                              })
                            );
                            
                            
                            const domainElements = domainPositions.map((position, idx) => {
                              const domain = position.domain;
                              const x = position.x;
                              const hasSpecificity = (domain === 'AMP-binding' || domain === 'PKS_AT');
                              const specificity = hasSpecificity ? domainToSpecificity.get(idx) : null;
                              
                              return React.createElement('g', { key: `domain-${idx}`, className: "domain-circle" },
                                
                                React.createElement('circle', {
                                  cx: x,
                                  cy: "40",
                                  r: domainRadius,
                                  fill: getColor(domain),
                                  stroke: "#333",
                                  strokeWidth: "1"
                                }),
                                
                                
                                showLabels && React.createElement('text', {
                                  x: x,
                                  y: "44",
                                  textAnchor: "middle",
                                  fontSize: "10",
                                  fill: "white",
                                }, getDomainLabel(domain)),
                                
                                
                                specificity && React.createElement('text', {
                                  x: x,
                                  y: "80",
                                  textAnchor: "middle",
                                  fontSize: "10",
                                  fill: "#333",
                                  transform: `rotate(45, ${x}, 80)`
                                }, specificity),
                                
                                React.createElement('title', null, 
                                  domain + (specificity ? ` (${specificity})` : '')
                                )
                              );
                            });
                            
                            
                            return [...moduleBoundaries, ...domainElements];
                          })()
                        )
                      );
                    });
                  })()
                );
              })(),
              
              (item.leader_sequence || item.core_sequence) && (
                React.createElement('div', { 
                  className: "sequence-display",
                  style: {
                    marginTop: '15px',
                    padding: '10px',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '4px',
                    borderLeft: '3px solid #4a6da7',
                    fontSize: '13px'
                  }
                },
                  React.createElement('div', { style: { fontWeight: 'bold', marginBottom: '5px' } },
                    "RiPP Sequence Information:"
                  ),
                  item.leader_sequence && (
                    React.createElement('div', null,
                      React.createElement('span', { 
                        style: { fontWeight: 'bold', marginRight: '5px' } 
                      }, "Leader sequence:"),
                      React.createElement('span', { 
                        style: { fontFamily: 'monospace', wordBreak: 'break-all' } 
                      }, item.leader_sequence)
                    )
                  ),
                  item.core_sequence && (
                    React.createElement('div', { style: { marginTop: '5px' } },
                      React.createElement('span', { 
                        style: { fontWeight: 'bold', marginRight: '5px' } 
                      }, "Core sequence:"),
                      React.createElement('span', { 
                        style: { fontFamily: 'monospace', wordBreak: 'break-all' } 
                      }, item.core_sequence)
                    )
                  )
                )
              )
            )
          ))
      )
    );
  };
  
  
  const renderBGCDropdown = () => {
    return React.createElement('div', { className: "bgc-dropdown-container" },
      React.createElement('div', 
        { 
          className: "bgc-dropdown-header",
          onClick: (e) => {
            e.stopPropagation();
            setDropdownOpen(!dropdownOpen);
          }
        },
        React.createElement('span', null, 
          `Select BGCs (${selectedBGCs.length}/${filteredData.length})`
        ),
        React.createElement('span', { className: "dropdown-arrow" }, dropdownOpen ? "▲" : "▼")
      ),
      dropdownOpen && React.createElement('div', { className: "bgc-dropdown-content" },
        React.createElement('div', { className: "select-all-option" },
          React.createElement('label', null,
            React.createElement('input', {
              type: "checkbox",
              checked: selectedBGCs.length === filteredData.length,
              onChange: toggleAllBGCs
            }),
            " Select All"
          )
        ),
        filteredData.map((item, index) => (
          React.createElement('div', { key: index, className: "bgc-option" },
            React.createElement('label', null,
              React.createElement('input', {
                type: "checkbox",
                checked: selectedBGCs.includes(item.file_name),
                onChange: () => toggleBGCSelection(item.file_name)
              }),
              " ", item.file_name
            )
          )
        ))
      )
    );
  };
  
  if (loading) {
    return React.createElement('div', { className: "loading-container" }, "Loading...");
  }
  
  return (
    React.createElement('div', { className: "bgc-module-vis" },
      React.createElement('div', { className: "vis-controls" },
        renderBGCDropdown(),
        React.createElement('div', { className: "label-toggle" },
          React.createElement('button', {
            className: showLabels ? 'label-button active' : 'label-button',
            onClick: () => setShowLabels(!showLabels)
          }, showLabels ? "Hide Labels" : "Show Labels"),
          React.createElement('button', {
            className: 'expand-button',
            onClick: () => {
              
              const selectedBGCsData = data.filter(item => selectedBGCs.includes(item.file_name));
              if (selectedBGCsData.length > 0) {
                openExpandedView(selectedBGCsData);
              } else {
                alert('Please select at least one BGC to expand.');
              }
            }
          }, "Expand View")
        )
      ),
      
      renderClusterView()
    )
  );
}