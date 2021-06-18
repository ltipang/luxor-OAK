"use strict";

window.SaleViewer = window.SaleViewer || {};

$(function () {
	var zoneGridOptions = {
		keyExpr: "id",
		editing: {
			mode: "popup",
			allowAdding: true,
			allowUpdating: true,
			allowDeleting: true,
			popup: {
				title: "Zone Info",
				showTitle: true,
				width: 370,
				height: 205,
			},
			form: {
				colCount: 1,
				items: [
					{
						dataField: "name",
						caption: "Zone Name",
						validationRules: [{
							type: "required",
							message: "Zone Name is required"
						}]
					},
				],
			},
			useIcons: true
		},
		dataSource: {
			store: new Array()
		},
		paging: {
			enabled:false
		},
		selection: {
			enabled: false
		},
		filterRow: {
			visible: true
		},
		headerFilter: {
			visible: true
		},
		export: {
			enabled: true
		},
		onExporting: function(e) { 
			var workbook = new ExcelJS.Workbook(); 
			var worksheet = workbook.addWorksheet('Main sheet'); 
			DevExpress.excelExporter.exportDataGrid({ 
				worksheet: worksheet, 
				component: e.component,
				autoFilterEnabled: true,
				customizeCell: function(options) {
					var excelCell = options;
					excelCell.font = { name: 'Arial', size: 12 };
					excelCell.alignment = { horizontal: 'left' };
				} 
			}).then(function() {
				workbook.xlsx.writeBuffer().then(function(buffer) { 
					saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'Zone.xlsx'); 
				}); 
			}); 
			e.cancel = true; 
		},
		summary: {
			totalItems: [{
				column: "name",
				summaryType: "count",
			}]
		},
		columns: [
			{
				dataField: "id",
				caption: "ID",
                alignment: "center",
				width: "20%",
				editing: false
			},
			{
				dataField: "name",
				caption: "Zone Name",
                alignment: "center",
				validationRules: [{
					type: "required",
					message: "Zone Name is required"
				}]
			},
		],
		showBorders: true,
		//columnAutoWidth: false,
		showColumnLines: true,
		showRowLines: false,
		hoverStateEnabled: true,
		onRowInserting: function(e) {
			var newData = e.data;
			$.ajax({
				url: "/bk/Zone",
				type: "POST",
				data: newData,
				error: function (result) {
					alert("There is a Problem, Try Again!");
				},
				success: function (result) {
					var data = JSON.parse(result);
					if(data['statusCode'] == '400'){
						if(data['message'] == 'zone_name'){
							alert("The name is duplicated with other, Try Again!");
						}
					}
					location.reload();
				}
			});
		},
		onRowUpdating: function(e) {
			var newData = e.newData;
			var fullData = e.key;
			for (var key in newData){
				fullData[key] = newData[key];
			}
			$.ajax({
				url: "/bk/Zone",
				type: "PUT",
				data: fullData,
				error: function (result) {
					alert("There is a Problem, Try Again!");
				},
				success: function (result) {
					var data = JSON.parse(result);
					if(data['statusCode'] == '400'){
						if(data['message'] == 'zone_name'){
							alert("The name is duplicated with other, Try Again!");
						}
						location.reload();
					}
				}
			});
		},
		onRowRemoving: function(e) {
			$.ajax({
				url: "/bk/Zone",
				type: "DELETE",
				data: e.data,
				error: function (result) {
					alert("There is a Problem, Try Again!");
					e.cancel = true;
				},
				success: function (result) {
				}
			});
		},
	};
	var ZoneGrid = $("#Zone").dxDataGrid(zoneGridOptions).dxDataGrid("instance")

	var cameraGridOptions = {
		keyExpr: "id",
		editing: {
			mode: "popup",
			allowUpdating: true,
			popup: {
				title: "Camera Info",
				showTitle: true,
				width: 570,
				height: 255,
			},
			useIcons: true
		},
		dataSource: {
			store: new Array()
		},
        paging: {
            pageSize: 10
        },
        pager: {
            showPageSizeSelector: true,
            allowedPageSizes: [10, 20, 30],
            showInfo: true
        },
		selection: {
			enabled: false
		},
		filterRow: {
			visible: true
		},
		headerFilter: {
			visible: true
		},
		export: {
			enabled: true
		},
		onExporting: function(e) { 
			var workbook = new ExcelJS.Workbook(); 
			var worksheet = workbook.addWorksheet('Main sheet'); 
			DevExpress.excelExporter.exportDataGrid({ 
				worksheet: worksheet, 
				component: e.component,
				autoFilterEnabled: true,
				customizeCell: function(options) {
					var excelCell = options;
					excelCell.font = { name: 'Arial', size: 12 };
					excelCell.alignment = { horizontal: 'left' };
				} 
			}).then(function() {
				workbook.xlsx.writeBuffer().then(function(buffer) { 
					saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'Camera.xlsx'); 
				}); 
			}); 
			e.cancel = true; 
		},
		summary: {
			totalItems: [{
				column: "camera_name",
				summaryType: "count",
			}],
			groupItems: [{
                column: "camera_name",
                summaryType: "count",
                displayFormat: "{0} cameras",
            },]
		},
		columns: [
			{
				dataField: "camera_name",
                alignment: "center",
				caption: "Name",
				allowEditing: false,
			},
			{
				dataField: "location",
				caption: "Location",
				allowEditing: false,
				alignment: "center"
			},
			{
				dataField: "state",
				caption: "Status",
				validationRules: [{
					type: "required",
					message: "Camera Status is required"
				}],
                lookup: {
                    dataSource: [{"ID": 1, "Name": "On"}, {"ID": 0, "Name": "Off"}],
                    valueExpr: "ID",
                    displayExpr: "Name"
                },
				alignment: "center"
			},
			{
				dataField: "zone_id",
				caption: "Zone",
				validationRules: [{
					type: "required",
					message: "Camera Zone Name is required"
				}],
                lookup: {
                    dataSource: [],
                    valueExpr: "id",
                    displayExpr: "name"
                },
				alignment: "center",
                groupIndex: 0
			},
		],
		showBorders: true,
		//columnAutoWidth: false,
		showColumnLines: true,
		showRowLines: false,
		hoverStateEnabled: true,
		/*onRowInserting: function(e) {
			var newData = e.data;
			$.ajax({
				url: "/bk/Zone/Camera",
				type: "POST",
				data: newData,
				error: function (result) {
					alert("There is a Problem, Try Again!");
				},
				success: function (result) {
					var data = JSON.parse(result);
					if(data['statusCode'] == '400'){
						if(data['message'] == 'zone_name'){
							alert("The name is duplicated with other, Try Again!");
						}
					}
					location.reload();
				}
			});
		},*/
		onRowUpdating: function(e) {
			var newData = e.newData;
			var fullData = e.key;
			for (var key in newData){
				fullData[key] = newData[key];
			}
			$.ajax({
				url: "/bk/Zone/Camera",
				type: "PUT",
				data: fullData,
				error: function (result) {
					alert("There is a Problem, Try Again!");
				},
				success: function (result) {
					var data = JSON.parse(result);
					if(data['statusCode'] == '400'){
						if(data['message'] == 'zone_name'){
							alert("The name is duplicated with other, Try Again!");
						}
						location.reload();
					}
				}
			});
		},
		/*onRowRemoving: function(e) {
			$.ajax({
				url: "/bk/Zone/Camera",
				type: "DELETE",
				data: e.data,
				error: function (result) {
					alert("There is a Problem, Try Again!");
					e.cancel = true;
				},
				success: function (result) {
				}
			});
		},*/
	};
	var cameraGrid = $("#Camera").dxDataGrid(cameraGridOptions).dxDataGrid("instance")
	
	ZoneGrid.beginCustomLoading();
	cameraGrid.beginCustomLoading();
	$.ajax({
		url: '/bk/Camera',
		data: {},
		error: function (result) {
			alert("There is a Problem, Try Again!");
			ZoneGrid.endCustomLoading();
			cameraGrid.endCustomLoading();
		},
		success: function (result) {
			result = JSON.parse(result);
			ZoneGrid.option("dataSource", { store: result['zones']});
			cameraGrid.option("dataSource", { store: result['cameras']});
			cameraGrid.option("columns[3].lookup.dataSource", result['zones']);
			ZoneGrid.endCustomLoading();
			cameraGrid.endCustomLoading();
		}
	});	
});
