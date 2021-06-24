"use strict";

window.SaleViewer = window.SaleViewer || {};

SaleViewer.Customers = function () {
	

    var self = this,
		popup = null,
        gridOptions = {
			keyExpr: "id",
			editing: {
				allowAdding: false,
				allowUpdating: false,
				allowDeleting: false,
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
			summary: {
				totalItems: [{
					column: "model",
					summaryType: "count",
				}]
			},
            columns: [
                {
                    dataField: "no",
					caption: "No.",
                    alignment: "center",
					width: "10%"
                },
                {
                    dataField: "model",
					caption: "Car Model",
                    alignment: "center",
                },
                {
                    dataField: "plate_number",
					caption: "LPR Result",
                    alignment: "center",
                },
                {
                    dataField: "camera_id",
					caption: "Camera",
                    alignment: "center",
					lookup: {
						dataSource: [],
						valueExpr: "id",
						displayExpr: "camera_name"
					},
                },
                {
                    dataField: "created",
					caption: "DateTime",
                    alignment: "center",
                    dataType: "datetime",
					format: "dd/MM/yy HH:mm",
                },
 			],
			grouping: {
				autoExpandAll: true,
			},
			groupPanel: {
				visible: true
			},
			showBorders: true,
			columnAutoWidth:false,
            showColumnLines: true,
            showRowLines: false,
			hoverStateEnabled: true,
			width:900,
        };

    self.init = function () {
		
		var gridContainer = $("#grid");
        gridContainer.dxDataGrid(gridOptions);
        var grid = gridContainer.data("dxDataGrid");
		var loadOptions = {};
		var category = "LPR_log";
		var selectFirst;          
		grid.beginCustomLoading();
		
		$('#exportxlsxButton').dxButton({
			icon: 'static/images/icons/excel1.png',
			text: 'Export to xlsx',
			onClick: function() {
				var workbook = new ExcelJS.Workbook(); 
				var worksheet = workbook.addWorksheet('Main sheet'); 
				DevExpress.excelExporter.exportDataGrid({ 
					worksheet: worksheet, 
					component: gridContainer.dxDataGrid('instance'),
					autoFilterEnabled: true,
					customizeCell: function(options) {
						var excelCell = options;
						excelCell.font = { name: 'Arial', size: 12 };
						excelCell.alignment = { horizontal: 'left' };
					} 
				}).then(function() {
					workbook.xlsx.writeBuffer().then(function(buffer) { 
						saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'LPR Log.xlsx'); 
					}); 
				}); 
			}
		});
		
		var menuSettings = [
			{ id: 1, name: "Today"},
			{ id: 2, name: "This Week"},
			{ id: 3, name: "This Month"},
			{ id: 4, name: "This Year"},
			{ id: 5, name: "All"},
			{ id: 6, name: "Advanced Search"},
		];
		$("#Timeline").dxDropDownButton({
			items: menuSettings,
			onItemClick: function(e) {
				if (e.itemData.id == 6){
					if (popup_custom_search) {
						popup_custom_search.option("contentTemplate", popupOptions_custom_search.contentTemplate.bind(this));
					} else {
						popup_custom_search = $("#custom_search_popup").dxPopup(popupOptions_custom_search).dxPopup("instance");
					}
					popup_custom_search.show();
					return;
				}
				grid.option("dataSource", { store: []});
				grid.beginCustomLoading();
				$.ajax({
					url: SaleViewer.baseApiUrl + category,
					data: {'timeline': e.itemData.name},
					error: function (result) {
						grid.endCustomLoading();
						alert("There is a Problem, Try Again!");			
					},
					success: function (result) {
						result = JSON.parse(result)
						grid.option("dataSource", { store: result});
						grid.endCustomLoading();
					}
				});
			},
			displayExpr: "name",
			keyExpr: "id",
			useSelectMode: true,
			selectedItemKey: 5,
			width: 150,
		});

		$.ajax({
			url: SaleViewer.baseApiUrl + category + '/cameras',
			error: function (result) {
				alert("There is a Problem, Try Again!");			
			},
			success: function (result) {
				result = JSON.parse(result)
				grid.option("columns[3].lookup.dataSource", result);
			}
		});
		$.ajax({
			url: SaleViewer.baseApiUrl + category,
			data: {'timeline': "All"},
			error: function (result) {
				grid.endCustomLoading();
				alert("There is a Problem, Try Again!");			
			},
			success: function (result) {
				result = JSON.parse(result)
				grid.option("dataSource", { store: result});
				grid.endCustomLoading();
			}
		});	
    };
};
$(function () {
    SaleViewer.customers = new SaleViewer.Customers();
    SaleViewer.customers.init();
});
