"use strict";

$(function () {
   var color_of_visit = $("#popular_vehicle_color").dxPieChart({
        palette: "bright",
        dataSource: [],
        legend: {
            orientation: "horizontal",
            itemTextPosition: "right",
            horizontalAlignment: "center",
            verticalAlignment: "bottom",
            columnCount: 4
        },
        "export": {
            enabled: true
        },
        margin: {
            bottom: 20,
        },
        series: [{
            argumentField: "type",
            valueField: "count",
            label: {
                visible: true,
                font: {
                    size: 16
                },
                connector: {
                    visible: true,
                    width: 0.5
                },
                position: "columns",
                customizeText: function (arg) {
                    return arg.valueText + " (" + arg.percentText + ")";
                }
            }
        }]
    }).dxPieChart("instance");

	$.ajax({
		url: '/bk/Dashboard/statistics/VehicleColor/total',
		error: function (result) {
			alert("There is a Problem, Try Again!");			
		},
		success: function (result) {
			result = JSON.parse(result);
			color_of_visit.beginUpdate();
			color_of_visit.option("dataSource", result);
			color_of_visit.endUpdate();
		}
	});

});
