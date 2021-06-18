"use strict";

window.SaleViewer = window.SaleViewer || {};
var cameras, st_index;
var top_bar_height, menu_area_width, max_height, max_width;
var camera_num, rows, cols;
var treeViewCameras;
var cameras_info;
//var streaming_address_pref = 'http://192.168.1.131:8080/'
var streaming_address_pref =  window.location.protocol + "//" + window.location.hostname + ":5002/"
var player;
var canvas = document.createElement('canvas');
var context = canvas.getContext('2d');

$(function(){
	top_bar_height = $('#top_bar').height();
	menu_area_width = $('#menu').width();
	max_height = window.innerHeight - top_bar_height - 30;
	max_width = parseInt((window.outerWidth - menu_area_width) * 10 / 12) - 70;
	rows = parseInt(localStorage.getItem('rows')); cols = parseInt(localStorage.getItem('cols'));
	cameras_info = localStorage.getItem('cameras').split(',')
	grid_setting();
	
	var form_grid = {
		formData: {"rows": localStorage.getItem('rows'), "cols": localStorage.getItem('cols')},
		labelLocation: "left",
		minColWidth: 100,
		colCount: 2,
		items: [
			{
				dataField: "rows",
				label: {
					text: "rows"
				},
				validationRules: [{
					type: "pattern",
					pattern: "^([1-9][0-9]*)$",
					message: "Number of rows should be integer larger than zero."
				},
				{
					type: "required",
					message: "Number of rows is required"
				}]
			},
			{
				dataField: "cols",
				label: {
					text: "cols"
				},
				validationRules: [{
					type: "pattern",
					pattern: "^([1-9][0-9]*)$",
					message: "Number of cols should be integer larger than zero."
				},
				{
					type: "required",
					message: "Number of cols is required"
				}]
			},
		]			
	};
	var formWidget = $("#GridSetting").dxForm(form_grid).dxForm("instance");
	$('#GridSettingButton').dxButton({
		text: 'Make Grid',
		type: "success",
		width: 150,
		onClick: function() {
			var data = formWidget.option("formData");
			if (!formWidget.validate().isValid){
				return;
			}
			rows = parseInt(data["rows"]); cols = parseInt(data["cols"]);
			grid_setting();
			localStorage.setItem('rows', data['rows'])
			localStorage.setItem('cols', data['cols'])
			$.ajax({
				url: '/bk/gridSetting',
				method: 'PUT',
				data: data,
				error: function (result) {
					alert("There is a Problem, Try Again!");			
				},
				success: function (result) {
				}
			});	
		}
	});
   treeViewCameras = $("#treeViewCameras").dxTreeView({ 
        items: [{}],
		selectByClick: true, 
        dataStructure: "plain",
        parentIdExpr: "categoryId",
        keyExpr: "ID",
        displayExpr: "camera_name",
		showCheckBoxesMode: "normal",
		height: max_height * 0.55,
    }).dxTreeView("instance");
	$('#CameraViewButton').dxButton({
		stylingMode: "contained",
		type: "default",
		text: 'Camera View',
		width: 150,
		onClick: function() {
			cameras_info = [];
			var nodes = treeViewCameras.getSelectedNodes();
			for(var i = 0; i < nodes.length; i++){
				if (nodes[i].itemData.ID == "1") continue;
				if (nodes[i].itemData.ID.match(/_/g).length == 1) continue;
				cameras_info.push(nodes[i].itemData.camera_name)
			}
			grid_setting();
			localStorage.setItem('cameras', cameras_info.join(','))
			$.ajax({
				url: '/bk/viewedCameras',
				method: 'PUT',
				data: {'cameras': cameras_info.join(',')},
				error: function (result) {
					alert("There is a Problem, Try Again!");			
				},
				success: function (result) {
				}
			});	
		}
	});

	$.ajax({
		url: '/bk/Camera_View',
		data: {},
		error: function (result) {
			alert("There is a Problem, Try Again!");			
		},
		success: function (result) {
			result = JSON.parse(result);
			treeViewCameras.option("items", result);
		}
	});	
});

function getRandomColor() {
	var letters = '0123456789ABCDEF'.split('');
	var color = '#';
	for (var i = 0; i < 6; i++ ) {
		color += letters[Math.floor(Math.random() * 16)];
	}
	return color;
}

function grid_setting() {
	if (cameras_info == undefined) cameras_info = [];
	if (player != undefined) {
		player.forEach(player_finish);
	}
	player = [];
	$('#camera_area').children().remove();
	camera_num = rows * cols;
	var cell_width = parseInt(max_width / cols) - 1;
	var cell_height = parseInt(max_height / rows);
	for (var i = 0; i < camera_num; i++){
		var video_id = 'video_js_id' + String(i);
		var vcell_str;
		if (i < cameras_info.length){
			vcell_str = "<video-js id='" + video_id + "' class='vjs-default-skin camera_video' controls preload='auto'>"
			vcell_str += "<source src='" + streaming_address_pref + cameras_info[i] + ".m3u8' type='application/x-mpegURL'>"
			vcell_str += "</video-js>"
		}
		else {
			vcell_str = "<img class='camera_video_empty' src='static/images/no connected.jpg'/>"
		}
		var acell = $('<div/>');
		var pcell = $("<p id='camera_name" + String(i) + "' class='camera_title'></p>");
		var vcell = $(vcell_str);
		acell.addClass('video-cell');
		pcell.appendTo(acell);
		vcell.appendTo(acell);
		//if (i < cameras_info.length){
		//	var bcell = $('<button onclick="snapshot(' + "'" + video_id + "'" + ')">SnapShot</button>');
		//	bcell.appendTo(acell);
		//}
		acell.appendTo($('#camera_area'));
		if (i < cameras_info.length){
			document.getElementById("camera_name" + String(i)).textContent = cameras_info[i];
			player.push(videojs(video_id));
			  //var player = videojs('my-player');
			  var button = videojs.getComponent('Button');
			  var closeButton = videojs.extend(button, {
				constructor: function() {
				  button.apply(this, arguments);
				  this.controlText("Snapshot");
				  this.addClass('vjs-icon-share');
				},
				handleClick: function() {
				  snapshot(this.player().id())
				}
			  });
			  videojs.registerComponent('closeButton', closeButton);
			  player[i].getChild('controlBar').addChild('closeButton', {});
		}
	}
	player.forEach(player_start);
	$('.video-cell').width(cell_width);
	$('.video-cell').height(cell_height);
	$('.camera_video').width(cell_width * 0.99);
	$('.camera_video').height(cell_height * 0.99);
	$('.camera_video_empty').width(cell_width * 0.99);
	$('.camera_video_empty').height(cell_height * 0.99);
}

function player_start(single_player, index){
	single_player.ready(function() {
	  setTimeout(function() {
		single_player.autoplay('muted');
	  }, 1000);
	});
}

function player_finish(single_player, index){
	single_player.dispose();
}

function snapshot(id)
{
	var video = document.getElementById(id);
	var w, h;
	w = video.firstChild.videoWidth; h = video.firstChild.videoHeight;
	canvas.width = w; canvas.height = h;
	context.fillRect(0, 0, w, h);
	context.drawImage(video.firstChild, 0, 0, w, h)
	var dataURL = canvas.toDataURL();
	$("#download").attr("href", dataURL)
	$("#download").attr("download", "snapshot.jpg")
	document.getElementById('download').click();
}

function single_camera(id) {
	var cam_url = $("#camera_url" + id.toString()).attr("src");
	$("#camera_url").attr("src", "");
	$("#camera_url").attr("src", cam_url);
	var cam_name = document.getElementById("camera_name" + id.toString()).textContent;
	document.getElementById("camera_name").textContent = cam_name;
};
