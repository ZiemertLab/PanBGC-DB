function draw_core_acc_chart() {
    const cutoffSlider = document.getElementById('core-v-acc-piechart-cutoff-slider');
    const cutoffTextField = document.getElementById('core-v-acc-piechart-cutoff-text-field');
    const piechartContainer = document.getElementById('core-v-acc-piechart-container');
    const controlContainer = document.getElementById('core-v-acc-piechart-control-container');

    const maxStrainCount = Math.max(...cluster_handler.getOriginalClusterData().map(item => item.total_BGCs));

    
    const speciesNameElement = document.getElementById('species-name');
    speciesNameElement.textContent = `${global_species_name} | BGCs: ${maxStrainCount}`;
    
    
    const existingLegend = document.getElementById('custom-pie-legend');
    if (existingLegend) {
        existingLegend.remove();
    }
    
    
    piechartContainer.style.height = '280px'; 
    piechartContainer.style.paddingTop = '40px'; 
    piechartContainer.style.marginBottom = '-10px';
    piechartContainer.style.overflow = 'visible';
    piechartContainer.style.position = 'relative';
    
    
    piechartContainer.style.top = '0';
    piechartContainer.style.left = '0';
    
    
    controlContainer.style.paddingTop = '0'; 
    
    
    if (cutoffSlider) {
        cutoffSlider.style.pointerEvents = 'auto';
        cutoffSlider.style.opacity = '1';
        cutoffSlider.style.zIndex = '10';
    }
    
    
    let geneCounts = {
        Core: 0,
        Accessory: 0,
        Unique: 0
    };
    
    const piechartOptions = {
        tooltip: {
            trigger: 'item',
            formatter: function(params) {
                return `${global_species_name}<br>${params.name}: ${Math.round(geneCounts[params.name])} (${params.percent}%)`;
            },
            backgroundColor: 'rgba(44, 62, 80, 0.85)',
            borderColor: '#1abc9c',
            borderWidth: 1,
            textStyle: {
                color: '#fff',
                fontSize: 13
            },
            padding: [8, 12]
        },
        color: ['#ff7f0e', '#2ca02c', '#1f77b4'],
        
        legend: {
            show: false
        },
        series: [{
            name: global_species_name,
            type: 'pie',
            radius: ['40%', '68%'], 
            center: ['50%', '40%'], 
            itemStyle: {
                borderRadius: 4,
                borderColor: '#fff',
                borderWidth: 2,
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.15)'
            },
            avoidLabelOverlap: true,
            label: {
                show: true,
                formatter: '{b}: {d}%',
                fontSize: 12,
                fontWeight: 'bold'
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 15,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.3)',
                    borderWidth: 3
                },
                label: {
                    fontWeight: 'bold',
                    fontSize: 14
                }
            },
            labelLine: {
                length: 15,
                length2: 10,
                smooth: true
            }
        }]
    };

    
    let piechart = echarts.init(piechartContainer);
    piechart.setOption(piechartOptions);

    
    const customLegend = document.createElement('div');
    customLegend.id = 'custom-pie-legend';
    customLegend.style.display = 'flex';
    customLegend.style.justifyContent = 'center';
    customLegend.style.alignItems = 'center';
    customLegend.style.paddingTop = '0px';
    customLegend.style.paddingBottom = '10px';
    customLegend.style.fontSize = '12px';
    customLegend.style.color = '#2c3e50';
    customLegend.style.gap = '15px';
    
    
    const legendItems = [
        {name: 'Accessory', color: '#ff7f0e'},
        {name: 'Core', color: '#2ca02c'},
        {name: 'Unique', color: '#1f77b4'}
    ];
    
    legendItems.forEach(item => {
        const legendItem = document.createElement('div');
        legendItem.style.display = 'inline-flex';
        legendItem.style.alignItems = 'center';
        legendItem.style.marginRight = '15px';
        
        const colorMarker = document.createElement('span');
        colorMarker.style.display = 'inline-block';
        colorMarker.style.width = '10px';
        colorMarker.style.height = '10px';
        colorMarker.style.borderRadius = '50%';
        colorMarker.style.backgroundColor = item.color;
        colorMarker.style.marginRight = '5px';
        
        const labelText = document.createElement('span');
        labelText.textContent = item.name;
        
        legendItem.appendChild(colorMarker);
        legendItem.appendChild(labelText);
        customLegend.appendChild(legendItem);
    });
    
    
    const sliderContainer = document.getElementById('core-v-acc-piechart-cutoff-slider-container');
    if (sliderContainer) {
        controlContainer.insertBefore(customLegend, sliderContainer);
    } else {
        piechartContainer.after(customLegend);
    }

    
    setTimeout(() => {
        piechart.resize();
    }, 100);

    const updateTextField = () => {
        cutoffTextField.textContent = parseFloat(cutoffSlider.value).toFixed(2);
    };

    const updateChartData = (corePercentage, accPercentage, uniquePercentage, coreCount, accCount, uniqueCount, totalCount) => {
        
        geneCounts.Core = coreCount;
        geneCounts.Accessory = accCount;
        geneCounts.Unique = uniqueCount;
        
        const data = [
            { value: accPercentage, name: 'Accessory' },
            { value: corePercentage, name: 'Core' },
            { value: uniquePercentage, name: 'Unique' }
        ];
        piechart.setOption({ series: [{ data }] });
        
        
        addStatsSummary({
            totalGenes: totalCount,
            coreGenes: coreCount,
            accessoryGenes: accCount,
            uniqueGenes: uniqueCount,
            corePercent: corePercentage,
            accessoryPercent: accPercentage,
            uniquePercent: uniquePercentage,
            thresholdPercentage: (parseFloat(cutoffSlider.value) * 100).toFixed(0)
        });
        
        
        setTimeout(() => {
            piechart.resize();
        }, 50);
    };

    const calculatePercentages = () => {
        const threshold = parseFloat(cutoffSlider.value);
        let accGenesData = [];
        let coreGenesData = [];
        let uniqueGenesData = [];
        let coreCount = 0;
        let accCount = 0;
        let uniqueCount = 0;

        cluster_handler.getOriginalClusterData().forEach(item => {
            
            if (item.BGC_count >= maxStrainCount * threshold) {
                coreGenesData.push(item);
                coreCount++;
            }
            
            else if (item.BGC_count === 1) {
                uniqueGenesData.push(item);
                uniqueCount++;
            }
            
            else {
                accGenesData.push(item);
                accCount++;
            }
        });

        const totalCount = coreCount + accCount + uniqueCount;
        
        
        cluster_handler.setAccGenome(accGenesData);
        cluster_handler.setCoreGenome(coreGenesData);
        
        
        if (!cluster_handler.getUniqueGenome) {
            cluster_handler.uniqueGenome = uniqueGenesData;
            cluster_handler.getUniqueGenome = function() {
                return this.uniqueGenome;
            };
            cluster_handler.setUniqueGenome = function(data) {
                this.uniqueGenome = data;
            };
        } else {
            cluster_handler.setUniqueGenome(uniqueGenesData);
        }

        
        const corePercentage = ((coreCount / totalCount) * 100).toFixed(1);
        const uniquePercentage = ((uniqueCount / totalCount) * 100).toFixed(1);
        const accPercentage = ((accCount / totalCount) * 100).toFixed(1);

        return { 
            corePercentage, 
            accPercentage, 
            uniquePercentage, 
            coreCount, 
            accCount, 
            uniqueCount, 
            totalCount 
        };
    };
    
    
    function addStatsSummary(stats) {
        
        const existingStatsDisplay = document.getElementById('pie-stats-display');
        if (existingStatsDisplay) {
            existingStatsDisplay.remove();
        }
        
        
        const statsDisplay = document.createElement('div');
        statsDisplay.id = 'pie-stats-display';
        statsDisplay.style.width = '100%';
        statsDisplay.style.marginTop = '10px';
        statsDisplay.style.padding = '12px 15px';
        statsDisplay.style.backgroundColor = '#f8f9fa';
        statsDisplay.style.borderRadius = '8px';
        statsDisplay.style.border = '1px solid #e0e5ec';
        statsDisplay.style.fontSize = '13px'; 
        statsDisplay.style.color = '#2c3e50';
        statsDisplay.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        statsDisplay.style.display = 'flex';
        statsDisplay.style.flexDirection = 'column'; 
        statsDisplay.style.justifyContent = 'flex-start';
        statsDisplay.style.zIndex = '5'; 
        
        
        const totalItem = document.createElement('div');
        totalItem.innerHTML = `<strong>PanBGC size:</strong> ${Math.round(stats.totalGenes)}`;
        totalItem.style.marginBottom = '8px';
        
        const coreItem = document.createElement('div');
        coreItem.innerHTML = `<strong>Core:</strong> ${Math.round(stats.coreGenes)} (${stats.corePercent}%)`;
        coreItem.style.marginBottom = '8px';
        
        const accItem = document.createElement('div');
        accItem.innerHTML = `<strong>Accessory:</strong> ${Math.round(stats.accessoryGenes)} (${stats.accessoryPercent}%)`;
        accItem.style.marginBottom = '8px';
        
        const uniqueItem = document.createElement('div');
        uniqueItem.innerHTML = `<strong>Unique:</strong> ${Math.round(stats.uniqueGenes)} (${stats.uniquePercent}%)`;
        uniqueItem.style.marginBottom = '8px';
        
        const thresholdItem = document.createElement('div');
        thresholdItem.innerHTML = `<strong>Core threshold:</strong> ≥${stats.thresholdPercentage}%`;
        thresholdItem.style.marginTop = '2px';
        thresholdItem.style.fontSize = '12px'; 
        thresholdItem.style.color = '#5a6268';
        
        
        statsDisplay.appendChild(totalItem);
        statsDisplay.appendChild(coreItem);
        statsDisplay.appendChild(accItem);
        statsDisplay.appendChild(uniqueItem);
        statsDisplay.appendChild(thresholdItem);
        
        
        const controlContainer = document.getElementById('core-v-acc-piechart-control-container');
        
        
        const cutoffContainer = document.getElementById('core-v-acc-piechart-cutoff-container');
        if (cutoffContainer) {
            
            const sliderContainer = document.getElementById('core-v-acc-piechart-cutoff-slider-container');
            if (sliderContainer) {
                
                if (sliderContainer.nextSibling !== cutoffContainer) {
                    if (sliderContainer.nextSibling) {
                        controlContainer.insertBefore(cutoffContainer, sliderContainer.nextSibling);
                    } else {
                        controlContainer.appendChild(cutoffContainer);
                    }
                }
            }
            
            
            if (cutoffContainer.nextSibling) {
                controlContainer.insertBefore(statsDisplay, cutoffContainer.nextSibling);
            } else {
                controlContainer.appendChild(statsDisplay);
            }
        } else {
            
            const sliderContainer = document.getElementById('core-v-acc-piechart-cutoff-slider-container');
            if (sliderContainer.nextSibling) {
                controlContainer.insertBefore(statsDisplay, sliderContainer.nextSibling);
            } else {
                controlContainer.appendChild(statsDisplay);
            }
        }
        
        
        if (window.geneStatsInfo === undefined) {
            window.geneStatsInfo = {};
        }
        window.geneStatsInfo = stats;
    }

    
    if (cutoffSlider && !cutoffSlider.value) {
        cutoffSlider.value = 0.95; 
    }

    
    cutoffSlider.removeEventListener('input', updateTextField);
    cutoffSlider.removeEventListener('change', null);
    
    
    cutoffSlider.addEventListener('input', updateTextField);

    
    cutoffSlider.addEventListener('change', function() {
        console.log("Slider changed to:", cutoffSlider.value); 
        const stats = calculatePercentages();
        updateChartData(
            stats.corePercentage, 
            stats.accPercentage, 
            stats.uniquePercentage,
            stats.coreCount,
            stats.accCount,
            stats.uniqueCount,
            stats.totalCount
        );
        
        
        cluster_handler.setWhichChartsToUpdate('D');
        cluster_handler.updateCharts();
        cluster_handler.setWhichChartsToUpdate('B');
        cluster_handler.updateCharts();
    });

    
    piechart.on('click', (params) => {
        if (params.seriesType === 'pie') {
            let data;
            
            if (params.name === 'Core') {
                data = cluster_handler.getCoreGenome();
            } else if (params.name === 'Unique') {
                data = cluster_handler.getUniqueGenome();
            } else {
                data = cluster_handler.getAccGenome();
            }
            
            cluster_handler.setWhichChartsToUpdate('ABCD');
            cluster_handler.setClusterData(data);
        }
    });

    
    const initialStats = calculatePercentages();
    updateChartData(
        initialStats.corePercentage, 
        initialStats.accPercentage, 
        initialStats.uniquePercentage,
        initialStats.coreCount,
        initialStats.accCount,
        initialStats.uniqueCount,
        initialStats.totalCount
    );
    updateTextField();
    
    
    const existingOverlay = document.getElementById('pie-stats-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    
    window.addEventListener('resize', function() {
        if (piechart && !piechart.isDisposed()) {
            try {
                piechart.resize();
            } catch (e) {
                console.error('Error resizing pie chart:', e);
            }
        }
    });

    
    const toggleButton_core = document.getElementById('core_acc_hide_btn'); 

    if (!toggleButton_core._clickListenerAttached) { 
        toggleButton_core.addEventListener('click', toggle_core_acc_hide); 
        toggleButton_core._clickListenerAttached = true; 
    }
    
    function toggle_core_acc_hide() { 
        const window_acc_core = document.getElementById('core-v-acc-piechart-control-container'); 

        if (window_acc_core.style.display === 'none') { 
            window_acc_core.style.display = 'block'; 
            toggleButton_core.textContent = '-'; 
        } else { 
            window_acc_core.style.display = 'none'; 
            toggleButton_core.textContent = '+'; 
        }
    }
}