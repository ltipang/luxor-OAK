"use strict";

window.SaleViewer = window.SaleViewer || {};

$(function () {
	SaleViewer.criteria = "";
	SaleViewer.baseApiUrl = "/bk/";
});

SaleViewer.loadData = function (data, callback, category) {
    $.ajax({
        url: SaleViewer.baseApiUrl + category,
        data: data,
        success: callback
    });
};

SaleViewer.lightColor = "#808080";
SaleViewer.darkColor = "#252525";

$(function () {
    DevExpress.viz.registerPalette("SaleViewPalette", {
        simpleSet: ["#da5859", "#f09777", "#fbc987", "#a5d7d0", "#a5bdd7", "#e97c82"],
        indicatingSet: ['#90ba58', '#eeba69', '#a37182'],
        gradientSet: ['#78b6d9', '#eeba69']
    });
});

function myTimer() {
	$.ajax({
		url: '/bk/GetNewAlarmNumber',
		error: function (result) {
		},
		success: function (result) {
			if (result == "0") {
				//var alarm_circle = document.getElementById("alarm_circle");
				//alarm_circle.setAttribute("class", "fa fa-circle noti_none");
				$("#alarm_count").text("");
			}
			else {
				//var alarm_circle = document.getElementById("alarm_circle");
				//alarm_circle.setAttribute("class", "fa fa-circle noti_show");
				$("#alarm_count").text(result);
			}
		}
	});
}

var myVar = setInterval(function () { myTimer() }, 5000);

var popup = null;
function alarm_list() {
	if ($("#alarm_count").text() == "") {
		return;
	}
	$.ajax({
		url: '/Alarm/GetAllAlarmCategory',
		error: function (result) {
			alert("There is a Problem, Try Again!");
		},
		success: function (result) {
			var alarm_circle = document.getElementById("alarm_circle");
			alarm_circle.setAttribute("class", "fa fa-circle noti_none");
			$("#alarm_count").text("");
			var gridOptions = {
				dataSource: {
					store: JSON.parse(result)
				},
				paging: {
					pageSize: 8
				},
				pager: {
					showInfo: true
				},
				filterRow: {
					visible: true
				},
				headerFilter: {
					visible: true
				},
				columns: [
					{
						dataField: "type",
						caption: "Alarm Type",
					},
					{
						dataField: "content",
						caption: "Alarm Content",
						width: "60%"
					},
					{
						dataField: "created_time",
						caption: "Alarm Time",
						dataType: "datetime",
						alignment: "right",
						format: "dd/MM/yy HH:mm",
					},
				],
				showBorders: false,
				columnAutoWidth: false,
				showColumnLines: false,
				showRowLines: false,
				hoverStateEnabled: true,
			},
			popupOptions = {
				width: 600,
				height: 480,
				contentTemplate: function () {
					return $('<div id="grid" class="products"></div>').dxDataGrid(gridOptions);
				},
				showTitle: true,
				title: "New Alarms",
				visible: false,
				dragEnabled: false,
				closeOnOutsideClick: true
			};
			if (popup) {
				popup.option("contentTemplate", popupOptions.contentTemplate.bind(this));
			} else {
				popup = $("#noti_popup").dxPopup(popupOptions).dxPopup("instance");
			}
			popup.show();
		}
	});
}
