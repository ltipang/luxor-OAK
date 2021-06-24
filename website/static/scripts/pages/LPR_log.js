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
						saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'LPR Log.xlsx'); 
					}); 
				}); 
				e.cancel = true; 
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
                    dataField: "created",
					caption: "DateTime",
                    alignment: "center",
                    dataType: "datetime",
					format: "dd/MM/yy HH:mm",
                },
 			],
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
		
		$.ajax({
			url: SaleViewer.baseApiUrl + category,
			data: loadOptions,
			error: function (result) {
				grid.endCustomLoading();
				alert("There is a Problem, Try Again!");			
			},
			success: function (result) {
				result = JSON.parse(result)
				grid.option("dataSource", { store: result['results']});
				grid.endCustomLoading();
			}
		});	
    };
};
$(function () {
    SaleViewer.customers = new SaleViewer.Customers();
    SaleViewer.customers.init();
});
