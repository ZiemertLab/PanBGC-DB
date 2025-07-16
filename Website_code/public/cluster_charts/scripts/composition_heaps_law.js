// Create a seeded random function for consistent results
function createSeededRandom(seed) {
  return function() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

// Function to fit Heaps' Law to data with multiple methods
function fitHeapsLaw(data) {
    // Extract x and y values
    const xValues = data.map(point => point[0]);
    const yValues = data.map(point => point[1]);
    
    // Filter out data points where y is 0 or negative (can't take log)
    // And filter out the initial points which might skew the fit
    const startIdx = Math.min(5, Math.floor(xValues.length * 0.1)); // Skip initial points, but not too many
    const validPoints = [];
    
    for (let i = startIdx; i < xValues.length; i++) {
      if (yValues[i] > 0) {
        validPoints.push([xValues[i], yValues[i]]);
      }
    }
    
    // Even with very few points, we'll try to make a fit
    // Initialize with no fit
    let bestFit = null;
    
    // Try all methods and collect successful fits
    const fits = [];
    
    try {
      // Method 1: Standard log-transformed linear regression
      const standardFit = fitStandardHeapsLaw(validPoints);
      if (!isNaN(standardFit.K) && !isNaN(standardFit.gamma) && standardFit.rSquared >= 0) {
        fits.push(standardFit);
      }
    } catch (e) {
      console.warn("Standard fit failed:", e);
    }
    
    try {
      // Method 2: Weighted regression emphasizing later points
      const weightedFit = fitWeightedHeapsLaw(validPoints);
      if (!isNaN(weightedFit.K) && !isNaN(weightedFit.gamma) && weightedFit.rSquared >= 0) {
        fits.push(weightedFit);
      }
    } catch (e) {
      console.warn("Weighted fit failed:", e);
    }
    
    try {
      // Method 3: Non-linear direct optimization
      const nonlinearFit = fitNonlinearHeapsLaw(validPoints);
      if (!isNaN(nonlinearFit.K) && !isNaN(nonlinearFit.gamma) && nonlinearFit.rSquared >= 0) {
        fits.push(nonlinearFit);
      }
    } catch (e) {
      console.warn("Non-linear fit failed:", e);
    }
    
    // If we have at least one successful fit, select the best one
    if (fits.length > 0) {
      fits.sort((a, b) => b.rSquared - a.rSquared); // Sort by descending R²
      bestFit = fits[0];
      
      // Generate the final fitted curve for all data points
      const fittedCurve = xValues.map(x => [x, bestFit.K * Math.pow(x, bestFit.gamma)]);
      
      return {
        ...bestFit,
        fittedCurve,
        allFits: fits // Return all fits for comparison if needed
      };
    } else {
      // No successful fits
      return {
        error: "Insufficient data to fit Heaps' Law curve",
        noFit: true
      };
    }
  }
  
  // Method 1: Standard log-transformed linear regression
  function fitStandardHeapsLaw(validPoints) {
    const validX = validPoints.map(point => point[0]);
    const validY = validPoints.map(point => point[1]);
    const logX = validX.map(x => Math.log(x));
    const logY = validY.map(y => Math.log(y));
    
    // Calculate means
    const meanLogX = logX.reduce((sum, val) => sum + val, 0) / logX.length;
    const meanLogY = logY.reduce((sum, val) => sum + val, 0) / logY.length;
    
    // Calculate slope (gamma) using linear regression
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < logX.length; i++) {
      numerator += (logX[i] - meanLogX) * (logY[i] - meanLogY);
      denominator += (logX[i] - meanLogX) * (logX[i] - meanLogX);
    }
    
    const gamma = numerator / denominator;
    
    // Calculate K using y = mx + b => b = y - mx => K = e^b
    const logK = meanLogY - gamma * meanLogX;
    const K = Math.exp(logK);
    
    // Calculate R-squared to assess fit quality
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
  
  // Method 2: Weighted regression emphasizing later points
  function fitWeightedHeapsLaw(validPoints) {
    const validX = validPoints.map(point => point[0]);
    const validY = validPoints.map(point => point[1]);
    const logX = validX.map(x => Math.log(x));
    const logY = validY.map(y => Math.log(y));
    
    // Calculate weights - increase weight linearly with index
    const weights = [];
    for (let i = 0; i < validPoints.length; i++) {
      // Weight increases with index - later points get higher weights
      weights.push((i + 1) / validPoints.length);
    }
    
    // Calculate weighted means
    let sumWeights = weights.reduce((a, b) => a + b, 0);
    let weightedLogXSum = 0;
    let weightedLogYSum = 0;
    
    for (let i = 0; i < logX.length; i++) {
      weightedLogXSum += logX[i] * weights[i];
      weightedLogYSum += logY[i] * weights[i];
    }
    
    const meanLogX = weightedLogXSum / sumWeights;
    const meanLogY = weightedLogYSum / sumWeights;
    
    // Calculate slope (gamma) using weighted linear regression
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < logX.length; i++) {
      numerator += weights[i] * (logX[i] - meanLogX) * (logY[i] - meanLogY);
      denominator += weights[i] * (logX[i] - meanLogX) * (logX[i] - meanLogX);
    }
    
    const gamma = numerator / denominator;
    
    // Calculate K using weighted formula
    const logK = meanLogY - gamma * meanLogX;
    const K = Math.exp(logK);
    
    // Calculate weighted R-squared
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
  
  // Method 3: Non-linear direct optimization
  function fitNonlinearHeapsLaw(validPoints) {
    const validX = validPoints.map(point => point[0]);
    const validY = validPoints.map(point => point[1]);
    
    // Start with initial parameters from log-linear fit for better convergence
    const initialLogFit = fitStandardHeapsLaw(validPoints);
    let K = initialLogFit.K;
    let gamma = initialLogFit.gamma;
    
    // Simple implementation of gradient descent for direct optimization
    const learningRate = 0.001;
    const iterations = 1000;
    const tolerance = 1e-6;
    
    let prevError = Number.MAX_VALUE;
    
    for (let iter = 0; iter < iterations; iter++) {
      // Calculate predictions and error
      let sumSquaredError = 0;
      let gradK = 0;
      let gradGamma = 0;
      
      for (let i = 0; i < validX.length; i++) {
        const x = validX[i];
        const y = validY[i];
        const prediction = K * Math.pow(x, gamma);
        const error = prediction - y;
        
        sumSquaredError += error * error;
        
        // Gradient for K: d(error)/dK = error * (prediction/K)
        gradK += error * (prediction / K);
        
        // Gradient for gamma: d(error)/dgamma = error * prediction * ln(x)
        gradGamma += error * prediction * Math.log(x);
      }
      
      // Check for convergence
      if (Math.abs(prevError - sumSquaredError) < tolerance) {
        break;
      }
      prevError = sumSquaredError;
      
      // Update parameters
      K -= learningRate * gradK;
      gamma -= learningRate * gradGamma;
      
      // Ensure K stays positive
      if (K <= 0) K = 1e-5;
    }
    
    // Calculate R-squared for this fit
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
  
  // Helper function to calculate combinations (n choose k)
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

// Helper function to check if two sets have the same elements
function areSetsEqual(setA, setB) {
  if (setA.size !== setB.size) return false;
  for (const item of setA) {
    if (!setB.has(item)) return false;
  }
  return true;
}
  
// Function to analyze BGC openness with multiple simulations - with seeded random
// Now includes a useGeneComposition parameter to toggle between definitions
async function analyzeBgcOpenness(jsonData, numSimulations = 100, seed = 12345, useGeneComposition = false) {
  // Create seeded random function
  const seededRandom = createSeededRandom(seed);
  
  // Step 1: Extract total BGCs count
  let totalBgcs = null;
  for (const entry of jsonData) {
    if ("total_BGCs" in entry) {
      totalBgcs = entry.total_BGCs;
      break; // Assume it's the same for all entries
    }
  }

  if (totalBgcs === null) {
    return { error: "total_BGCs not found in JSON data." };
  }
  
  // Check if there's only one BGC - return early with special indicator
  if (totalBgcs < 2) {
    return { 
      error: "Only one BGC found - analysis not applicable",
      singleBgc: true
    };
  }

  // Step 2: Extract and clean BGC identifiers
  const bgcGeneMatrix = {};
  const allGenes = new Set();

  for (const entry of jsonData) {
    if (!("Ortholog_Group_OG_ID" in entry) || !("CDS_Locus_Tags" in entry)) {
      continue;
    }
    
    const ogId = entry.Ortholog_Group_OG_ID; // Ortholog Group ID
    const bgcs = entry.CDS_Locus_Tags.split(";"); // Extract all BGCs containing this gene

    for (const bgc of bgcs) {
      const bgcIdCleaned = bgc.split(".").slice(0, -1).join("."); // Remove "regionXXX"
      
      if (!(bgcIdCleaned in bgcGeneMatrix)) {
        bgcGeneMatrix[bgcIdCleaned] = new Set();
      }
      
      bgcGeneMatrix[bgcIdCleaned].add(ogId); // Store OG presence
      allGenes.add(ogId); // Track this gene
    }
  }

  // Ensure we use exactly the expected number of BGCs
  const bgcList = Object.keys(bgcGeneMatrix).slice(0, totalBgcs);

  if (bgcList.length < 2) { // Need at least 2 BGCs to perform analysis
    return { error: `Insufficient BGCs: Found only ${bgcList.length}` };
  }

  // Initialize for simulation results
  const allCurves = [];
  
  // Run multiple simulations
  for (let sim = 0; sim < numSimulations; sim++) {
    try {
      // Shuffle the BGC order using seeded random for this simulation
      const shuffledBgcList = [...bgcList].sort(() => seededRandom() - 0.5);
      
      // Set up containers for tracking uniqueness
      const seenGenes = new Set();
      const uniqueBgcs = new Set();
      
      if (useGeneComposition) {
        // NEW APPROACH: A BGC is unique if its gene composition differs from all previously seen BGCs
        const seenCompositions = []; // Array of Sets to store each unique composition
        
        for (const bgc of shuffledBgcList) {
          const geneSet = bgcGeneMatrix[bgc];
          
          // Check if this gene composition already exists in any previously seen compositions
          const isUniqueComposition = !seenCompositions.some(composition => 
            areSetsEqual(composition, geneSet)
          );
          
          if (isUniqueComposition) {
            uniqueBgcs.add(bgc);
            seenCompositions.push(new Set([...geneSet])); // Store a copy of the gene set
          }
          
          // Add all genes to seen (for compatibility with the data processing later)
          for (const gene of geneSet) {
            seenGenes.add(gene);
          }
        }
      } else {
        // ORIGINAL APPROACH: A BGC is unique if it contributes at least one new gene
        for (const bgc of shuffledBgcList) {
          const geneSet = bgcGeneMatrix[bgc];
          const newGenes = [...geneSet].filter(gene => !seenGenes.has(gene));
          
          if (newGenes.length > 0) { // If this BGC contributes any new genes
            uniqueBgcs.add(bgc);
          }
          
          // Add all genes to seen, whether BGC is unique or not
          for (const gene of geneSet) {
            seenGenes.add(gene);
          }
        }
      }

      // Prepare Data for this simulation
      const numBgcsAnalyzed = [];
      const numUniqueBgcs = [];
      const seenBgcs = new Set();

      for (let i = 0; i < shuffledBgcList.length; i++) {
        const bgc = shuffledBgcList[i];
        seenBgcs.add(bgc);
        
        // Count unique BGCs seen so far
        const uniqueCount = [...seenBgcs].filter(b => uniqueBgcs.has(b)).length;
        
        numBgcsAnalyzed.push(i + 1);
        numUniqueBgcs.push(uniqueCount);
      }
      
      // Store results for successful simulations
      allCurves.push({
        x: numBgcsAnalyzed,
        y: numUniqueBgcs
      });
      
    } catch (e) {
      console.warn("Simulation failed:", e);
      // Just skip failed simulations
      continue;
    }
  }
  
  // Check if we have any successful simulations
  if (allCurves.length === 0) {
    return { error: "Failed to run simulations" };
  }
  
  // Find the maximum N across all curves
  const maxN = Math.max(...allCurves.map(curve => Math.max(...curve.x)));
  
  // Calculate average curves for visualization
  const avgUniqueCounts = new Array(maxN).fill(0);
  const countsPerPosition = new Array(maxN).fill(0);
  
  for (const curve of allCurves) {
    for (let i = 0; i < curve.y.length; i++) {
      avgUniqueCounts[i] += curve.y[i];
      countsPerPosition[i] += 1;
    }
  }
  
  // Avoid division by zero
  for (let i = 0; i < maxN; i++) {
    if (countsPerPosition[i] === 0) {
      countsPerPosition[i] = 1;
    }
    avgUniqueCounts[i] = avgUniqueCounts[i] / countsPerPosition[i];
  }
  
  // Generate x-axis for plotting
  const xAxis = Array.from({ length: maxN }, (_, i) => i + 1);
  
  // Create the data for average curve
  const averageCurveData = xAxis.map((x, i) => [x, avgUniqueCounts[i]]);
  
  // Fit Heaps' law to the average curve
  const heapsFit = fitHeapsLaw(averageCurveData);
  
  // Prepare data for individual simulation curves
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
  
// Main function to process the data and create chart
async function processDataAndCreateChart(useGeneComposition = false) {
  try {
    // Load the JSON data using fetch
    const response = await fetch(GENECLUSTER_LOCATION);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const jsonData = await response.json();
    
    // Extract the family name from the path
    const pathParts = GENECLUSTER_LOCATION.split('/');
    const familyName = pathParts[pathParts.length - 2] || "Unknown Family";
    
    // Analyze BGC openness with seeded random and the selected uniqueness definition
    const result = await analyzeBgcOpenness(jsonData, 100, 12345, useGeneComposition);
    
    if (result.error) {
      if (result.singleBgc) {
        // For a single BGC case, display a chart with gamma = 0
        const chartDom = document.getElementById('heaps-law-chart-container');
        const myChart = echarts.init(chartDom);
        
        const singlePoint = [[1, 1]]; // A single point at (1,1)
        
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
            left: 10, // Position legend on the left
            right: 'auto', // Reset right positioning
            orient: 'horizontal', // Keep horizontal orientation
            itemStyle: {
              opacity: 0 // Hide the legend symbols
            }
          },
          grid: {
            left: '6%',      // Reduced from larger value
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
            nameGap: 40,     // Reduced to match other chart
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
        
        // For the single BGC case
        const heapsParams = document.createElement('div');
        heapsParams.className = 'heaps-params-overlay';
        heapsParams.style.position = 'absolute';
        heapsParams.style.top = '-25px'; // Changed from 10px to 3px (moved to almost the very top)
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
        
        return; // Exit early after rendering single BGC case
      } else {
        // For other errors, show the error message
        document.getElementById('heaps-law-chart-container').innerHTML = 
          `<div class="error-message" style="display:flex;justify-content:center;align-items:center;height:300px;font-family:Arial,sans-serif;color:#d9534f;">Error: ${result.error}</div>`;
        return;
      }
    }
    
    // Create the ECharts instance
    const chartDom = document.getElementById('heaps-law-chart-container');
    const myChart = echarts.init(chartDom);
    
    // Configure the chart options without including simulation series
    const option = {
      tooltip: {
        trigger: 'axis',
        formatter: function(params) {
          // Only show tooltip for average and Heaps' fit curves
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
        // Add Unique clusters curve
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
        // Add Heaps' Law fitted curve only if fit was successful
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
    
    // Apply the chart options
    myChart.setOption(option);
    
    // Create overlay div for Heaps' Law parameters similar to the summary overlay style
    const heapsParams = document.createElement('div');
    heapsParams.className = 'heaps-params-overlay';
    heapsParams.style.position = 'absolute';
    heapsParams.style.top = '-25px'; // Changed from 10px to 3px (moved to almost the very top)
    heapsParams.style.right = '20px'; // Changed from left: 70px to right: 20px
    heapsParams.style.left = 'auto'; // Reset left positioning
    heapsParams.style.background = 'rgba(255, 255, 255, 0.8)';
    heapsParams.style.padding = '8px';
    heapsParams.style.borderRadius = '4px';
    heapsParams.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    heapsParams.style.fontSize = '12px';
    heapsParams.style.zIndex = '100';
    
    // Add content based on fit status
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
    
    // Make sure container has position relative
    chartDom.style.position = 'relative';
    
    // Remove any existing overlay before adding new one
    const existingOverlay = chartDom.querySelector('.heaps-params-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    // Add overlay to chart container
    chartDom.appendChild(heapsParams);
    
    // Apply the updated options with the text component
    myChart.setOption(option);
    
    // Handle window resize
    window.addEventListener('resize', function() {
      myChart.resize();
    });
    
    // Return the results
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

// Initialize the chart with the dropdown
document.addEventListener('DOMContentLoaded', function() {
  // Create and add the dropdown to the page
  const chartContainer = document.getElementById('heaps-law-chart-container');
  
  // Create the dropdown container
  const dropdownContainer = document.createElement('div');
  dropdownContainer.className = 'uniqueness-selector';
  dropdownContainer.style.marginBottom = '10px';
  dropdownContainer.style.fontFamily = 'Arial, sans-serif';
  
  // Create the dropdown HTML
  dropdownContainer.innerHTML = `
    <label for="uniqueness-dropdown" style="margin-right: 8px; font-size: 14px;">Define BGC uniqueness by:</label>
    <select id="uniqueness-dropdown" style="padding: 4px; border-radius: 4px; border: 1px solid #ccc;">
      <option value="composition" selected>Unique gene composition</option>
      <option value="newGenes">Newly genes added to family</option>
    </select>
  `;
  
  // Insert the dropdown before the chart container
  chartContainer.parentNode.insertBefore(dropdownContainer, chartContainer);
  
  // Get the dropdown element
  const uniquenessDropdown = document.getElementById('uniqueness-dropdown');
  
  // Process data with the default selection (newly genes added)
  let useGeneComposition = uniquenessDropdown.value === 'composition';
  processDataAndCreateChart(useGeneComposition);
  
  // Update chart when dropdown changes
  uniquenessDropdown.addEventListener('change', function() {
    useGeneComposition = this.value === 'composition';
    processDataAndCreateChart(useGeneComposition);
  });
});
// Function to export all BGC analysis data
async function exportAllHeapsLawData() {
  // Create progress modal
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
  
  // Create array to store results
  const results = [];
  let processedCount = 0;
  
  try {
    // Get folder list from your data structure
    const folderPaths = await getFolderList();
    const totalFolders = folderPaths.length;
    
    progressText.textContent = `Processing 0/${totalFolders} folders...`;
    statusText.textContent = 'Starting analysis...';
    
    // Process folders in batches to avoid freezing the browser
    const BATCH_SIZE = 50;
    
    for (let i = 0; i < folderPaths.length; i += BATCH_SIZE) {
      const batch = folderPaths.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (folderPath) => {
        try {
          statusText.textContent = `Processing: ${folderPath}`;
          
          // Fetch the Report.json file
          const response = await fetch(`${folderPath}/Report.json`);
          if (!response.ok) {
            throw new Error(`Failed to fetch Report.json (${response.status})`);
          }
          
          const jsonData = await response.json();
          
          // Run the analysis with both methods using the original functions
          const resultNewGenes = await analyzeBgcOpenness(jsonData, 100, 12345, false);
          const resultComposition = await analyzeBgcOpenness(jsonData, 100, 12345, true);
          
          // Format the result to match what we display on the website
          const result = {
            folder: folderPath,
            family_name: folderPath.split('/').pop(),
            newGenes: null,
            composition: null
          };
          
          // Handle new genes method result
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
          
          // Handle composition method result
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
          
          // Add to results
          results.push(result);
        } catch (error) {
          console.error(`Error processing ${folderPath}:`, error);
          results.push({
            folder: folderPath,
            family_name: folderPath.split('/').pop(),
            error: error.message
          });
        }
        
        // Update progress
        processedCount++;
        const progress = Math.min(100, Math.round((processedCount / totalFolders) * 100));
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `Processing ${processedCount}/${totalFolders} folders (${progress}%)`;
      }));
      
      // Small delay to allow UI updates
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Create and download the JSON file
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
    
    // Remove modal after delay
    setTimeout(() => {
      document.body.removeChild(modal);
    }, 3000);
    
  } catch (error) {
    console.error('Export failed:', error);
    progressText.textContent = 'Export failed!';
    statusText.textContent = error.message;
    progressFill.style.backgroundColor = '#f44336';
    
    // Remove modal after delay
    setTimeout(() => {
      document.body.removeChild(modal);
    }, 5000);
  }
}

// Helper function to get folder paths
// You'll need to customize this based on your website's data structure
async function getFolderList() {
  // Try various methods to get all folders
  
  // Method 1: Try to fetch a special index file that lists all folders (recommended approach)
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
  
  // Method 2: Try to fetch a directory listing if the server allows it
  try {
    const response = await fetch('/data/');
    const text = await response.text();
    
    // Parse the HTML directory listing
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
  
  // Method 3: Ask the user to provide a list of folder names
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
  
  // Method 4: Check if we're viewing a single folder and just use that
  const currentPath = window.location.pathname;
  const pathMatch = currentPath.match(/\/data\/([^\/]+)/);
  if (pathMatch && pathMatch[1]) {
    console.log('Using only the current folder');
    return [`/data/${pathMatch[1]}`];
  }
  
  // If all else fails, warn the user
  alert('Could not determine folder list. Please create a /data/folder_list.json file containing an array of folder names.');
  return [];
}

// Create and add export button to the page
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

// Initialize the export button when the page is ready
if (document.readyState === 'complete') {
  addExportButton();
} else {
  window.addEventListener('load', addExportButton);
}