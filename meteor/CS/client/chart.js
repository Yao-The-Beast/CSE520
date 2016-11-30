import { SensorData } from '../imports/Database/database.js';
var Highcharts = require('highcharts/highstock');

Template.chart.onRendered(function () {
    this.autorun(function () {
        if (Router.current().params.sensorName) {
            var cursor = "liveChart";
            var sensorName = Router.current().params.sensorName;
            var query = SensorData.find({'name':sensorName}, {sort:{'timestamp':-1}}); 
            var initializing = true;
            var flag = true;
            var liveChart;
            var allData = [];
            var seriesData = [];
            // if (flag){
            //     query.forEach(function (row) {
            //         allData.push({
            //             x: row.timestamp.getTime(),
            //             y: row.data
            //         });
            //     });
            //     seriesData = allData.slice(0);
            //     flag = false;
            // }
            // Create basic line-chart:
            liveChart = Highcharts.chart('liveChart', {
                    title: {
                            text: 'Number of elements'
                    },
                    chart: {
                        type: 'spline',
                        animation: Highcharts.svg,
                        marginRight: 10,
                    },
                    title: {
                        text: 'Live Humidity Data'
                    },
                    xAxis: {
                        type: 'datetime',
                        tickPixelInterval: 100
                    },
                    yAxis: {
                        title: {
                            text: 'Data'
                        },
                        plotLines: [{
                            value: 0,
                            width: 1,
                            color: '#808080'
                        }]
                    },
                    tooltip: {
                        formatter: function () {
                            return '<b>' + 'Time:</b> ' + Highcharts.dateFormat('%m/%d %H:%M:%S', this.x) + '<br/>' +
                                   '<b>' + this.series.name + ':</b> ' + Highcharts.numberFormat(this.y, 2) + '%' +'</b><br/>';
                        }
                    },
                    legend: {
                        enabled: false
                    },
                    exporting: {
                        enabled: false
                    },
                     series: [{
                            name: 'Humidity',
                            data: seriesData
                    }],
                });

            // // Add watchers:
            query.observeChanges({
                added: function (id, doc) {
                    if (!initializing) {
                        var y = doc.data;
                        var x = doc.timestamp.getTime();
                        console.log(x);
                        liveChart.series[0].addPoint([x,y]);
                        
                        if (liveChart.series[0].points.length > 20){
                            liveChart.series[0].data[0].remove();
                        }
                    }
                },
                removed: function (id, doc) {
                }
            });   
            initializing = false;
        }
    });
});