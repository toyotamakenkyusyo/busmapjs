//"use strict";
//これ以外に読み込みが必要なもの
//leaflet
import {f_xhr_get} from "./js/f_xhr_get.js";
import {f_lon_to_x, f_lat_to_y, f_x_to_lon, f_y_to_lat} from "./js/lonlat_xy.js";
import {f_offset_segment_array} from "./js/f_offset_segment_array.js";

window.f_busmap = async function f_busmap() {
	const c_zoom_level = 10; //初期ズームレベル
	//leaflet
	document.getElementById("div_leaflet").style.height = "512px";
	document.getElementById("div_leaflet").style.background = "#FFFFFF";
	let l_map = L.map("div_leaflet"); //leafletの読み込み。
	L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png", {attribution: "<a href=\"https://maps.gsi.go.jp/development/ichiran.html\">地理院タイル</a>", opacity: 0.25}).addTo(l_map); //背景地図（地理院地図等）を表示する。
	L.svg().addTo(l_map); //svg地図を入れる。
	l_map.setView([36, 135], 10); //初期表示位置
	//データ読み込み
	const c_data = await f_xhr_get("https://kamelong.com/nodeJS/api?minLat=34&maxLat=36&minLon=135&maxLon=136&zoomLevel=10", "json");
	//const c_data = await f_xhr_get("https://kamelong.com/nodeJS/api?minLat=20&maxLat=50&minLon=125&maxLon=150&zoomLevel=6", "json");
	
	//オフセットした折れ線、折れ線上の駅の位置を返す
	console.time("t");
	f_offset_polyline(c_data, f_zoom_ratio(c_zoom_level));
	console.timeEnd("t");
	console.log(c_data);
	
	//leafletで表示
	//線
	for (let i1 in c_data["route"]) {
		c_data["route"][i1]["l_polyline"] = L.polyline(c_data["route"][i1]["polyline"], {"color": c_data["route"][i1]["color"], "weight": 1}).addTo(l_map);
	}
	//駅
	for (let i1 in c_data["route"]) {
		c_data["route"][i1]["l_points"] = [];
		for (let i2 = 0; i2 < c_data["route"][i1]["points"].length; i2++) {
			c_data["route"][i1]["l_points"][i2] = {};
			c_data["route"][i1]["l_points"][i2]["l_circleMarker"] = L.circleMarker(c_data["route"][i1]["points"][i2]["latlon"], {"color": "#000000", "fillColor": "#c0c0c0", "fillOpacity": 1, "radius": 4, "weight": 2, "opacity": 1}).addTo(l_map);
		}
	}
	//駅名
	for (let i1 in c_data["station"]) {
		L.marker([c_data["station"][i1]["lat"], c_data["station"][i1]["lon"]], {"icon": L.divIcon({"html": c_data["station"][i1]["name"], className: "className", iconSize: [256, 16], iconAnchor: [-4, -4]})}).addTo(l_map);
	}
	f_zoom();
	
	//zoomlevelに応じてオフセット幅の倍率を自動で変える
	//ズームレベル変更→オフセット再計算→leaflet変更
	l_map.on("zoom", f_zoom);
	function f_zoom() {
		f_offset_polyline(c_data, f_zoom_ratio(l_map.getZoom()));
		//線
		for (let i1 in c_data["route"]) {
			c_data["route"][i1]["l_polyline"].setLatLngs(c_data["route"][i1]["polyline"]);
		}
		//駅
		for (let i1 in c_data["route"]) {
			for (let i2 = 0; i2 < c_data["route"][i1]["points"].length; i2++) {
				c_data["route"][i1]["l_points"][i2]["l_circleMarker"].setLatLng(c_data["route"][i1]["points"][i2]["latlon"]);
			}
		}
	}
	
	//ズームレベルに応じたオフセット幅の倍率
	function f_zoom_ratio(a_zoom_level) {
		return 2 ** (20 - a_zoom_level); //オフセット幅の調節
	}
	
}





function f_offset_polyline(a_data, a_zoom_ratio) {
	//緯度経度をxy（仮にEPSG:3857）に変換しておく
	const c_station_xy = {};
	for (let i1 in a_data["station"]) {
		c_station_xy[i1] = {};
		c_station_xy[i1]["x"] = f_lon_to_x(a_data["station"][i1]["lon"], "m");
		c_station_xy[i1]["y"] = f_lat_to_y(a_data["station"][i1]["lat"], "m");
	}
	//折れ線の線分の列c_segment_arraysを作る
	const c_segment_arrays = {};
	for (let i1 in a_data["route"]) {
		c_segment_arrays[i1] = [];
		for (let i2 = 0; i2 < a_data["route"][i1]["stationList"].length - 1; i2++) {
			const c_sid = a_data["route"][i1]["stationList"][i2];
			const c_eid = a_data["route"][i1]["stationList"][i2 + 1];
			c_segment_arrays[i1].push({
				"sid": c_sid,
				"eid": c_eid,
				"sids": [c_sid],
				"eids": [c_eid],
				"sx": c_station_xy[c_sid]["x"],
				"sy": c_station_xy[c_sid]["y"],
				"ex": c_station_xy[c_eid]["x"],
				"ey": c_station_xy[c_eid]["y"],
				"sn": true, //残す
				"en": true, //残す
				"w": null, //線幅
				"z": null//, //オフセット幅
			});
		}
	}
	
	//線分をc_segmentsに集める
	const c_segments = {};
	for (let i1 in c_segment_arrays) {
		for (let i2 = 0; i2 < c_segment_arrays[i1].length; i2++) {
			const c_segment = c_segment_arrays[i1][i2];
			const c_segment_key_1 = "segment_" + c_segment["sid"] + "_" + c_segment["eid"];
			const c_segment_key_2 = "segment_" + c_segment["eid"] + "_" + c_segment["sid"];
			if (c_segments[c_segment_key_1] !== undefined) {
				c_segments[c_segment_key_1][i1] = {"id": i1, "direction": 1, "w": 1, "z": null};
				c_segments[c_segment_key_1]["number"] += 1;
			} else if (c_segments[c_segment_key_2] !== undefined) {
				c_segments[c_segment_key_2][i1] = {"id": i1, "direction": -1, "w": 1, "z": null};
				c_segments[c_segment_key_2]["number"] += 1;
			} else {
				c_segments[c_segment_key_1] = {};
				c_segments[c_segment_key_1]["number"] = 0;
				c_segments[c_segment_key_1][i1] = {"id": i1, "direction": 1, "w": 1, "z": null};
				c_segments[c_segment_key_1]["number"] += 1;
			}
		}
	}
	//オフセット幅zを設定
	for (let i1 in c_segments) {
		let l_z = (-1) * (c_segments[i1]["number"] - 1) * 0.5;
		for (let i2 in c_segments[i1]) {
			if (i2 !== "number") {
				if (c_segments[i1][i2]["direction"] === 1) {
					c_segments[i1][i2]["z"] = l_z * a_zoom_ratio;
				} else if (c_segments[i1][i2]["direction"] === -1) {
					c_segments[i1][i2]["z"] = (-1) * l_z * a_zoom_ratio;
				}
				l_z += 1;
			}
		}
	}
	
	//オフセット幅zをc_segment_arraysに入れる
	for (let i1 in c_segment_arrays) {
		for (let i2 = 0; i2 < c_segment_arrays[i1].length; i2++) {
			const c_segment = c_segment_arrays[i1][i2];
			const c_segment_key_1 = "segment_" + c_segment["sid"] + "_" + c_segment["eid"];
			const c_segment_key_2 = "segment_" + c_segment["eid"] + "_" + c_segment["sid"];
			if (c_segments[c_segment_key_1] !== undefined) {
				if (c_segments[c_segment_key_1][i1] !== undefined) {
					c_segment["z"] = c_segments[c_segment_key_1][i1]["z"];
				} else if (c_segments[c_segment_key_2][i1] !== undefined) {
					c_segment["z"] = c_segments[c_segment_key_2][i1]["z"];
				}
			} else {
				c_segment["z"] = c_segments[c_segment_key_2][i1]["z"];
			}
			
		}
	}
	//オフセットした線を作る
	const c_polylines = {};
	for (let i1 in c_segment_arrays) {
		f_offset_segment_array(c_segment_arrays[i1]);
		//折れ線に変換する
		c_polylines[i1] = [];
		for (let i2 = 0; i2 < c_segment_arrays[i1][0]["sxy"].length; i2++) {
			c_polylines[i1].push({"x": c_segment_arrays[i1][0]["sxy"][i2]["x"], "y": c_segment_arrays[i1][0]["sxy"][i2]["y"]});
			if (c_segment_arrays[i1][0]["sxy"].length === 3) {
				c_polylines[i1][c_polylines[i1].length - 2]["ids"] = c_segment_arrays[i1][0]["sids"];
			} else {
				c_polylines[i1][c_polylines[i1].length - 1]["ids"] = c_segment_arrays[i1][0]["sids"];
			}
		}
		for (let i2 = 0; i2 < c_segment_arrays[i1].length; i2++) {
			for (let i3 = 0; i3 < c_segment_arrays[i1][i2]["exy"].length; i3++) {
				c_polylines[i1].push({"x": c_segment_arrays[i1][i2]["exy"][i3]["x"], "y": c_segment_arrays[i1][i2]["exy"][i3]["y"]});
				if (c_segment_arrays[i1][i2]["exy"].length === 3) {
					c_polylines[i1][c_polylines[i1].length - 2]["ids"] = c_segment_arrays[i1][i2]["eids"];
				} else {
					c_polylines[i1][c_polylines[i1].length - 1]["ids"] = c_segment_arrays[i1][i2]["eids"];
				}
			}
		}
		//xyを緯度経度に変換する
		for (let i2 = 0; i2 < c_polylines[i1].length; i2++) {
			c_polylines[i1][i2]["lon"] = f_x_to_lon(c_polylines[i1][i2]["x"]);
			c_polylines[i1][i2]["lat"] = f_y_to_lat(c_polylines[i1][i2]["y"]);
		}
		//折れ線
		a_data["route"][i1]["polyline"] = [];
		for (let i2 = 0; i2 < c_polylines[i1].length; i2++) {
			a_data["route"][i1]["polyline"].push({"lat": c_polylines[i1][i2]["lat"], "lon": c_polylines[i1][i2]["lon"]});
		}
		//点
		a_data["route"][i1]["points"] = [];
		for (let i2 = 0; i2 < c_polylines[i1].length; i2++) {
			if (c_polylines[i1][i2]["ids"] !== undefined) {
				if (c_polylines[i1][i2]["ids"].length === 1) { //各点idは1つだけの前提（統合していないはず）
					a_data["route"][i1]["points"].push({"id": c_polylines[i1][i2]["ids"][0], "latlon": {"lat": c_polylines[i1][i2]["lat"], "lon": c_polylines[i1][i2]["lon"]}});
				}
			}
		}
		
	}
}
