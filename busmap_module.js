//"use strict";
//これ以外に読み込みが必要なもの
//leaflet
//Leaflet.curve
//zip.min.js
//rt関係
//f_busmap({});
console.log("ここ");


//開発予定メモ
//SVG出力機能の回復
//クリックしたときの各種機能の回復
//時刻表の回復
//高速化、遅くなった部分がないか確認


//グローバル変数
let l_map; //leaflet
let l_data = {};//グローバルな情報を扱う。
let l_tooltip_x = 0;//ツールチップの位置
let l_tooltip_y = 0;//ツールチップの位置
let l_settings = {};//設定

import {f_input_settings} from "./js/f_input_settings.js";
import {f_html} from "./js/f_html.js";


import {f_xhr_get} from "./js/f_xhr_get.js";
import {f_zip_to_text} from "./js/f_zip_to_text.js";
import {f_csv_to_json} from "./js/f_csv_to_json.js";
import {f_binary_to_json} from "./js/f_binary_to_json.js"; //GTFS-RTの読み込みに用いる

import {f_from_topojson} from "./js/f_from_topojson.js";
import {f_from_geojson} from "./js/f_from_geojson.js";
import {f_from_api} from "./js/f_from_api.js";

import {f_prepare_json} from "./js/f_prepare_json.js";

import {f_set_stop_type} from "./js/f_set_stop_type.js";
import {f_set_route_sort_order} from "./js/f_set_route_sort_order.js";
import {f_number_gtfs} from "./js/f_number_gtfs.js";
import {f_make_ur_routes} from "./js/f_make_ur_routes.js";

import {f_set_color} from "./js/f_set_color.js";
import {f_make_shape_pt_array} from "./js/f_make_shape_pt_array.js";
import {f_make_parent_stations} from "./js/f_make_parent_stations.js";
import {f_count_trip_number} from "./js/f_count_trip_number.js";


import {f_lonlat_xy} from "./js/f_lonlat_xy.js";
import {f_make_shape_segments} from "./js/f_make_shape_segments.js";
import {f_set_width_offset} from "./js/f_set_width_offset.js";
import {f_offset_segment_array} from "./js/f_offset_segment_array.js";

import {f_make_polyline} from "./js/f_make_polyline.js";
import {f_cut_polyline} from "./js/f_cut_polyline.js";
import {f_search_route} from "./js/f_search_route.js";

window.f_busmap = async function f_busmap(a_settings) {

	console.time("T");
	console.time("t0");
	a_settings = f_input_settings(a_settings); //初期設定
	document.getElementById(a_settings["div_id"]).innerHTML = f_html(a_settings); //HTMLの初期設定
	//leafletの初期設定
	if (a_settings["leaflet"] === true) {
		l_map = L.map("div_leaflet"); //leafletの読み込み。
		if (a_settings["background_map"] === true) {
			for (let i1 = 0; i1 < a_settings["background_layers"].length; i1++) {
				L.tileLayer(a_settings["background_layers"][i1][0], a_settings["background_layers"][i1][1]).addTo(l_map); //背景地図（地理院地図等）を表示する。
			}
		}
		L.svg().addTo(l_map); //svg地図を入れる。
		if (a_settings["set_view_latlon"] !== null && a_settings["set_view_zoom"] !== null) {
			l_map.setView(a_settings["set_view_latlon"], a_settings["set_view_zoom"]); //初期表示位置（仮）
		}
	}
	console.timeEnd("t0");
	//a_settings["data"] = "https://toyotamakenkyusyo.github.io/gtfs/3270001000564/next/GTFS-JP.zip"; //仮
	//a_settings["data"] = "test.geojson"; //仮
	//a_settings["data_type"] = "geojson"; //仮
	
	//データの読み込みと前処理
	let l_data = {};
	if (a_settings["data_type"] === "gtfs") {
		console.time("t11");
		const c_csvs = f_zip_to_text(await f_xhr_get(a_settings["data"], "arraybuffer"), Zlib); //Zlibはhttps://cdn.jsdelivr.net/npm/zlibjs@0.3.1/bin/unzip.min.jsにある
		for (let i1 in c_csvs) {
			l_data[i1.replace(".txt", "")] = f_csv_to_json(c_csvs[i1]);
		}
		console.timeEnd("t11");
		console.time("t12");
		f_set_stop_type(l_data); //pickup_typeとdrop_off_typeを補う（ur_routesを作るため）
		f_set_route_sort_order(l_data); //route_sort_orderを補う（ur_routesを作るため）
		f_number_gtfs(l_data); //緯度、経度、順番の型を数に変換
		console.timeEnd("t12");
		console.time("t13");
		f_make_ur_routes(l_data); //ur_routesを作る
		console.timeEnd("t13");
	} else if (a_settings["data_type"] === "json" || a_settings["data_type"] === "geojson" || a_settings["data_type"] === "topojson" || a_settings["data_type"] === "api") {
		l_data = await f_xhr_get(a_settings["data"], "json");
		if (a_settings["data_type"] === "topojson") {
			l_data = f_from_topojson(l_data);
		} else if (a_settings["data_type"] === "geojson") {
			l_data = f_from_geojson(l_data);
			l_data["routes"] = l_data["ur_routes"]; //臨時に追加
		} else if (a_settings["data_type"] === "api") {
			l_data = f_from_api(l_data);
		}
		//この時点では、stops、ur_routesのみ
		//stop_nameを補う
		//a_data["calendar"] = []; //仮、互換性
		//a_data["ur_routes"][i1]["service_array"] = ""; //仮の処置
		//a_data["ur_routes"][i1]["trip_number"] = 999; //仮に999とする。
		f_prepare_json(l_data);
	} else {
		new Error("読み込みできないタイプ");
	}
	console.time("t2");
	
	f_set_color(l_data); //route_color、route_text_colorを補う
	f_make_shape_pt_array(l_data); //shape_pt_arrayを加える
	f_make_parent_stations(l_data); //stopsをur_stopsとparent_stationsに分け、location_typeを補う
	f_count_trip_number(l_data);//便数を数える
	
	//GTFS-RTの読み込み
	l_data["rt"] = null;
	if (typeof a_settings["rt"] === "string") {
		const c_grb = module.exports.transit_realtime;
		const c_cors_url = a_settings["cors_url"]; //クロスオリジンを回避するphpをかませる
		const c_rt_url = c_cors_url + a_settings["rt"];
		a_data["rt"] = f_binary_to_json(await f_xhr_get(c_rt_url, "arraybuffer"), c_grb);
	}
	
	console.log(l_data);
	const c_bmd = {
		"rt": l_data["rt"],
		"stops": l_data["stops"],
		"ur_stops": l_data["ur_stops"],
		"parent_stations": l_data["parent_stations"],
		"ur_routes": l_data["ur_routes"],
		"calendar": l_data["calendar"],
		"trips": l_data["trips"],
		"stop_times": l_data["stop_times"]//,
	};
	
	if (a_settings["change"] === true) {
		//当面機能停止
		//document.getElementById("ur_route_list").innerHTML = f_ur_route_list(c_bmd);
	}
	console.timeEnd("t2");
	console.time("t3");
	f_make_shape_segments(c_bmd, f_lonlat_xy, a_settings); //新規
	console.timeEnd("t3");
	console.time("t4");
	if (a_settings["global"] === true) { //グローバルに移す
		l_data = c_bmd;
		l_settings = a_settings;
	}
	console.timeEnd("t4");
	console.timeEnd("T");
	console.time("U");
	f_open(c_bmd, a_settings); //6s遅い！
	console.timeEnd("U");
	
}



//設定変更
function f_change_setting(a_key, a_value) {
	l_settings[a_key] = a_value;
	document.getElementById("td_" + a_key).innerHTML = a_value;
}





/*
各系統の停留所リストは途中の欠損禁止。
停留所一覧の欠損も禁止。
緯度経度の欠損は可。

現状
"calendar":[{"service_id": "平日", "monday": "1", "start_date": "20181201", "end_date": "20190331"}]
, "stops": [{"location_type": "0", "parent_station": "市役所_parent", "stop_id": "1001-1", "stop_name": "市役所", "stop_lat": 35, "stop_lon": 138}]
, "trips": []
, "ur_routes": [{"agency_id": "122", "route_color": "002200", "route_id": "101010", "route_long_name": "A線", "route_short_name": "A", "route_text_color": "FFFFFF", "service_array": ["service_id": "平日", "number": 12], "shape_pt_array": [{"shape_id": "A", "shape_pt_lat": 35, "shape_pt_lon": 137, "shape_pt_sequence": 2}], "stop_array": [{"stop_id": "1101-1", "stop_number": 23, "drop_off_type": "1", "pickup_type": "0"}]}]
*/




function f_open(a_bmd, a_settings) {
	console.time("u1");
	if (a_settings["change"] === true) {
		//表示するur_routeの設定
		//showはいずれにしても必要？
		//現在故障中。
		/*
		for (let i1 = 0; i1 < a_bmd["ur_routes"].length; i1++) {
			if (form1[a_bmd["ur_routes"][i1]["ur_route_id"]].checked) {
				a_bmd["ur_routes"][i1]["show"] = true;
			} else {
				a_bmd["ur_routes"][i1]["show"] = false;
			}
		}
		*/
	}
	console.timeEnd("u1");
	console.time("u2");
	f_set_width_offset(a_bmd, f_lonlat_xy, a_settings); //新規
	console.timeEnd("u2");
	console.time("u3");
	//オフセット
	const c_groups = {};
	for (let i1 = 0; i1 < a_bmd["parent_routes"].length; i1++) {
		const c_parent_route_id = a_bmd["parent_routes"][i1]["parent_route_id"];
		c_groups["parent_route_id_" + c_parent_route_id] = {};
	}
	console.timeEnd("u3");
	console.time("u4");
	for (let i1 = 12; i1 <= 16; i1++) {
		const c_zoom_ratio = 2 ** (16 - i1);
		console.log(c_zoom_ratio)
		a_bmd["layer_zoom_" + String(i1)] = L.layerGroup();
		a_bmd["index_zoom_" + String(i1)] = {};
		for (let i2 = 0; i2 < a_bmd["parent_routes"].length; i2++) {
			const c_parent_route_id = a_bmd["parent_routes"][i2]["parent_route_id"];
			a_bmd["index_zoom_" + String(i1)][c_parent_route_id] = [];
		}
		c_groups["zoom_" + String(i1)] = L.layerGroup();
		for (let i2 = 0; i2 < a_bmd["ur_route_child_shape_segment_arrays"].length; i2++) {
			const c_array = []; //a_bmd["ur_route_child_shape_segment_arrays"][i1]のコピー
			for (let i3 = 0; i3 < a_bmd["ur_route_child_shape_segment_arrays"][i2].length; i3++) {
				c_array[i3] = {};
				for (let i4 in a_bmd["ur_route_child_shape_segment_arrays"][i2][i3]) {
					c_array[i3][i4] = a_bmd["ur_route_child_shape_segment_arrays"][i2][i3][i4];
				}
				c_array[i3]["sids"] = [c_array[i3]["sid"]];
				c_array[i3]["eids"] = [c_array[i3]["eid"]];
				c_array[i3]["w"] = c_array[i3]["w"] * c_zoom_ratio; //オフセット倍率を変更
				c_array[i3]["z"] = c_array[i3]["z"] * c_zoom_ratio; //オフセット倍率を変更
			}
			
			
			
			
			f_offset_segment_array(c_array); //オフセット
			
			//console.log(c_array);
			//折れ線に変換する
			const c_polyline = f_make_polyline(c_array);
			//緯度経度
			const c_zoom_level = 16; //仮、set_width_offsetと同じ
			for (let i3 = 0; i3 < c_polyline.length; i3++) {
				c_polyline[i3]["lon"] = f_lonlat_xy(c_polyline[i3]["x"], "x_to_lon", c_zoom_level);
				c_polyline[i3]["lat"] = f_lonlat_xy(c_polyline[i3]["y"], "y_to_lat", c_zoom_level);
			}
			
			//near_stopsを入れる
			for (let i3 = 0; i3 < c_polyline.length; i3++) {
				c_polyline[i3]["near_stops"] = [];
				if (c_polyline[i3]["ids"] === undefined) {
					c_polyline[i3]["ids"] = [];
				}
				for (let i4 = 0; i4 < c_polyline[i3]["ids"].length; i4++) {
					const c_near_stops = a_bmd["shape_points"][c_polyline[i3]["ids"][i4]]["near_stops"];
					for (let i5 = 0; i5 < c_near_stops.length; i5++) {
						c_polyline[i3]["near_stops"].push(c_near_stops[i5]);
					}
				}
			}
			
			if (a_bmd["ur_routes"][i2]["stop_array"] === undefined) {
				a_bmd["ur_routes"][i2]["stop_array"] = [];
			}
			
			const c_cut_polyline = f_cut_polyline(c_polyline, a_bmd["ur_routes"][i2]["stop_array"]);
			const c_parent_route_id = a_bmd["ur_routes"][i2][a_settings["parent_route_id"]];
			if (a_settings["round"] === true) { //角を丸める＜注意＞未完成でoffsetと連動していない
				for (let i3 in c_cut_polyline["curves"]) {
					if (c_groups["parent_route_id_" + c_parent_route_id][i3] === undefined) {
						c_groups["parent_route_id_" + c_parent_route_id][i3] = L.featureGroup();
					}
					for (let i4 = 0; i4 < c_cut_polyline["curves"][i3].length; i4++) {
						//console.log(c_cut_polyline["curves"][i3][i4]["curve"]);
						const c_curve = L.curve(c_cut_polyline["curves"][i3][i4]["curve"], {"color": "#" + a_bmd["ur_routes"][i2]["route_color"], "weight": c_cut_polyline["curves"][i3][i4]["width"] * 256 /  c_zoom_ratio});
						
					c_curve.on("click", function(e) {
						f_change_parent_route_color(c_parent_route_id, i3);
					});
					
					c_groups["parent_route_id_" + c_parent_route_id][i3].addLayer(c_curve);
					c_groups["zoom_" + String(i1)].addLayer(c_curve);
					}
				}
			}
			
			for (let i3 = 0; i3 < c_cut_polyline["stop_array"].length; i3++) {
				a_bmd["layer_zoom_" + String(i1)].addLayer(L.circle(c_cut_polyline["stop_array"][i3], {"radius": 2, "stroke": 1, "color": "#000000", "fill": true, "fillColor": "#FFFFFF"}));
			}
			
			
		}
	}
	
	
	console.timeEnd("u4");
	console.time("u5");
	
	for (let i1 = 0; i1 < a_bmd["parent_stations"].length; i1++) {
		L.marker({"lon": a_bmd["parent_stations"][i1]["stop_lon"], "lat": a_bmd["parent_stations"][i1]["stop_lat"]}, {"icon": L.divIcon({"html": "<span style=\"writing-mode: " + a_settings["writing_mode"] + ";\" onclick=\"f_set_stop_id('" + a_bmd["parent_stations"][i1]["stop_id"] + "');\">" + a_bmd["parent_stations"][i1]["stop_name"] + "</span>", className: "className", iconSize: [256, 256], iconAnchor: [-4, -4]})}).addTo(l_map);
	}
	console.timeEnd("u5");
	console.time("u6");
	
	f_zoom();
	//ズームレベル変更→leaflet変更
	l_map.on("zoom", f_zoom);
	console.timeEnd("u6");
	
	function f_zoom() {
		const c_zoom_level = l_map.getZoom();
		if (c_zoom_level <= 12) {
			c_groups["zoom_12"].addTo(l_map);
			c_groups["zoom_13"].remove(l_map);
			c_groups["zoom_14"].remove(l_map);
			c_groups["zoom_15"].remove(l_map);
			c_groups["zoom_16"].remove(l_map);
			a_bmd["layer_zoom_12"].addTo(l_map);
			a_bmd["layer_zoom_13"].remove(l_map);
			a_bmd["layer_zoom_14"].remove(l_map);
			a_bmd["layer_zoom_15"].remove(l_map);
			a_bmd["layer_zoom_16"].remove(l_map);
		} else if (c_zoom_level === 13) {
			c_groups["zoom_12"].remove(l_map);
			c_groups["zoom_13"].addTo(l_map);
			c_groups["zoom_14"].remove(l_map);
			c_groups["zoom_15"].remove(l_map);
			c_groups["zoom_16"].remove(l_map);
			a_bmd["layer_zoom_12"].remove(l_map);
			a_bmd["layer_zoom_13"].addTo(l_map);
			a_bmd["layer_zoom_14"].remove(l_map);
			a_bmd["layer_zoom_15"].remove(l_map);
			a_bmd["layer_zoom_16"].remove(l_map);
		} else if (c_zoom_level === 14) {
			c_groups["zoom_12"].remove(l_map);
			c_groups["zoom_13"].remove(l_map);
			c_groups["zoom_14"].addTo(l_map);
			c_groups["zoom_15"].remove(l_map);
			c_groups["zoom_16"].remove(l_map);
			a_bmd["layer_zoom_12"].remove(l_map);
			a_bmd["layer_zoom_13"].remove(l_map);
			a_bmd["layer_zoom_14"].addTo(l_map);
			a_bmd["layer_zoom_15"].remove(l_map);
			a_bmd["layer_zoom_16"].remove(l_map);
		} else if (c_zoom_level === 15) {
			c_groups["zoom_12"].remove(l_map);
			c_groups["zoom_13"].remove(l_map);
			c_groups["zoom_14"].remove(l_map);
			c_groups["zoom_15"].addTo(l_map);
			c_groups["zoom_16"].remove(l_map);
			a_bmd["layer_zoom_12"].remove(l_map);
			a_bmd["layer_zoom_13"].remove(l_map);
			a_bmd["layer_zoom_14"].remove(l_map);
			a_bmd["layer_zoom_15"].addTo(l_map);
			a_bmd["layer_zoom_16"].remove(l_map);
		} else if (c_zoom_level >= 16) {
			c_groups["zoom_12"].remove(l_map);
			c_groups["zoom_13"].remove(l_map);
			c_groups["zoom_14"].remove(l_map);
			c_groups["zoom_15"].remove(l_map);
			c_groups["zoom_16"].addTo(l_map);
			a_bmd["layer_zoom_12"].remove(l_map);
			a_bmd["layer_zoom_13"].remove(l_map);
			a_bmd["layer_zoom_14"].remove(l_map);
			a_bmd["layer_zoom_15"].remove(l_map);
			a_bmd["layer_zoom_16"].addTo(l_map);
		}
	}
	
	//クリックしたところを強調
	function f_change_parent_route_color(a_parent_route_id, a_to) {
		for (let i1 = 0; i1 < a_bmd["parent_routes"].length; i1++) {
			const c_parent_route_id = a_bmd["parent_routes"][i1]["parent_route_id"];
			for (let i2 in c_groups["parent_route_id_" + c_parent_route_id]) {
				let l_color;
				if (c_parent_route_id === a_parent_route_id && i2 === a_to) {
					l_color = "#" + a_bmd["parent_routes"][i1]["route_color"];
				} else {
					l_color = "#C0C0C0";
				}
				c_groups["parent_route_id_" + c_parent_route_id][i2].setStyle({"color": l_color});
			}
		}
	}
	
	window.start_stop_id = null;
	window.end_stop_id = null;
	//停留所名をクリックして経路検索
	window.f_set_stop_id = function (a_stop_id) {
		window.start_stop_id = window.end_stop_id;
		window.end_stop_id = a_stop_id;
		console.log(window.start_stop_id + "→" + window.end_stop_id);
		
		f_show_search_route(window.start_stop_id, window.end_stop_id);
	}
	
	console.time("u7");
	
	//経路検索
	const c_parent_station_index = {};
	for (let i1 = 0; i1 < a_bmd["ur_stops"].length; i1++) {
		c_parent_station_index[a_bmd["ur_stops"][i1]["stop_id"]] = a_bmd["ur_stops"][i1]["parent_station"];
	}
	
	function f_show_search_route(a_start_parent_station, a_end_parent_station) {
		const c_route_se = f_search_route(a_start_parent_station, a_end_parent_station, a_bmd, c_parent_station_index);
		//parent_routeでまとめる
		const c_parent_route_se = {};
		for (let i1 = 0; i1 < a_bmd["ur_routes"].length; i1++) {
			const c_parent_route_id = a_bmd["ur_routes"][i1][a_settings["parent_route_id"]];
			if (c_parent_route_se["parent_route_id_" + c_parent_route_id] === undefined) {
				c_parent_route_se["parent_route_id_" + c_parent_route_id] = {};
			}
			for (let i2 = 0; i2 < c_route_se[i1].length; i2++) {
				const c_id = c_route_se[i1][i2];
				c_parent_route_se["parent_route_id_" + c_parent_route_id][c_id] = true;
			}
		}
		//表示に反映する
		for (let i1 = 0; i1 < a_bmd["parent_routes"].length; i1++) {
			const c_parent_route_id = a_bmd["parent_routes"][i1]["parent_route_id"];
			for (let i2 in c_groups["parent_route_id_" + c_parent_route_id]) {
				let l_color;
				if (c_parent_route_se["parent_route_id_" + c_parent_route_id][i2] === true) {
					l_color = "#" + a_bmd["parent_routes"][i1]["route_color"];
				} else {
					l_color = "#C0C0C0";
				}
				c_groups["parent_route_id_" + c_parent_route_id][i2].setStyle({"color": l_color});
			}
		}
	}
	
	
	
	console.timeEnd("u7");
	
	
	/*
	console.log(a_bmd);
	
	console.time("A");
	try { //tripが無いとエラーなので回避
		f_stop_array(a_bmd);
	} catch(e) {
	}
	console.timeEnd("A");
	console.time("L");
	if (a_settings["leaflet"] === true) {
		f_leaflet(a_bmd, a_settings);//この中に作ったsvgを入力して描画。
	} else {
		f_svg(a_bmd, a_settings);
	}
	console.timeEnd("L");
	*/
}







