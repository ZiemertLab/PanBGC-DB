// Global vars for tracking data zoom and chart state
let gvs_previousStart = 0;
let gvs_previousEnd = 100;
let accumulationChartInstance = null;
let simulationResults = null;
let heapsLawData = null;
let resizeHandler = null; // Store resize handler reference for proper removal

// Function to handle data zoom events
function gvs_onDataZoom(params, chart) {
    try {
        const option = chart.getOption();
        if (!option || !option.xAxis || !option.xAxis[0] || !option.xAxis[0].data) {
            console.error('Invalid chart options in data zoom handler');
            return;
        }

        let start, end;
        if (params.start !== undefined && params.end !== undefined) {
            start = params.start;
            end = params.end;
        } else if (params.batch && params.batch.length > 0 && params.batch[0].start !== undefined && params.batch[0].end !== undefined) {
            start = params.batch[0].start;
            end = params.batch[0].end;
        } else {
            console.error('Could not determine zoom range from params.');
            return;
        }

        const startIndex = Math.round(start / 100 * option.xAxis[0].data.length);
        const endIndex = Math.round(end / 100 * option.xAxis[0].data.length);
        const highlightedXData = option.xAxis[0].data.slice(startIndex, endIndex);

        let zoomed_in_cluster_data = cluster_handler.getOriginalClusterData().filter(item => highlightedXData.includes(item.Ortholog_Group_OG_ID));

        if (end - start < gvs_previousEnd - gvs_previousStart) { // Zoom-in procedure
            cluster_handler.setWhichChartsToUpdate('ACD');
            cluster_handler.setClusterData(zoomed_in_cluster_data);
        } else { // Zoom-out procedure
            cluster_handler.setWhichChartsToUpdate('ACD');
            cluster_handler.setClusterData(zoomed_in_cluster_data);
        }

        gvs_previousStart = start;
        gvs_previousEnd = end;
    } catch (error) {
        console.error('Error in data zoom handler:', error);
    }
}

// Fetch the Heaps Law data from the provided path
async function fetchHeapsLawData(path) {
    try {
        console.log("Fetching Heaps Law data from:", path);
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Heaps Law data loaded successfully");
        return data;
    } catch (error) {
        console.error("Error fetching Heaps Law data:", error);
        throw error;
    }
}

// Functions for curve fitting (adapted from heaps_law.js)
// --------------------------------------------------------

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

// Run the simulation with the fixed permutations and given threshold
function runSimulationWithThreshold(threshold) {
    if (!heapsLawData || !heapsLawData.simulationData) {
        console.error("Heaps Law data not loaded");
        return null;
    }
    
    try {
        const simData = heapsLawData.simulationData;
        const geneToBgcs = simData.geneToBgcs;
        const bgcToGenes = simData.bgcToGenes;
        const permutations = simData.permutations;
        const bgcCount = heapsLawData.bgcCount;
        
        // Run simulations
        const numSimulations = permutations.length;
        const coreCurves = [];
        const accCurves = [];
        const uniqueCurves = [];
        
        // Run each simulation using the pre-calculated permutations
        for (let sim = 0; sim < numSimulations; sim++) {
            const shuffledBgcList = permutations[sim];
            
            // Initialize arrays to store curve data
            const yCore = Array(shuffledBgcList.length).fill(0);
            const yAcc = Array(shuffledBgcList.length).fill(0);
            const yUnique = Array(shuffledBgcList.length).fill(0);
            
            // Keep track of genes and BGCs seen at each step
            const genesByStep = [];
            const bgcsByStep = [];
            
            let currentGenes = new Set();
            let currentBgcs = new Set();
            
            // First, determine which genes are present at each step
            for (let i = 0; i < shuffledBgcList.length; i++) {
                const bgc = shuffledBgcList[i];
                
                // Add this BGC to our set
                currentBgcs.add(bgc);
                bgcsByStep.push(new Set([...currentBgcs]));
                
                // Add genes from this BGC
                if (bgcToGenes[bgc]) {
                    bgcToGenes[bgc].forEach(gene => currentGenes.add(gene));
                }
                
                genesByStep.push(new Set([...currentGenes]));
            }
            
            // For each step, categorize genes based on occurrence in BGCs up to that step
            for (let i = 0; i < shuffledBgcList.length; i++) {
                const currentBgcs = bgcsByStep[i];
                const currentGenes = genesByStep[i];
                
                // Current threshold count for this step
                const stepThresholdCount = Math.ceil(currentBgcs.size * threshold);
                
                // Count each gene's occurrence in the current set of BGCs
                const geneOccurrences = {};
                currentGenes.forEach(gene => {
                    if (geneToBgcs[gene]) {
                        // Get the BGCs this gene is in
                        const geneBgcs = geneToBgcs[gene].filter(bgc => currentBgcs.has(bgc));
                        geneOccurrences[gene] = geneBgcs.length;
                    }
                });
                
                // Categorize based on occurrence count and threshold
                let coreAtStep = 0;
                let uniqueAtStep = 0;
                let accAtStep = 0;
                
                Object.entries(geneOccurrences).forEach(([gene, count]) => {
                    if (count >= stepThresholdCount) {  // Core
                        coreAtStep++;
                    } else if (count === 1) {  // Unique
                        uniqueAtStep++;
                    } else {  // Accessory
                        accAtStep++;
                    }
                });
                
                // Store counts for this step
                yCore[i] = coreAtStep;
                yAcc[i] = accAtStep;
                yUnique[i] = uniqueAtStep;
            }
            
            // Store the curves
            coreCurves.push(yCore);
            accCurves.push(yAcc);
            uniqueCurves.push(yUnique);
        }
        
        // Calculate average curves
        const avgCore = [];
        const avgAcc = [];
        const avgUnique = [];
        
        for (let i = 0; i < coreCurves[0].length; i++) {
            let coreSum = 0;
            let accSum = 0;
            let uniqueSum = 0;
            
            for (let j = 0; j < coreCurves.length; j++) {
                coreSum += coreCurves[j][i];
                accSum += accCurves[j][i];
                uniqueSum += uniqueCurves[j][i];
            }
            
            avgCore.push(coreSum / coreCurves.length);
            avgAcc.push(accSum / coreCurves.length);
            avgUnique.push(uniqueSum / coreCurves.length);
        }
        
        // Create the results array for the chart
        const xValues = Array.from({ length: avgCore.length }, (_, i) => i + 1);
        
        const resultsData = xValues.map((x, i) => ({
            Number_of_BGCs_Analyzed: x,
            Core_Genome_Size: avgCore[i],
            Accessory_Genome_Size: avgAcc[i],
            Unique_Genome_Size: avgUnique[i],
            Total_Genome_Size: avgCore[i] + avgAcc[i] + avgUnique[i],
            Core_Plus_Acc: avgCore[i] + avgAcc[i]
        }));
        
        // Calculate final gene counts for the summary statistics
        const finalThresholdCount = Math.ceil(bgcCount * threshold);
        
        let coreGenes = 0;
        let accessoryGenes = 0;
        let uniqueGenes = 0;
        
        // Count genes in each category based on final BGC counts
        Object.entries(geneToBgcs).forEach(([gene, bgcs]) => {
            const count = bgcs.length;
            if (count >= finalThresholdCount) {
                coreGenes++;
            } else if (count === 1) {
                uniqueGenes++;
            } else {
                accessoryGenes++;
            }
        });
        
        // Calculate total genes and percentages for statistics
        const totalGenes = coreGenes + accessoryGenes + uniqueGenes;
        const corePercent = totalGenes > 0 ? (coreGenes / totalGenes * 100) : 0;
        const accPercent = totalGenes > 0 ? (accessoryGenes / totalGenes * 100) : 0;
        const uniquePercent = totalGenes > 0 ? (uniqueGenes / totalGenes * 100) : 0;
        
        // Prepare data for curve fitting - fit to total genome size
        const pangenomeFitData = resultsData.map(item => [
            item.Number_of_BGCs_Analyzed,
            item.Total_Genome_Size
        ]);
        
        // Apply curve fitting to pangenome data
        const pangenomeFit = fitHeapsLaw(pangenomeFitData);
        
        // Return results for the chart including fit data
        return {
            gamma: pangenomeFit.noFit ? 0 : pangenomeFit.gamma,
            k: pangenomeFit.noFit ? 0 : pangenomeFit.K,
            rSquared: pangenomeFit.noFit ? 0 : pangenomeFit.rSquared,
            method: pangenomeFit.noFit ? 'none' : pangenomeFit.method,
            fittedCurve: pangenomeFit.noFit ? [] : pangenomeFit.fittedCurve,
            totalGenes: totalGenes,
            coreGenes: coreGenes,
            accessoryGenes: accessoryGenes,
            uniqueGenes: uniqueGenes,
            corePercent: corePercent,
            accessoryPercent: accPercent,
            uniquePercent: uniquePercent,
            resultsData: resultsData,
            threshold: threshold,
            thresholdPercentage: (threshold * 100).toFixed(0),
            thresholdCount: finalThresholdCount
        };
    } catch (error) {
        console.error("Error running simulation:", error);
        return null;
    }
}

// Function to create and update the gene accumulation chart
function createAccumulationChart(results) {
    try {
        // Get container
        const container = document.getElementById('strain-v-gene-barchart-container');
        
        // Check if container exists to prevent errors
        if (!container) {
            console.error('strain-v-gene-barchart-container not found');
            return;
        }
        
        // Clean up any existing chart before creating a new one
        if (accumulationChartInstance) {
            try {
                // Remove listeners before disposal
                accumulationChartInstance.off('dataZoom');
                accumulationChartInstance.dispose();
            } catch (e) {
                console.error('Error disposing chart:', e);
            }
            accumulationChartInstance = null;
        }
        
        // Remove any existing resize handler
        if (resizeHandler) {
            window.removeEventListener('resize', resizeHandler);
        }
        
        // Create new chart instance
        accumulationChartInstance = echarts.init(container);
        
        const thresholdPercent = (results.threshold * 100).toFixed(0);
        const displayGamma = results.gamma.toFixed(3);
        
        const option = {
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    const xValue = params[0].value[0];
                    let tooltipText = `BGCs analyzed: ${xValue}<br>`;
                    
                    // Filter and reorder parameters to show only requested info
                    const filteredParams = [];
                    
                    // Find All Genes (Pangenome)
                    const allGenesParam = params.find(p => p.seriesName === 'PanBGC size');
                    if (allGenesParam) {
                        filteredParams.push({
                            name: 'All Genes',
                            value: allGenesParam.value[1].toFixed(1)
                        });
                    }
                    
                    // Find Core Genes
                    const coreGenesParam = params.find(p => p.seriesName.includes('Core Genes'));
                    if (coreGenesParam) {
                        filteredParams.push({
                            name: 'Core Genes',
                            value: coreGenesParam.value[1].toFixed(1)
                        });
                    }
                    
                    // Get Accessory Genes (from results data directly)
                    const dataIndex = Math.floor(xValue) - 1;
                    if (dataIndex >= 0 && dataIndex < results.resultsData.length) {
                        filteredParams.push({
                            name: 'Accessory Genes',
                            value: results.resultsData[dataIndex].Accessory_Genome_Size.toFixed(1)
                        });
                    }
                    
                    // Get Unique Genes (from results data directly)
                    if (dataIndex >= 0 && dataIndex < results.resultsData.length) {
                        filteredParams.push({
                            name: 'Unique Genes',
                            value: results.resultsData[dataIndex].Unique_Genome_Size.toFixed(1)
                        });
                    }
                    
                    // Find Fitted Value if available
                    const fittedParam = params.find(p => p.seriesName === "Heaps' Law fit");
                    if (fittedParam) {
                        filteredParams.push({
                            name: 'Fitted Value',
                            value: fittedParam.value[1].toFixed(1)
                        });
                    }
                    
                    // Add all filtered parameters to tooltip
                    filteredParams.forEach(param => {
                        tooltipText += `${param.name}: ${param.value}<br>`;
                    });
                    
                    return tooltipText;
                }
            },
            legend: {
                data: [
                    "PanBGC size", 
                    "Accessory Genes", 
                    `Core Genes (≥${thresholdPercent}%)`,
                    "Heaps' Law fit"
                ],
                top: 10,
                left: 10, // Position legend on the left instead of right
                right: 'auto', // Reset right positioning
                orient: 'horizontal', // Keep horizontal orientation
                itemStyle: {
                    opacity: 0 // Hide the legend symbols
                }
            },
            grid: {
                left: '6%',      // Reduced from 9% to 6%
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
              max: results.resultsData.length,
              splitLine: { show: false } // Disable vertical grid lines
          },
          yAxis: {
              type: 'value',
              name: 'Number of Genes',
              nameLocation: 'middle',
              nameRotate: 90,
              nameGap: 40,
              splitLine: { show: false } // Disable horizontal grid lines
          },
            series: [
                // Core Genes - solid area
                {
                    name: `Core Genes (≥${thresholdPercent}%)`,
                    type: 'line',
                    areaStyle: {
                        color: '#2ca02c',
                        opacity: 0.9
                    },
                    lineStyle: {
                        width: 2.5,
                        color: '#2ca02c'
                    },
                    symbol: 'none',
                    emphasis: {
                        focus: 'series'
                    },
                    data: results.resultsData.map(item => [
                        item.Number_of_BGCs_Analyzed,
                        item.Core_Genome_Size
                    ])
                },
                // Core + Accessory - solid area
                {
                    name: 'Accessory Genes',
                    type: 'line',
                    areaStyle: {
                        color: '#ff7f0e',
                        opacity: 0.5
                    },
                    lineStyle: {
                        width: 2.5,
                        color: '#ff7f0e'
                    },
                    symbol: 'none',
                    emphasis: {
                        focus: 'series'
                    },
                    data: results.resultsData.map(item => [
                        item.Number_of_BGCs_Analyzed,
                        item.Core_Genome_Size + item.Accessory_Genome_Size
                    ])
                },
                // All Genes (Total) - solid area
                {
                    name: 'PanBGC size',
                    type: 'line',
                    areaStyle: {
                        color: '#1f77b4',
                        opacity: 0.2
                    },
                    lineStyle: {
                        width: 2.5,
                        color: '#1f77b4'
                    },
                    symbol: 'none',
                    emphasis: {
                        focus: 'series'
                    },
                    data: results.resultsData.map(item => [
                        item.Number_of_BGCs_Analyzed,
                        item.Total_Genome_Size
                    ])
                },
                // Fitted Curve for Pangenome - dashed line
                ...(results.fittedCurve && results.fittedCurve.length > 0 ? [{
                    name: "Heaps' Law fit",
                    type: 'line',
                    lineStyle: {
                        width: 2.5,
                        color: 'red',
                        type: 'dashed'
                    },
                    symbol: 'none',
                    emphasis: {
                        focus: 'series'
                    },
                    data: results.fittedCurve
                }] : [])
            ]
        };
        
        // Apply options to the chart
        accumulationChartInstance.setOption(option);
        
        // Add an overlay to display summary statistics
        addSummaryOverlay(container, results);
        
        // Add datazoom event listener with safety checks
        accumulationChartInstance.on('dataZoom', function(params) {
            if (accumulationChartInstance) {
                gvs_onDataZoom(params, accumulationChartInstance);
            }
        });
        
        // Create new resize handler with safety checks
        resizeHandler = function() {
            if (accumulationChartInstance && !accumulationChartInstance.isDisposed()) {
                try {
                    accumulationChartInstance.resize();
                } catch (e) {
                    console.error('Error resizing chart:', e);
                }
            }
        };
        
        // Add resize listener
        window.addEventListener('resize', resizeHandler);
        
    } catch (error) {
        console.error('Error creating accumulation chart:', error);
    }
}

// Function to add a summary overlay to the chart
function addSummaryOverlay(container, results) {
    // Remove any existing overlay
    const existingOverlay = document.getElementById('acc-curve-stats-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    // Create overlay div
    const overlay = document.createElement('div');
    overlay.id = 'acc-curve-stats-overlay';
    overlay.style.position = 'absolute';
    overlay.style.top = '-25px'; // Changed from 10px to 3px (moved to almost the very top)
    overlay.style.right = '20px';
    overlay.style.left = 'auto';
    overlay.style.background = 'rgba(255, 255, 255, 0.8)';
    overlay.style.padding = '8px';
    overlay.style.borderRadius = '4px';
    overlay.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    overlay.style.fontSize = '12px';
    overlay.style.zIndex = '100';
    
    // Format the gamma value and other statistics
    const displayGamma = results.gamma.toFixed(3);
    const displayRSquared = results.rSquared ? results.rSquared.toFixed(3) : '0.000';
    const displayMethod = results.method || 'none';
    
    // R-squared color based on fit quality
    const rSquaredColor = 
        results.rSquared >= 0.9 ? 'green' : 
        results.rSquared >= 0.8 ? 'orange' : 
        'red';
    
    // Add content - only showing Heaps Law related information now
    overlay.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 4px;">Heaps' Law Parameters</div>
        <div>Pangenome Openness (γ): ${displayGamma}</div>
        <div style="color: ${rSquaredColor}">R²: ${displayRSquared}</div>
        <div>Fitting Method: ${displayMethod}</div>
    `;
    
    // Add to container
    container.style.position = 'relative';
    container.appendChild(overlay);
}

// Main function to draw the gene count vs. BGC chart
function draw_geneid_straincount_chart() {
    // Get container
    const container = document.getElementById('strain-v-gene-barchart-container');
    if (!container) {
        console.error("Container 'strain-v-gene-barchart-container' not found");
        return;
    }
    
    // Show loading message
    container.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:300px;">Loading gene distribution data...</div>';
    
    // Get the data path
    let dataPath = HEAPS_LAW_DATA;
    
    // If not available, check if GENECLUSTER_LOCATION is available and construct the path
    if (!dataPath) {
        if (GENECLUSTER_LOCATION) {
            // Extract directory from GENECLUSTER_LOCATION
            const lastSlashIndex = GENECLUSTER_LOCATION.lastIndexOf('/');
            if (lastSlashIndex !== -1) {
                const directory = GENECLUSTER_LOCATION.substring(0, lastSlashIndex);
                dataPath = `${directory}/heaps_law.json`;
                console.log("Constructed Heaps Law data path:", dataPath);
            } else {
                container.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:300px;">Error: Could not determine path to Heaps Law data</div>';
                return;
            }
        } else {
            container.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:300px;">Error: No path to Heaps Law data available</div>';
            return;
        }
    }
    
    // Get the initial slider value
    const cutoffSlider = document.getElementById('core-v-acc-piechart-cutoff-slider');
    const cutoffTextField = document.getElementById('core-v-acc-piechart-cutoff-text-field');
    let initialCutoff = 1.0;
    
    if (cutoffSlider) {
        initialCutoff = parseFloat(cutoffSlider.value);
    }
    
    // Define the slider change function outside to have a named function reference
    function onSliderChanged(event) {
        try {
            // Safety check for slider existence
            if (!cutoffSlider) {
                console.error("Slider not found when changing value");
                return;
            }
            
            const newThreshold = parseFloat(cutoffSlider.value);
            
            // Update text field if it exists
            if (cutoffTextField) {
                cutoffTextField.textContent = newThreshold.toFixed(2);
            }
            
            // Run the simulation with the new threshold
            if (heapsLawData) {
                const results = runSimulationWithThreshold(newThreshold);
                if (results) {
                    simulationResults = results;
                    createAccumulationChart(results);
                }
            }
        } catch (error) {
            console.error("Error in slider handler:", error);
        }
    }
    
    // Fetch the Heaps Law data, then run the simulation and create the chart
    fetchHeapsLawData(dataPath)
        .then(data => {
            heapsLawData = data;
            console.log("Loaded Heaps Law data with gamma:", heapsLawData.gamma);
            
            // Run the simulation with the initial threshold
            return runSimulationWithThreshold(initialCutoff);
        })
        .then(results => {
            if (results) {
                simulationResults = results;
                createAccumulationChart(results);
                
                // Connect to the existing slider
                if (cutoffSlider) {
                    // Properly remove old event listeners
                    const oldInputListener = cutoffSlider._inputHandler;
                    const oldChangeListener = cutoffSlider._changeHandler;
                    
                    if (oldInputListener) {
                        cutoffSlider.removeEventListener('input', oldInputListener);
                    }
                    
                    if (oldChangeListener) {
                        cutoffSlider.removeEventListener('change', oldChangeListener);
                    }
                    
                    // Store references to the listeners for later cleanup
                    cutoffSlider._inputHandler = onSliderChanged;
                    cutoffSlider._changeHandler = onSliderChanged;
                    
                    // Add new listeners
                    cutoffSlider.addEventListener('input', onSliderChanged);
                    cutoffSlider.addEventListener('change', onSliderChanged);
                }
            } else {
                container.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:300px;">Error: Could not process Heaps Law data</div>';
            }
        })
        .catch(error => {
            console.error("Error loading Heaps Law data:", error);
            container.innerHTML = `<div style="display:flex;justify-content:center;align-items:center;height:300px;">Error: ${error.message}</div>`;
        });
    
    // Collapse window function
    var toggleButton_geneid = document.getElementById('genecount_hide_btn'); 

    if (!toggleButton_geneid._clickListenerAttached) { 
        toggleButton_geneid.addEventListener('click', toggle_geneid_straincount_hide); 
        toggleButton_geneid._clickListenerAttached = true; 
    }
    
    function toggle_geneid_straincount_hide() { 
        var window_geneid_strain = document.getElementById('strain-v-gene-barchart-container'); 

        if (window_geneid_strain.style.display === 'none') { 
            window_geneid_strain.style.display = 'block'; 
            toggleButton_geneid.textContent = '-'; 
        } else { 
            window_geneid_strain.style.display = 'none'; 
            toggleButton_geneid.textContent = '+'; 
        }
    }
}

// Function to export all BGC gene accumulation data
async function exportAllGeneAccumulationData() {
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
      
      // Process folders one at a time
      for (let i = 0; i < folderPaths.length; i++) {
        const folderPath = folderPaths[i];
        
        try {
          statusText.textContent = `Processing: ${folderPath}`;
          
          // Fetch the Heaps Law data for this folder
          const heapsLawPath = `${folderPath}/heaps_law.json`;
          const response = await fetch(heapsLawPath);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch heaps_law.json (${response.status})`);
          }
          
          const heapsLawData = await response.json();
          
          // Extract the family name from the path
          const familyName = folderPath.split('/').pop();
          
          // Run our own analysis to get the pangenome curve data
          const threshold = 0.95;
          const analysisResults = await calculatePangenomeCurve(heapsLawData, threshold);
          
          // Format the result
          const result = {
            folder: folderPath,
            family_name: familyName,
            gamma: analysisResults.gamma,
            k: analysisResults.k,
            r_squared: analysisResults.rSquared,
            method: analysisResults.method,
            bgcCount: heapsLawData.bgcCount || null,
            geneCount: heapsLawData.geneCount || null
          };
          
          // Add gene classification if available
          if (analysisResults.geneClassification) {
            result.gene_classification = analysisResults.geneClassification;
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
        
        // Small delay to allow UI updates
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Create and download the JSON file
      progressText.textContent = 'Creating export file...';
      statusText.textContent = 'Preparing download...';
      
      const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bgc_gene_accumulation_results.json';
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
  
  // Independent function to calculate pangenome curve and gamma values
  async function calculatePangenomeCurve(heapsLawData, threshold) {
    try {
      // Return error if no simulation data
      if (!heapsLawData.simulationData) {
        return {
          gamma: null,
          k: null,
          rSquared: null,
          method: null,
          geneClassification: null
        };
      }
      
      const simData = heapsLawData.simulationData;
      const geneToBgcs = simData.geneToBgcs;
      const bgcToGenes = simData.bgcToGenes;
      const permutations = simData.permutations;
      const bgcCount = heapsLawData.bgcCount;
      
      // Run simulations
      const numSimulations = permutations.length;
      const coreCurves = [];
      const accCurves = [];
      const uniqueCurves = [];
      
      // Run each simulation using the pre-calculated permutations
      for (let sim = 0; sim < numSimulations; sim++) {
        const shuffledBgcList = permutations[sim];
        
        // Initialize arrays to store curve data
        const yCore = Array(shuffledBgcList.length).fill(0);
        const yAcc = Array(shuffledBgcList.length).fill(0);
        const yUnique = Array(shuffledBgcList.length).fill(0);
        
        // Keep track of genes and BGCs seen at each step
        const genesByStep = [];
        const bgcsByStep = [];
        
        let currentGenes = new Set();
        let currentBgcs = new Set();
        
        // First, determine which genes are present at each step
        for (let i = 0; i < shuffledBgcList.length; i++) {
          const bgc = shuffledBgcList[i];
          
          // Add this BGC to our set
          currentBgcs.add(bgc);
          bgcsByStep.push(new Set([...currentBgcs]));
          
          // Add genes from this BGC
          if (bgcToGenes[bgc]) {
            bgcToGenes[bgc].forEach(gene => currentGenes.add(gene));
          }
          
          genesByStep.push(new Set([...currentGenes]));
        }
        
        // For each step, categorize genes based on occurrence in BGCs up to that step
        for (let i = 0; i < shuffledBgcList.length; i++) {
          const currentBgcs = bgcsByStep[i];
          const currentGenes = genesByStep[i];
          
          // Current threshold count for this step
          const stepThresholdCount = Math.ceil(currentBgcs.size * threshold);
          
          // Count each gene's occurrence in the current set of BGCs
          const geneOccurrences = {};
          currentGenes.forEach(gene => {
            if (geneToBgcs[gene]) {
              // Get the BGCs this gene is in
              const geneBgcs = geneToBgcs[gene].filter(bgc => currentBgcs.has(bgc));
              geneOccurrences[gene] = geneBgcs.length;
            }
          });
          
          // Categorize based on occurrence count and threshold
          let coreAtStep = 0;
          let uniqueAtStep = 0;
          let accAtStep = 0;
          
          Object.entries(geneOccurrences).forEach(([gene, count]) => {
            if (count >= stepThresholdCount) {  // Core
              coreAtStep++;
            } else if (count === 1) {  // Unique
              uniqueAtStep++;
            } else {  // Accessory
              accAtStep++;
            }
          });
          
          // Store counts for this step
          yCore[i] = coreAtStep;
          yAcc[i] = accAtStep;
          yUnique[i] = uniqueAtStep;
        }
        
        // Store the curves
        coreCurves.push(yCore);
        accCurves.push(yAcc);
        uniqueCurves.push(yUnique);
      }
      
      // Calculate average curves
      const avgCore = [];
      const avgAcc = [];
      const avgUnique = [];
      
      for (let i = 0; i < coreCurves[0].length; i++) {
        let coreSum = 0;
        let accSum = 0;
        let uniqueSum = 0;
        
        for (let j = 0; j < coreCurves.length; j++) {
          coreSum += coreCurves[j][i];
          accSum += accCurves[j][i];
          uniqueSum += uniqueCurves[j][i];
        }
        
        avgCore.push(coreSum / coreCurves.length);
        avgAcc.push(accSum / coreCurves.length);
        avgUnique.push(uniqueSum / coreCurves.length);
      }
      
      // Create the results array for the chart
      const xValues = Array.from({ length: avgCore.length }, (_, i) => i + 1);
      
      const resultsData = xValues.map((x, i) => ({
        Number_of_BGCs_Analyzed: x,
        Core_Genome_Size: avgCore[i],
        Accessory_Genome_Size: avgAcc[i],
        Unique_Genome_Size: avgUnique[i],
        Total_Genome_Size: avgCore[i] + avgAcc[i] + avgUnique[i],
        Core_Plus_Acc: avgCore[i] + avgAcc[i]
      }));
      
      // Calculate final gene counts for the summary statistics
      const finalThresholdCount = Math.ceil(bgcCount * threshold);
      
      let coreGenes = 0;
      let accessoryGenes = 0;
      let uniqueGenes = 0;
      
      // Count genes in each category based on final BGC counts
      Object.entries(geneToBgcs).forEach(([gene, bgcs]) => {
        const count = bgcs.length;
        if (count >= finalThresholdCount) {
          coreGenes++;
        } else if (count === 1) {
          uniqueGenes++;
        } else {
          accessoryGenes++;
        }
      });
      
      // Calculate total genes and percentages for statistics
      const totalGenes = coreGenes + accessoryGenes + uniqueGenes;
      const corePercent = totalGenes > 0 ? (coreGenes / totalGenes * 100) : 0;
      const accPercent = totalGenes > 0 ? (accessoryGenes / totalGenes * 100) : 0;
      const uniquePercent = totalGenes > 0 ? (uniqueGenes / totalGenes * 100) : 0;
      
      // Prepare data for curve fitting - fit to total genome size
      const pangenomeFitData = resultsData.map(item => [
        item.Number_of_BGCs_Analyzed,
        item.Total_Genome_Size
      ]);
      
      // Use the fitHeapsLaw function that's already in the script
      const pangenomeFit = fitHeapsLaw(pangenomeFitData);
      
      // Return results
      return {
        gamma: pangenomeFit.noFit ? null : pangenomeFit.gamma,
        k: pangenomeFit.noFit ? null : pangenomeFit.K,
        rSquared: pangenomeFit.noFit ? null : pangenomeFit.rSquared,
        method: pangenomeFit.noFit ? 'none' : pangenomeFit.method,
        geneClassification: {
          totalGenes: totalGenes,
          coreGenes: coreGenes,
          accessoryGenes: accessoryGenes,
          uniqueGenes: uniqueGenes,
          corePercent: corePercent,
          accessoryPercent: accPercent,
          uniquePercent: uniquePercent,
          threshold: threshold,
          thresholdPercentage: (threshold * 100).toFixed(0)
        }
      };
    } catch (error) {
      console.error("Error calculating pangenome curve:", error);
      return {
        gamma: null,
        k: null,
        rSquared: null,
        method: null,
        geneClassification: null
      };
    }
  }
  
  // Helper function to get folder paths
  async function getFolderList() {
    // Try various methods to get all folders
    
    // Method 1: Try to fetch a folder list JSON file
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
    
    // Method 2: Try to fetch a directory listing (fallback)
    try {
      const response = await fetch('/data/');
      const text = await response.text();
      
      // Simple parsing - this might need adjusting based on your server's directory listing format
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
    
    // Method 3: Get the current folder from window.location if available
    try {
      const currentPath = window.location.pathname;
      const pathMatch = currentPath.match(/\/data\/([^\/]+)/);
      
      if (pathMatch && pathMatch[1]) {
        console.log('Using only the current folder');
        return [`/data/${pathMatch[1]}`];
      }
    } catch (e) {
      console.warn('Could not determine current folder:', e);
    }
    
    // If all else fails, prompt the user for input
    const folderInput = prompt(
      'Please enter a comma-separated list of folder names in the /data directory:',
      'folder1,folder2,folder3'
    );
    
    if (folderInput) {
      const folders = folderInput.split(',')
        .map(f => f.trim())
        .filter(f => f.length > 0)
        .map(folder => `/data/${folder}`);
      
      console.log(`Using ${folders.length} user-provided folders`);
      return folders;
    }
    
    // If we still have no folders, return empty array
    return [];
  }
  
  // Create and add export button to the page
  function addExportButtonForGeneAccumulation() {
    // Check if button already exists
    if (document.getElementById('gene-accumulation-export-btn')) {
      return;
    }
    
    const button = document.createElement('button');
    button.id = 'gene-accumulation-export-btn';
    button.textContent = 'Export All BGC Gene Accumulation Data';
    button.style.position = 'fixed';
    button.style.bottom = '60px'; // Position above the previous export button
    button.style.right = '20px';
    button.style.padding = '10px 15px';
    button.style.backgroundColor = '#4169E1'; // Royal blue to distinguish from the other button
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';
    button.style.zIndex = '1000';
    button.style.fontFamily = 'Arial, sans-serif';
    button.style.fontSize = '14px';
    button.style.fontWeight = 'bold';
    button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    
    button.addEventListener('click', exportAllGeneAccumulationData);
    
    document.body.appendChild(button);
    
    console.log('BGC gene accumulation export functionality added');
  }
  
  // Initialize the export button
  if (document.readyState === 'complete') {
    addExportButtonForGeneAccumulation();
  } else {
    window.addEventListener('load', addExportButtonForGeneAccumulation);
  }
  
  // Immediately create the button (in case the page is already loaded)
  addExportButtonForGeneAccumulation();