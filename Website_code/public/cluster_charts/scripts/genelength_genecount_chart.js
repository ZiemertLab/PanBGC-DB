
function gvc_onDataZoom(params, gcount_v_rank_barchart) {
    const option = gcount_v_rank_barchart.getOption();

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

    let zoomed_in_cluster_data = cluster_handler.getOriginalClusterData().filter(item => highlightedXData.includes(item.OG_Median_Length_bp));


    if (end - start < gvc_previousEnd - gvc_previousStart) {
        cluster_handler.setWhichChartsToUpdate('ABD');
        cluster_handler.setClusterData(zoomed_in_cluster_data);

    } else { 
        cluster_handler.setWhichChartsToUpdate('ABD');
        cluster_handler.setClusterData(zoomed_in_cluster_data);
    }

    gvc_previousStart = start;
    gvc_previousEnd = end;
}


let gvc_previousStart = 0;
let gvc_previousEnd = 100;


function draw_genelength_genecount_chart() {

    const geneLenCountMap = {};

    cluster_handler.getClusterData().forEach(item => {
        geneLenCountMap[item.OG_Median_Length_bp] = (geneLenCountMap[item.OG_Median_Length_bp] || 0) + 1;
    });

    const calculated_geneLengths = Object.keys(geneLenCountMap).map(Number);   
    const calculated_geneCounts = Object.values(geneLenCountMap);              

    const gcount_v_rank_barchart = echarts.init(document.getElementById('gcount-v-rank-barchart-container'));

    
    const colored_data = calculated_geneCounts.map((value, index) => {
        if (calculated_geneLengths[index] === cluster_handler.getSelectedGeneData().geneLen) {
            return {
                value,
                itemStyle: {
                    color: 'red',
                    borderColor: 'red',
                    borderWidth: 3,
                    borderType: 'solid',
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.5)',
                    shadowOffsetX: 3,
                    shadowOffsetY: 3
                },
                barWidth: 30 
            };
        } else { 
            return {
                value,
                itemStyle: {
                    color: 'darkgreen'
                }
            };
        }
    });

    const gcount_v_rank_barchart_options = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            formatter: function (params) {
                let tooltipText = '<div style="padding:0px 0px;border-radius:5px;background:rgba(f,f,f,0.5);color:black;">';
                params.forEach(function (item) {
                    tooltipText += item.marker + 'Number of Genes ' + '<br/>' + item.seriesName + ' : ' + item.value + '<br/>' + 'at length : ' + params[0].name;
                });
                tooltipText += '</div>';
                return tooltipText;
            }
        },
        xAxis: {
            data: calculated_geneLengths,
            name: 'Genes in BGC',
            nameLocation: 'middle',
            nameGap: 20
        },
        yAxis: {
            name: 'BGC count',
            nameLocation: 'middle',
            nameRotate: 90,
            nameGap: 25
        },
        series: [{
            name: 'BGC count',
            type: 'bar',
            smooth: true,
            data: colored_data
        }],
        dataZoom: [{
            type: 'slider',
            realtime: false,
            start: 0,
            end: 100,
            xAxisIndex: 0,
            bottom: 5
        }]
    };

    gcount_v_rank_barchart.setOption(gcount_v_rank_barchart_options);

    
    if (!gcount_v_rank_barchart._dataZoomListenerAttached) {
        gcount_v_rank_barchart.on('dataZoom', function (params) {
            gvc_onDataZoom(params, gcount_v_rank_barchart);
        });
        gcount_v_rank_barchart._dataZoomListenerAttached = true;
    }



var toggleButtongenelength = document.getElementById('genelength_hide_btn'); 

if (!toggleButtongenelength._clickListenerAttached) 
{ 
	toggleButtongenelength.addEventListener('click', toggle_genelength); 	
	toggleButtongenelength._clickListenerAttached = true; 
}

function toggle_genelength()  { 
    var window_genelength = document.getElementById('gcount-v-rank-barchart-container'); 

    if (window_genelength.style.display === 'none') { 
        window_genelength.style.display = 'block'; 
        toggleButtongenelength.textContent = '-'; 
        } 
        else { 
            window_genelength.style.display = 'none'; 
            toggleButtongenelength.textContent = '+'; 
        }
    }
}
