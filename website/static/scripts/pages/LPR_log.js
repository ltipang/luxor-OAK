"use strict";

window.SaleViewer = window.SaleViewer || {};

SaleViewer.Customers = function () {
	

    var self = this,
		popup = null,
		popup_custom_search = null,
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
                    dataField: "plate_number",
					caption: "LPR Result",
                    alignment: "center",
                },
                {
                    dataField: "model",
					caption: "Car Model",
                    alignment: "center",
                },
                {
                    dataField: "camera_name",
					//caption: "Camera",
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
        },
		form_grid,
		popupOptions_custom_search = {
			width: 800,
			height: 350,
			contentTemplate: function () {
				return $("<div style='text-align:right;'><div/>").append(
					$('<div id="grid_custom_search" class="products" style="padding:15px;"></div>').dxForm(form_grid),
					$('<br>'),
					$('<br>'),
					$('<div id="search_btn" class="products" style="margin:15px;"></div>').dxButton({
						stylingMode: "contained",
						type: "success",
						text: "Submit",
						width: 120,
						onClick: function() {
							var data = $("#grid_custom_search").dxForm("instance").option("formData");
							if (!$("#grid_custom_search").dxForm("instance").validate().isValid){
								return;
							}
							else if (data["end_date"] < data["start_date"]){
								alert("Start Date should be older than End Date!");
								return;
							}
							var where_cmd;
							where_cmd = "DATE(`created`) >= DATE('" + self.getDateString(data["start_date"]) + "')"
							where_cmd += " and DATE(`created`) <= DATE('" + self.getDateString(data["end_date"]) + "')"
							if (data['license'] != undefined && data['license'] != ''){
								where_cmd += " and `plate_number` = '" + data['license'] + "'";
							}
							if (data['model'] != undefined && data['model'] != ''){
								where_cmd += " and `model` = '" + data['model'] + "'";
							}
							if (data['camera_name'] != undefined && data['camera_name'] != ''){
								where_cmd += " and cameras.`camera_name` = '" + data['camera_name'] + "'";
							}
							var grid = $("#grid").data("dxDataGrid");
							grid.beginCustomLoading();
							$.ajax({
								url: SaleViewer.baseApiUrl + "LPR_log",
								data: {"where_cmd": where_cmd},
								error: function (result) {
									grid.endCustomLoading();
									alert("There is a Problem, Try Again!");			
								},
								success: function (result) {
									result = JSON.parse(result)
									grid.option("dataSource", { store: result});
									grid.endCustomLoading();
									$("#custom_search_popup").dxPopup("instance").hide();
								}
							});	
						}
					}),
					$('<div id="cancel_btn" class="products" style="margin:15px;"></div>').dxButton({
						stylingMode: "contained",
						text: "Clear",
						type: "danger",
						width: 120,
						onClick: function() {
							var form = $("#grid_custom_search").dxForm("instance");
							form.option("formData.start_date", null);
							form.option("formData.end_date", new Date());
							form.option("formData.camera_name", null);
							form.option("formData.license", null);
							form.option("formData.model", null);
						}
					}),
				);
			},
			showTitle: true,
			title: "Advanced Search",
			visible: false,
			dragEnabled: false,
			closeOnOutsideClick: true
		};

	self.getDateString = function (now){
		var year = now.getFullYear(), month = now.getMonth() + 1, day = now.getDate(), date_string;
		date_string = year + '-';
		if (month > 9) date_string += month + '-';
		else date_string += '0' + month + '-';
		if (day > 9) date_string += day;
		else date_string += '0' + day;
		return date_string;
	}

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
				//grid.option("columns[3].lookup.dataSource", result['cameras']);
				form_grid = {
					formData: {"start_date": null,"end_date": new Date()},
					labelLocation: "left",
					minColWidth: 200,
					colCount: 2,
					items: [
						{
							dataField: "start_date",
							editorType: "dxDateBox",
							editorOptions: { 
								type: "date"
							},
							validationRules: [{
								type: "required",
								message: "Data Range is required"
							}]
						},
						{
							dataField: "end_date",
							editorType: "dxDateBox",
							editorOptions: { 
								type: "date"
							},
							label: {
								text: "",
								showing: false
							},
							validationRules: [{
								type: "required",
								message: "Data Range is required"
							}]
						},
						{
							dataField: "license",
						},
						{
							dataField: "model",
						},
						{
							dataField: "camera_name",
							label: {
								text: "Camera Name"
							},
							editorType: "dxSelectBox",
							editorOptions: { 
								items: result['camera_names'],
								searchEnabled: true,
								value: ""
							},
						},
					]
				};
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
