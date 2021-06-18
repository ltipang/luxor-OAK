"use strict";

window.IVMS = window.IVMS || {};

window.jsPDF = window.jspdf.jsPDF;
applyPlugin(window.jsPDF);


IVMS.Videos = function () {
	var $t_fixed;
	var positionFlag = false;
	var camera_names, camera_locations, zone_names;
	function PatchHeaders(e) {
		var $header = e.element.find(".dx-datagrid-headers").detach();
		var $panel = e.element.find(".dx-datagrid-header-panel").detach();
		$t_fixed = $("<div>");
		$t_fixed.append($panel);
		$t_fixed.append($header);
		$t_fixed.addClass("fixed-headers").prependTo(e.element.find(".dx-datagrid")[0]);
		if (positionFlag)
			$t_fixed.css("position", "fixed");
		$t_fixed.width(e.element.width());
	}
    var self = this,
		root_path = window.location.protocol + "//" + window.location.hostname + ":" + window.location.port,
		popup = null,
		popup_custom_search = null,
        gridOptions = {
			editing: {
				mode: "row",
				allowAdding: false,
				allowUpdating: false,
				allowDeleting: false,
				useIcons: true
			},
			selection: {
				mode: "multiple",
				"showCheckBoxesMode": "onClick"
			},
            dataSource: {
                store: new Array()
            },
			paging: {
                pageSize: 10
            },
			pager: {
				showPageSizeSelector: true,
				allowedPageSizes: [10, 20, 30, 40, 50],
				showInfo: true,
			},
			filterRow: {
                visible: true
            },
			headerFilter: {
				visible: true
			},
			summary: {
				totalItems: [{
                    column: "thumb_name",
					summaryType: "count",
				}],				
				groupItems: [{
					column: "OrderNumber",
					summaryType: "count",
					displayFormat: "{0} transactions",
				}]
			},
            columns: [
                {
                    dataField: "id",
                    caption: "ID",
					alignment: "center",
					width: 80,
                }, {
                    dataField: "thumb_name",
					caption: "Video Thumb",
                    alignment: "center",
					cellTemplate: function (container, options) {
						$("<div>")
							.append($("<img>", { "src": "/static" + options.value }))
							.appendTo(container);
					}
                },
                {
                    dataField: "start_time",
					caption: "Start Time",
                    alignment: "center",
                    dataType: "datetime",
					format: "dd/MM/yy HH:mm",
                }, {
                    dataField: "end_time",
                    alignment: "center",
					dataType: "datetime",
					format: "dd/MM/yy HH:mm",
                },
				{
					dataField: "camera_name",
					caption: "Camera Name",
                    alignment: "center",
				},
				{
					dataField: "location",
					caption: "Camera Location",
                    alignment: "center",
				},
				{
					dataField: "zone_name",
					caption: "Zone",
                    alignment: "center",
				},
                {
					type: "buttons",
					width: 100, 
					buttons: ["delete", {
						hint: "Check",
						icon: "video",
						visible: true,
						onClick: function(e) {
							video_data = e.row.data;

							self.showVideo(video_data);
						},
						onHidden: function(e) {
							$("#video_img").attr("src", "");
						}
					}]
				},
 			],
			grouping: {
				autoExpandAll: true,
			},
			groupPanel: {
				visible: true
			},
			showBorders: true,
			//columnAutoWidth:false,
            showColumnLines: true,
            showRowLines: false,
			//showColumnHeaders: true,
			hoverStateEnabled: true,			
			onRowRemoving: function(e) {
				$.ajax({
                    url: "/bk/Video",
					type: "DELETE",
					data: {"id":e.data.id},
					error: function (result) {
						alert("There is a Problem, Try Again!");
						e.cancel = true;
					},
					success: function (result) {
					}
				});
			},
			onRowRemoved: function(e) {
				//console.log("RowRemoved");
			},
			onContentReady: function (e) {
            }
        },
		 
		video_data=null,
		popupOptions = {
            width: 600,
            height: 580,
            contentTemplate: function() {
                return $("<div/>").append(
					$("<p>" + video_data.video_filename + "</p>"),
                    $("<video id='video_img' width='480' height='360' controls='controls' autoplay='' style='margin: 3px;' src=/static" + video_data.video_filename + "> </video>"),
                );
            },
            showTitle: true,
            title: "Saved Video",
            visible: false,
            dragEnabled: false,
            closeOnOutsideClick: true,
			onHidden: function (e) {
				$("#video_img").attr("src", "");
			},
			toolbarItems: [{
				widget: "dxButton",
				location: "after",
				options: { 
					icon: 'download',
					onClick: function(e) { 
						var filePath = root_path + $("#video_img").attr("src");
						var splits = filePath.split('/');
						$("#download").attr("href", filePath)
						$("#download").attr("download", splits[splits.length-1])
						document.getElementById('download').click();
					}
				}
			}]
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
						where_cmd = "DATE(`start_time`) >= DATE('" + self.getDateString(data["start_date"]) + "')"
						where_cmd += " and DATE(`start_time`) <= DATE('" + self.getDateString(data["end_date"]) + "')"
						if (data['camera_name'] != undefined && data['camera_name'] != ''){
							where_cmd += " and cameras.`camera_name` = '" + data['camera_name'] + "'";
						}
						if (data['camera_location'] != undefined && data['camera_location'] != ''){
							where_cmd += " and cameras.`location` = '" + data['camera_location'] + "'";
						}
						if (data['zone_name'] != undefined && data['zone_name'] != ''){
							where_cmd += " and zones.`name` = '" + data['zone_name'] + "'";
						}
						var grid = $("#grid").data("dxDataGrid");
						grid.beginCustomLoading();
						$.ajax({
							url: "/bk/Video",
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
						form.option("formData.camera_location", null);
					}
				}),
				/*$('<div id="cancel_btn" class="products" style="margin:15px;"></div>').dxButton({
					stylingMode: "contained",
					text: "Cancel",
					type: "danger",
					width: 120,
					onClick: function() {
						var form = $("#grid_custom_search").dxForm("instance");
						form.option("formData.start_date", null);
						form.option("formData.end_date", new Date());
						form.option("formData.camera_name", null);
						form.option("formData.camera_location", null);
						$("#custom_search_popup").dxPopup("instance").hide();
					}
				}),*/
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
		$('#exportPdfButton').dxButton({
			icon: 'download',
			text: 'Download Selected Videos',
			onClick: function() {
				var selected = grid.getSelectedRowsData();
				var filePath = []
				for(var i = 0; i < selected.length; i++){
					filePath.push("static" + selected[i].video_filename);
				}
				$.ajax({
					url: "/videos/zipDownload",
					data: {'filePath': filePath.join(',')},
					method: "POST",
					error: function (result) {
						alert("There is a Problem, Try Again!");			
					},
					success: function (result) {
						result = JSON.parse(result)
						$("#download").attr("href", root_path + '/' + result['fullPath'])
						$("#download").attr("download", result['fileName'])
						document.getElementById('download').click();
					}
				});
				grid.clearSelection();
			}
		});
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
						saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'Videos.xlsx'); 
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
					url: "/bk/Video",
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
			selectedItemKey: 1,
			width: 150,
		});
		
		var gridContainer = $("#grid");
        gridContainer.dxDataGrid(gridOptions);
        var grid = gridContainer.data("dxDataGrid");
		grid.beginCustomLoading();
		$.ajax({
            url: "/bk/Video/first",
			data: {'timeline': "Today"},
			error: function (result) {
				grid.endCustomLoading();
				alert("There is a Problem, Try Again!");			
			},
			success: function (result) {
				var res = JSON.parse(result);
				grid.option("dataSource", { store: res['cameras']});
				camera_names = res['camera_names'];
				camera_locations = res['camera_locations'];
				zone_names = res['zone_names'];
				grid.endCustomLoading();
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
							dataField: "camera_name",
							label: {
								text: "Camera Name"
							},
							editorType: "dxSelectBox",
							editorOptions: { 
								items: camera_names,
								searchEnabled: true,
								value: ""
							},
						},
						{
							dataField: "camera_location",
							label: {
								text: "Camera Location"
							},
							editorType: "dxSelectBox",
							editorOptions: { 
								items: camera_locations,
								searchEnabled: true,
								value: ""
							},
						},
						{
							dataField: "zone_name",
							label: {
								text: "Zone Name"
							},
							editorType: "dxSelectBox",
							editorOptions: { 
								items: zone_names,
								searchEnabled: true,
								value: ""
							},
						},
					]
				};
			}
		});	
    };
	self.showVideo = function(data) {
        if(popup) {
            popup.option("contentTemplate", popupOptions.contentTemplate.bind(this));
        } else {
            popup = $("#video_popup").dxPopup(popupOptions).dxPopup("instance");
        }
		
        popup.show();
    };   
   
};
$(function () {
    IVMS.Videos = new IVMS.Videos();
    IVMS.Videos.init();
});
