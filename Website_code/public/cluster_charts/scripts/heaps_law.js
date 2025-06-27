
function createSeededRandom(seed) {
  return function() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}


function fitHeapsLaw(data) {
    
    const xValues = data.map(point => point[0]);
    const yValues = data.map(point => point[1]);
    
    
    
    const startIdx = Math.min(5, Math.floor(xValues.length * 0.1)); 
    const validPoints = [];
    
    for (let i = startIdx; i < xValues.length; i++) {
      if (yValues[i] > 0) {
        validPoints.push([xValues[i], yValues[i]]);
      }
    }
    
    
    
    let bestFit = null;
    
    
    const fits = [];
    
    try {
      
      const standardFit = fitStandardHeapsLaw(validPoints);
      if (!isNaN(standardFit.K) && !isNaN(standardFit.gamma) && standardFit.rSquared >= 0) {
        fits.push(standardFit);
      }
    } catch (e) {
      console.warn("Standard fit failed:", e);
    }
    
    try {
      
      const weightedFit = fitWeightedHeapsLaw(validPoints);
      if (!isNaN(weightedFit.K) && !isNaN(weightedFit.gamma) && weightedFit.rSquared >= 0) {
        fits.push(weightedFit);
      }
    } catch (e) {
      console.warn("Weighted fit failed:", e);
    }
    
    try {
      
      const nonlinearFit = fitNonlinearHeapsLaw(validPoints);
      if (!isNaN(nonlinearFit.K) && !isNaN(nonlinearFit.gamma) && nonlinearFit.rSquared >= 0) {
        fits.push(nonlinearFit);
      }
    } catch (e) {
      console.warn("Non-linear fit failed:", e);
    }
    
    
    if (fits.length > 0) {
      fits.sort((a, b) => b.rSquared - a.rSquared); 
      bestFit = fits[0];
      
      
      const fittedCurve = xValues.map(x => [x, bestFit.K * Math.pow(x, bestFit.gamma)]);
      
      return {
        ...bestFit,
        fittedCurve,
        allFits: fits 
      };
    } else {
      
      return {
        error: "Insufficient data to fit Heaps' Law curve",
        noFit: true
      };
    }
  }
  
  
  function fitStandardHeapsLaw(validPoints) {
    const validX = validPoints.map(point => point[0]);
    const validY = validPoints.map(point => point[1]);
    const logX = validX.map(x => Math.log(x));
    const logY = validY.map(y => Math.log(y));
    
    
    const meanLogX = logX.reduce((sum, val) => sum + val, 0) / logX.length;
    const meanLogY = logY.reduce((sum, val) => sum + val, 0) / logY.length;
    
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < logX.length; i++) {
      numerator += (logX[i] - meanLogX) * (logY[i] - meanLogY);
      denominator += (logX[i] - meanLogX) * (logX[i] - meanLogX);
    }
    
    const gamma = numerator / denominator;
    
    
    const logK = meanLogY - gamma * meanLogX;
    const K = Math.exp(logK);
    
    
    let totalSS = 0;
    let residualSS = 0;
    for (let i = 0; i < validY.length; i++) {
      const predicted = K * Math.pow(validX[i], gamma);
      totalSS += Math.pow(validY[i] - (validY.reduce((a, b) => a + b) / validY.length), 2);
      residualSS += Math.pow(validY[i] - predicted, 2);
    }
    const rSquared = 1 - (residualSS / totalSS);
    
    return {
      K,
      gamma,
      method: "standard",
      rSquared
    };
  }
  
  
  function fitWeightedHeapsLaw(validPoints) {
    const validX = validPoints.map(point => point[0]);
    const validY = validPoints.map(point => point[1]);
    const logX = validX.map(x => Math.log(x));
    const logY = validY.map(y => Math.log(y));
    
    
    const weights = [];
    for (let i = 0; i < validPoints.length; i++) {
      
      weights.push((i + 1) / validPoints.length);
    }
    
    
    let sumWeights = weights.reduce((a, b) => a + b, 0);
    let weightedLogXSum = 0;
    let weightedLogYSum = 0;
    
    for (let i = 0; i < logX.length; i++) {
      weightedLogXSum += logX[i] * weights[i];
      weightedLogYSum += logY[i] * weights[i];
    }
    
    const meanLogX = weightedLogXSum / sumWeights;
    const meanLogY = weightedLogYSum / sumWeights;
    
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < logX.length; i++) {
      numerator += weights[i] * (logX[i] - meanLogX) * (logY[i] - meanLogY);
      denominator += weights[i] * (logX[i] - meanLogX) * (logX[i] - meanLogX);
    }
    
    const gamma = numerator / denominator;
    
    
    const logK = meanLogY - gamma * meanLogX;
    const K = Math.exp(logK);
    
    
    let weightedTotalSS = 0;
    let weightedResidualSS = 0;
    for (let i = 0; i < validY.length; i++) {
      const predicted = K * Math.pow(validX[i], gamma);
      weightedTotalSS += weights[i] * Math.pow(validY[i] - (validY.reduce((a, b) => a + b) / validY.length), 2);
      weightedResidualSS += weights[i] * Math.pow(validY[i] - predicted, 2);
    }
    const rSquared = 1 - (weightedResidualSS / weightedTotalSS);
    
    return {
      K,
      gamma,
      method: "weighted",
      rSquared
    };
  }
  
  
  function fitNonlinearHeapsLaw(validPoints) {
    const validX = validPoints.map(point => point[0]);
    const validY = validPoints.map(point => point[1]);
    
    
    const initialLogFit = fitStandardHeapsLaw(validPoints);
    let K = initialLogFit.K;
    let gamma = initialLogFit.gamma;
    
    
    const learningRate = 0.001;
    const iterations = 1000;
    const tolerance = 1e-6;
    
    let prevError = Number.MAX_VALUE;
    
    for (let iter = 0; iter < iterations; iter++) {
      
      let sumSquaredError = 0;
      let gradK = 0;
      let gradGamma = 0;
      
      for (let i = 0; i < validX.length; i++) {
        const x = validX[i];
        const y = validY[i];
        const prediction = K * Math.pow(x, gamma);
        const error = prediction - y;
        
        sumSquaredError += error * error;
        
        
        gradK += error * (prediction / K);
        
        
        gradGamma += error * prediction * Math.log(x);
      }
      
      
      if (Math.abs(prevError - sumSquaredError) < tolerance) {
        break;
      }
      prevError = sumSquaredError;
      
      
      K -= learningRate * gradK;
      gamma -= learningRate * gradGamma;
      
      
      if (K <= 0) K = 1e-5;
    }
    
    
    const meanY = validY.reduce((a, b) => a + b) / validY.length;
    let totalSS = 0;
    let residualSS = 0;
    
    for (let i = 0; i < validY.length; i++) {
      const predicted = K * Math.pow(validX[i], gamma);
      totalSS += Math.pow(validY[i] - meanY, 2);
      residualSS += Math.pow(validY[i] - predicted, 2);
    }
    
    const rSquared = 1 - (residualSS / totalSS);
    
    return {
      K,
      gamma,
      method: "nonlinear",
      rSquared
    };
  }
  
  
  function choose(n, k) {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    
    let result = 1;
    for (let i = 1; i <= k; i++) {
      result *= (n - (k - i));
      result /= i;
    }
    return result;
  }


function areSetsEqual(setA, setB) {
  if (setA.size !== setB.size) return false;
  for (const item of setA) {
    if (!setB.has(item)) return false;
  }
  return true;
}
  


async function analyzeBgcOpenness(jsonData, numSimulations = 100, seed = 12345, useGeneComposition = false) {
  
  const seededRandom = createSeededRandom(seed);
  
  
  let totalBgcs = null;
  for (const entry of jsonData) {
    if ("total_BGCs" in entry) {
      totalBgcs = entry.total_BGCs;
      break; 
    }
  }

  if (totalBgcs === null) {
    return { error: "total_BGCs not found in JSON data." };
  }
  
  
  if (totalBgcs < 2) {
    return { 
      error: "Only one BGC found - analysis not applicable",
      singleBgc: true
    };
  }

  
  const bgcGeneMatrix = {};
  const allGenes = new Set();

  for (const entry of jsonData) {
    if (!("Ortholog_Group_OG_ID" in entry) || !("CDS_Locus_Tags" in entry)) {
      continue;
    }
    
    const ogId = entry.Ortholog_Group_OG_ID; 
    const bgcs = entry.CDS_Locus_Tags.split(";"); 

    for (const bgc of bgcs) {
      const bgcIdCleaned = bgc.split(".").slice(0, -1).join("."); 
      
      if (!(bgcIdCleaned in bgcGeneMatrix)) {
        bgcGeneMatrix[bgcIdCleaned] = new Set();
      }
      
      bgcGeneMatrix[bgcIdCleaned].add(ogId); 
      allGenes.add(ogId); 
    }
  }

  
  const bgcList = Object.keys(bgcGeneMatrix).slice(0, totalBgcs);

  if (bgcList.length < 2) { 
    return { error: `Insufficient BGCs: Found only ${bgcList.length}` };
  }

  
  const allCurves = [];
  
  
  for (let sim = 0; sim < numSimulations; sim++) {
    try {
      
      const shuffledBgcList = [...bgcList].sort(() => seededRandom() - 0.5);
      
      
      const seenGenes = new Set();
      const uniqueBgcs = new Set();
      
      if (useGeneComposition) {
        
        const seenCompositions = []; 
        
        for (const bgc of shuffledBgcList) {
          const geneSet = bgcGeneMatrix[bgc];
          
          
          const isUniqueComposition = !seenCompositions.some(composition => 
            areSetsEqual(composition, geneSet)
          );
          
          if (isUniqueComposition) {
            uniqueBgcs.add(bgc);
            seenCompositions.push(new Set([...geneSet])); 
          }
          
          
          for (const gene of geneSet) {
            seenGenes.add(gene);
          }
        }
      } else {
        
        for (const bgc of shuffledBgcList) {
          const geneSet = bgcGeneMatrix[bgc];
          const newGenes = [...geneSet].filter(gene => !seenGenes.has(gene));
          
          if (newGenes.length > 0) { 
            uniqueBgcs.add(bgc);
          }
          
          
          for (const gene of geneSet) {
            seenGenes.add(gene);
          }
        }
      }

      
      const numBgcsAnalyzed = [];
      const numUniqueBgcs = [];
      const seenBgcs = new Set();

      for (let i = 0; i < shuffledBgcList.length; i++) {
        const bgc = shuffledBgcList[i];
        seenBgcs.add(bgc);
        
        
        const uniqueCount = [...seenBgcs].filter(b => uniqueBgcs.has(b)).length;
        
        numBgcsAnalyzed.push(i + 1);
        numUniqueBgcs.push(uniqueCount);
      }
      
      
      allCurves.push({
        x: numBgcsAnalyzed,
        y: numUniqueBgcs
      });
      
    } catch (e) {
      console.warn("Simulation failed:", e);
      
      continue;
    }
  }
  
  
  if (allCurves.length === 0) {
    return { error: "Failed to run simulations" };
  }
  
  
  const maxN = Math.max(...allCurves.map(curve => Math.max(...curve.x)));
  
  
  const avgUniqueCounts = new Array(maxN).fill(0);
  const countsPerPosition = new Array(maxN).fill(0);
  
  for (const curve of allCurves) {
    for (let i = 0; i < curve.y.length; i++) {
      avgUniqueCounts[i] += curve.y[i];
      countsPerPosition[i] += 1;
    }
  }
  
  
  for (let i = 0; i < maxN; i++) {
    if (countsPerPosition[i] === 0) {
      countsPerPosition[i] = 1;
    }
    avgUniqueCounts[i] = avgUniqueCounts[i] / countsPerPosition[i];
  }
  
  
  const xAxis = Array.from({ length: maxN }, (_, i) => i + 1);
  
  
  const averageCurveData = xAxis.map((x, i) => [x, avgUniqueCounts[i]]);
  
  
  const heapsFit = fitHeapsLaw(averageCurveData);
  
  
  const simulationCurves = allCurves.map(curve => {
    return curve.x.map((x, i) => [x, curve.y[i]]);
  });
  
  return {
    averageCurveData,
    simulationCurves,
    heapsFit,
    uniquenessMethod: useGeneComposition ? "composition" : "newGenes"
  };
}
  

async function processDataAndCreateChart(useGeneComposition = false) {
  try {
    
    const response = await fetch(GENECLUSTER_LOCATION);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const jsonData = await response.json();
    
    
    const pathParts = GENECLUSTER_LOCATION.split('/');
    const familyName = pathParts[pathParts.length - 2] || "Unknown Family";
    
    
    const result = await analyzeBgcOpenness(jsonData, 100, 12345, useGeneComposition);
    
    if (result.error) {
      if (result.singleBgc) {
        
        const chartDom = document.getElementById('heaps-law-chart-container');
        const myChart = echarts.init(chartDom);
        
        const singlePoint = [[1, 1]]; 
        
        const option = {
          tooltip: {
            trigger: 'axis',
            formatter: function(params) {
              return `BGCs Analyzed: 1<br/>Unique BGCs: 1`;
            }
          },
          legend: {
            data: ['Single BGC'],
            top: 10,
            left: 10, 
            right: 'auto', 
            orient: 'horizontal', 
            itemStyle: {
              opacity: 0 
            }
          },
          grid: {
            left: '6%',      
            right: '7%',
            bottom: '10%',
            top: '25%',
            containLabel: true
          },
          xAxis: {
            type: 'value',
            name: 'Number of BGCs Analyzed',
            nameLocation: 'middle',
            nameGap: 30,
            min: 0,
            max: 2
          },
          yAxis: {
            type: 'value',
            name: 'Unique BGCs',
            nameLocation: 'middle',
            nameRotate: 90,
            nameGap: 40,     
            min: 0,
            max: 2
          },
          series: [
            {
              name: 'Single BGC',
              type: 'scatter',
              symbolSize: 10,
              data: singlePoint,
              itemStyle: {
                color: '#1f77b4'
              }
            }
          ]
        };
        
        myChart.setOption(option);
        
        
        const heapsParams = document.createElement('div');
        heapsParams.className = 'heaps-params-overlay';
        heapsParams.style.position = 'absolute';
        heapsParams.style.top = '-25px'; 
        heapsParams.style.right = '20px';
        heapsParams.style.left = 'auto';
        heapsParams.style.background = 'rgba(255, 255, 255, 0.8)';
        heapsParams.style.padding = '8px';
        heapsParams.style.borderRadius = '4px';
        heapsParams.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        heapsParams.style.fontSize = '12px';
        heapsParams.style.zIndex = '100';
        
        heapsParams.innerHTML = `
          <div style="font-weight: bold; margin-bottom: 4px;">Heaps' Law Parameters</div>
          <div>Family BGC openness (γ) = 0</div>
          <div style="color: #999;">Single BGC case</div>
        `;
        
        chartDom.style.position = 'relative';
        
        const existingOverlay = chartDom.querySelector('.heaps-params-overlay');
        if (existingOverlay) {
          existingOverlay.remove();
        }
        
        chartDom.appendChild(heapsParams);
        
        return; 
      } else {
        
        document.getElementById('heaps-law-chart-container').innerHTML = 
          `<div class="error-message" style="display:flex;justify-content:center;align-items:center;height:300px;font-family:Arial,sans-serif;color:#d9534f;">Error: ${result.error}</div>`;
        return;
      }
    }
    
    
    const chartDom = document.getElementById('heaps-law-chart-container');
    const myChart = echarts.init(chartDom);
    
    
    const option = {
      tooltip: {
        trigger: 'axis',
        formatter: function(params) {
          
          const filtered = params.filter(param => 
            param.seriesName === 'Unique clusters' || 
            param.seriesName === 'Heaps\' Law Fit');
            
          if (filtered.length === 0) return '';
          
          let result = `BGCs Analyzed: ${Math.round(filtered[0].value[0])}<br/>`;
          
          for (const param of filtered) {
            result += `${param.seriesName}: ${Math.round(param.value[1] * 100) / 100}<br/>`;
          }
          
          return result;
        }
      },
      legend: {
        data: result.heapsFit.noFit ? ['Unique clusters'] : ['Unique clusters', 'Heaps\' Law Fit'],
        top: 10,
        left: 10,
        right: 'auto',
        orient: 'horizontal',
        itemStyle: {
          opacity: 0
        }
      },
      grid: {
        left: '6%',
        right: '7%',
        bottom: '10%',
        top: '25%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        name: 'Number of BGCs Analyzed',
        nameLocation: 'middle',
        nameGap: 30,
        min: 1,
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        name: 'Unique BGCs',
        nameLocation: 'middle',
        nameRotate: 90,
        nameGap: 40,
        splitLine: { show: false }
      },
      series: [
        
        {
          name: 'Unique clusters',
          type: 'line',
          showSymbol: true,
          symbolSize: 5,
          sampling: 'average',
          data: result.averageCurveData,
          lineStyle: {
            width: 2.5,
            color: '#1f77b4'
          },
          itemStyle: {
            color: '#1f77b4'
          },
          symbol: 'none',
          emphasis: {
            focus: 'series'
          }
        },
        
        ...(result.heapsFit.noFit ? [] : [{
          name: 'Heaps\' Law Fit',
          type: 'line',
          showSymbol: false,
          data: result.heapsFit.fittedCurve,
          lineStyle: {
            width: 2.5,
            color: 'red',
            type: 'dashed'
          },
          symbol: 'none',
          emphasis: {
            focus: 'series'
          }
        }])
      ]
    };
    
    
    myChart.setOption(option);
    
    
    const heapsParams = document.createElement('div');
    heapsParams.className = 'heaps-params-overlay';
    heapsParams.style.position = 'absolute';
    heapsParams.style.top = '-25px'; 
    heapsParams.style.right = '20px'; 
    heapsParams.style.left = 'auto'; 
    heapsParams.style.background = 'rgba(255, 255, 255, 0.8)';
    heapsParams.style.padding = '8px';
    heapsParams.style.borderRadius = '4px';
    heapsParams.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    heapsParams.style.fontSize = '12px';
    heapsParams.style.zIndex = '100';
    
    
    if (result.heapsFit.noFit) {
      heapsParams.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 4px;">Heaps' Law Parameters</div>
        <div style="color: #d9534f;">Insufficient data for fitting</div>
      `;
    } else {
      heapsParams.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 4px;">Heaps' Law Parameters</div>
        <div>Family BGC Openness (γ) = ${Math.round(result.heapsFit.gamma * 1000) / 1000}</div>
        <div style="color: ${result.heapsFit.rSquared >= 0.9 ? 'green' : result.heapsFit.rSquared >= 0.8 ? 'orange' : 'red'}">
          R² = ${Math.round(result.heapsFit.rSquared * 1000) / 1000}
        </div>
        <div>Method: ${result.heapsFit.method}</div>
        <div>Uniqueness: ${result.uniquenessMethod === 'composition' ? 'Gene composition' : 'New genes added'}</div>
      `;
    }
    
    
    chartDom.style.position = 'relative';
    
    
    const existingOverlay = chartDom.querySelector('.heaps-params-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    
    chartDom.appendChild(heapsParams);
    
    
    myChart.setOption(option);
    
    
    window.addEventListener('resize', function() {
      myChart.resize();
    });
    
    
    return {
      familyName,
      heapsFit: result.heapsFit,
      uniquenessMethod: result.uniquenessMethod
    };
    
  } catch (error) {
    console.error('Error processing data:', error);
    document.getElementById('heaps-law-chart-container').innerHTML = 
      `<div class="error-message">Error: ${error.message}</div>`;
  }
}


document.addEventListener('DOMContentLoaded', function() {
  
  const chartContainer = document.getElementById('heaps-law-chart-container');
  
  
  const dropdownContainer = document.createElement('div');
  dropdownContainer.className = 'uniqueness-selector';
  dropdownContainer.style.marginBottom = '10px';
  dropdownContainer.style.fontFamily = 'Arial, sans-serif';
  
  
  dropdownContainer.innerHTML = `
    <label for="uniqueness-dropdown" style="margin-right: 8px; font-size: 14px;">Define BGC uniqueness by:</label>
    <select id="uniqueness-dropdown" style="padding: 4px; border-radius: 4px; border: 1px solid #ccc;">
      <option value="composition" selected>Unique gene composition</option>
      <option value="newGenes">Newly genes added to family</option>
    </select>
  `;
  
  
  chartContainer.parentNode.insertBefore(dropdownContainer, chartContainer);
  
  
  const uniquenessDropdown = document.getElementById('uniqueness-dropdown');
  
  
  let useGeneComposition = uniquenessDropdown.value === 'composition';
  processDataAndCreateChart(useGeneComposition);
  
  
  uniquenessDropdown.addEventListener('change', function() {
    useGeneComposition = this.value === 'composition';
    processDataAndCreateChart(useGeneComposition);
  });
});

async function exportAllHeapsLawData() {
  
  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  modal.style.zIndex = '10000';
  
  const progressText = document.createElement('div');
  progressText.style.color = 'white';
  progressText.style.fontSize = '24px';
  progressText.style.marginBottom = '20px';
  progressText.textContent = 'Preparing to export data...';
  
  const progressBar = document.createElement('div');
  progressBar.style.width = '80%';
  progressBar.style.height = '30px';
  progressBar.style.backgroundColor = '#444';
  progressBar.style.borderRadius = '5px';
  progressBar.style.overflow = 'hidden';
  
  const progressFill = document.createElement('div');
  progressFill.style.width = '0%';
  progressFill.style.height = '100%';
  progressFill.style.backgroundColor = '#4CAF50';
  progressFill.style.transition = 'width 0.2s';
  
  const statusText = document.createElement('div');
  statusText.style.color = 'white';
  statusText.style.fontSize = '14px';
  statusText.style.marginTop = '10px';
  statusText.style.maxWidth = '80%';
  statusText.style.textAlign = 'center';
  statusText.textContent = 'Loading folder list...';
  
  progressBar.appendChild(progressFill);
  modal.appendChild(progressText);
  modal.appendChild(progressBar);
  modal.appendChild(statusText);
  document.body.appendChild(modal);
  
  
  const results = [];
  let processedCount = 0;
  
  try {
    
    const folderPaths = await getFolderList();
    const totalFolders = folderPaths.length;
    
    progressText.textContent = `Processing 0/${totalFolders} folders...`;
    statusText.textContent = 'Starting analysis...';
    
    
    const BATCH_SIZE = 50;
    
    for (let i = 0; i < folderPaths.length; i += BATCH_SIZE) {
      const batch = folderPaths.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (folderPath) => {
        try {
          statusText.textContent = `Processing: ${folderPath}`;
          
          
          const response = await fetch(`${folderPath}/Report.json`);
          if (!response.ok) {
            throw new Error(`Failed to fetch Report.json (${response.status})`);
          }
          
          const jsonData = await response.json();
          
          
          const resultNewGenes = await analyzeBgcOpenness(jsonData, 100, 12345, false);
          const resultComposition = await analyzeBgcOpenness(jsonData, 100, 12345, true);
          
          
          const result = {
            folder: folderPath,
            family_name: folderPath.split('/').pop(),
            newGenes: null,
            composition: null
          };
          
          
          if (resultNewGenes.singleBgc) {
            result.newGenes = {
              gamma: 0,
              K: null,
              r_squared: null,
              method: "N/A",
              status: "Single BGC case"
            };
          } else if (resultNewGenes.error) {
            result.newGenes = {
              gamma: null,
              K: null,
              r_squared: null,
              method: null,
              status: `Error: ${resultNewGenes.error}`
            };
          } else if (resultNewGenes.heapsFit && resultNewGenes.heapsFit.noFit) {
            result.newGenes = {
              gamma: null,
              K: null,
              r_squared: null,
              method: null,
              status: "Insufficient data for fitting"
            };
          } else {
            result.newGenes = {
              gamma: resultNewGenes.heapsFit.gamma,
              K: resultNewGenes.heapsFit.K,
              r_squared: resultNewGenes.heapsFit.rSquared,
              method: resultNewGenes.heapsFit.method,
              status: "Success"
            };
          }
          
          
          if (resultComposition.singleBgc) {
            result.composition = {
              gamma: 0,
              K: null,
              r_squared: null,
              method: "N/A",
              status: "Single BGC case"
            };
          } else if (resultComposition.error) {
            result.composition = {
              gamma: null,
              K: null,
              r_squared: null,
              method: null,
              status: `Error: ${resultComposition.error}`
            };
          } else if (resultComposition.heapsFit && resultComposition.heapsFit.noFit) {
            result.composition = {
              gamma: null,
              K: null,
              r_squared: null,
              method: null,
              status: "Insufficient data for fitting"
            };
          } else {
            result.composition = {
              gamma: resultComposition.heapsFit.gamma,
              K: resultComposition.heapsFit.K,
              r_squared: resultComposition.heapsFit.rSquared,
              method: resultComposition.heapsFit.method,
              status: "Success"
            };
          }
          
          
          results.push(result);
        } catch (error) {
          console.error(`Error processing ${folderPath}:`, error);
          results.push({
            folder: folderPath,
            family_name: folderPath.split('/').pop(),
            error: error.message
          });
        }
        
        
        processedCount++;
        const progress = Math.min(100, Math.round((processedCount / totalFolders) * 100));
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `Processing ${processedCount}/${totalFolders} folders (${progress}%)`;
      }));
      
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    
    progressText.textContent = 'Creating export file...';
    statusText.textContent = 'Preparing download...';
    
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bgc_analysis_results.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    progressText.textContent = 'Export complete!';
    statusText.textContent = `Exported data for ${processedCount} folders`;
    progressFill.style.backgroundColor = '#4CAF50';
    
    
    setTimeout(() => {
      document.body.removeChild(modal);
    }, 3000);
    
  } catch (error) {
    console.error('Export failed:', error);
    progressText.textContent = 'Export failed!';
    statusText.textContent = error.message;
    progressFill.style.backgroundColor = '#f44336';
    
    
    setTimeout(() => {
      document.body.removeChild(modal);
    }, 5000);
  }
}



async function getFolderList() {
  
  
  
  try {
    const response = await fetch('/data/folder_list.json');
    if (response.ok) {
      const folders = await response.json();
      console.log(`Loaded ${folders.length} folders from folder_list.json`);
      return folders.map(folder => `/data/${folder}`);
    }
  } catch (e) {
    console.warn('Could not load folder list from JSON file:', e);
  }
  
  
  try {
    const response = await fetch('/data/');
    const text = await response.text();
    
    
    const folderRegex = /<a[^>]*href="([^"\/]+)\/"/g;
    const matches = [...text.matchAll(folderRegex)];
    
    if (matches.length > 0) {
      const folders = matches.map(match => `/data/${match[1]}`);
      console.log(`Found ${folders.length} folders from directory listing`);
      return folders;
    }
  } catch (e) {
    console.warn('Could not get directory listing:', e);
  }
  
  
  const folderInput = prompt(
    'Please enter a comma-separated list of folder names in the /data directory:',
    'folder1,folder2,folder3'
  );
  
  if (folderInput) {
    const folders = folderInput.split(',')
      .map(f => f.trim())
      .filter(f => f.length > 0)
      .map(folder => `/data/${folder}`);
    
    if (folders.length > 0) {
      console.log(`Using ${folders.length} user-provided folders`);
      return folders;
    }
  }
  
  
  const currentPath = window.location.pathname;
  const pathMatch = currentPath.match(/\/data\/([^\/]+)/);
  if (pathMatch && pathMatch[1]) {
    console.log('Using only the current folder');
    return [`/data/${pathMatch[1]}`];
  }
  
  
  alert('Could not determine folder list. Please create a /data/folder_list.json file containing an array of folder names.');
  return [];
}


function addExportButton() {
  const button = document.createElement('button');
  button.textContent = 'Export All BGC Data';
  button.style.position = 'fixed';
  button.style.bottom = '20px';
  button.style.right = '20px';
  button.style.padding = '10px 15px';
  button.style.backgroundColor = '#4CAF50';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '5px';
  button.style.cursor = 'pointer';
  button.style.zIndex = '1000';
  button.style.fontFamily = 'Arial, sans-serif';
  button.style.fontSize = '14px';
  button.style.fontWeight = 'bold';
  button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  
  button.addEventListener('click', exportAllHeapsLawData);
  
  document.body.appendChild(button);
  
  console.log('BGC data export functionality added');
}


if (document.readyState === 'complete') {
  addExportButton();
} else {
  window.addEventListener('load', addExportButton);
}