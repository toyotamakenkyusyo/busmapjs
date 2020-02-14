//"use strict";
//これ以外に読み込みが必要なもの
//leaflet
//Leaflet.curve
//zip.min.js
//rt関係
//f_busmap({});
console.log("ここ");
//クリックできるところを青字下線
//document.getElementsByTagName("style")[0].innerHTML += " span[onclick] {color: blue; text-decoration: underline;}";
document.getElementsByTagName("head")[0].innerHTML += "<style>span[onclick] {color: blue; text-decoration: underline;}</style>";


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
import {f_binary_to_json} from "./js/f_binary_to_json.js";

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
import {f_stop_number} from "./js/f_stop_number.js";


import {f_lonlat_xy} from "./js/f_lonlat_xy.js";
import {f_make_shape_segments} from "./js/f_make_shape_segments.js";
import {f_set_width_offset} from "./js/f_set_width_offset.js";
import {f_offset_segment_array} from "./js/f_offset_segment_array.js";

window.f_busmap = async function f_busmap(a_settings) {

	console.time("T");
	console.time("t0");
	//初期設定
	a_settings = f_input_settings(a_settings);
	//HTMLの初期設定
	document.getElementById(a_settings["div_id"]).innerHTML = f_html(a_settings);
	//leafletの初期設定
	if (a_settings["leaflet"] === true) {
		l_map = L.map("div_leaflet"); //leafletの読み込み。
		if (a_settings["background_map"] === true) {
			for (let i1 = 0; i1 < a_settings["background_layers"].length; i1++) {
				L.tileLayer(a_settings["background_layers"][i1][0], a_settings["background_layers"][i1][1]).addTo(l_map); //背景地図（地理院地図等）を表示する。
			}
		}
		L.svg().addTo(l_map); //svg地図を入れる。
		l_map.setView([35.454518, 133.850126], 16); //初期表示位置（仮）
		//l_map.setView([34.66167,133.935], 16); //初期表示位置（仮）
	}
	console.timeEnd("t0");
	//a_settings["data"] = "https://toyotamakenkyusyo.github.io/gtfs/3270001000564/next/GTFS-JP.zip"; //仮
	//a_settings["data"] = "test.geojson"; //仮
	//a_settings["data_type"] = "geojson"; //仮
	
	//データの読み込みと前処理
	let l_data = {};
	if (a_settings["data_type"] === "gtfs") {
		console.time("t11");
		const c_arraybuffer = await f_xhr_get(a_settings["data"], "arraybuffer");
		const c_text = await f_zip_to_text(c_arraybuffer, Zlib);
		//Zlibはhttps://cdn.jsdelivr.net/npm/zlibjs@0.3.1/bin/unzip.min.js
		for (let i1 in c_text) {
			l_data[i1.replace(".txt", "")] = f_csv_to_json(c_text[i1]);
		}
		console.timeEnd("t11");
		console.time("t12");
		//GTFSの差異を統一（ur_routesを作るのに必要なroute_sort_order、pickup_type、drop_off_type）
		//pickup_typeとdrop_off_typeを補う
		f_set_stop_type(l_data);
		//route_sort_orderを補う
		f_set_route_sort_order(l_data);
		//緯度、経度、順番の型を数に変換
		f_number_gtfs(l_data);
		console.timeEnd("t12");
		console.time("t13");
		//ur_routesを作る
		f_make_ur_routes(l_data);
		console.timeEnd("t13");
	} else if (a_settings["data_type"] === "json" || a_settings["data_type"] === "geojson" || a_settings["data_type"] === "topojson" || a_settings["data_type"] === "api") {
		l_data = await f_xhr_get(a_settings["data"], "json");
		if (a_settings["data_type"] === "topojson") {
			l_data = f_from_topojson(l_data);
		} else if (a_settings["data_type"] === "geojson") {
			l_data = f_from_geojson(l_data);
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
	//route_color、route_text_colorを補う
	f_set_color(l_data);
	//shape_pt_arrayを補う
	f_make_shape_pt_array(l_data);
	//location_typeを補う（未作成）
	f_make_parent_stations(l_data);
	f_stop_number(l_data);
	
	//GTFS-RTの読み込み
	l_data["rt"] = null;
	if (typeof a_settings["rt"] === "string") {
		const c_grb = module.exports.transit_realtime;
		const c_cors_url = a_settings["cors_url"]; //クロスオリジンを回避するphpをかませる
		const c_rt_url = c_cors_url + a_settings["rt"];
		a_data["rt"] = f_binary_to_json(await f_xhr_get(c_rt_url, "arraybuffer"), c_grb);
	}
	
	console.log(l_data);
	//const c_bmd = l_data;
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
	//f_leaflet(c_bmd);
	
	

	//throw new Error("終了");
	
	
	//f_prepare_common(a_data[0]);
	//f_next_2(c_bmd, c_input_settings);//ここから仮につなげる
	if (a_settings["change"] === true) {
		//当面機能停止
		//document.getElementById("ur_route_list").innerHTML = f_ur_route_list(c_bmd);
	}
	console.timeEnd("t2");
	console.time("t3");
	f_make_shape_segments(c_bmd, f_lonlat_xy, a_settings); //新規
	console.timeEnd("t3");
	console.time("t4");
	f_trip_number(c_bmd);//便数を数える
	//グローバルに移す
	if (a_settings["global"] === true) {
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
	for (let i1 = 14; i1 <= 16; i1++) {
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
		L.marker({"lon": a_bmd["parent_stations"][i1]["stop_lon"], "lat": a_bmd["parent_stations"][i1]["stop_lat"]}, {"icon": L.divIcon({"html": "<span style=\"writing-mode:  vertical-rl;\" onclick=\"f_set_stop_id('" + a_bmd["parent_stations"][i1]["stop_id"] + "');\">" + a_bmd["parent_stations"][i1]["stop_name"] + "</span>", className: "className", iconSize: [256, 256], iconAnchor: [-4, -4]})}).addTo(l_map);
	}
	console.timeEnd("u5");
	console.time("u6");
	
	f_zoom();
	//ズームレベル変更→leaflet変更
	l_map.on("zoom", f_zoom);
	console.timeEnd("u6");
	
	function f_zoom() {
		const c_zoom_level = l_map.getZoom();
		if (c_zoom_level <= 14) {
			c_groups["zoom_14"].addTo(l_map);
			c_groups["zoom_15"].remove(l_map);
			c_groups["zoom_16"].remove(l_map);
			a_bmd["layer_zoom_14"].addTo(l_map);
			a_bmd["layer_zoom_15"].remove(l_map);
			a_bmd["layer_zoom_16"].remove(l_map);
		} else if (c_zoom_level === 15) {
			c_groups["zoom_14"].remove(l_map);
			c_groups["zoom_15"].addTo(l_map);
			c_groups["zoom_16"].remove(l_map);
			a_bmd["layer_zoom_14"].remove(l_map);
			a_bmd["layer_zoom_15"].addTo(l_map);
			a_bmd["layer_zoom_16"].remove(l_map);
		} else if (c_zoom_level >= 16) {
			c_groups["zoom_14"].remove(l_map);
			c_groups["zoom_15"].remove(l_map);
			c_groups["zoom_16"].addTo(l_map);
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
		
		f_search_route(window.start_stop_id, window.end_stop_id);
	}
	
	console.time("u7");
	
	//経路検索
	const c_parent_station_index = {};
	for (let i1 = 0; i1 < a_bmd["ur_stops"].length; i1++) {
		c_parent_station_index[a_bmd["ur_stops"][i1]["stop_id"]] = a_bmd["ur_stops"][i1]["parent_station"];
	}
	
	//テスト
	//f_search_route("37", "131");
	
	console.timeEnd("u7");
	//2点間
	function f_search_from_start_end(a_start_parent_station, a_end_parent_station) {
		const c_ur_route_stop_arrays = [];
		for (let i1 = 0; i1 < a_bmd["ur_routes"].length; i1++) {
			let l_stop_array = [];
			let l_start = false;
			let l_end = false;
			for (let i2 = 0; i2 < a_bmd["ur_routes"][i1]["stop_array"].length; i2++) {
				const c_parent_station = c_parent_station_index[a_bmd["ur_routes"][i1]["stop_array"][i2]["stop_id"]];
				if (l_start === true) {
					l_stop_array.push(a_bmd["ur_routes"][i1]["stop_array"][i2 - 1]["stop_id"] + "_to_" + a_bmd["ur_routes"][i1]["stop_array"][i2]["stop_id"]);
				}
				if (c_parent_station === a_start_parent_station) {
					l_stop_array = [];
					l_start = true;
				}
				if (c_parent_station === a_end_parent_station && l_start === true) {
					l_end = true;
					break;
				}
			}
			if (l_end === true) {
				c_ur_route_stop_arrays.push(l_stop_array);
			} else {
				c_ur_route_stop_arrays.push([]);
			}
		}
		return c_ur_route_stop_arrays;
	}
	
	
	//始点から探す
	function f_search_from_start(a_start_parent_station) {
		const c_ur_route_stop_arrays = [];
		for (let i1 = 0; i1 < a_bmd["ur_routes"].length; i1++) {
			c_ur_route_stop_arrays[i1] = {};
			let l_stop_array = [];
			let l_start = false;
			for (let i2 = 0; i2 < a_bmd["ur_routes"][i1]["stop_array"].length; i2++) {
				const c_parent_station = c_parent_station_index[a_bmd["ur_routes"][i1]["stop_array"][i2]["stop_id"]];
				if (l_start === true) {
					l_stop_array.push(a_bmd["ur_routes"][i1]["stop_array"][i2 - 1]["stop_id"] + "_to_" + a_bmd["ur_routes"][i1]["stop_array"][i2]["stop_id"]);
					if (c_ur_route_stop_arrays[i1][c_parent_station] === undefined) {
						c_ur_route_stop_arrays[i1][c_parent_station] = [];
						for (let i3 = 0; i3 < l_stop_array.length; i3++) {
							c_ur_route_stop_arrays[i1][c_parent_station].push(l_stop_array[i3]);
						}
					}
				}
				if (c_parent_station === a_start_parent_station) {
					l_stop_array = [];
					l_start = true;
				}
			}
		}
		return c_ur_route_stop_arrays;
	}
	
	//終点から探す
	function f_search_from_end(a_end_parent_station) {
		const c_ur_route_stop_arrays = [];
		for (let i1 = 0; i1 < a_bmd["ur_routes"].length; i1++) {
			c_ur_route_stop_arrays[i1] = {};
			let l_stop_array = [];
			let l_end = false;
			for (let i2 = a_bmd["ur_routes"][i1]["stop_array"].length - 1; i2 >= 0; i2--) {
				const c_parent_station = c_parent_station_index[a_bmd["ur_routes"][i1]["stop_array"][i2]["stop_id"]];
				if (l_end === true) {
					l_stop_array.push(a_bmd["ur_routes"][i1]["stop_array"][i2]["stop_id"] + "_to_" + a_bmd["ur_routes"][i1]["stop_array"][i2 + 1]["stop_id"]);
					if (c_ur_route_stop_arrays[i1][c_parent_station] === undefined) {
						c_ur_route_stop_arrays[i1][c_parent_station] = [];
						for (let i3 = l_stop_array.length - 1; i3 >= 0; i3--) {
							c_ur_route_stop_arrays[i1][c_parent_station].push(l_stop_array[i3]);
						}
					}
				}
				if (c_parent_station === a_end_parent_station) {
					l_stop_array = [];
					l_end = true;
				}
			}
		}
		return c_ur_route_stop_arrays;
	}
	
	
	function f_search_route(a_start_parent_station, a_end_parent_station) {
		const c_route_se = f_search_from_start_end(a_start_parent_station, a_end_parent_station);
		for (let i1 = 0; i1 < c_route_se.length; i1++) {
			if (c_route_se[i1].length > 0) {
				break;
			}
			if (i1 === c_route_se.length - 1) { //直接の経路がない場合
				const c_mid_parent_station = {}; //始点からも終点からも行ける点
				const c_mid_parent_station_s = {}; //始点から行ける点
				const c_mid_parent_station_e = {}; //終点から行ける点
				const c_route_s = f_search_from_start(a_start_parent_station);
				const c_route_e = f_search_from_end(a_end_parent_station);
				for (let i2 = 0; i2 < c_route_s.length; i2++) {
					for (let i3 in c_route_s[i2]) {
						c_mid_parent_station_s[i3] = true;
					}
				}
				for (let i2 = 0; i2 < c_route_e.length; i2++) {
					for (let i3 in c_route_e[i2]) {
						c_mid_parent_station_e[i3] = true;
					}
				}
				for (let i2 in c_mid_parent_station_s) {
					if (c_mid_parent_station_e[i2] === true) {
						c_mid_parent_station[i2] = true;
					}
				}
				//console.log(c_route_s);
				//console.log(c_route_e);
				for (let i2 = 0; i2 < c_route_s.length; i2++) {
					for (let i3 in c_route_s[i2]) {
						if (c_mid_parent_station[i3] === true) {
							c_route_se[i2] = c_route_se[i2].concat(c_route_s[i2][i3]);
						}
					}
				}
				for (let i2 = 0; i2 < c_route_e.length; i2++) {
					for (let i3 in c_route_e[i2]) {
						if (c_mid_parent_station[i3] === true) {
							c_route_se[i2] = c_route_se[i2].concat(c_route_e[i2][i3]);
						}
					}
				}
			}
		}
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
		//console.log(c_route_se);
		//console.log(c_parent_route_se);
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
	
	
	
	
	

	
	//throw new Error("ここまで");
	
	
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






function f_make_polyline(a_child_shape_segment_array) {
	const c_polyline = [];
	//最初と最後は3点にならない
	//widthは終点側に入れる
	c_polyline.push({"x": a_child_shape_segment_array[0]["sxy"][0]["x"], "y": a_child_shape_segment_array[0]["sxy"][0]["y"], "curve": a_child_shape_segment_array[0]["sxy"][0]["curve"], "original": a_child_shape_segment_array[0]["sm"], "width": null, "ids": a_child_shape_segment_array[0]["sids"]});
	for (let i2 = 0; i2 < a_child_shape_segment_array.length; i2++) {
		if (a_child_shape_segment_array[i2]["exy"].length === 3) {
			c_polyline.push({"x": a_child_shape_segment_array[i2]["exy"][0]["x"], "y": a_child_shape_segment_array[i2]["exy"][0]["y"], "curve": a_child_shape_segment_array[i2]["exy"][0]["curve"], "original": a_child_shape_segment_array[i2]["em"], "width": a_child_shape_segment_array[i2]["w"], "ids": []});
			c_polyline.push({"x": a_child_shape_segment_array[i2]["exy"][1]["x"], "y": a_child_shape_segment_array[i2]["exy"][1]["y"], "curve": a_child_shape_segment_array[i2]["exy"][1]["curve"], "original": a_child_shape_segment_array[i2]["em"], "width": a_child_shape_segment_array[i2]["w"], "ids": a_child_shape_segment_array[i2]["eids"]});
			c_polyline.push({"x": a_child_shape_segment_array[i2]["exy"][2]["x"], "y": a_child_shape_segment_array[i2]["exy"][2]["y"], "curve": a_child_shape_segment_array[i2]["exy"][2]["curve"], "original": a_child_shape_segment_array[i2]["em"], "width": a_child_shape_segment_array[i2 + 1]["w"], "ids": []});
		} else {
			c_polyline.push({"x": a_child_shape_segment_array[i2]["exy"][0]["x"], "y": a_child_shape_segment_array[i2]["exy"][0]["y"], "curve": a_child_shape_segment_array[i2]["exy"][0]["curve"], "original": a_child_shape_segment_array[i2]["em"], "width": a_child_shape_segment_array[i2]["w"], "ids": a_child_shape_segment_array[i2]["eids"]});
		}
	}
	//NaNがないか確認
	for (let i1 = 0; i1 < c_polyline.length; i1++) {
		if (isNaN(c_polyline[i1]["x"])) {
			console.log(c_polyline[i1]["x"]);
			if (i1 !== 0) {
				c_polyline[i1]["x"] = c_polyline[i1 - 1]["x"];
			} else {
				c_polyline[i1]["x"] = c_polyline[i1 + 2]["x"];
			}
		}
		if (isNaN(c_polyline[i1]["y"])) {
			console.log(c_polyline[i1]["y"]);
			if (i1 !== 0) {
				c_polyline[i1]["y"] = c_polyline[i1 - 1]["y"];
			} else {
				c_polyline[i1]["y"] = c_polyline[i1 + 2]["y"];
			}
		}
	}
	return c_polyline;
}




function f_cut_polyline(a_polyline, a_stop_array) {
	const c_stop_number_array = [];
	for (let i1 = 0; i1 < a_polyline.length; i1++) {
		for (let i2 = 0; i2 < a_polyline[i1]["near_stops"].length; i2++) {
			c_stop_number_array.push({"number": i1, "stop_id": a_polyline[i1]["near_stops"][i2]});
		}
	}
	//途中にぬけがあってもよいが、途中からずれる可能性はある
	const c_cut_stop_number_array = [];
	let l_stop_id;
	let l_number = 0;
	for (let i1 = 0; i1 < a_stop_array.length; i1++) {
		l_stop_id = a_stop_array[i1]["stop_id"];
		for (let i2 = l_number; i2 < c_stop_number_array.length; i2++) {
			if (c_stop_number_array[i2]["stop_id"] === l_stop_id) {
				c_cut_stop_number_array.push({"number": c_stop_number_array[i2]["number"], "stop_id": l_stop_id});
				l_number = i2;
			}
		}
	}
	const c_polylines = {};
	for (let i1 = 0; i1 < c_cut_stop_number_array.length - 1; i1++) {
		const c_sid = c_cut_stop_number_array[i1]["stop_id"];
		const c_eid = c_cut_stop_number_array[i1 + 1]["stop_id"];
		const c_id = c_sid + "_to_" + c_eid;
		c_polylines[c_id] = [];
		for (let i2 = c_cut_stop_number_array[i1]["number"]; i2 <= c_cut_stop_number_array[i1 + 1]["number"]; i2++) {
			if (i2 === c_cut_stop_number_array[i1]["number"]) { //最初
				c_polylines[c_id].push({"polyline": [], "width": a_polyline[i2 + 1]["width"]});
			} else if (i2 < c_cut_stop_number_array[i1 + 1]["number"] && a_polyline[i2]["width"] !== a_polyline[i2 + 1]["width"]) { //太さが変わるとき
				c_polylines[c_id][c_polylines[c_id].length - 1]["polyline"].push({"lon": a_polyline[i2]["lon"], "lat": a_polyline[i2]["lat"]});
				c_polylines[c_id].push({"polyline": [], "width": a_polyline[i2 + 1]["width"]});
			}
			c_polylines[c_id][c_polylines[c_id].length - 1]["polyline"].push({"lon": a_polyline[i2]["lon"], "lat": a_polyline[i2]["lat"]});
		}
	}
	const c_curves = {};
	//緯度経度が{"lon": a_polyline[i2]["lon"], "lat": a_polyline[i2]["lat"]}は不可
	for (let i1 = 0; i1 < c_cut_stop_number_array.length - 1; i1++) {
		const c_sid = c_cut_stop_number_array[i1]["stop_id"];
		const c_eid = c_cut_stop_number_array[i1 + 1]["stop_id"];
		const c_id = c_sid + "_to_" + c_eid;
		c_curves[c_id] = [];
		for (let i2 = c_cut_stop_number_array[i1]["number"]; i2 <= c_cut_stop_number_array[i1 + 1]["number"]; i2++) {
			if (i2 === c_cut_stop_number_array[i1]["number"]) { //最初
				c_curves[c_id].push({"curve": [], "width": a_polyline[i2 + 1]["width"]});
				c_curves[c_id][c_curves[c_id].length - 1]["curve"].push("M");
				c_curves[c_id][c_curves[c_id].length - 1]["curve"].push([a_polyline[i2]["lat"], a_polyline[i2]["lon"]]);
			} else if (i2 < c_cut_stop_number_array[i1 + 1]["number"] && a_polyline[i2]["width"] !== a_polyline[i2 + 1]["width"]) { //太さが変わるとき
				//前の点
				if (a_polyline[i2 - 1]["curve"] === true && a_polyline[i2 - 1]["width"] === a_polyline[i2]["width"]) { //前が曲線で、太さが変わっていない
					c_curves[c_id][c_curves[c_id].length - 1]["curve"].push([a_polyline[i2]["lat"], a_polyline[i2]["lon"]]);
				} else { //前が曲線でない
					c_curves[c_id][c_curves[c_id].length - 1]["curve"].push("L");
					c_curves[c_id][c_curves[c_id].length - 1]["curve"].push([a_polyline[i2]["lat"], a_polyline[i2]["lon"]]);
				}
				//次の点
				c_curves[c_id].push({"curve": [], "width": a_polyline[i2 + 1]["width"]});
				c_curves[c_id][c_curves[c_id].length - 1]["curve"].push("M");
				c_curves[c_id][c_curves[c_id].length - 1]["curve"].push([a_polyline[i2]["lat"], a_polyline[i2]["lon"]]);
			} else { //太さが変わらないとき
				if (a_polyline[i2 - 1]["curve"] === true && a_polyline[i2 - 1]["width"] === a_polyline[i2]["width"]) { //前が曲線で、太さが変わっていない
					c_curves[c_id][c_curves[c_id].length - 1]["curve"].push([a_polyline[i2]["lat"], a_polyline[i2]["lon"]]);
				} else if (i2 < c_cut_stop_number_array[i1 + 1]["number"] && a_polyline[i2]["curve"] === true) { //曲線
					c_curves[c_id][c_curves[c_id].length - 1]["curve"].push("Q");
					c_curves[c_id][c_curves[c_id].length - 1]["curve"].push([a_polyline[i2]["lat"], a_polyline[i2]["lon"]]);
				} else { //線分
					c_curves[c_id][c_curves[c_id].length - 1]["curve"].push("L");
					c_curves[c_id][c_curves[c_id].length - 1]["curve"].push([a_polyline[i2]["lat"], a_polyline[i2]["lon"]]);
				}
			}
		}
	}
	const c_stop_array = [];
	for (let i1 = 0; i1 < c_cut_stop_number_array.length; i1++) {
		c_stop_array.push({"lon": a_polyline[c_cut_stop_number_array[i1]["number"]]["lon"], "lat": a_polyline[c_cut_stop_number_array[i1]["number"]]["lat"]});
	}
	return {"polylines": c_polylines, "curves": c_curves, "stop_array": c_stop_array};
}


//問題点
//途中で停留所所が見つからず、2回目に出現する位置にずれると、途中が抜けて変になりうる

function f_2(a_polyline, a_stop_array) {
	const c_number_array = [];
	for (let i1 = 0; i1 < a_polyline.length; i1++) {
		for (let i2 = 0; i2 < a_polyline[i1]["near_stops"].length; i2++) {
			c_number_array.push({"number": i1, "stop_id": a_polyline[i1]["near_stops"][i2]});
		}
	}
	const c_cut_number_array = [];
	let l_stop_id;
	let l_number = 0;
	for (let i1 = 0; i1 < a_stop_array.length; i1++) {
		l_stop_id = a_stop_array[i1]["stop_id"];
		for (let i2 = l_number; i2 < c_number_array.length; i2++) {
			if (c_number_array[i2]["stop_id"] === l_stop_id) {
				c_cut_number_array.push(c_number_array[i2]["number"]);
				l_number = i2;
			}
		}
	}
	
	
	const c_ids = [];
	for (let i1 = 0; i1 < a_polyline.length; i1++) {
		for (let i2 = 0; i2 < a_polyline[i1]["ids"].length; i2++) {
			c_ids.push(a_polyline[i1]["ids"][i2]);
		}
	}
	
	//console.log({"na": c_number_array, "sa": a_stop_array, "ca": c_cut_number_array, "al": a_polyline.length, "id": c_ids});
	const c_polyline_array = [];
	for (let i1 = 0; i1 < c_cut_number_array.length - 1; i1++) {
		c_polyline_array.push([]);
		for (let i2 = c_cut_number_array[i1]; i2 <= c_cut_number_array[i1 + 1]; i2++) {
			c_polyline_array[i1].push({"lon": a_polyline[i2]["lon"], "lat": a_polyline[i2]["lat"]});
		}
	}
	const c_curve_array = [];
	for (let i1 = 0; i1 < c_cut_number_array.length - 1; i1++) {
		c_curve_array.push([]);
		for (let i2 = c_cut_number_array[i1]; i2 <= c_cut_number_array[i1 + 1]; i2++) {
			//緯度経度がc_curve_array[i1].push({"lon": a_polyline[i2]["lon"], "lat": a_polyline[i2]["lat"]});は不可
			if (i2 === c_cut_number_array[i1]) { //最初
				c_curve_array[i1].push("M");
				c_curve_array[i1].push([a_polyline[i2]["lat"], a_polyline[i2]["lon"]]);
			} else if (a_polyline[i2 - 1]["curve"] === false && a_polyline[i2]["curve"] === false) { //線分
				c_curve_array[i1].push("L");
				c_curve_array[i1].push([a_polyline[i2]["lat"], a_polyline[i2]["lon"]]);
			} else if (a_polyline[i2]["curve"] === true) { //曲線
				c_curve_array[i1].push("Q");
				c_curve_array[i1].push([a_polyline[i2]["lat"], a_polyline[i2]["lon"]]);
			} else if (a_polyline[i2 - 1]["curve"] === true && a_polyline[i2]["curve"] === false) { //曲線の後ろ
				c_curve_array[i1].push([a_polyline[i2]["lat"], a_polyline[i2]["lon"]]);
			}
		}
	}
	const c_stop_array = [];
	for (let i1 = 0; i1 < c_cut_number_array.length; i1++) {
		c_stop_array.push({"lon": a_polyline[c_cut_number_array[i1]]["lon"], "lat": a_polyline[c_cut_number_array[i1]]["lat"]});
	}
	return {"polyline_array": c_polyline_array, "stop_array": c_stop_array, "curve_array": c_curve_array};
}





function f_ur_route_list(a_data) {
	//ur_route一覧表を作る。
	let l_table = "<table><tbody>\n<tr><td>表示</td><td>事業者</td><td>営業所</td><td>親経路id</td><td>経路id</td><td>経路略称</td><td>経路名</td><td>運行回数</td></tr>";
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		const c_ur_route = a_data["ur_routes"][i1];
		l_table += "\n<tr><td>" + "<input checked=\"checked\" name=\"" + c_ur_route["ur_route_id"] + "\" type=\"checkbox\" value=\"1\" />" + "</td><td>" + c_ur_route["agency_id"] +"</td><td>" + c_ur_route["jp_office_id"] +"</td><td>" + c_ur_route["jp_parent_route_id"] +"</td><td style=\"background-color: #" + c_ur_route["route_color"] + "; color: #" + c_ur_route["route_text_color"] + ";\">" + c_ur_route["route_id"] + "</td><td>" + c_ur_route["route_short_name"] +"</td><td>" + c_ur_route["route_long_name"] +"</td><td>";
		for (let i2 = 0; i2 < c_ur_route["service_array"].length; i2++) {
			const c_service = c_ur_route["service_array"][i2];
			l_table += c_service["service_id"] + ": " + c_service["number"] +" ";
		}
		l_table += "</td></tr>";
	}
	l_table += "\n</tbody></table>";
	return l_table;
}







//路線時刻表作成
function f_stop_array(a_data) {
	console.log(a_data);
	console.log(a_data["parent_routes"]);
	for (let i1 = 0; i1 < a_data["parent_routes"].length; i1++) {
		const c_parent_route_stop_array = [];
		for (let i2 = 0; i2 < a_data["ur_routes"].length; i2++) {
			if (a_data["ur_routes"][i2]["parent_route_id"] !== a_data["parent_routes"][i1]["parent_route_id"]) { //parentが違う経路
				continue;
			}
			
			//tripを1つ探す。
			let l_trip_stop_times;
			for (let i3 = 0; i3 < a_data["trips"].length; i3++) {
				if (a_data["trips"][i3]["route_id"] === a_data["ur_routes"][i2]["route_id"]) {
					l_trip_stop_times = a_data["trips"][i3]["stop_times"];
					break;
				}
			}
			//stop_timesを探し、標柱リストを作る。
			const c_stop_array = [];
			for (let i3 = 0; i3 < l_trip_stop_times.length - 1; i3++) {
				c_stop_array.push([l_trip_stop_times[i3]["stop_id"], l_trip_stop_times[i3 + 1]["stop_id"]]);
			}
			
			//同じところを探し、見つかったら違うところをその直前に挿入する。
			let l_number = -1; //この番号まで入力済み
			for (let i3 = 0; i3 < c_stop_array.length; i3++) {
				for (let i4 = 0; i4 < c_parent_route_stop_array.length; i4++) {
					if (c_parent_route_stop_array[i4][0] === c_stop_array[i3][0] && c_parent_route_stop_array[i4][1] === c_stop_array[i3][1]) { //同じところがある
						//l_number + 1～i3 - 1までを追加する。
						for (let i5 = 0; i5 < i3 - l_number - 1; i5++) {
							c_parent_route_stop_array.splice(i4 + i5, 0, [c_stop_array[l_number + 1 + i5][0], c_stop_array[l_number + 1 + i5][1]]);
						}
						l_number = i3;
					}
				}
			}
			//未入力が残る場合
			if (l_number !== c_stop_array.length - 1) {
				for (let i3 = 0; i3 < c_stop_array.length - 1 - l_number; i3++) {
					c_parent_route_stop_array.push([c_stop_array[l_number + 1 + i3][0], c_stop_array[l_number + 1 + i3][1]]);
				}
			}
		}
		//console.log(c_parent_route_stop_array);
		a_data["parent_routes"][i1]["stop_array"] = c_parent_route_stop_array;
		
	}
}




function f_trip_number(a_data) {
	//trip_numberを計算する。一週間の平均とする。
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		if (a_data["ur_routes"][i1]["service_array"] !== "") {
			a_data["ur_routes"][i1]["trip_number"] = 0;
		}
		for (let i2 = 0; i2 < a_data["ur_routes"][i1]["service_array"].length; i2++) {
			for (let i3 = 0; i3 < a_data["calendar"].length; i3++) {
				if (a_data["ur_routes"][i1]["service_array"][i2]["service_id"] === a_data["calendar"][i3]["service_id"]) {
					const c_day = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
					for (let i4 = 0; i4 < c_day.length; i4++) {
						if (a_data["calendar"][i2] === undefined) {
							continue; //calendarがない場合があるので追加
						}
						if (a_data["calendar"][i2][c_day[i4]] === "1") {
							a_data["ur_routes"][i1]["trip_number"] += a_data["ur_routes"][i1]["service_array"][i2]["number"] / 7;//trip_numberではない！
							//console.log(a_data["ur_routes"][i1]["service_array"][i2]["number"]);
						}
					}
				}
			}
		}
	}
}


function f_make_svg(a_data, a_settings) {
	console.log(a_data);
	//この段階では平行移動による位置の調整はしていない。
	
	//左右上下の端を調べる
	let l_x_min = Number.MAX_SAFE_INTEGER;
	let l_x_max = 0;
	let l_y_min = Number.MAX_SAFE_INTEGER;
	let l_y_max = 0;
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		for (let i2 = 0; i2 < a_data["ur_routes"][i1]["shape_pt_array"].length; i2++) {
			const c_point = a_data["ur_routes"][i1]["shape_pt_array"][i2];
			const c_point_x = c_point["shape_pt_x"];
			const c_point_y = c_point["shape_pt_y"];
			if (c_point_x < l_x_min) {
				l_x_min = c_point_x;
			}
			if (l_x_max < c_point_x) {
				l_x_max = c_point_x;
			}
			if (c_point_y < l_y_min) {
				l_y_min = c_point_y;
			}
			if (l_y_max < c_point_y) {
				l_y_max = c_point_y;
			}
		}
	}
	
	//どうせ0,0付近は使われない前提
	const c_x_left = Math.floor(l_x_min / 256 - 1) * 256;
	const c_y_top = Math.floor(l_y_min / 256 - 1) * 256;
	const c_x_width = Math.ceil((l_x_max - l_x_min) / 256 + 2) * 256;
	const c_y_height = Math.ceil((l_y_max - l_y_min) / 256 + 2) * 256;
	
	
	//ツールチップ
	let l_t_tooltip = "<text id=\"t_tooltip\" x=\"0\" y=\"0\" style=\"font-size: 12px; line-height: 1; stroke: #FFFFFF; fill: #000000; stroke-width: 4px; opacity: 1;\">ツールチップ</text>";
	
	//現在位置を表示する。
	let l_t_position = "<text id=\"t_position\" x=\"0\" y=\"0\" style=\"font-size: 64px; line-height: 1; fill: #000000; opacity: 0.5;\">現在位置</text>";
	
	let l_make_g = "";
	for (let i1 = 0; i1 <= a_settings["svg_zoom_ratio"]; i1++) {
		l_make_g += f_make_g(i1);
	}
	
	const c_svg = l_make_g + l_t_tooltip + l_t_position;
	return c_svg;
	
	
	function f_make_g(a_zoom_16) {
		const c_zoom_16 = 2** a_zoom_16;
		const c_polyline_key = "polyline_" + String(a_zoom_16);
		const c_matrix = {};
		
		//経路の折れ線のレイヤー
		//太さが変わるごとに別のpathにする。
		let l_g_routes = "<g class=\"g_routes\" style=\"fill: none; stroke: red; stroke-width: 2px; stroke-linejoin: round;\">";
		for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
			//parent_routeの色を探す。
			let l_route_color;
			for (let i2 = 0; i2 < a_data["parent_routes"].length; i2++) {
				if (a_data["parent_routes"][i2]["parent_route_id"] === a_data["ur_routes"][i1]["parent_route_id"]) {
					l_route_color = a_data["parent_routes"][i2]["route_color"];
				}
			}
			for (let i2 = 0; i2 < a_data["ur_routes"][i1][c_polyline_key].length; i2++) {
				let l_g_routes_i1 ="";
				l_g_routes_i1 += "<path";
				if (a_settings["clickable"] === true) {
					l_g_routes_i1 += " onclick=\"f_show_routes('" + a_data["ur_routes"][i1]["parent_route_id"] + "')\"";
				}
				l_g_routes_i1 += " class=\"class_routes class_parent_" + a_data["ur_routes"][i1]["parent_route_id"] + " class_ur_" + a_data["ur_routes"][i1]["route_id"] + " " + "g_polyline_" + i1 + "_" + i2 + "\" style=\"pointer-events: auto; stroke: #" + l_route_color +"; stroke-width: " + a_data["ur_routes"][i1][c_polyline_key][i2]["width"] + ";\" d=\"";
				let l_exist = false;//1つめがあればtrue
				let l_exist_2 = false;//ないものがあればtrue
				for (let i3 = 0; i3 < a_data["ur_routes"][i1][c_polyline_key][i2]["polyline"].length; i3++) {
					const c_point = a_data["ur_routes"][i1][c_polyline_key][i2]["polyline"][i3];
					if (isNaN(c_point["x"]) || isNaN(c_point["y"])) {
						l_exist_2 = true;
						continue; //まずい点は除く
					}
					if (l_exist === false) { //最初
						l_exist = true;
						l_g_routes_i1 += "M " + c_point["x"] + "," + c_point["y"];
						continue;
					}
					if (a_settings["round"] === true && !(isNaN(c_point["sx"]) || isNaN(c_point["sy"]) || isNaN(c_point["ex"]) || isNaN(c_point["ey"]))) { //欠けがない、曲線
						l_g_routes_i1 += "L " + c_point["sx"] + "," + c_point["sy"] + " Q " + c_point["x"] + "," + c_point["y"] + " "+ c_point["ex"] + "," + c_point["ey"];
					} else {
						l_g_routes_i1 += "L " + c_point["x"] + "," + c_point["y"];
					}
				}
				l_g_routes_i1 += "\" />\n";
				if (l_exist === true) {
					l_g_routes += l_g_routes_i1;
					if (l_exist_2 === true) {
						console.log("NaNあり");
					}
				} else {
					console.log("全てNaN");
				}
			}
		}
		l_g_routes += "</g>";
		
		
		let l_min_r = a_settings["min_width"] / 2 + a_settings["min_space_width"] / 2;
		if (l_min_r > 4) {
			l_min_r = a_settings["min_width"] / 2 +a_settings["stop_stroke_width"] / 2;
		}
		const c_min_r = l_min_r; //a_settings["min_width"] / 2 + a_settings["min_space_width"] / 2; //円の半径
		//停留所にバスがとまるか表示
		//不完全かもしれない。複数経路には対応しない。経路毎につくって重ねているだけ。
		//stop→shape_pt_number→polylineと辿る。
		for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
			for (let i2 = 0; i2 < a_data["ur_routes"][i1]["stop_array"].length; i2++) {
				const c_stop_number = a_data["ur_routes"][i1]["stop_array"][i2]["stop_number"];
				a_data["ur_routes"][i1]["stop_array"][i2]["shape_pt_number"] = a_data["stops"][c_stop_number]["shape_pt_number"];
			}
		}
		
		
		//経路毎に各stopに対応するshape_pointを探す
		//見つからない場合は、飛ばして次に進むようになっている
		//飛ばされた場合、直前の標柱が暫定的に使われる。
		for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
			let l_i3 = 0;
			let l_i4 = 0;
			let l_i5 = 0;
			for (let i2 = 0; i2 < a_data["ur_routes"][i1]["stop_array"].length; i2++) {
				const c_shape_pt_number = a_data["ur_routes"][i1]["stop_array"][i2]["shape_pt_number"];
				loop: for (let i3 = 0; i3 < a_data["ur_routes"][i1][c_polyline_key].length; i3++) {
					if (i3 < l_i3) {
						continue;
					}
					for (let i4 = 0; i4 < a_data["ur_routes"][i1][c_polyline_key][i3]["polyline"].length; i4++) {
						if (i3 === l_i3 && i4 < l_i4) {
							continue;
						}
						for (let i5 = 0; i5 < a_data["ur_routes"][i1][c_polyline_key][i3]["polyline"][i4]["unified_shape_pt_numbers"].length; i5++) {
							if (i3 === l_i3 && i4 === l_i4 && i5 !== l_i5) { //i5は直前と異なれば順序はどうでもいい。
								continue;
							}
							if (a_data["ur_routes"][i1][c_polyline_key][i3]["polyline"][i4]["unified_shape_pt_numbers"][i5] === c_shape_pt_number) {
								l_i3 = i3;
								l_i4 = i4;
								l_i5 = i5;
								break loop;
							}
						}
					}
				}
				a_data["ur_routes"][i1]["stop_array"][i2]["polyline_number_1"] = l_i3;
				a_data["ur_routes"][i1]["stop_array"][i2]["polyline_number_2"] = l_i4;
				a_data["ur_routes"][i1]["stop_array"][i2]["x"] = a_data["ur_routes"][i1][c_polyline_key][l_i3]["polyline"][l_i4]["x"];
				a_data["ur_routes"][i1]["stop_array"][i2]["y"] = a_data["ur_routes"][i1][c_polyline_key][l_i3]["polyline"][l_i4]["y"];
				//shapeの向きを求める
				let l_x;
				let l_y;
				if (l_i3 === 0 && l_i4 === 0) { //最初
					if (a_data["ur_routes"][i1][c_polyline_key][l_i3]["polyline"].length < 2) {
						l_x = 1;
						l_y = 0;
					} else {
						l_x = a_data["ur_routes"][i1][c_polyline_key][l_i3]["polyline"][l_i4 + 1]["x"] - a_data["ur_routes"][i1][c_polyline_key][l_i3]["polyline"][l_i4]["x"];
						l_y = a_data["ur_routes"][i1][c_polyline_key][l_i3]["polyline"][l_i4 + 1]["y"] - a_data["ur_routes"][i1][c_polyline_key][l_i3]["polyline"][l_i4]["y"];
					}
				} else if (l_i3 === a_data["ur_routes"][i1][c_polyline_key].length - 1 && l_i4 === a_data["ur_routes"][i1][c_polyline_key][l_i3]["polyline"].length - 1) { //最後
					l_x = a_data["ur_routes"][i1][c_polyline_key][l_i3]["polyline"][l_i4]["x"] - a_data["ur_routes"][i1][c_polyline_key][l_i3]["polyline"][l_i4 - 1]["x"];
					l_y = a_data["ur_routes"][i1][c_polyline_key][l_i3]["polyline"][l_i4]["y"] - a_data["ur_routes"][i1][c_polyline_key][l_i3]["polyline"][l_i4 - 1]["y"];
				} else if (l_i4 === 0) { //前が違うpolyline
					const c_i4_2 = a_data["ur_routes"][i1][c_polyline_key][l_i3 - 1]["polyline"].length - 1;
					if (a_data["ur_routes"][i1][c_polyline_key][l_i3]["polyline"].length < 2) {
						l_x = 1;
						l_y = 0;
					} else {
						l_x = a_data["ur_routes"][i1][c_polyline_key][l_i3]["polyline"][l_i4 + 1]["x"] - a_data["ur_routes"][i1][c_polyline_key][l_i3 - 1]["polyline"][c_i4_2]["x"];
						l_y = a_data["ur_routes"][i1][c_polyline_key][l_i3]["polyline"][l_i4 + 1]["y"] - a_data["ur_routes"][i1][c_polyline_key][l_i3 - 1]["polyline"][c_i4_2]["y"];
					}
				} else if (l_i4 === a_data["ur_routes"][i1][c_polyline_key][l_i3]["polyline"].length - 1) { //後ろが違うpolyline
					l_x = a_data["ur_routes"][i1][c_polyline_key][l_i3 + 1]["polyline"][0]["x"] - a_data["ur_routes"][i1][c_polyline_key][l_i3]["polyline"][l_i4 - 1]["x"];
					l_y = a_data["ur_routes"][i1][c_polyline_key][l_i3 + 1]["polyline"][0]["y"] - a_data["ur_routes"][i1][c_polyline_key][l_i3]["polyline"][l_i4 - 1]["y"];
				} else {
					l_x = a_data["ur_routes"][i1][c_polyline_key][l_i3]["polyline"][l_i4 + 1]["x"] - a_data["ur_routes"][i1][c_polyline_key][l_i3]["polyline"][l_i4 - 1]["x"];
					l_y = a_data["ur_routes"][i1][c_polyline_key][l_i3]["polyline"][l_i4 + 1]["y"] - a_data["ur_routes"][i1][c_polyline_key][l_i3]["polyline"][l_i4 - 1]["y"];
				}
				//正規化
				let l_x_2;
				let l_y_2;
				if (l_x === 0 && l_y === 0) {
					l_x_2 = 1;
					l_y_2 = 0;
				} else {
					l_x_2 = l_x / ((l_x ** 2 + l_y ** 2) ** 0.5);
					l_y_2 = l_y / ((l_x ** 2 + l_y ** 2) ** 0.5);
				}
				a_data["ur_routes"][i1]["stop_array"][i2]["dx"] = l_x_2;
				a_data["ur_routes"][i1]["stop_array"][i2]["dy"] = l_y_2;
			}
		}
		
		for (let i1 = 0; i1 < a_data["parent_routes"].length; i1++) {
			a_data["parent_routes"][i1]["stops"] = [];
		}
		
		for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
			const c_parent_route_number = a_data["ur_routes"][i1]["parent_route_number"];
			const c_stops = a_data["parent_routes"][c_parent_route_number]["stops"];
			for (let i2 = 0; i2 < a_data["ur_routes"][i1]["stop_array"].length; i2++) {
				const c_stop = a_data["ur_routes"][i1]["stop_array"][i2];
				let l_type_0 = false; //始発終着等なしでtrue
				if (c_stop["drop_off_type"] === "0" && c_stop["pickup_type"] === "0") {
					l_type_0 = true;
				}
				let l_type_1 = false; //停車なしでtrue
				if (c_stop["drop_off_type"] === "1" && c_stop["pickup_type"] === "1") {
					l_type_1 = true;
				}
				
				let l_exist = false;
				for (let i3 = 0; i3 < c_stops.length; i3++) {
					if (c_stops[i3]["stop_id"] === c_stop["stop_id"] && c_stops[i3]["x"] === c_stop["x"] && c_stops[i3]["y"] === c_stop["y"]) {
						if (l_type_0 === false) { //始発終着等あり
							c_stops[i3]["type_0"] = false;
						}
						if (l_type_1 === false) { //停車あり
							c_stops[i3]["type_1"] = false;
						}
						l_exist = true;
						break;
					}
				}
				if (l_exist === false) {
					c_stops.push({
						"stop_id": c_stop["stop_id"]
						, "x": c_stop["x"]
						, "y": c_stop["y"]
						, "dx": c_stop["dx"]
						, "dy": c_stop["dy"]
						, "type_0": l_type_0
						, "type_1": l_type_1
					});
				}
			}
		}
		
		//標柱点の色
		let l_type_0_color = a_settings["stop_color_standard"]; //通常の停留所記号の色#FFFFFF
		let l_type_1_color = a_settings["stop_color_nonstandard"]; //起終点等の停留所記号の色#FFFF00
		let l_location_color = a_settings["stop_color_location"]; //位置を示す停留所記号の色#c0c0c0
		let l_stroke_color = a_settings["stop_stroke_color"]; //停留所記号の縁の色
		//標柱記号の縁取りの太さ
		let l_stroke_width = String(a_settings["stop_stroke_width"] * c_zoom_16); //停留所記号の縁の太さ1 * c_zoom_16 //String(c_min_r / 2 * c_zoom_16);
		
		
		/*
		if (false) { //灰色
			l_type_0_color = "#808080";
			l_type_1_color = "#000000";
			l_location_color = "#6060060";
			l_stroke_color = "#FFFFFF";
			l_stroke_width = String(c_min_r / 2 * c_zoom_16 / 2);
		}
		if (false) { //白
			l_type_0_color = "#FFFFFF";
			l_type_1_color = "#c0c0c0";
			l_location_color = "#000000";
			l_stroke_color = "#000000";
			l_stroke_width = String(c_min_r / 2 * c_zoom_16);
		}
		if (false) { //白縁の黒
			l_type_0_color = "#000000";
			l_type_1_color = "#808080";
			l_location_color = "#6060060";
			l_stroke_color = "#FFFFFF";
			l_stroke_width = String(c_min_r / 2 * c_zoom_16);
		}
		*/
		
		
		
		let l_g_stop_type = "<g class=\"g_stop_type\">";
		for (let i1 = 0; i1 < a_data["parent_routes"].length; i1++) {
			for (let i2 = 0; i2 < a_data["parent_routes"][i1]["stops"].length; i2++) {
				const c_stop = a_data["parent_routes"][i1]["stops"][i2];
				if (isNaN(c_stop["x"]) || isNaN(c_stop["y"])) {
					console.log("NaN");
					continue;
				}
				let l_fill_color; //塗色、falseのとき非表示
				if (c_stop["type_0"] === true) {//始発終着等なし
					l_fill_color = l_type_0_color;
				} else if (c_stop["type_1"] === true) {//停車なし
					l_fill_color = false;
				} else {//その他
					l_fill_color = l_type_1_color;
				}
				
				if (l_fill_color !== false) { //表示
					if (a_settings["stop_direction"] === false) { //円
						l_g_stop_type += "<circle";
						if (a_settings["clickable"] === true) {
							l_g_stop_type += " onclick=\"f_show_stops('" + c_stop["stop_id"] + "')\"";
						}
						l_g_stop_type += " cx=\"" + c_stop["x"] + "\" cy=\"" + c_stop["y"] + "\" r=\"" + String(c_min_r * c_zoom_16) + "\" style=\"fill: " + l_fill_color + "; stroke: " + l_stroke_color + "; stroke-width: " + l_stroke_width + "; opacity: 1;\" />";
					} else { //三角
						l_g_stop_type += "<path";
						if (a_settings["clickable"] === true) {
							l_g_stop_type += " onclick=\"f_show_stops('" + c_stop["stop_id"] + "')\"";
						}
						l_g_stop_type += " d=\"M1,0 L-1,-1 L-1,1 Z\" transform=\"translate(" + c_stop["x"] + "," + c_stop["y"] + ")scale(" + String(c_min_r * c_zoom_16 / 2 + 1) + ")matrix(" + c_stop["dx"] + "," + c_stop["dy"] + "," + (-1 * c_stop["dy"]) + "," + c_stop["dx"] + ",0,0)\" style=\"fill: " + l_fill_color + "; stroke: " + l_stroke_color + "; stroke-width: " + (l_stroke_width / (c_min_r * c_zoom_16 / 2 + 1)) + "; opacity: 1;\" />";
					}
				}
				
				
				
				//dot matrix
				if (a_settings["stop_name_overlap"] === false) {
					const c_y = Math.floor(c_stop["y"]) - c_y_top;
					const c_x = Math.floor(c_stop["x"]) - c_x_left;
					/*
					for (let i3 = c_y - 3; i3 <= c_y + 4; i3++) {
						for (let i4 = c_x - 3; i4 <= c_x + 4; i4++) {
							c_matrix["x_" + String(i4) + "_y_" + String(i3)] = true;
						}
					}
					*/
					const c_o = c_min_r * c_zoom_16 * 1.5;
					for (let i3 = c_y - c_o + 1; i3 <= c_y + c_o; i3++) {
						for (let i4 = c_x - c_o + 1; i4 <= c_x + c_o; i4++) {
							c_matrix["x_" + String(i4) + "_y_" + String(i3)] = true;
						}
					}
				}
			}
		}
		
		l_g_stop_type += "</g>";
		
		
		
		
		
		
		
		
		
		
		
		
		
		let l_visibility = "visible";
		if (a_settings["show_stop_location"] === false) {
			l_visibility = "hidden";
		}
		//標柱の位置を表示
		let l_g_stop_location = "<g class=\"g_stop_location\" style=\"fill: " + l_location_color + "; stroke: " + l_stroke_color + "; visibility: " + l_visibility + ";\">";
		for (let i1 = 0; i1 < a_data["stops"].length; i1++) {
			if (a_data["stops"][i1]["location_type"] === "0") {
				if (isNaN(a_data["stops"][i1]["shape_pt_x"]) || isNaN(a_data["stops"][i1]["shape_pt_y"])) {
					console.log("NaN");
					continue;
				}
				l_g_stop_location += "<circle class=\"stop_location stop_location_" + a_data["stops"][i1]["stop_id"] + "\"";
				if (a_settings["clickable"] === true) {
					l_g_stop_location += " onclick=\"f_show_stops('" + a_data["stops"][i1]["stop_id"] + "')\"";
				}
				l_g_stop_location += " cx=\"" + a_data["stops"][i1]["shape_pt_x"] + "\" cy=\"" + a_data["stops"][i1]["shape_pt_y"] + "\" r=\"" + String(c_min_r * c_zoom_16) + "\" style=\"stroke-width: " + l_stroke_width + "; opacity: 1;\" />";
				//位置を記録する。
				//dot matrix
				if (a_settings["stop_name_overlap"] === false) {
					const c_x = Math.floor(a_data["stops"][i1]["shape_pt_x"]) - c_x_left;
					const c_y = Math.floor(a_data["stops"][i1]["shape_pt_y"]) - c_y_top;
					/*
					for (let i3 = c_y - 3; i3 <= c_y + 4; i3++) {
						for (let i4 = c_x - 3; i4 <= c_x + 4; i4++) {
							c_matrix["x_" + String(i4) + "_y_" + String(i3)] = true;
						}
					}
					*/
					const c_o = c_min_r * c_zoom_16 * 1.5;
					for (let i3 = c_y - c_o + 1; i3 <= c_y + c_o; i3++) {
						for (let i4 = c_x - c_o + 1; i4 <= c_x + c_o; i4++) {
							c_matrix["x_" + String(i4) + "_y_" + String(i3)] = true;
						}
					}
				}
			}
		 }
		l_g_stop_location += "</g>";
		
		
		
		
		
		//停留所名表示
		const c_font_size = a_settings["font_size"];//16;
		const c_font_family = a_settings["font_family"];//"'IPAexGothic'";
		let l_stroke_opacity = "0.5"; //半透明
		if (a_settings["stop_name_overlap"] === false) { //重なり回避
			l_stroke_opacity = "1";
		}
		let l_g_stop_name = "<g class=\"g_stop_name\" style=\"font-family: " + c_font_family + "; font-size: " + String(c_font_size * c_zoom_16) + "px; line-height: 1; stroke: #FFFFFF; stroke-width: " + String(4 * c_zoom_16) + "px; stroke-opacity: " + l_stroke_opacity + ";\">";
		for (let i1 = 0; i1 < a_data["stops"].length; i1++) {
			if (a_data["stops"][i1]["location_type"] === "1") {
				
				const c_w = (a_data["stops"][i1]["stop_name"].length + 4) * c_font_size * c_zoom_16; //全角4文字分は時刻表示用
				const c_x = Math.floor(a_data["stops"][i1]["shape_pt_x"]) - c_x_left;
				const c_y = Math.floor(a_data["stops"][i1]["shape_pt_y"]) - c_y_top;
				let l_y_new = c_y;
				
				//x座標を固定してy座標が適する位置を探す。
				let l_count = 0;
				
				if (a_settings["stop_name_overlap"] === false) {
					for (let i2 = c_y; i2 < c_y + 256; i2++) { //256px探す
						let l_exist = false;
						for (let i3 = c_x; i3 <= c_x + c_w; i3++) {
							if (c_matrix["x_" + String(i3) + "_y_" + String(i2)] === true) {
								l_exist = true;
							}
						}
						if (l_exist === true) { //何かあるとき
							l_count = 0;
						} else {
							l_count += 1;
						}
						if (l_count === c_font_size * c_zoom_16) {
							l_y_new = i2 - c_font_size + 1;
							break;
						}
					}
					
					//位置を記録する。
					//dot matrix
					for (let i3 = l_y_new; i3 <= l_y_new + c_font_size * c_zoom_16; i3++) {
						for (let i4 = c_x; i4 <= c_x + c_w * c_zoom_16; i4++) {
							c_matrix["x_" + String(i4) + "_y_" + String(i3)] = true;
						}
					}
				}
				
				//経路名の表示は省略
				if (isNaN(c_x + c_x_left) || isNaN(l_y_new + c_y_top + c_font_size - 2)) {
					console.log("NaN");
					continue;
				}
				//停留所名
				l_g_stop_name += "<text x='" + (c_x + c_x_left + c_min_r * 4) + "' y='" + (l_y_new + c_y_top + c_font_size - 2) + "'><tspan fill=\"#FFFFFF\" stroke=\"FFFFFF\" class=\"stop_name_background stop_name_background_" + a_data["stops"][i1]["stop_id"] + "\"";
				if (a_settings["clickable"] === true) {
					l_g_stop_name += " onclick=\"f_show_stops('" + a_data["stops"][i1]["stop_id"] + "')\"";
				}
				l_g_stop_name += ">" + a_data["stops"][i1]["stop_name"] + "</tspan><tspan fill=\"#000000\" stroke=\"000000\" class=\"stop_time_background stop_time_background_" + a_data["stops"][i1]["stop_id"] + "\"></tspan></text><text x='" + (c_x + c_x_left + c_min_r * 4) + "' y='" + (l_y_new + c_y_top + c_font_size - 2) + "'><tspan fill=\"#000000\" stroke=\"none\" class=\"stop_name stop_name_" + a_data["stops"][i1]["stop_id"] + "\"";
				if (a_settings["clickable"] === true) {
					l_g_stop_name += " onclick=\"f_show_stops('" + a_data["stops"][i1]["stop_id"] + "')\"";
				}
				l_g_stop_name += ">" + a_data["stops"][i1]["stop_name"] + "</tspan><tspan fill=\"#FFFFFF\" stroke=\"none\" class=\"stop_time stop_time_" + a_data["stops"][i1]["stop_id"] + "\" ></tspan></text>";
			}
		}
		l_g_stop_name += "</g>";
		//表示設定
		if (a_settings["stop_name"] === true) {
		} else {
			l_g_stop_name = "";
		}
		
		//リアルタイム
		let l_g_rt = "<g style=\"font-family: " + c_font_family + "; font-size: " + String(c_font_size * c_zoom_16) + "px; line-height: 1; stroke: none; fill: #000000;\">";
		if (a_data["rt"] !== null) {
			console.log("リアルタイム");
			for (let i1 = 0; i1 < a_data["rt"]["entity"].length; i1++) {
				const c_v = a_data["rt"]["entity"][i1]["vehicle"];
				const c_trip_id = c_v["trip"]["tripId"];
				const c_lat = c_v["position"]["latitude"];
				const c_lon = c_v["position"]["longitude"];
				let l_ur_route_id = "";
				let l_parent_route_id = "";
				for (let i2 = 0; i2 < a_data["trips"].length; i2++) {
					if (a_data["trips"][i2]["trip_id"] === c_trip_id) {
						l_ur_route_id = a_data["trips"][i2]["ur_route_id"];
						break;
					}
				}
				for (let i2 = 0; i2 < a_data["ur_routes"].length; i2++) {
					if (a_data["ur_routes"][i2]["ur_route_id"] === l_ur_route_id) {
						l_parent_route_id = a_data["ur_routes"][i2]["parent_route_id"];
						break;
					}
				}
				//緯度経度をxyに変換
				const c_zoom_level = a_settings["zoom_level"];
				const c_dx = (2 ** c_zoom_level) * 256 / 2;//左端（緯度の基準は半分の位置）
				const c_dy = 0;//上端
				c_x = 2 ** (c_zoom_level + 7) * (c_lon / 180 + 1) - c_dx;
				c_y = 2 ** (c_zoom_level + 7) / Math.PI * ((-1) * Math.atanh(Math.sin(c_lat * Math.PI / 180)) + Math.atanh(Math.sin(85.05112878 * Math.PI / 180))) - c_dy;
				l_g_rt += "<text x=\"" + c_x + "\" y=\"" + c_y + "\" class=\"class_routes class_parent_" + l_parent_route_id + " class_ur_" + l_ur_route_id + "\" style=\"pointer-events: auto;\"";
				if (a_settings["clickable"] === true) {
					l_g_rt += " onclick=\"f_show_routes('" + l_parent_route_id + "')\"";
				}
				l_g_rt += ">" + "●" + l_parent_route_id + " " + c_trip_id + "</text>";
			}
		}
		l_g_rt += "</g>";



		return "<g id=\"" + "g_zoom_" + String(a_zoom_16) +"\">" + l_g_routes + l_g_stop_type + l_g_stop_location + l_g_stop_name + l_g_rt + "</g>";
	}
	
}








function f_leaflet(a_data, a_settings) {
	const c_zoom_level = a_settings["zoom_level"];
	//左右上下の端を調べる
	let l_x_min = Number.MAX_SAFE_INTEGER;
	let l_x_max = 0;
	let l_y_min = Number.MAX_SAFE_INTEGER;
	let l_y_max = 0;
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		for (let i2 = 0; i2 < a_data["ur_routes"][i1]["shape_pt_array"].length; i2++) {
			const c_point = a_data["ur_routes"][i1]["shape_pt_array"][i2];
			const c_point_x = c_point["shape_pt_x"];
			const c_point_y = c_point["shape_pt_y"];
			if (c_point_x < l_x_min) {
				l_x_min = c_point_x;
			}
			if (l_x_max < c_point_x) {
				l_x_max = c_point_x;
			}
			if (c_point_y < l_y_min) {
				l_y_min = c_point_y;
			}
			if (l_y_max < c_point_y) {
				l_y_max = c_point_y;
			}
		}
	}
	
	//どうせ0,0付近は使われない前提
	const c_x_left = Math.floor(l_x_min / 256 - 1) * 256;
	const c_y_top = Math.floor(l_y_min / 256 - 1) * 256;
	const c_x_width = Math.ceil((l_x_max - l_x_min) / 256 + 2) * 256;
	const c_y_height = Math.ceil((l_y_max - l_y_min) / 256 + 2) * 256;
	
	
	//緯度経度に変換する。
	const c_left = c_x_left / 256 + (2 ** c_zoom_level) / 2 + 2;
	const c_top = c_y_top / 256 + 2;
	const c_top_left = [(180 / Math.PI) * (Math.asin(Math.tanh((-1) * (Math.PI / (2 ** (c_zoom_level + 7))) * c_top * 256 + Math.atanh(Math.sin(85.05112878 * Math.PI / 180))))), 180 * (c_left * 256 / (2 ** (c_zoom_level + 7)) - 1)];
	
	const c_center_x = (c_x_left + c_x_width / 2) / 256 + (2 ** c_zoom_level) / 2 + 2;
	const c_center_y = (c_y_top + c_y_height / 2) / 256 + 2;
	const c_center = [(180 / Math.PI) * (Math.asin(Math.tanh((-1) * (Math.PI / (2 ** (c_zoom_level + 7))) * c_center_y * 256 + Math.atanh(Math.sin(85.05112878 * Math.PI / 180))))), 180 * (c_center_x * 256 / (2 ** (c_zoom_level + 7)) - 1)];
	
	
	
	//初期の表示位置をsvgの左上、ズームレベルc_zoom_levelに設定する。
	//SVGの挿入位置と初期倍率に関係する？
	l_map.setView(c_top_left, c_zoom_level);
	
	//背景地図を半透明にする。
	if (a_settings["background_map"] === true) {//透明にせず、半透明にする
		//document.getElementsByClassName("leaflet-pane leaflet-tile-pane")[0].style.opacity = "0.25";
		//背景地図レイヤーに直接指定
	} else {//透明にする
		document.getElementsByClassName("leaflet-pane leaflet-tile-pane")[0].style.opacity = "0";
	}
	
	
	
	//svg地図を入れる。
	const c_svg = document.getElementsByClassName("leaflet-pane leaflet-overlay-pane")[0].firstElementChild;
	const c_svg_g = c_svg.firstElementChild;
	//作ったsvg地図を入力する。
	console.time("S");
	c_svg_g.innerHTML = f_make_svg(a_data, a_settings);
	console.timeEnd("S");
	//svgをクリック可能にする。
	c_svg.setAttribute("style", "pointer-events: auto;");
	c_svg.setAttribute("id", "svg");
	
	
	//現在の位置情報を取得。
	function f_success(a_p) {
		//svg中の座標に変換する。
		const c_p_lon = a_p.coords.longitude;
		const c_p_lat = a_p.coords.latitude;
		const c_p_x = 2 ** (c_zoom_level + 7) * (c_p_lon / 180 + 1) - (2 ** c_zoom_level) / 2 * 256; //左端の経度をずらす。
		const c_p_y = 2 ** (c_zoom_level + 7) / Math.PI * ((-1) * Math.atanh(Math.sin(c_p_lat * Math.PI / 180)) + Math.atanh(Math.sin(85.05112878 * Math.PI / 180)));
		document.getElementById("t_position").setAttribute("x", c_p_x);
		document.getElementById("t_position").setAttribute("y", c_p_y);
	}
	navigator.geolocation.watchPosition(f_success);
	
	
	//拡大縮小したときにsvg地図がずれないようにする。
	l_map.on("zoom", f_zoom);
	function f_zoom() {
		c_svg_g.setAttribute("transform", "translate(" + l_map.latLngToLayerPoint([85.05112878, 0]).x + ", " + l_map.latLngToLayerPoint([85.05112878, 0]).y + ") scale(" + (2 ** (l_map.getZoom() - c_zoom_level)) + ")");
		setTimeout(f_zoom_2, 0);
	}
	
	function f_zoom_2() {
		for (let i1 = 0; i1 <= a_settings["svg_zoom_ratio"]; i1++) {
			document.getElementById("g_zoom_" + String(i1)).setAttribute("visibility","hidden");
		}
		const c_svg_zoom_ratio = c_zoom_level - l_map.getZoom();
		if (c_svg_zoom_ratio <= 0) {
			document.getElementById("g_zoom_0").setAttribute("visibility","visible");
		} else if (c_svg_zoom_ratio <= a_settings["svg_zoom_ratio"]) {
			document.getElementById("g_zoom_" + String(c_svg_zoom_ratio)).setAttribute("visibility","visible");
		} else {
			document.getElementById("g_zoom_" + String(a_settings["svg_zoom_ratio"])).setAttribute("visibility","visible");
		}
	}
	
	
	//初期の表示位置を調整。（中心に）
	l_map.setView(c_center, c_zoom_level);
	f_zoom();
	
	
	
	//クリックした点の緯度経度取得
	l_map.on("click", f_click);
	function f_click(a1) {
		const c_lng = a1.latlng.lng;//経度
		const c_lat = a1.latlng.lat;//緯度
		l_tooltip_x = 2 ** (c_zoom_level + 7) * (c_lng / 180 + 1) - ((2 ** c_zoom_level) / 2 * 256); //東経0度を基準とする。
		l_tooltip_y = 2 ** (c_zoom_level + 7) / Math.PI * ((-1) * Math.atanh(Math.sin(c_lat * Math.PI / 180)) + Math.atanh(Math.sin(85.05112878 * Math.PI / 180)));
	}
	
	
}



function f_svg(a_data, a_settings) {
	//左右上下の端を調べる
	let l_x_min = Number.MAX_SAFE_INTEGER;
	let l_x_max = 0;
	let l_y_min = Number.MAX_SAFE_INTEGER;
	let l_y_max = 0;
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		for (let i2 = 0; i2 < a_data["ur_routes"][i1]["shape_pt_array"].length; i2++) {
			const c_point = a_data["ur_routes"][i1]["shape_pt_array"][i2];
			const c_point_x = c_point["shape_pt_x"];
			const c_point_y = c_point["shape_pt_y"];
			if (c_point_x < l_x_min) {
				l_x_min = c_point_x;
			}
			if (l_x_max < c_point_x) {
				l_x_max = c_point_x;
			}
			if (c_point_y < l_y_min) {
				l_y_min = c_point_y;
			}
			if (l_y_max < c_point_y) {
				l_y_max = c_point_y;
			}
		}
	}
	
	//どうせ0,0付近は使われない前提
	const c_x_left = Math.floor(l_x_min / 256 - 1) * 256;
	const c_y_top = Math.floor(l_y_min / 256 - 1) * 256;
	const c_x_width = Math.ceil((l_x_max - l_x_min) / 256 + 2) * 256;
	const c_y_height = Math.ceil((l_y_max - l_y_min) / 256 + 2) * 256;



	let l_svg = "<svg width=\"" + c_x_width + "\" height=\"" + c_y_height + "\" viewBox=\"0 0 " + c_x_width + " " + c_y_height + "\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"1.1\"><g transform=\"translate(" + String(-1 * c_x_left) + "," + String(-1 * c_y_top) + ")\">" + f_make_svg(a_data, a_settings) + "</g></svg>";
	document.getElementById(a_settings["div_id"]).innerHTML = l_svg;
}















function f_get(a_data, a_file, a_in, a_out) {
	for (let i1 = 0; i1 < a_file.length; i1++) {
		if (a_file[i1][a_in] === a_data) {
			if (a_out === "all") {
				return a_file[i1];
			} else {
				return a_file[i1][a_out];
			}
		}
	}
}

function f_get_parent_station_stop_id(a_stop_id, a_file) {
	if (f_get(a_stop_id, a_file, "stop_id", "location_type") === "0") {
		return f_get(a_stop_id, a_file, "stop_id", "parent_station");
	} else {
		return a_stop_id;
	}
}




function f_show_stops(a_stop_id) {
	setTimeout(function() {
		f_stop_name(a_stop_id);
		f_show_routes_stops(a_stop_id);
	}, 0);
}

function f_stop_name(a_stop_id) {
	//色を元に戻す。
	const c_stop_name_tspan = document.getElementsByClassName("stop_name");
	for (let i1 = 0; i1 < c_stop_name_tspan.length; i1++) {
		c_stop_name_tspan[i1].setAttribute("fill", "#000000");
	}
	const c_stop_name_background_tspan = document.getElementsByClassName("stop_name_background");
	for (let i1 = 0; i1 < c_stop_name_background_tspan.length; i1++) {
		c_stop_name_background_tspan[i1].setAttribute("fill", "#FFFFFF");
		c_stop_name_background_tspan[i1].setAttribute("stroke", "#FFFFFF");
	}
	const c_stop_location = document.getElementsByClassName("stop_location");
	for (let i1 = 0; i1 < c_stop_location.length; i1++) {
		c_stop_location[i1].setAttribute("fill", "#808080");
	}
	
	//停留所名の色の白黒を反転させる。
	const c_parent_station_stop_id = f_get_parent_station_stop_id(a_stop_id, l_data["stops"]);
	
	const c_text_color = document.getElementsByClassName("stop_name_" + c_parent_station_stop_id);
	for (let i1 = 0; i1 < c_text_color.length; i1++) {
		c_text_color[i1].setAttribute("fill", "#FFFFFF");
	}
	const c_text_background_color = document.getElementsByClassName("stop_name_background_" + c_parent_station_stop_id);
	for (let i1 = 0; i1 < c_text_background_color.length; i1++) {
		c_text_background_color[i1].setAttribute("fill", "#000000");
		c_text_background_color[i1].setAttribute("stroke", "#000000");
	}
	
	
	//標柱時刻表をやめたので停止
	/*
	if (f_get(a_stop_id, l_data["stops"], "stop_id", "location_type") === "0") {
		document.getElementById("stop_location_" + a_stop_id).setAttribute("fill", "#FF0000");
	}
	*/
	
	
	//timetableに追加。
	
	document.getElementById("stop_name").innerHTML = f_get(a_stop_id, l_data["stops"], "stop_id", "stop_name");
	document.getElementById("timetable").innerHTML = f_stop_timetable(a_stop_id);
}








function f_stop_timetable(a_stop_id) {
	/*
	if ((l_data["stop_times"] === undefined) || (l_data["stop_times"] === "")) {
		return "";
	}
	*/
	
	//同じ停留所の標柱一覧を作る。
	const c_parent_station_stop_id = f_get_parent_station_stop_id(a_stop_id, l_data["stops"]);
	const c_stop_ids = []; //同じ停留所の標柱のid
	for (let i1 = 0; i1 < l_data["stops"].length; i1++) {
		if (l_data["stops"][i1]["parent_station"] === c_parent_station_stop_id) {
			c_stop_ids.push(l_data["stops"][i1]["stop_id"]);
		}
	}
	
	
	
	const c_timetable = [];
	
	
	
	//発車時刻を集める。
	for (let i1 = 0; i1 < l_data["trips"].length; i1++) {
		for (let i2 = 0; i2 < l_data["trips"][i1]["stop_times"].length; i2++) {
			let l_exist = false;
			for (i3 = 0; i3 < c_stop_ids.length; i3++) {
				if (l_data["trips"][i1]["stop_times"][i2]["stop_id"] === c_stop_ids[i3]) {
					l_exist = true;
				}
			}
			if (l_exist === true) {
				c_timetable.push({
					"departure_time": Number(l_data["trips"][i1]["stop_times"][i2]["departure_time"].replace(/:/g, ""))
					, "stop_time": l_data["trips"][i1]["stop_times"][i2]
				});
			}
		}
	}
	
	//発車時刻で並べ替える。
	for (let i1 = 0; i1 < l_data["calendar"].length; i1++) {
		c_timetable.sort(f_sort_departure_time);
	}
	function f_sort_departure_time(a1, a2) {
		if (a1["departure_time"] < a2["departure_time"]) {
			return -1;
		}
		if (a1["departure_time"] > a2["departure_time"]) {
			return 1;
		}
		return 0;
	}
	
	
	
	let l_innerHTML = "";
	l_innerHTML += "<table><tbody><tr><td>標柱</td><td>経路名</td><td>便</td><td>運行日</td><td>発車時刻</td></tr>";
	for (let i1 = 0; i1 < c_timetable.length; i1++) {
		const c_stop_time = c_timetable[i1]["stop_time"];
		const c_trip = f_get(c_stop_time["trip_id"], l_data["trips"], "trip_id", "all");
		const c_ur_route = f_get(c_trip["ur_route_id"], l_data["ur_routes"], "ur_route_id", "all");
		//parent_routeの色を探す。
		const c_parent_route_number = c_ur_route["parent_route_number"];
		const c_route_color = l_data["parent_routes"][c_parent_route_number]["route_color"];
		const c_route_text_color = l_data["parent_routes"][c_parent_route_number]["route_text_color"];
		l_innerHTML += "<tr onclick=\"f_trip_timetable('" + c_stop_time["trip_id"] + "', '" + c_stop_time["stop_sequence"] + "', '" + c_stop_time["stop_id"] + "')\" style='background-color: #" + c_route_color + "; color: #" + c_route_text_color + ";'><td>" + c_stop_time["stop_id"] + "</td><td>" + c_ur_route["route_long_name"] + "</td><td>" + c_trip["trip_id"] + "</td><td>" + c_trip["service_id"] + "</td><td>" + c_stop_time["departure_time"] + "</td></tr>";
	}
	l_innerHTML += "</tbody></table>";
	return l_innerHTML;
}



//経由路線表示
function f_show_routes_stops(a_stop_id) {
	//一覧表のリセット
	document.getElementById("route_list").innerHTML = "";
	
//同じ停留所の標柱一覧を作る。
	const c_parent_station_stop_id = f_get_parent_station_stop_id(a_stop_id, l_data["stops"]);
	const c_stop_ids = []; //同じ停留所の標柱のid
	for (let i1 = 0; i1 < l_data["stops"].length; i1++) {
		if (l_data["stops"][i1]["parent_station"] === c_parent_station_stop_id) {
			c_stop_ids.push(l_data["stops"][i1]["stop_id"]);
		}
	}
	const l_stop_ids = c_stop_ids;
	
	
	//経由する経路の色を変更する。
	for (let i1 = 0; i1 < l_data["ur_routes"].length; i1++) {
		let l_exist = false; //経由する場合true
		for (let i2 = 0; i2 < l_data["ur_routes"][i1]["stop_array"].length; i2++) {
			for (let i3 = 0; i3 < l_stop_ids.length; i3++) {
				if (l_stop_ids[i3] === l_data["ur_routes"][i1]["stop_array"][i2]["stop_id"]) {
					l_exist = true;
					break;
				}
			}
		}
		const c_ur_route_id = l_data["ur_routes"][i1]["route_id"];
		const c_parent_route_id = l_data["ur_routes"][i1]["parent_route_id"];
		let l_route_color;
		let l_route_text_color;
		for (let i2 = 0; i2 < l_data["parent_routes"].length; i2++) {
			if (l_data["parent_routes"][i2]["parent_route_id"] === c_parent_route_id) {
				l_route_color = l_data["parent_routes"][i2]["route_color"];
				l_route_text_color = l_data["parent_routes"][i2]["route_text_color"];
			}
		}
		const c_elements = document.getElementsByClassName("class_ur_" + c_ur_route_id);
		for (let i2 = 0; i2 < c_elements.length; i2++) {
			if (l_exist === true) {
				document.getElementsByClassName("class_ur_" + c_ur_route_id)[i2].style.stroke = "#" + l_route_color;
			} else {
				document.getElementsByClassName("class_ur_" + c_ur_route_id)[i2].style.stroke = "#C0C0C0";
			}
		}
		
		//ついでに一覧表に載せる。
		if (l_exist === true) {
			document.getElementById("route_list").innerHTML += "<li onclick=\"f_show_routes('" + c_parent_route_id + "')\" style='background-color: #" + l_route_color + "; color: #" + l_route_text_color + ";'>" + l_data["ur_routes"][i1]["route_long_name"] + "</li>";
		}
	}
	
	
}


function f_trip_timetable(a_trip_id, a_stop_sequence, a_stop_id) {
	f_timetable();
	
	//発車する標柱を赤で示す。
	const c_stop_color = document.getElementsByClassName("stop_location_" + a_stop_id);
	for (let i1 = 0; i1 < c_stop_color.length; i1++) {
		c_stop_color[i1].setAttribute("fill", "#FF0000");
	}
	
	
	let l_trip_number;
	for (let i1 = 0; i1 < l_data["trips"].length; i1++) {
		if (l_data["trips"][i1]["trip_id"] === a_trip_id) {
			l_trip_number = i1;
		}
	}
	const c_stop_times = l_data["trips"][l_trip_number]["stop_times"];
	for (let i1 = 0; i1 < c_stop_times.length; i1++) {
		if (c_stop_times[i1]["stop_sequence"] >= a_stop_sequence) {
			let l_time = c_stop_times[i1]["arrival_time"];
			if (c_stop_times[i1]["stop_sequence"] === a_stop_sequence) {
				l_time = c_stop_times[i1]["departure_time"];
			}
			const c_parent_station_stop_id = f_get_parent_station_stop_id(c_stop_times[i1]["stop_id"], l_data["stops"]);
			const c_time_background = document.getElementsByClassName("stop_time_background_" + c_parent_station_stop_id);
			for (let i2 = 0; i2 < c_time_background.length; i2++) {
				c_time_background[i2].innerHTML += " <tspan style=\"stroke: #000000;\">" + l_time + "</tspan>";
			}
			const c_time = document.getElementsByClassName("stop_time_" + c_parent_station_stop_id);
			for (let i2 = 0; i2 < c_time.length; i2++) {
				c_time[i2].innerHTML += " <tspan style='stroke: none; fill: #FFFFFF'>" + l_time + "</tspan>";
			}
		}
	}
}


function f_show_routes(a_parent_route_id) {
	setTimeout(function() { //座標取得の関係で遅らせる。
		f_show_route_name(a_parent_route_id);
		f_route_color_change(a_parent_route_id);
		f_parent_route_timetable(a_parent_route_id);
	}, 0);
}


function f_show_route_name(a_parent_route_id) {
	const c_t_tooltip = document.getElementById("t_tooltip");
	c_t_tooltip.innerHTML = "";
	c_t_tooltip.setAttribute("x", (l_tooltip_x + 16));
	c_t_tooltip.setAttribute("y", (l_tooltip_y + 16));
	for (let i1= 0; i1 < l_data["parent_routes"].length; i1++) {
		if (l_data["parent_routes"][i1]["parent_route_id"] === a_parent_route_id) {
			c_t_tooltip.innerHTML += "\n<tspan x=\"" + (l_tooltip_x + 16) + "\" y=\"" + (l_tooltip_y + 16) + "\" style=\"stroke: #" + l_data["parent_routes"][i1]["route_color"] + "; fill: #" + l_data["parent_routes"][i1]["route_text_color"] + ";\">" + a_parent_route_id + "</tspan>";
			c_t_tooltip.innerHTML += "\n<tspan x=\"" + (l_tooltip_x + 16) + "\" y=\"" + (l_tooltip_y + 16) + "\" style=\"stroke: none; fill: #" + l_data["parent_routes"][i1]["route_text_color"] + ";\">" + a_parent_route_id + "</tspan>";
		}
	}
}


function f_route_color_change(a_parent_route_id) {
	for (let i1 = 0; i1 < l_data["parent_routes"].length; i1++) {
		const c_parent_route_id = l_data["parent_routes"][i1]["parent_route_id"];
		const c_route_color = l_data["parent_routes"][i1]["route_color"];
		const c_elements = document.getElementsByClassName("class_parent_" + c_parent_route_id);
		for (let i2 = 0; i2 < c_elements.length; i2++) {
			if (c_parent_route_id === a_parent_route_id) {
				document.getElementsByClassName("class_parent_" + c_parent_route_id)[i2].style.stroke = "#" + c_route_color;
			} else {
				document.getElementsByClassName("class_parent_" + c_parent_route_id)[i2].style.stroke = "#C0C0C0";
			}
		}
	}
}

function f_route_color() {
	for (let i1 = 0; i1 < l_data["parent_routes"].length; i1++) {
		const c_parent_route_id = l_data["parent_routes"][i1]["parent_route_id"];
		const c_route_color = l_data["parent_routes"][i1]["route_color"];
		const c_elements = document.getElementsByClassName("class_parent_" + c_parent_route_id);
		for (let i2 = 0; i2 < c_elements.length; i2++) {
			document.getElementsByClassName("class_parent_" + c_parent_route_id)[i2].style.stroke = "#" + c_route_color;
		}
	}
}

function f_tooltip() {
	document.getElementById("t_tooltip").innerHTML = "";
}

//便の時刻表示をやめる
function f_timetable() {
	const c_stop_time = document.getElementsByClassName("stop_time");
	const c_stop_time_background = document.getElementsByClassName("stop_time_background");
	for (let i1 = 0; i1 < c_stop_time.length; i1++) {
		c_stop_time[i1].innerHTML = "";
	}
	for (let i1 = 0; i1 < c_stop_time_background.length; i1++) {
		c_stop_time_background[i1].innerHTML = "";
	}
	const c_stop_location = document.getElementsByClassName("stop_location");
	for (let i1 = 0; i1 < c_stop_location.length; i1++) {
		c_stop_location[i1].setAttribute("fill", "#808080");
	}
}



function f_parent_route_timetable(a_parent_route_id) {
	let l_stop_array;
	for (let i1 = 0; i1 < l_data["parent_routes"].length; i1++) {
		if (l_data["parent_routes"][i1]["parent_route_id"] === a_parent_route_id) {
			l_stop_array = l_data["parent_routes"][i1]["stop_array"];
			break;
		}
	}
	//停留所名
	const c_stops = [];
	for (let i1 = 0; i1 < l_stop_array.length; i1++) {
		for (let i2 = 0; i2 < l_data["stops"].length; i2++) {
			if (l_data["stops"][i2]["stop_id"] === l_stop_array[i1][0]) {
				c_stops.push({"stop_id": l_data["stops"][i2]["stop_id"], "stop_name": l_data["stops"][i2]["stop_name"] + " 発", "number": i1});
				break;
			}
		}
		for (let i2 = 0; i2 < l_data["stops"].length; i2++) {
			if (l_data["stops"][i2]["stop_id"] === l_stop_array[i1][1]) {
				c_stops.push({"stop_id": l_data["stops"][i2]["stop_id"], "stop_name": l_data["stops"][i2]["stop_name"] + " 着", "number": i1 + 1});
				break;
			}
		}
	}
	//時刻を集める。
	const c_trips = [];
	for (let i1 = 0; i1 < l_data["trips"].length; i1++) {
		//parent_route_idを調べる。
		let l_parent_route_id_2;
		for (let i2 = 0; i2 < l_data["ur_routes"].length; i2++) {
			if (l_data["ur_routes"][i2]["route_id"] === l_data["trips"][i1]["route_id"]) {
				l_parent_route_id_2 = l_data["ur_routes"][i2]["parent_route_id"];
				break;
			}
		}
		//parent_route_idが違う場合は外す。
		if (a_parent_route_id !== l_parent_route_id_2) {
			continue;
		}
		let l_route_long_name;
		let l_route_color;
		for (let i2 = 0; i2 < l_data["ur_routes"].length; i2++) {
			if (l_data["ur_routes"][i2]["route_id"] === l_data["trips"][i1]["route_id"]) {
				l_route_long_name = l_data["ur_routes"][i2]["route_long_name"];
				l_route_color = l_data["ur_routes"][i2]["route_color"];
			}
		}
		//時刻を探す。2回目以降未対応。
		const c_stop_times = [];
		for (let i2 = 0; i2 < l_stop_array.length; i2++) {
			let l_exist = false;
			for (let i3 = 0; i3 < l_data["trips"][i1]["stop_times"].length - 1; i3++) {
				if (l_data["trips"][i1]["stop_times"][i3]["stop_id"] === l_stop_array[i2][0] && l_data["trips"][i1]["stop_times"][i3 + 1]["stop_id"] === l_stop_array[i2][1]) {
					c_stop_times.push(l_data["trips"][i1]["stop_times"][i3]["departure_time"]);
					c_stop_times.push(l_data["trips"][i1]["stop_times"][i3 + 1]["arrival_time"]);
					l_exist = true;
					break;
				}
			}
			if (l_exist === false) {
				c_stop_times.push("=");
				c_stop_times.push("=");
			}
		}
		
		//まとめ
		c_trips.push({"trip_id": l_data["trips"][i1]["trip_id"], "service_id": l_data["trips"][i1]["service_id"], "route_long_name": l_route_long_name, "route_color": l_route_color, "stop_times": c_stop_times});
	}
	//HTML化
	let l_timetable = "<table><tbody>";
	l_timetable += "<tr><td>経路名</td><td>便</td><td>運行日</td>";
	for (let i1 = 0; i1 < c_stops.length; i1++) {
		l_timetable += "<td>" + c_stops[i1]["stop_name"] + "</td>";
	}
	l_timetable += "</tr>";
	l_timetable += "<tr><td>route_id</td><td>trip_id</td><td>service_id</td>";
	for (let i1 = 0; i1 < c_stops.length; i1++) {
		l_timetable += "<td>" + c_stops[i1]["stop_id"] + "</td>";
	}
	l_timetable += "</tr>";
	for (let i1 = 0; i1 < c_trips.length; i1++) {
		l_timetable += "<tr><td>" + c_trips[i1]["route_long_name"] + "</td><td>" + c_trips[i1]["trip_id"] + "</td><td>" + c_trips[i1]["service_id"] + "</td>";
		for (let i2 = 0; i2 < c_trips[i1]["stop_times"].length; i2++) {
			l_timetable += "<td>" + c_trips[i1]["stop_times"][i2] + "</td>";
		}
		l_timetable += "</tr>";
	}
	l_timetable += "</tbody></table>";
	//SVG化
	const c_height = c_stops.length / 2 * 16;
	let l_svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"5760\" height=\"" + c_height  + "\" viewBox=\"0 -16 5760 " + (c_height + 16) + "\">";
	for (let i1 = 0; i1 < 24; i1++) {
		l_svg += "<path d=\"M " + i1 * 240 + ", " + 0 + " L " + i1 * 240 + ", " + c_height + "\" fill=\"none\" stroke=\"#000000\" stroke-width=\"2\" />";
		l_svg += "<text x=\"" + i1 * 240 + "\" y=\"0\">" + i1 + "</text>"
	}
	for (let i1 = 0; i1 < c_stops.length / 2 + 1; i1++) {
		l_svg += "<path d=\"M " + 0 + ", " + i1 * 16 + " L " + 5760 + ", " + i1 * 16 + "\" fill=\"none\" stroke=\"#000000\" stroke-width=\"2\" />";
		let l_text;
		if (i1 === 0) {
			l_text = c_stops[2 * i1]["stop_name"];
		} else if (i1 === c_stops.length / 2) {
			l_text = c_stops[2 * i1 - 1]["stop_name"]
		} else {
			l_text = c_stops[2 * i1 - 1]["stop_name"] + " " + c_stops[2 * i1]["stop_name"]
		}
		l_svg += "<text x=\"0\" y=\"" + i1 * 16 + "\">" + l_text + "</text>"
	}
	for (let i1 = 0; i1 < c_trips.length; i1++) {
		for (let i2 = 0; i2 < c_trips[i1]["stop_times"].length / 2; i2++) {
			const c_number_1 = c_stops[i2 * 2]["number"];
			const c_number_2 = c_stops[i2 * 2 + 1]["number"];
			if (c_trips[i1]["stop_times"][i2 * 2] === "=" || c_trips[i1]["stop_times"][i2 * 2 + 1] === "=") {
				continue;
			}
			const c_stop_time_11 = c_trips[i1]["stop_times"][i2 * 2].split(":");
			const c_stop_time_12 = Number(c_stop_time_11[0]) * 240 + Number(c_stop_time_11[1]) * 4 + Number(c_stop_time_11[2]) / 15;
			const c_stop_time_21 = c_trips[i1]["stop_times"][i2 * 2 + 1].split(":");
			const c_stop_time_22 = Number(c_stop_time_21[0]) * 240 + Number(c_stop_time_21[1]) * 4 + Number(c_stop_time_21[2]) / 15;
			l_svg += "<path d=\"M " + c_stop_time_12 + ", " + c_number_1 * 16 + " L " + c_stop_time_22 + ", " + c_number_2 * 16 + "\" fill=\"none\" stroke=\"#000000\" stroke-width=\"2\" />";
		}
	}
	l_svg += "</svg>"
	document.getElementById("parent_route_timetable").innerHTML = l_timetable;
	document.getElementById("svg_timetable").innerHTML = l_svg;
}



function f_output_svg() {
	const c_svg = document.getElementsByClassName("leaflet-pane leaflet-overlay-pane")[0].firstElementChild.outerHTML;
	const c_blob = new Blob([c_svg], {"type": "image/svg+xml"});
	if (window.navigator.msSaveBlob) { 
		window.navigator.msSaveBlob(c_blob, "busmap.svg"); 
	} else {
		document.getElementById("output_svg").href = window.URL.createObjectURL(c_blob);
	}
}

