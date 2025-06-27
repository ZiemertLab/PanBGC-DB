
let gvs_previousStart = 0;
let gvs_previousEnd = 100;
let accumulationChartInstance = null;
let simulationResults = null;
let heapsLawData = null;
let resizeHandler = null; 


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

        if (end - start < gvs_previousEnd - gvs_previousStart) { 
            cluster_handler.setWhichChartsToUpdate('ACD');
            cluster_handler.setClusterData(zoomed_in_cluster_data);
        } else { 
            cluster_handler.setWhichChartsToUpdate('ACD');
            cluster_handler.setClusterData(zoomed_in_cluster_data);
        }

        gvs_previousStart = start;
        gvs_previousEnd = end;
    } catch (error) {
        console.error('Error in data zoom handler:', error);
    }
}


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
        
        
        const numSimulations = permutations.length;
        const coreCurves = [];
        const accCurves = [];
        const uniqueCurves = [];
        
        
        for (let sim = 0; sim < numSimulations; sim++) {
            const shuffledBgcList = permutations[sim];
            
            
            const yCore = Array(shuffledBgcList.length).fill(0);
            const yAcc = Array(shuffledBgcList.length).fill(0);
            const yUnique = Array(shuffledBgcList.length).fill(0);
            
            
            const genesByStep = [];
            const bgcsByStep = [];
            
            let currentGenes = new Set();
            let currentBgcs = new Set();
            
            
            for (let i = 0; i < shuffledBgcList.length; i++) {
                const bgc = shuffledBgcList[i];
                
                
                currentBgcs.add(bgc);
                bgcsByStep.push(new Set([...currentBgcs]));
                
                
                if (bgcToGenes[bgc]) {
                    bgcToGenes[bgc].forEach(gene => currentGenes.add(gene));
                }
                
                genesByStep.push(new Set([...currentGenes]));
            }
            
            
            for (let i = 0; i < shuffledBgcList.length; i++) {
                const currentBgcs = bgcsByStep[i];
                const currentGenes = genesByStep[i];
                
                
                const stepThresholdCount = Math.ceil(currentBgcs.size * threshold);
                
                
                const geneOccurrences = {};
                currentGenes.forEach(gene => {
                    if (geneToBgcs[gene]) {
                        
                        const geneBgcs = geneToBgcs[gene].filter(bgc => currentBgcs.has(bgc));
                        geneOccurrences[gene] = geneBgcs.length;
                    }
                });
                
                
                let coreAtStep = 0;
                let uniqueAtStep = 0;
                let accAtStep = 0;
                
                Object.entries(geneOccurrences).forEach(([gene, count]) => {
                    if (count >= stepThresholdCount) {  
                        coreAtStep++;
                    } else if (count === 1) {  
                        uniqueAtStep++;
                    } else {  
                        accAtStep++;
                    }
                });
                
                
                yCore[i] = coreAtStep;
                yAcc[i] = accAtStep;
                yUnique[i] = uniqueAtStep;
            }
            
            
            coreCurves.push(yCore);
            accCurves.push(yAcc);
            uniqueCurves.push(yUnique);
        }
        
        
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
        
        
        const xValues = Array.from({ length: avgCore.length }, (_, i) => i + 1);
        
        const resultsData = xValues.map((x, i) => ({
            Number_of_BGCs_Analyzed: x,
            Core_Genome_Size: avgCore[i],
            Accessory_Genome_Size: avgAcc[i],
            Unique_Genome_Size: avgUnique[i],
            Total_Genome_Size: avgCore[i] + avgAcc[i] + avgUnique[i],
            Core_Plus_Acc: avgCore[i] + avgAcc[i]
        }));
        
        
        const finalThresholdCount = Math.ceil(bgcCount * threshold);
        
        let coreGenes = 0;
        let accessoryGenes = 0;
        let uniqueGenes = 0;
        
        
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
        
        
        const totalGenes = coreGenes + accessoryGenes + uniqueGenes;
        const corePercent = totalGenes > 0 ? (coreGenes / totalGenes * 100) : 0;
        const accPercent = totalGenes > 0 ? (accessoryGenes / totalGenes * 100) : 0;
        const uniquePercent = totalGenes > 0 ? (uniqueGenes / totalGenes * 100) : 0;
        
        
        const pangenomeFitData = resultsData.map(item => [
            item.Number_of_BGCs_Analyzed,
            item.Total_Genome_Size
        ]);
        
        
        const pangenomeFit = fitHeapsLaw(pangenomeFitData);
        
        
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


function createAccumulationChart(results) {
    try {
        
        const container = document.getElementById('strain-v-gene-barchart-container');
        
        
        if (!container) {
            console.error('strain-v-gene-barchart-container not found');
            return;
        }
        
        
        if (accumulationChartInstance) {
            try {
                
                accumulationChartInstance.off('dataZoom');
                accumulationChartInstance.dispose();
            } catch (e) {
                console.error('Error disposing chart:', e);
            }
            accumulationChartInstance = null;
        }
        
        
        if (resizeHandler) {
            window.removeEventListener('resize', resizeHandler);
        }
        
        
        accumulationChartInstance = echarts.init(container);
        
        const thresholdPercent = (results.threshold * 100).toFixed(0);
        const displayGamma = results.gamma.toFixed(3);
        
        const option = {
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    const xValue = params[0].value[0];
                    let tooltipText = `BGCs analyzed: ${xValue}<br>`;
                    
                    
                    const filteredParams = [];
                    
                    
                    const allGenesParam = params.find(p => p.seriesName === 'PanBGC size');
                    if (allGenesParam) {
                        filteredParams.push({
                            name: 'All Genes',
                            value: allGenesParam.value[1].toFixed(1)
                        });
                    }
                    
                    
                    const coreGenesParam = params.find(p => p.seriesName.includes('Core Genes'));
                    if (coreGenesParam) {
                        filteredParams.push({
                            name: 'Core Genes',
                            value: coreGenesParam.value[1].toFixed(1)
                        });
                    }
                    
                    
                    const dataIndex = Math.floor(xValue) - 1;
                    if (dataIndex >= 0 && dataIndex < results.resultsData.length) {
                        filteredParams.push({
                            name: 'Accessory Genes',
                            value: results.resultsData[dataIndex].Accessory_Genome_Size.toFixed(1)
                        });
                    }
                    
                    
                    if (dataIndex >= 0 && dataIndex < results.resultsData.length) {
                        filteredParams.push({
                            name: 'Unique Genes',
                            value: results.resultsData[dataIndex].Unique_Genome_Size.toFixed(1)
                        });
                    }
                    
                    
                    const fittedParam = params.find(p => p.seriesName === "Heaps' Law fit");
                    if (fittedParam) {
                        filteredParams.push({
                            name: 'Fitted Value',
                            value: fittedParam.value[1].toFixed(1)
                        });
                    }
                    
                    
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
              max: results.resultsData.length,
              splitLine: { show: false } 
          },
          yAxis: {
              type: 'value',
              name: 'Number of Genes',
              nameLocation: 'middle',
              nameRotate: 90,
              nameGap: 40,
              splitLine: { show: false } 
          },
            series: [
                
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
        
        
        accumulationChartInstance.setOption(option);
        
        
        addSummaryOverlay(container, results);
        
        
        accumulationChartInstance.on('dataZoom', function(params) {
            if (accumulationChartInstance) {
                gvs_onDataZoom(params, accumulationChartInstance);
            }
        });
        
        
        resizeHandler = function() {
            if (accumulationChartInstance && !accumulationChartInstance.isDisposed()) {
                try {
                    accumulationChartInstance.resize();
                } catch (e) {
                    console.error('Error resizing chart:', e);
                }
            }
        };
        
        
        window.addEventListener('resize', resizeHandler);
        
    } catch (error) {
        console.error('Error creating accumulation chart:', error);
    }
}


function addSummaryOverlay(container, results) {
    
    const existingOverlay = document.getElementById('acc-curve-stats-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    
    const overlay = document.createElement('div');
    overlay.id = 'acc-curve-stats-overlay';
    overlay.style.position = 'absolute';
    overlay.style.top = '-25px'; 
    overlay.style.right = '20px';
    overlay.style.left = 'auto';
    overlay.style.background = 'rgba(255, 255, 255, 0.8)';
    overlay.style.padding = '8px';
    overlay.style.borderRadius = '4px';
    overlay.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    overlay.style.fontSize = '12px';
    overlay.style.zIndex = '100';
    
    
    const displayGamma = results.gamma.toFixed(3);
    const displayRSquared = results.rSquared ? results.rSquared.toFixed(3) : '0.000';
    const displayMethod = results.method || 'none';
    
    
    const rSquaredColor = 
        results.rSquared >= 0.9 ? 'green' : 
        results.rSquared >= 0.8 ? 'orange' : 
        'red';
    
    
    overlay.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 4px;">Heaps' Law Parameters</div>
        <div>Pangenome Openness (γ): ${displayGamma}</div>
        <div style="color: ${rSquaredColor}">R²: ${displayRSquared}</div>
        <div>Fitting Method: ${displayMethod}</div>
    `;
    
    
    container.style.position = 'relative';
    container.appendChild(overlay);
}


function draw_geneid_straincount_chart() {
    
    const container = document.getElementById('strain-v-gene-barchart-container');
    if (!container) {
        console.error("Container 'strain-v-gene-barchart-container' not found");
        return;
    }
    
    
    container.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:300px;">Loading gene distribution data...</div>';
    
    
    let dataPath = HEAPS_LAW_DATA;
    
    
    if (!dataPath) {
        if (GENECLUSTER_LOCATION) {
            
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
    
    
    const cutoffSlider = document.getElementById('core-v-acc-piechart-cutoff-slider');
    const cutoffTextField = document.getElementById('core-v-acc-piechart-cutoff-text-field');
    let initialCutoff = 1.0;
    
    if (cutoffSlider) {
        initialCutoff = parseFloat(cutoffSlider.value);
    }
    
    
    function onSliderChanged(event) {
        try {
            
            if (!cutoffSlider) {
                console.error("Slider not found when changing value");
                return;
            }
            
            const newThreshold = parseFloat(cutoffSlider.value);
            
            
            if (cutoffTextField) {
                cutoffTextField.textContent = newThreshold.toFixed(2);
            }
            
            
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
    
    
    fetchHeapsLawData(dataPath)
        .then(data => {
            heapsLawData = data;
            console.log("Loaded Heaps Law data with gamma:", heapsLawData.gamma);
            
            
            return runSimulationWithThreshold(initialCutoff);
        })
        .then(results => {
            if (results) {
                simulationResults = results;
                createAccumulationChart(results);
                
                
                if (cutoffSlider) {
                    
                    const oldInputListener = cutoffSlider._inputHandler;
                    const oldChangeListener = cutoffSlider._changeHandler;
                    
                    if (oldInputListener) {
                        cutoffSlider.removeEventListener('input', oldInputListener);
                    }
                    
                    if (oldChangeListener) {
                        cutoffSlider.removeEventListener('change', oldChangeListener);
                    }
                    
                    
                    cutoffSlider._inputHandler = onSliderChanged;
                    cutoffSlider._changeHandler = onSliderChanged;
                    
                    
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


async function exportAllGeneAccumulationData() {
    
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
      
      
      for (let i = 0; i < folderPaths.length; i++) {
        const folderPath = folderPaths[i];
        
        try {
          statusText.textContent = `Processing: ${folderPath}`;
          
          
          const heapsLawPath = `${folderPath}/heaps_law.json`;
          const response = await fetch(heapsLawPath);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch heaps_law.json (${response.status})`);
          }
          
          const heapsLawData = await response.json();
          
          
          const familyName = folderPath.split('/').pop();
          
          
          const threshold = 0.95;
          const analysisResults = await calculatePangenomeCurve(heapsLawData, threshold);
          
          
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
          
          
          if (analysisResults.geneClassification) {
            result.gene_classification = analysisResults.geneClassification;
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
        
        
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      
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
  
  
  async function calculatePangenomeCurve(heapsLawData, threshold) {
    try {
      
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
      
      
      const numSimulations = permutations.length;
      const coreCurves = [];
      const accCurves = [];
      const uniqueCurves = [];
      
      
      for (let sim = 0; sim < numSimulations; sim++) {
        const shuffledBgcList = permutations[sim];
        
        
        const yCore = Array(shuffledBgcList.length).fill(0);
        const yAcc = Array(shuffledBgcList.length).fill(0);
        const yUnique = Array(shuffledBgcList.length).fill(0);
        
        
        const genesByStep = [];
        const bgcsByStep = [];
        
        let currentGenes = new Set();
        let currentBgcs = new Set();
        
        
        for (let i = 0; i < shuffledBgcList.length; i++) {
          const bgc = shuffledBgcList[i];
          
          
          currentBgcs.add(bgc);
          bgcsByStep.push(new Set([...currentBgcs]));
          
          
          if (bgcToGenes[bgc]) {
            bgcToGenes[bgc].forEach(gene => currentGenes.add(gene));
          }
          
          genesByStep.push(new Set([...currentGenes]));
        }
        
        
        for (let i = 0; i < shuffledBgcList.length; i++) {
          const currentBgcs = bgcsByStep[i];
          const currentGenes = genesByStep[i];
          
          
          const stepThresholdCount = Math.ceil(currentBgcs.size * threshold);
          
          
          const geneOccurrences = {};
          currentGenes.forEach(gene => {
            if (geneToBgcs[gene]) {
              
              const geneBgcs = geneToBgcs[gene].filter(bgc => currentBgcs.has(bgc));
              geneOccurrences[gene] = geneBgcs.length;
            }
          });
          
          
          let coreAtStep = 0;
          let uniqueAtStep = 0;
          let accAtStep = 0;
          
          Object.entries(geneOccurrences).forEach(([gene, count]) => {
            if (count >= stepThresholdCount) {  
              coreAtStep++;
            } else if (count === 1) {  
              uniqueAtStep++;
            } else {  
              accAtStep++;
            }
          });
          
          
          yCore[i] = coreAtStep;
          yAcc[i] = accAtStep;
          yUnique[i] = uniqueAtStep;
        }
        
        
        coreCurves.push(yCore);
        accCurves.push(yAcc);
        uniqueCurves.push(yUnique);
      }
      
      
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
      
      
      const xValues = Array.from({ length: avgCore.length }, (_, i) => i + 1);
      
      const resultsData = xValues.map((x, i) => ({
        Number_of_BGCs_Analyzed: x,
        Core_Genome_Size: avgCore[i],
        Accessory_Genome_Size: avgAcc[i],
        Unique_Genome_Size: avgUnique[i],
        Total_Genome_Size: avgCore[i] + avgAcc[i] + avgUnique[i],
        Core_Plus_Acc: avgCore[i] + avgAcc[i]
      }));
      
      
      const finalThresholdCount = Math.ceil(bgcCount * threshold);
      
      let coreGenes = 0;
      let accessoryGenes = 0;
      let uniqueGenes = 0;
      
      
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
      
      
      const totalGenes = coreGenes + accessoryGenes + uniqueGenes;
      const corePercent = totalGenes > 0 ? (coreGenes / totalGenes * 100) : 0;
      const accPercent = totalGenes > 0 ? (accessoryGenes / totalGenes * 100) : 0;
      const uniquePercent = totalGenes > 0 ? (uniqueGenes / totalGenes * 100) : 0;
      
      
      const pangenomeFitData = resultsData.map(item => [
        item.Number_of_BGCs_Analyzed,
        item.Total_Genome_Size
      ]);
      
      
      const pangenomeFit = fitHeapsLaw(pangenomeFitData);
      
      
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
    
    
    return [];
  }
  
  
  function addExportButtonForGeneAccumulation() {
    
    if (document.getElementById('gene-accumulation-export-btn')) {
      return;
    }
    
    const button = document.createElement('button');
    button.id = 'gene-accumulation-export-btn';
    button.textContent = 'Export All BGC Gene Accumulation Data';
    button.style.position = 'fixed';
    button.style.bottom = '60px'; 
    button.style.right = '20px';
    button.style.padding = '10px 15px';
    button.style.backgroundColor = '#4169E1'; 
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
  
  
  if (document.readyState === 'complete') {
    addExportButtonForGeneAccumulation();
  } else {
    window.addEventListener('load', addExportButtonForGeneAccumulation);
  }
  
  
  addExportButtonForGeneAccumulation();