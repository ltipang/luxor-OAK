"use strict";

window.SaleViewer = window.SaleViewer || {};

SaleViewer.Customers = function () {
	

    var self = this,
		popup = null,
        gridOptions = {
			keyExpr: "id",
			editing: {
				mode: "popup",
				allowAdding: true,
				allowUpdating: true,
				allowDeleting: true,
				popup: {
					title: "User Info",
					showTitle: true,
					width: 670,
					height: 305,
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
						saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'Camera.xlsx'); 
					}); 
				}); 
				e.cancel = true; 
			},
			summary: {
				totalItems: [{
					column: "camera_name",
					summaryType: "count",
				}]
			},
            columns: [
                {
                    dataField: "camera_name",
                    alignment: "center",
					validationRules: [{
						type: "required",
						message: "camera_name is required"
					}],
					width: "12%"
                },
                {
                    dataField: "camera_url",
                    alignment: "center",
					validationRules: [{
						type: "required",
						message: "camera_url is required"
					}]
                },
                {
                    dataField: "state",
                    alignment: "center",
					validationRules: [{
						type: "required",
						message: "state is required"
					}],
					lookup: {
						dataSource: [{'id': 0, 'title': 'off'}, {'id': 1, 'title': 'on'}],
						displayExpr: "title",
						valueExpr: "id"
					},
					width: "8%"
                },
                {
                    dataField: "location",
                    alignment: "center",
					validationRules: [{
						type: "required",
						message: "location is required"
					}],
					width: "10%"
                },
                {
                    dataField: "user_id",
					caption: "User",
                    alignment: "center",
					validationRules: [{
						type: "required",
						message: "state is required"
					}],
					lookup: {
						dataSource: [],
						displayExpr: "name",
						valueExpr: "id"
					},
					width: "10%",
                },
 			],
			showBorders: true,
			columnAutoWidth:false,
            showColumnLines: true,
            showRowLines: false,
			hoverStateEnabled: true,
			//width:500,
			onRowInserting: function(e) {
				var newData = e.data;
				$.ajax({
					url: "/bk/Camera",
					type: "POST",
					data: newData,
					error: function (result) {
						alert("There is a Problem, Try Again!");
					},
					success: function (result) {
						var data = JSON.parse(result);
						if(data['statusCode'] == '400'){
							if(data['message'] == 'camera_name'){
								alert("The name is duplicated with other, Try Again!");
							}
							else if(data['message'] == 'camera_url'){
								alert("The url is duplicated with other, Try Again!");
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
					url: "/bk/Camera",
					type: "PUT",
					data: fullData,
					error: function (result) {
						alert("There is a Problem, Try Again!");
					},
					success: function (result) {
						var data = JSON.parse(result);
						if(data['statusCode'] == '400'){
							if(data['message'] == 'camera_name'){
								alert("The name is duplicated with other, Try Again!");
							}
							else if(data['message'] == 'camera_url'){
								alert("The url is duplicated with other, Try Again!");
							}
							location.reload();
						}
					}
				});
			},
			onRowRemoving: function(e) {
				$.ajax({
					url: "/bk/Camera",
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

    self.init = function () {
		
		var gridContainer = $("#grid");
        gridContainer.dxDataGrid(gridOptions);
        var grid = gridContainer.data("dxDataGrid");
		var loadOptions = {};
		var category = "Camera";
		var selectFirst;          
		grid.beginCustomLoading();
		
		$.ajax({
			url: SaleViewer.baseApiUrl + category,
			data: loadOptions,
			error: function (result) {
				grid.endCustomLoading();
				alert("There is a Problem, Try Again!");			
			},
			success: function (result) {
				result = JSON.parse(result)
				grid.option("columns[4].lookup.dataSource", result['users']);
				grid.option("dataSource", { store: result['cameras']});
				grid.endCustomLoading();
			}
		});	
    };
};
$(function () {
    SaleViewer.customers = new SaleViewer.Customers();
    SaleViewer.customers.init();
});
