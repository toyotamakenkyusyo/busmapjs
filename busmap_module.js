//"use strict";
//これ以外に読み込みが必要なもの
//leaflet
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

window.f_busmap = async function f_busmap(a_settings) {
	console.time("make_bmd");
	//初期設定
	a_settings = f_input_settings(a_settings);
	//HTMLの初期設定
	document.getElementById(a_settings["div_id"]).innerHTML = f_html(a_settings);
	//leafletの初期設定
	if (a_settings["leaflet"] === true) {
		l_map = L.map("div_leaflet"); //leafletの読み込み。
		for (let i1 = 0; i1 < a_settings["background_layers"].length; i1++) {
			L.tileLayer(a_settings["background_layers"][i1][0], a_settings["background_layers"][i1][1]).addTo(l_map); //背景地図（地理院地図等）を表示する。
		}
		L.svg().addTo(l_map); //svg地図を入れる。
	}
	
	
	//a_settings["data"] = "https://toyotamakenkyusyo.github.io/gtfs/3270001000564/next/GTFS-JP.zip"; //仮
	//a_settings["data"] = "test.geojson"; //仮
	//a_settings["data_type"] = "geojson"; //仮
	
	//データの読み込みと前処理
	let l_data = {};
	if (a_settings["data_type"] === "gtfs") {
		const c_arraybuffer = await f_xhr_get(a_settings["data"], "arraybuffer");
		const c_text = await f_zip_to_text(c_arraybuffer, Zlib);
		//Zlibはhttps://cdn.jsdelivr.net/npm/zlibjs@0.3.1/bin/unzip.min.js
		for (let i1 in c_text) {
			l_data[i1.replace(".txt", "")] = f_csv_to_json(c_text[i1]);
		}
		//GTFSの差異を統一（ur_routesを作るのに必要なroute_sort_order、pickup_type、drop_off_type）
		//pickup_typeとdrop_off_typeを補う
		f_set_stop_type(l_data);
		//route_sort_orderを補う
		f_set_route_sort_order(l_data);
		//緯度、経度、順番の型を数に変換
		f_number_gtfs(l_data);
		//ur_routesを作る
		f_make_ur_routes(l_data);
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
	console.timeEnd("make_bmd");
	console.log(l_data);
	//const c_bmd = l_data;
	const c_bmd = {
		"rt": l_data["rt"],
		"stops": l_data["stops"],
		"ur_stops": l_data["ur_stops"],
		"parent_station": l_data["parent_station"],
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
	console.time("t_5");
	f_make_shape_points(c_bmd);
	console.timeEnd("t_5");
	console.time("t_6");
	f_set_xy(c_bmd, a_settings["zoom_level"]); //shape_pointsとstopsに座標xyを加える。
	console.timeEnd("t_6");
	console.time("t_7");
	f_make_shape_segments(c_bmd);
	console.timeEnd("t_7");
	console.time("t_8");
	//仮に停止している
	f_delete_point(c_bmd); //余計なshape pointを消す。
	console.timeEnd("t_8");
	console.time("t_9");
	f_make_shape_segments(c_bmd);
	console.timeEnd("t_9");
	console.time("t_10");
	f_cut_shape_segments(c_bmd, a_settings); //3s遅い。高速化困難。ここでshape_pointが増加、stopにnearest_shape_pt_idを追加、shape_pt_arrayに変更あり。
	console.timeEnd("t_10");
	console.time("t_11");
	f_make_new_shape_pt_array(c_bmd);
	console.timeEnd("t_11");
	console.time("t_12");
	f_make_child_shape_segments(c_bmd);
	console.timeEnd("t_12");
	console.time("t_13");
	f_set_xy_2(c_bmd); //shape_pointsの座標をshape_pt_arrayに移す。1s遅い。
	console.timeEnd("t_13");
	console.log(c_bmd);
	f_trip_number(c_bmd);//便数を数える
	//グローバルに移す
	if (a_settings["global"] === true) {
		l_data = c_bmd;
		l_settings = a_settings;
	}
	
	console.time("t_14");
	f_open(c_bmd, a_settings); //6s遅い！
	console.timeEnd("t_14");
	
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

	
	console.time("T");
	f_topology(a_bmd, a_settings);
	console.timeEnd("T");
	console.time("G");
	f_geometry(a_bmd, a_settings);
	console.timeEnd("G");
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






//shape_pointsを作る。
//a_data["ur_routes"][i1]["shape_pt_array"][i2]["shape_pt_number"]にshape_pt_numberを記録しておく。
function f_make_shape_points(a_data) {
	const c_shape_points_1 = [];
	//仮に重複ありでshape pointを集める。
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		for (let i2 = 0; i2 < a_data["ur_routes"][i1]["shape_pt_array"].length; i2++) {
			c_shape_points_1.push({
				"shape_pt_lat": a_data["ur_routes"][i1]["shape_pt_array"][i2]["shape_pt_lat"]
				, "shape_pt_lon": a_data["ur_routes"][i1]["shape_pt_array"][i2]["shape_pt_lon"]
				, "i1": i1
				, "i2": i2
			});
		}
	}
	//shape pointを緯度latの小さいものから順に並べる。
	c_shape_points_1.sort(function(a1,a2) {
		if (a1["shape_pt_lat"] < a2["shape_pt_lat"]) {
			return -1;
		}
		if (a1["shape_pt_lat"] > a2["shape_pt_lat"]) {
			return 1;
		}
		return 0;
	});
	const c_shape_points_2 = [];
	//同じ点は最初に出てきたものだけ追加する。経度lonはばらばらなので注意。
	let l_lat_i2 = 0; //現時点での緯度latが最初に出たときのshape_pt_numberを記録する。
	label_i1: for (let i1 = 0; i1 < c_shape_points_1.length; i1++) {
		if (i1 === 0) {
			l_lat_i2 = 0; //shape_pt_numberを記録する。
		} else if (c_shape_points_1[i1]["shape_pt_lat"] !== c_shape_points_2[l_lat_i2]["shape_pt_lat"]) { //緯度latが前と異なるとき
			l_lat_i2 = c_shape_points_2.length; //shape_pt_numberを記録する。
		} else {
			for (let i2 = l_lat_i2; i2 < c_shape_points_2.length; i2++) {
				if (c_shape_points_1[i1]["shape_pt_lon"] === c_shape_points_2[i2]["shape_pt_lon"]) {
					//番号shape_pt_numberを記録しておく。
					const c_shape_pt_number = i2;
					const c_i1 = c_shape_points_1[i1]["i1"];
					const c_i2 = c_shape_points_1[i1]["i2"];
					a_data["ur_routes"][c_i1]["shape_pt_array"][c_i2]["shape_pt_number"] = c_shape_pt_number;
					c_shape_points_1[i1]["shape_pt_number"] = c_shape_pt_number;
					continue label_i1; //latもlonも同じものが存在すれば次へ進む
				}
			}
		}
		//追加する。
		c_shape_points_2.push({
			"shape_pt_lat": c_shape_points_1[i1]["shape_pt_lat"]
			, "shape_pt_lon": c_shape_points_1[i1]["shape_pt_lon"]
			, "stops_exist": false
			, "near_stops": []
			, "original": true
		});
		//番号shape_pt_numberを記録しておく。
		const c_shape_pt_number = c_shape_points_2.length - 1;
		const c_i1 = c_shape_points_1[i1]["i1"];
		const c_i2 = c_shape_points_1[i1]["i2"];
		a_data["ur_routes"][c_i1]["shape_pt_array"][c_i2]["shape_pt_number"] = c_shape_pt_number;
		c_shape_points_1[i1]["shape_pt_number"] = c_shape_pt_number;
	}
	a_data["shape_points"] = c_shape_points_2;
}






//ズームレベルa_zoom_levelでのタイルマップのxyに変換する。
//経度の基準を半分ずらしている。
function f_set_xy(a_data, a_zoom_level) {
	const c_dx = (2 ** a_zoom_level) * 256 / 2;//左端（緯度の基準は半分の位置）
	const c_dy = 0;//上端
	for (let i1 = 0; i1 < a_data["shape_points"].length; i1++) {
		const c_shape_point = a_data["shape_points"][i1];
		c_shape_point["shape_pt_x"] = 2 ** (a_zoom_level + 7) * (c_shape_point["shape_pt_lon"] / 180 + 1) - c_dx;
		c_shape_point["shape_pt_y"] = 2 ** (a_zoom_level + 7) / Math.PI * ((-1) * Math.atanh(Math.sin(c_shape_point["shape_pt_lat"] * Math.PI / 180)) + Math.atanh(Math.sin(85.05112878 * Math.PI / 180))) - c_dy;
	}
	for (let i1 = 0; i1 < a_data["stops"].length; i1++) {
		const c_stop = a_data["stops"][i1];
		c_stop["stop_x"] = 2 ** (a_zoom_level + 7) * (c_stop["stop_lon"] / 180 + 1) - c_dx;
		c_stop["stop_y"] = 2 ** (a_zoom_level + 7) / Math.PI * ((-1) * Math.atanh(Math.sin(c_stop["stop_lat"] * Math.PI / 180)) + Math.atanh(Math.sin(85.05112878 * Math.PI / 180))) - c_dy;
	}
}








function f_make_shape_segments(a_data) {
	const c_shape_segments = [];
	//各ur_routeにshape_segment_arrayをつくる。
	//shape_segmentをc_shape_segmentsに集める。
	//目次を作る。
	const c_index_se = {};
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		a_data["ur_routes"][i1]["shape_segment_array"] = [];
		const c_shape_pt_array = a_data["ur_routes"][i1]["shape_pt_array"];
		const c_shape_segment_array = a_data["ur_routes"][i1]["shape_segment_array"];
		for (let i2 = 0; i2 < c_shape_pt_array.length - 1; i2++) {//最後を除く
			const c_start_shape_pt_number = c_shape_pt_array[i2]["shape_pt_number"];
			const c_end_shape_pt_number = c_shape_pt_array[i2 + 1]["shape_pt_number"];
			const c_segment_1 = c_index_se["s_" + String(c_start_shape_pt_number) + "_e_" + String(c_end_shape_pt_number)];
			const c_segment_2 = c_index_se["s_" + String(c_end_shape_pt_number) + "_e_" + String(c_start_shape_pt_number)];
			if (c_segment_1 !== undefined) { //正向きがあるとき
				c_shape_segment_array.push({
					"shape_segment_number": c_segment_1
					, "direction": 1
				});
				c_shape_segments[c_segment_1]["ur_route_numbers"].push(i1);
			} else if (c_segment_2 !== undefined) { //逆向きがあるとき
				c_shape_segment_array.push({
					"shape_segment_number": c_segment_2
					, "direction": -1
				});
				c_shape_segments[c_segment_2]["ur_route_numbers"].push(i1);
			} else { //どちらもないとき
				c_shape_segments.push({
					"start_shape_pt_number": c_start_shape_pt_number
					, "end_shape_pt_number": c_end_shape_pt_number
					, "stops_exist": false
					, "near_stops": []
					, "ur_route_numbers": [i1]
					, "stop_numbers": []
				
				});
				c_index_se["s_" + String(c_start_shape_pt_number) + "_e_" + String(c_end_shape_pt_number)] = c_shape_segments.length - 1;
				c_shape_segment_array.push({
					"shape_segment_number": c_shape_segments.length - 1
					, "direction": 1
				});
			}
		}
	}
	a_data["shape_segments"] = c_shape_segments;
}






//標柱に対応した？余計な点を消す
function f_delete_point(a_data) {
	const c_shape_segments_2 = [];
	const c_delete_shape_points = [];
	//連続する3点を集める。向きの違いは区別しない。
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		const c_shape_pt_array = a_data["ur_routes"][i1]["shape_pt_array"];
		for (let i2 = 1; i2 < c_shape_pt_array.length - 1; i2++) {//最初と最後を除く
			const c_shape_pt_number_1 = c_shape_pt_array[i2 - 1]["shape_pt_number"];
			const c_shape_pt_number_2 = c_shape_pt_array[i2]["shape_pt_number"];
			const c_shape_pt_number_3 = c_shape_pt_array[i2 + 1]["shape_pt_number"];
			let l_exist = false;
			for (let i3 = 0; i3 < c_shape_segments_2.length; i3++) {
				if ((c_shape_segments_2[i3]["shape_pt_number_1"] === c_shape_pt_number_1 && c_shape_segments_2[i3]["shape_pt_number_3"] === c_shape_pt_number_3) || (c_shape_segments_2[i3]["shape_pt_number_1"] === c_shape_pt_number_3 && c_shape_segments_2[i3]["shape_pt_number_3"] === c_shape_pt_number_1)) { //あるとき
					l_exist = true;
					if (c_shape_segments_2[i3]["shape_pt_number_2"] !== c_shape_pt_number_2) { //間の点が異なる場合
						c_delete_shape_points.push(c_shape_segments_2[i3]["shape_pt_number_2"], c_shape_pt_number_2);
					}
					break;
				}
			}
			if (l_exist === false) { //ないとき
				c_shape_segments_2.push({
					"shape_pt_number_1": c_shape_pt_number_1
					, "shape_pt_number_2": c_shape_pt_number_2
					, "shape_pt_number_3": c_shape_pt_number_3
				});
				//両端を結ぶsegmentがないか、確認する。
				for (let i3 = 0; i3 < a_data["shape_segments"].length; i3++) {
					if ((c_shape_pt_number_1 === a_data["shape_segments"][i3]["start_shape_pt_number"] && c_shape_pt_number_3 === a_data["shape_segments"][i3]["end_shape_pt_number"]) || (c_shape_pt_number_1 === a_data["shape_segments"][i3]["end_shape_pt_number"] && c_shape_pt_number_3 === a_data["shape_segments"][i3]["start_shape_pt_number"])) { //あるとき
						c_delete_shape_points.push(c_shape_pt_number_2);
					}
				}
			}
		}
	}
	//新しいshape_pt_arrayをつくる。
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		const c_new_shape_pt_array = [];
		const c_shape_pt_array = a_data["ur_routes"][i1]["shape_pt_array"];
		for (let i2 = 0; i2 < c_shape_pt_array.length; i2++) {
			if (i2 === 0 || i2 === c_shape_pt_array.length - 1) {
				//残す場合
				c_new_shape_pt_array.push({
					"shape_pt_number": c_shape_pt_array[i2]["shape_pt_number"]
					, "shape_pt_x": c_shape_pt_array[i2]["shape_pt_x"]
					, "shape_pt_y": c_shape_pt_array[i2]["shape_pt_y"]
				});
				continue;
			}
			let l_exist = false; //消す場合true
			for (let i3 = 0; i3 < c_delete_shape_points.length; i3++) {
				if(c_delete_shape_points[i3] === c_shape_pt_array[i2]["shape_pt_number"]) {
					l_exist = true;
					break;
				}
			}
			if (l_exist === true) { //消す場合
				continue;
			}
			//残す場合
			c_new_shape_pt_array.push({
				"shape_pt_number": c_shape_pt_array[i2]["shape_pt_number"]
				, "shape_pt_x": c_shape_pt_array[i2]["shape_pt_x"]
				, "shape_pt_y": c_shape_pt_array[i2]["shape_pt_y"]
			});
		}
		a_data["ur_routes"][i1]["shape_pt_array"] = c_new_shape_pt_array;
	}
}



function f_cut_shape_segments(a_data, a_settings) {
	//使う関数
	//点と線分の距離
	//そのまま流用したため、未検証。
	function f_distance(a_px, a_py, a_sx, a_sy, a_ex, a_ey) {
		//if ((a_px === a_sx && a_py === a_sy) || (a_px === a_ex && a_py === a_ey)) { //始点か終点と一致
			//return 0;
		//}
		const c_vx = a_ex - a_sx;
		const c_vy = a_ey - a_sy;
		const c_r2 = c_vx * c_vx + c_vy * c_vy;
		const c_tt = c_vx * (a_px - a_sx) + c_vy * (a_py - a_sy);
		if(c_tt < 0){
			return (a_sx - a_px) * (a_sx - a_px) + (a_sy - a_py) * (a_sy - a_py);
		}
		if(c_tt > c_r2){
			return (a_ex - a_px) * (a_ex - a_px) + (a_ey - a_py) * (a_ey - a_py);
		}
		const c_f1 = c_vx * (a_sy - a_py) - c_vy * (a_sx - a_px);
		return (c_f1 * c_f1) / c_r2;
	}
	//shape segmentに通りうるstopをまとめておく
	for (let i1 = 0; i1 < a_data["shape_segments"].length; i1++) {
		for (let i2 = 0; i2 < a_data["shape_segments"][i1]["ur_route_numbers"].length; i2++) {
			for (let i3 = 0; i3 < a_data["ur_routes"][a_data["shape_segments"][i1]["ur_route_numbers"][i2]]["stop_array"].length; i3++) {
				a_data["shape_segments"][i1]["stop_numbers"].push(a_data["ur_routes"][a_data["shape_segments"][i1]["ur_route_numbers"][i2]]["stop_array"][i3]["stop_number"]);
			}
		}
	}
	
	
	//切断の前にズームレベルc_zタイルに分けて目次を作る。
	const c_z = a_settings["cut_zoom_level"];
	const c_z_tile = 2 ** (c_z - 8 - a_settings["zoom_level"]); //ズームレベルa_zoom_levelのタイル座標をズームレベルc_zのタイル番号に変換する。
	//経度は基準をずらしているのに注意。
	const c_index = {}; //c_shape_segmentsの目次をつくる。
	for (let i1 = 0; i1 < a_data["shape_segments"].length; i1++) {
		//ズームレベル16のタイル番号
		const c_x = Math.floor((a_data["shape_points"][a_data["shape_segments"][i1]["start_shape_pt_number"]]["shape_pt_x"] + a_data["shape_points"][a_data["shape_segments"][i1]["end_shape_pt_number"]]["shape_pt_x"]) * 0.5 * c_z_tile);
		const c_y = Math.floor((a_data["shape_points"][a_data["shape_segments"][i1]["start_shape_pt_number"]]["shape_pt_y"] + a_data["shape_points"][a_data["shape_segments"][i1]["end_shape_pt_number"]]["shape_pt_y"]) * 0.5 * c_z_tile);
		const c_ley = String(c_x) + "_" + String(c_y);
		if (c_index[c_ley] === undefined) {
			c_index[c_ley] = [];
		}
		c_index[c_ley].push(i1);
	}
	
	
	//各stopについて最寄のsegmentを求める。
	for (let i1 = 0; i1 < a_data["stops"].length; i1++) {
		let l_nearest_distance = Number.MAX_VALUE; //shape segmentまでの最短の距離
		let l_nearest_shape_segment_number; //最寄のshape segmentの番号
		const c_px = a_data["stops"][i1]["stop_x"];
		const c_py = a_data["stops"][i1]["stop_y"];
		const c_px_tile = Math.floor(c_px * c_z_tile);
		const c_py_tile = Math.floor(c_py * c_z_tile);
		//最寄のshape segmentを探す。
		for (let i2 = c_px_tile - 1; i2 <= c_px_tile + 1; i2++) {
			for (let i3 = c_py_tile - 1; i3 <= c_py_tile + 1; i3++) {
				const c_key = String(i2) + "_" + String(i3);
				if (c_index[c_key] === undefined) {
					continue;
				}
				for (let i4 = 0; i4 < c_index[c_key].length; i4++) {
					const c_shape_segment = a_data["shape_segments"][c_index[c_key][i4]];
					//その標柱を通りうるか確認する。
					let l_exist = false;
					for (let i5 = 0; i5 < c_shape_segment["stop_numbers"].length; i5++) {
						if (c_shape_segment["stop_numbers"][i5] === i1) {
							l_exist = true;
						}
					}
					if (l_exist === false && a_data["stops"][i1]["location_type"] === "0") {
						continue;
					}
					const c_distance = f_distance(c_px, c_py, a_data["shape_points"][c_shape_segment["start_shape_pt_number"]]["shape_pt_x"], a_data["shape_points"][c_shape_segment["start_shape_pt_number"]]["shape_pt_y"], a_data["shape_points"][c_shape_segment["end_shape_pt_number"]]["shape_pt_x"], a_data["shape_points"][c_shape_segment["end_shape_pt_number"]]["shape_pt_y"]);
					if (c_distance < l_nearest_distance) {
						l_nearest_distance = c_distance;
						l_nearest_shape_segment_number = c_index[c_key][i4];
					}
				}
			}
		}
		//最寄のsegmentが求まった。
		//l_nearest_segment_number === undefinedが問題！！！
		if (l_nearest_shape_segment_number === undefined) {
			console.log(i1);
			console.log(a_data["stops"][i1]["stop_name"]);
			console.log("最寄segment未発見");
			a_data["stops"][i1]["shape_pt_number"] = 0; //仮に適当な値を入れる。
			//例外処理が必要。
		} else {
			const c_nearest_shape_segment = a_data["shape_segments"][l_nearest_shape_segment_number];
			const c_sx = a_data["shape_points"][c_nearest_shape_segment["start_shape_pt_number"]]["shape_pt_x"];
			const c_sy = a_data["shape_points"][c_nearest_shape_segment["start_shape_pt_number"]]["shape_pt_y"];
			const c_ex = a_data["shape_points"][c_nearest_shape_segment["end_shape_pt_number"]]["shape_pt_x"];
			const c_ey = a_data["shape_points"][c_nearest_shape_segment["end_shape_pt_number"]]["shape_pt_y"];
			const c_vx = c_ex - c_sx;
			const c_vy = c_ey - c_sy;
			const c_r2 = c_vx * c_vx + c_vy * c_vy;
			const c_tt = c_vx * (c_px - c_sx) + c_vy * (c_py - c_sy);
			if (c_tt <= 0) {
				//stopsにshape_pt_numberを加える。
				a_data["stops"][i1]["shape_pt_number"] = c_nearest_shape_segment["start_shape_pt_number"];
				a_data["stops"][i1]["shape_pt_x"] = c_sx;
				a_data["stops"][i1]["shape_pt_y"] = c_sy;
				a_data["shape_points"][c_nearest_shape_segment["start_shape_pt_number"]]["stops_exist"] = true; //標柱の存在
				a_data["shape_points"][c_nearest_shape_segment["start_shape_pt_number"]]["near_stops"].push({"stop_number": i1});
			} else if (c_tt >= c_r2) {
				//stopsにshape_pt_numberを加える。
				a_data["stops"][i1]["shape_pt_number"] = c_nearest_shape_segment["end_shape_pt_number"];
				a_data["stops"][i1]["shape_pt_x"] = c_ex;
				a_data["stops"][i1]["shape_pt_y"] = c_ey;
				a_data["shape_points"][c_nearest_shape_segment["end_shape_pt_number"]]["stops_exist"] = true; //標柱の存在
				a_data["shape_points"][c_nearest_shape_segment["end_shape_pt_number"]]["near_stops"].push({"stop_number": i1});
			} else {
				const c_t = c_tt / c_r2;
				const c_x = c_sx + c_t * c_vx;
				const c_y = c_sy + c_t * c_vy;
				//c_shape_segmentsのnear_stopsとshape_pointsを加える。
				let l_exist = false;
				for (let i2 = 0; i2 < c_nearest_shape_segment["near_stops"].length; i2++) {
					if (c_nearest_shape_segment["near_stops"][i2]["ratio"] === c_t) { //同じ位置に既にある場合
						a_data["stops"][i1]["shape_pt_number"] = c_nearest_shape_segment["near_stops"][i2]["shape_pt_number"]; //stopsにshape_pt_numberを加える。
						a_data["shape_points"][c_nearest_shape_segment["near_stops"][i2]["shape_pt_number"]]["near_stops"].push({"stop_number": i1});
						l_exist = true;
						break;
					}
				}
				if (l_exist === false) {
					//shape_pointsに追加しておく。
					a_data["shape_points"].push({"shape_pt_x": c_x, "shape_pt_y": c_y, "stops_exist": true, "near_stops": [{"stop_number": i1}], "original": false}); //標柱の存在
					a_data["stops"][i1]["shape_pt_number"] = a_data["shape_points"].length - 1; //stopsにshape_pt_numberを加える。
					c_nearest_shape_segment["stops_exist"] = true;
					//near_stopsに加える。
					c_nearest_shape_segment["near_stops"].push({"shape_pt_number": a_data["shape_points"].length - 1, "ratio": c_t});
					//ratioの値で並べ替えておく。
					c_nearest_shape_segment["near_stops"].sort(function(a1,a2){
						if (a1["ratio"] < a2["ratio"]) {
							return -1;
						}
						if (a1["ratio"] > a2["ratio"]) {
							return 1;
						}
						return 0;
					});
					
				}
				//stopsにxyを加える。
				a_data["stops"][i1]["shape_pt_x"] = c_x;
				a_data["stops"][i1]["shape_pt_y"] = c_y;
			}
		}
	}
}

function f_make_new_shape_pt_array(a_data) {
	//shape_pt_arrayに新しいshape pointを入れる。
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		const c_shape_pt_array = [];
		const c_shape_segment_array = a_data["ur_routes"][i1]["shape_segment_array"];
		//最初の1つ
		if (c_shape_segment_array[0]["direction"] === 1) {
			c_shape_pt_array.push({"shape_pt_number": a_data["shape_segments"][c_shape_segment_array[0]["shape_segment_number"]]["start_shape_pt_number"]});
		} else {
			c_shape_pt_array.push({"shape_pt_number": a_data["shape_segments"][c_shape_segment_array[0]["shape_segment_number"]]["end_shape_pt_number"]});
		}
		//2つめから。
		for (let i2 = 0; i2 < c_shape_segment_array.length; i2++) {
			const c_shape_segment = a_data["shape_segments"][c_shape_segment_array[i2]["shape_segment_number"]];
			if (c_shape_segment_array[i2]["direction"] === 1) { //向きが1のとき
				for (let i3 = 0; i3 < c_shape_segment["near_stops"].length; i3++) {
					c_shape_pt_array.push({"shape_pt_number": c_shape_segment["near_stops"][i3]["shape_pt_number"]});
				}
				c_shape_pt_array.push({"shape_pt_number": c_shape_segment["end_shape_pt_number"]});
			} else if (c_shape_segment_array[i2]["direction"] === -1) { //向きが-1のとき
				for (let i3 = c_shape_segment["near_stops"].length - 1; i3 >= 0; i3--) {
					c_shape_pt_array.push({"shape_pt_number": c_shape_segment["near_stops"][i3]["shape_pt_number"]});
				}
				c_shape_pt_array.push({"shape_pt_number": c_shape_segment["start_shape_pt_number"]});
			}
		}
		a_data["ur_routes"][i1]["shape_pt_array"] = c_shape_pt_array;
	}
	//shape_pt_arrayの始点、終点を処理する。
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		const c_stop_array = a_data["ur_routes"][i1]["stop_array"];
		const c_shape_pt_array = a_data["ur_routes"][i1]["shape_pt_array"];
		if (c_shape_pt_array.length < 3) {
			continue;
		}
		if (c_stop_array === "" || c_stop_array.length < 2 || c_stop_array === undefined || c_stop_array === null) { //c_stop_arrayがない場合
			continue;
		}
		
		//最初、最後があるかどうか確認して追加削除を行う。
		let l_new_shape_pt_array = []; //追加削除後
		//stopに対応するshape_pointがshape_pt_arrayにあるか探す。
		const c_shape_pt_numbers = [];
		for (let i2 = 0; i2 < c_stop_array.length; i2++) {
			c_shape_pt_numbers.push({"shape_pt_number": a_data["stops"][c_stop_array[i2]["stop_number"]]["shape_pt_number"], "shape_pt_array_number": null});
		}
		let l_count_first = 0; //最初の標柱と同じshape pointに停まる回数
		let l_count_last = 0; //最後の標柱と同じshape pointに停まる回数
		for (let i2 = 0; i2 < c_shape_pt_numbers.length; i2++) {
			if (c_shape_pt_numbers[0]["shape_pt_number"] === c_shape_pt_numbers[i2]["shape_pt_number"]) {
				l_count_first += 1;
			}
			if (c_shape_pt_numbers[c_shape_pt_numbers.length - 1]["shape_pt_number"] === c_shape_pt_numbers[i2]["shape_pt_number"]) {
				l_count_last += 1;
			}
		}
		//とりあえず探してみる
		let l_number;
		l_number = 0;
		let l_count = 0; //かけている数を数える
		let l_last_number = null; //最後の標柱の番号
		let l_first_number = null; //最初の標柱の番号
		//前から探す、前半のshapesが冗長になるかもしれない
		for (let i2 = 0; i2 < c_shape_pt_numbers.length; i2++) {
			for (let i3 = l_number; i3 < c_shape_pt_array.length; i3++) {
				if (c_shape_pt_numbers[i2]["shape_pt_number"] === c_shape_pt_array[i3]["shape_pt_number"]) {
					c_shape_pt_numbers[i2]["shape_pt_array_number"] = i3;
					l_number = i3;
					if (i2 === c_shape_pt_numbers.length - 1) {
						l_last_number = i3;
					}
					break;
				}
				if (i2 !== c_shape_pt_numbers.length - 1 &&i3 === c_shape_pt_array.length - 1) { //途中で最後まで到達
					console.log("エラー1 " + String(i2) + "/" + String(c_shape_pt_numbers.length - 1) + " " + c_shape_pt_numbers[i2]["shape_pt_number"]);
					l_count += 1;
				}
			}
		}
		if ((c_shape_pt_numbers[0]["shape_pt_array_number"] === null) || (c_shape_pt_numbers[0]["shape_pt_array_number"] !== null && l_count >= 1)) {
			//最初があり、途中が欠ける (c_shape_pt_numbers[0]["shape_pt_array_number"] !== null && l_count >= 1)
			//最初がない (c_shape_pt_numbers[0]["shape_pt_array_number"] === null)
			//2番目から探す
			l_number = 0;
			l_count = 0;
			for (let i2 = 1; i2 < c_shape_pt_numbers.length; i2++) { //2番目から
				for (let i3 = l_number; i3 < c_shape_pt_array.length; i3++) {
					if (c_shape_pt_numbers[i2]["shape_pt_number"] === c_shape_pt_array[i3]["shape_pt_number"]) {
						c_shape_pt_numbers[i2]["shape_pt_array_number"] = i3;
						l_number = i3;
						if (i2 === c_shape_pt_numbers.length - 1) {
							l_last_number = i3;
						}
						break;
					}
					if (i2 !== c_shape_pt_numbers.length - 1 && i3 === c_shape_pt_array.length - 1) { //途中で最後まで到達
						console.log("エラー2 " + String(i2) + "/" + String(c_shape_pt_numbers.length - 1) + " " + c_shape_pt_numbers[i2]["shape_pt_number"]);
						l_count += 1;
					}
				}
			}
			if (l_count >= 1) { //エラーがあるとき
				l_new_shape_pt_array = c_shape_pt_array; //とりあえず元のままにする
			} else if (l_last_number === null) { //最後の標柱がみつからない
				//最初を追加する
				l_new_shape_pt_array.push({"shape_pt_number": c_shape_pt_numbers[0]["shape_pt_number"]});
				//途中をすべて加える
				for (let i2 = 0; i2 < c_shape_pt_array.length; i2++) {
					l_new_shape_pt_array.push({"shape_pt_number": c_shape_pt_array[i2]["shape_pt_number"]});
				}
				//最後を加える
				l_new_shape_pt_array.push({"shape_pt_number": c_shape_pt_numbers[c_shape_pt_numbers.length - 1]["shape_pt_number"]});
			} else { //最後の標柱がみつかる
				//途中から最後まで加える
				for (let i2 = 0; i2 <= l_last_number; i2++) {
					l_new_shape_pt_array.push({"shape_pt_number": c_shape_pt_array[i2]["shape_pt_number"]});
				}
			}
		} else { //欠けがない、最初の標柱が見つかる場合
			//最初から最後の1つ前までみつかっている
			//前半が冗長の可能性があるので、後ろから探しなおす。
			//最後の標柱の有無
			l_first_number = null; //最初の標柱の番号
			if (l_last_number === null) { //最後の標柱がみつからない
				l_number = c_shape_pt_array.length - 1;
				for (let i2 = c_shape_pt_numbers.length - 2; i2 >= 0; i2--) { //最後はとばす
					for (let i3 = l_number; i3 >= 0; i3--) {
						if (c_shape_pt_numbers[i2]["shape_pt_number"] === c_shape_pt_array[i3]["shape_pt_number"]) {
							c_shape_pt_numbers[i2]["shape_pt_array_number"] = i3;
							l_number = i3;
							if (i2 === 0) {
								l_first_number = i3;
							}
							break;
						}
					}
				}
				//最初から最後の1つ前まで加える
				for (let i2 = l_first_number; i2 < c_shape_pt_array.length; i2++) {
					l_new_shape_pt_array.push({"shape_pt_number": c_shape_pt_array[i2]["shape_pt_number"]});
				}
				//最後の標柱を加える
				l_new_shape_pt_array.push({"shape_pt_number": c_shape_pt_numbers[c_shape_pt_numbers.length - 1]["shape_pt_number"]});
			} else { //最後の標柱が見つかる
				l_number = l_last_number;
				for (let i2 = c_shape_pt_numbers.length - 1; i2 >= 0; i2--) {
					for (let i3 = l_number; i3 >= 0; i3--) {
						if (c_shape_pt_numbers[i2]["shape_pt_number"] === c_shape_pt_array[i3]["shape_pt_number"]) {
							c_shape_pt_numbers[i2]["shape_pt_array_number"] = i3;
							l_number = i3;
							if (i2 === 0) {
								l_first_number = i3;
							}
							break;
						}
					}
				}
				//最初から最後まで加える
				for (let i2 = l_first_number; i2 <= l_last_number; i2++) {
					l_new_shape_pt_array.push({"shape_pt_number": c_shape_pt_array[i2]["shape_pt_number"]});
				}
			}
		}
		a_data["ur_routes"][i1]["shape_pt_array"] = l_new_shape_pt_array;
		if (a_data["ur_routes"][i1]["shape_pt_array"].length <= 2) {
			console.log("shapesが短すぎる？");
			console.log(a_data["ur_routes"][i1]);
		}
	}
}

function f_make_child_shape_segments(a_data) {
	//child_shape_segmentsをつくる。
	console.time("t12_1");
	const c_child_shape_segments = [];
	for (let i1 = 0; i1 < a_data["shape_segments"].length; i1++) {
		if (a_data["shape_segments"][i1]["near_stops"].length === 0) {
			c_child_shape_segments.push({"start_shape_pt_number": a_data["shape_segments"][i1]["start_shape_pt_number"], "end_shape_pt_number": a_data["shape_segments"][i1]["end_shape_pt_number"], "parent_shape_segment_number": i1});
		} else {
			c_child_shape_segments.push({"start_shape_pt_number": a_data["shape_segments"][i1]["start_shape_pt_number"], "end_shape_pt_number": a_data["shape_segments"][i1]["near_stops"][0]["shape_pt_number"], "parent_shape_segment_number": i1});
			if (a_data["shape_segments"][i1]["near_stops"].length > 1) {
				for (let i2 = 0; i2 < a_data["shape_segments"][i1]["near_stops"].length - 1; i2++) { //1つ少ない
					c_child_shape_segments.push({"start_shape_pt_number": a_data["shape_segments"][i1]["near_stops"][i2]["shape_pt_number"], "end_shape_pt_number": a_data["shape_segments"][i1]["near_stops"][i2 + 1]["shape_pt_number"], "parent_shape_segment_number": i1});
				}
			}
			c_child_shape_segments.push({"start_shape_pt_number": a_data["shape_segments"][i1]["near_stops"][a_data["shape_segments"][i1]["near_stops"].length - 1]["shape_pt_number"], "end_shape_pt_number": a_data["shape_segments"][i1]["end_shape_pt_number"], "parent_shape_segment_number": i1});
		}
	}
	a_data["child_shape_segments"] = c_child_shape_segments;
	console.timeEnd("t12_1");
	console.time("t12_2");
	//高速化済み
	const c_index_se = {};
	for (let i1 = 0; i1 < a_data["child_shape_segments"].length; i1++) {
		c_index_se["s_" + String(a_data["child_shape_segments"][i1]["start_shape_pt_number"]) + "_e_" + String(a_data["child_shape_segments"][i1]["end_shape_pt_number"])] = i1;
	}
	
	//child_segment_arrayをつくる。
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		const c_shape_pt_array = a_data["ur_routes"][i1]["shape_pt_array"];
		a_data["ur_routes"][i1]["child_shape_segment_array"] = [];
		const c_child_shape_segment_array = a_data["ur_routes"][i1]["child_shape_segment_array"];
		for (let i2 = 0; i2 < c_shape_pt_array.length - 1; i2++) {
			let l_exist = false;
			//探す
			const c_se_1 = c_index_se["s_" + String(c_shape_pt_array[i2]["shape_pt_number"]) + "_e_" + String(c_shape_pt_array[i2 + 1]["shape_pt_number"])];
			const c_se_2 = c_index_se["s_" + String(c_shape_pt_array[i2 + 1]["shape_pt_number"]) + "_e_" + String(c_shape_pt_array[i2]["shape_pt_number"])];
			if (c_se_1 !== undefined) {
				c_child_shape_segment_array.push({"child_shape_segment_number": c_se_1, "direction": 1});
			} else if (c_se_2 !== undefined) {
				c_child_shape_segment_array.push({"child_shape_segment_number": c_se_2, "direction": -1});
			} else {
				a_data["shape_segments"].push({
					"start_shape_pt_number": c_shape_pt_array[i2]["shape_pt_number"]
					, "end_shape_pt_number": c_shape_pt_array[i2 + 1]["shape_pt_number"]
				});
				a_data["child_shape_segments"].push({
					"start_shape_pt_number": c_shape_pt_array[i2]["shape_pt_number"]
					, "end_shape_pt_number": c_shape_pt_array[i2 + 1]["shape_pt_number"]
					, "parent_shape_segment_number": a_data["shape_segments"].length - 1
				});
				c_index_se["s_" + String(a_data["child_shape_segments"][a_data["child_shape_segments"].length - 1]["start_shape_pt_number"]) + "_e_" + String(a_data["child_shape_segments"][a_data["child_shape_segments"].length - 1]["end_shape_pt_number"])] = a_data["child_shape_segments"].length - 1;
				c_child_shape_segment_array.push({"child_shape_segment_number": a_data["child_shape_segments"].length - 1, "direction": 1});
			}
		}
	}
	console.timeEnd("t12_2");
}



function f_set_xy_2(a_data) {
	//shape_pointsの座標をshape_pt_arrayに移す。
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		for (let i2 = 0; i2 < a_data["ur_routes"][i1]["shape_pt_array"].length; i2++) {	
			const c_shape_point = a_data["ur_routes"][i1]["shape_pt_array"][i2];
			const c_shape_pt_number = c_shape_point["shape_pt_number"];
			c_shape_point["shape_pt_x"] = a_data["shape_points"][c_shape_pt_number]["shape_pt_x"];
			c_shape_point["shape_pt_y"] = a_data["shape_points"][c_shape_pt_number]["shape_pt_y"];
			c_shape_point["stops_exist"] = a_data["shape_points"][c_shape_pt_number]["stops_exist"]; //標柱の存在
			//near_stopsは省略
		}
	}
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

function f_topology(a_data, a_settings) {
	//f_trip_number(a_data);
	//parent_routesをつくる。
	const c_parent_route_id = a_settings["parent_route_id"];//このidで統合する。
	const c_parent_routes = [];
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		//parent_route_idに設定したい識別子を追加する。
		a_data["ur_routes"][i1]["parent_route_id"] = a_data["ur_routes"][i1][c_parent_route_id];
		let l_exist = false;
		//既にそのur_routeがparent_routesにあるか探す。
		for (let i2 = 0; i2 < c_parent_routes.length; i2++) {
			if (c_parent_routes[i2]["parent_route_id"] === a_data["ur_routes"][i1]["parent_route_id"]) {
				a_data["ur_routes"][i1]["parent_route_number"] = i2;
				l_exist = true;
				continue;
			}
		}
		//もし無かったら、ur_routeをparent_routesに加える。
		//route_colorとroute_text_colorははじめのものを流用する。
		if (l_exist === false) {
			c_parent_routes.push({
				"parent_route_id": a_data["ur_routes"][i1]["parent_route_id"]
				, "route_color": a_data["ur_routes"][i1]["route_color"]
				, "route_text_color": a_data["ur_routes"][i1]["route_text_color"]
				, "shape_segments": []
				, "child_shape_segments": []
			});
			a_data["ur_routes"][i1]["parent_route_number"] = c_parent_routes.length - 1;
		}
	}
	a_data["parent_routes"] = c_parent_routes;
	
	
	//(1) parent_routeのchild_shape_segmentでtrip_numberを合計する
	//(2) direction別に各parent_routeのchild_shape_segmentのwidthを求める。
	
	
	//(1) parent_routeのchild_shape_segmentでtrip_numberを合計する。
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		const c_ur_route = a_data["ur_routes"][i1];
		const c_child_shape_segments = a_data["parent_routes"][c_ur_route["parent_route_number"]]["child_shape_segments"];
		for (let i2 = 0; i2 < c_ur_route["child_shape_segment_array"].length; i2++) {
			let l_exist = false;
			let l_number; //c_child_shape_segmentsでの番号
			for (let i3 = 0; i3 < c_child_shape_segments.length; i3++) {
				if (c_child_shape_segments[i3]["child_shape_segment_number"] === c_ur_route["child_shape_segment_array"][i2]["child_shape_segment_number"]) {
					l_exist = true;
					l_number = i3;
					break;
				}
			}
			if (l_exist === false) {
				c_child_shape_segments.push({
					"child_shape_segment_number": c_ur_route["child_shape_segment_array"][i2]["child_shape_segment_number"]
					, "trip_number_direction_1": 0
					, "trip_number_direction_-1": 0
				});
				l_number = c_child_shape_segments.length - 1;
			}
			if (c_ur_route["child_shape_segment_array"][i2]["direction"] === 1) {
				c_child_shape_segments[l_number]["trip_number_direction_1"] += c_ur_route["trip_number"];
			} else if (c_ur_route["child_shape_segment_array"][i2]["direction"] === -1) {
				c_child_shape_segments[l_number]["trip_number_direction_-1"] += c_ur_route["trip_number"];
			}
		}
	}
	//trip_numberをwidthに変換する関数。
	const c_min_width = a_settings["min_width"]; //2pxか3pxくらい
	const c_max_width = a_settings["max_width"];
	function f_trip_number_to_width(a_trip_number) {
		if (a_trip_number === 0) {
			return 0;
		}
		let l_width = a_trip_number / 32 * c_min_width;
		if (l_width < c_min_width) { //下限
			l_width = c_min_width;
		}
		if (l_width > c_max_width) { //上限
			l_width = c_max_width;
		}
		return l_width;
	}
	//(2) direction別に各parent_routeのchild_shape_segmentのwidthを求める。
	for (let i1 = 0; i1 < a_data["parent_routes"].length; i1++) {
		for (let i2 = 0; i2 < a_data["parent_routes"][i1]["child_shape_segments"].length; i2++) {
			const c_child_shape_segment = a_data["parent_routes"][i1]["child_shape_segments"][i2];
			c_child_shape_segment["width_direction_1"] = f_trip_number_to_width(c_child_shape_segment["trip_number_direction_1"]);
			c_child_shape_segment["width_direction_-1"] = f_trip_number_to_width(c_child_shape_segment["trip_number_direction_-1"]);
			c_child_shape_segment["width"] = f_trip_number_to_width(c_child_shape_segment["trip_number_direction_1"] + c_child_shape_segment["trip_number_direction_-1"]);
		}
	}
	
	
	//リセット
	for (let i1 = 0; i1 < a_data["shape_segments"].length; i1++) {
		a_data["shape_segments"][i1]["parent_routes"] = [];
	}
	
	//parent_shape_segmentで最大のwidthをまとめる
	for (let i1 = 0; i1 < a_data["parent_routes"].length; i1++) {
		for (let i2 = 0; i2 < a_data["parent_routes"][i1]["child_shape_segments"].length; i2++) {
			const c_child_shape_segment = a_data["parent_routes"][i1]["child_shape_segments"][i2];
			const c_shape_segment = a_data["shape_segments"][a_data["child_shape_segments"][c_child_shape_segment["child_shape_segment_number"]]["parent_shape_segment_number"]];
			if (c_shape_segment["parent_routes"] === undefined) {
				c_shape_segment["parent_routes"] = [];
			}
			let l_exist = false;
			for (let i3 = 0; i3 < c_shape_segment["parent_routes"].length; i3++) {
				if (c_shape_segment["parent_routes"][i3]["parent_route_number"] === i1) {
					if (c_shape_segment["parent_routes"][i3]["width_direction_1"] < c_child_shape_segment["width_direction_1"]) {
						c_shape_segment["parent_routes"][i3]["width_direction_1"] = c_child_shape_segment["width_direction_1"];
					}
					if (c_shape_segment["parent_routes"][i3]["width_direction_-1"] < c_child_shape_segment["width_direction_-1"]) {
						c_shape_segment["parent_routes"][i3]["width_direction_-1"] = c_child_shape_segment["width_direction_-1"];
					}
					if (c_shape_segment["parent_routes"][i3]["width"] < c_child_shape_segment["width"]) {
						c_shape_segment["parent_routes"][i3]["width"] = c_child_shape_segment["width"];
					}
					l_exist = true;
					break;
				}
			}
			if (l_exist === false) {
				c_shape_segment["parent_routes"].push({
					"parent_route_number": i1
					, "width_direction_1": c_child_shape_segment["width_direction_1"]
					, "width_direction_-1": c_child_shape_segment["width_direction_-1"]
					, "width": c_child_shape_segment["width"]
				});
			}
		}
	}
	
	//parent_shape_segmentでoffsetを求める
	//仮に線の太さの分だけ両側に余白を取るとして計算しておく。
	for (let i1 = 0; i1 < a_data["shape_segments"].length; i1++) {
		const c_parent_routes = a_data["shape_segments"][i1]["parent_routes"];
		if (c_parent_routes === undefined) {
			console.log("通る系統なし？");
			continue;
		}
		for (let i2 = 0; i2 < c_parent_routes.length; i2++) {
			/*
			if (i2 === 0) {
				c_parent_routes[i2]["offset_direction_1"] = c_min_width + c_parent_routes[i2]["width_direction_1"];
				c_parent_routes[i2]["offset_direction_-1"] = c_min_width + c_parent_routes[i2]["width_direction_-1"];
				c_parent_routes[i2]["offset"] = c_min_width + c_parent_routes[i2]["width"];
			} else {
				c_parent_routes[i2]["offset_direction_1"] = c_parent_routes[i2 - 1]["offset_direction_1"] + c_parent_routes[i2 - 1]["width_direction_1"] + c_parent_routes[i2]["width_direction_1"];
				c_parent_routes[i2]["offset_direction_-1"] = c_parent_routes[i2 - 1]["offset_direction_-1"] + c_parent_routes[i2 - 1]["width_direction_-1"] + c_parent_routes[i2]["width_direction_-1"];
				c_parent_routes[i2]["offset"] = c_parent_routes[i2 - 1]["offset"] + c_parent_routes[i2 - 1]["width"] + c_parent_routes[i2]["width"];
			}
			*/
			const c_min_space_width = a_settings["min_space_width"];
			if (i2 === 0) {
				c_parent_routes[i2]["offset_direction_1"] = c_min_width / 2 + c_min_space_width + c_parent_routes[i2]["width_direction_1"] / 2;
				c_parent_routes[i2]["offset_direction_-1"] = c_min_width / 2 + c_min_space_width + c_parent_routes[i2]["width_direction_-1"] / 2;
				c_parent_routes[i2]["offset"] = c_min_width / 2 + c_min_space_width + c_parent_routes[i2]["width"] / 2;
			} else {
				c_parent_routes[i2]["offset_direction_1"] = c_parent_routes[i2 - 1]["offset_direction_1"] + c_parent_routes[i2 - 1]["width_direction_1"] / 2 + c_min_space_width + c_parent_routes[i2]["width_direction_1"] / 2;
				c_parent_routes[i2]["offset_direction_-1"] = c_parent_routes[i2 - 1]["offset_direction_-1"] + c_parent_routes[i2 - 1]["width_direction_-1"] / 2 + c_min_space_width + c_parent_routes[i2]["width_direction_-1"] / 2;
				c_parent_routes[i2]["offset"] = c_parent_routes[i2 - 1]["offset"] + c_parent_routes[i2 - 1]["width"] / 2 + c_min_space_width + c_parent_routes[i2]["width"] / 2;
			}
		}
	}
	
	//parent_routeのwidthをur_routeに移す。
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		const c_ur_route = a_data["ur_routes"][i1];
		const c_child_shape_segments = a_data["parent_routes"][c_ur_route["parent_route_number"]]["child_shape_segments"];
		for (let i2 = 0; i2 < c_ur_route["child_shape_segment_array"].length; i2++) {
			for (let i3 = 0; i3 < c_child_shape_segments.length; i3++) {
				if (c_child_shape_segments[i3]["child_shape_segment_number"] === c_ur_route["child_shape_segment_array"][i2]["child_shape_segment_number"]) {
					c_ur_route["child_shape_segment_array"][i2]["width_direction_1"] = c_child_shape_segments[i3]["width_direction_1"];
					c_ur_route["child_shape_segment_array"][i2]["width_direction_-1"] = c_child_shape_segments[i3]["width_direction_-1"];
					c_ur_route["child_shape_segment_array"][i2]["width"] = c_child_shape_segments[i3]["width"];
					break;
				}
			}
		}
	}
	
	//parent_routeのoffsetをur_routeに移す。
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		const c_ur_route = a_data["ur_routes"][i1];
		const c_parent_route_number = a_data["ur_routes"][i1]["parent_route_number"];
		for (let i2 = 0; i2 < c_ur_route["child_shape_segment_array"].length; i2++) {
			const c_parent_shape_segment = a_data["shape_segments"][a_data["child_shape_segments"][c_ur_route["child_shape_segment_array"][i2]["child_shape_segment_number"]]["parent_shape_segment_number"]]["parent_routes"];
			for (let i3 = 0; i3 < c_parent_shape_segment.length; i3++) {
				if (c_parent_shape_segment[i3]["parent_route_number"] === c_parent_route_number) {
					c_ur_route["child_shape_segment_array"][i2]["offset_direction_1"] = c_parent_shape_segment[i3]["offset_direction_1"];
					c_ur_route["child_shape_segment_array"][i2]["offset_direction_-1"] = c_parent_shape_segment[i3]["offset_direction_-1"];
					c_ur_route["child_shape_segment_array"][i2]["offset"] = c_parent_shape_segment[i3]["offset"];
					break;
				}
			}
		}
	}
	
	//directionの処理
	if (a_settings["direction"] === true) {
		for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
			const c_ur_route = a_data["ur_routes"][i1];
			for (let i2 = 0; i2 < c_ur_route["child_shape_segment_array"].length; i2++) {
				const c_child_shape_segment = c_ur_route["child_shape_segment_array"][i2];
				if (c_child_shape_segment["direction"] === 1) {
					c_child_shape_segment["offset"] = c_child_shape_segment["offset_direction_1"]
					c_child_shape_segment["width"] = c_child_shape_segment["width_direction_1"]
				} else if (c_child_shape_segment["direction"] === -1) {
					c_child_shape_segment["offset"] = c_child_shape_segment["offset_direction_-1"]
					c_child_shape_segment["width"] = c_child_shape_segment["width_direction_-1"]
				}
			}
		}
	} else {
		for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
			const c_ur_route = a_data["ur_routes"][i1];
			for (let i2 = 0; i2 < c_ur_route["child_shape_segment_array"].length; i2++) {
				const c_child_shape_segment = c_ur_route["child_shape_segment_array"][i2];
				if (c_child_shape_segment["direction"] === 1) {
					c_child_shape_segment["offset"] = c_child_shape_segment["offset"]
					c_child_shape_segment["width"] = c_child_shape_segment["width"]
				} else if (c_child_shape_segment["direction"] === -1) {
					c_child_shape_segment["offset"] = (-1) * c_child_shape_segment["offset"]
					c_child_shape_segment["width"] = c_child_shape_segment["width"]
				}
			}
		}
	}
}







function f_geometry(a_data, a_settings) {
	//座標の準備
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		const c_child_shape_segment_array = a_data["ur_routes"][i1]["child_shape_segment_array"];
		for (let i2 = 0; i2 < c_child_shape_segment_array.length; i2++) {
			const c_child_shape_segment = a_data["child_shape_segments"][c_child_shape_segment_array[i2]["child_shape_segment_number"]];
			const c_start_shape_pt_number = c_child_shape_segment["start_shape_pt_number"];
			const c_end_shape_pt_number = c_child_shape_segment["end_shape_pt_number"];
			const c_start_shape_point = a_data["shape_points"][c_start_shape_pt_number];
			const c_end_shape_point = a_data["shape_points"][c_end_shape_pt_number];
			if (c_child_shape_segment_array[i2]["direction"] === 1) {
				c_child_shape_segment_array[i2]["start_shape_pt_number"] = c_start_shape_pt_number;
				c_child_shape_segment_array[i2]["end_shape_pt_number"] = c_end_shape_pt_number;
				c_child_shape_segment_array[i2]["start_shape_pt_x"] = c_start_shape_point["shape_pt_x"];
				c_child_shape_segment_array[i2]["start_shape_pt_y"] = c_start_shape_point["shape_pt_y"];
				c_child_shape_segment_array[i2]["end_shape_pt_x"] = c_end_shape_point["shape_pt_x"];
				c_child_shape_segment_array[i2]["end_shape_pt_y"] = c_end_shape_point["shape_pt_y"];
			} else if (c_child_shape_segment_array[i2]["direction"] === -1) {
				c_child_shape_segment_array[i2]["start_shape_pt_number"] = c_end_shape_pt_number;
				c_child_shape_segment_array[i2]["end_shape_pt_number"] = c_start_shape_pt_number;
				c_child_shape_segment_array[i2]["start_shape_pt_x"] = c_end_shape_point["shape_pt_x"];
				c_child_shape_segment_array[i2]["start_shape_pt_y"] = c_end_shape_point["shape_pt_y"];
				c_child_shape_segment_array[i2]["end_shape_pt_x"] = c_start_shape_point["shape_pt_x"];
				c_child_shape_segment_array[i2]["end_shape_pt_y"] = c_start_shape_point["shape_pt_y"];
				//c_child_shape_segment_array[i2]["offset"] = (-1) * c_child_shape_segment_array[i2]["offset"];
			}
		}
	}
	
	
	//c_segment_pairsを作っておく。
	const c_segment_pairs = {};
	//ここからoffset作成。
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		const c_shape_pt_array = a_data["ur_routes"][i1]["shape_pt_array"];
		const c_child_shape_segment_array = a_data["ur_routes"][i1]["child_shape_segment_array"];
		a_data["ur_routes"][i1]["polyline"] = f_make_polyline(0);
		for (let i2 = 0; i2 <= a_settings["svg_zoom_ratio"]; i2++) {
			a_data["ur_routes"][i1]["polyline_" + String(i2)] = f_make_polyline(i2);
		}
		
		//a_zoom_16が0のときそのまま、1のときz=15、2のときz=14
		function f_make_polyline(a_zoom_16) {
			const c_zoom_16 = 2 ** a_zoom_16;
			//そのままl_polylineに移す。
			let l_polyline = [];
			//はじめの点
			const c_x_0 = c_child_shape_segment_array[0]["end_shape_pt_x"] - c_child_shape_segment_array[0]["start_shape_pt_x"];
			const c_y_0 = c_child_shape_segment_array[0]["end_shape_pt_y"] - c_child_shape_segment_array[0]["start_shape_pt_y"];
			const c_r_0 = (c_x_0 * c_x_0 + c_y_0 * c_y_0) ** 0.5;
			const c_offset_0 = c_child_shape_segment_array[0]["offset"];
			l_polyline.push({
				"shape_pt_number": c_child_shape_segment_array[0]["start_shape_pt_number"]
				, "next_shape_pt_number": c_child_shape_segment_array[0]["end_shape_pt_number"]
				, "unified_shape_pt_numbers": [c_child_shape_segment_array[0]["start_shape_pt_number"]]
				, "shape_pt_x": c_child_shape_segment_array[0]["start_shape_pt_x"]
				, "shape_pt_y": c_child_shape_segment_array[0]["start_shape_pt_y"]
				, "offset": c_offset_0 * c_zoom_16
				, "width": c_child_shape_segment_array[0]["width"] * c_zoom_16
				, "t2": 0
				, "t1": undefined
				, "xy": [{"x": c_offset_0 * c_zoom_16 * c_y_0 / c_r_0, "y": c_offset_0 * c_zoom_16 * (-1) * c_x_0 / c_r_0}]//相対、配列、左手系
				, "stops_exist": null //標柱の存在
				, "number": 0 //初期位置
			});
			//途中の点
			for (let i2 = 1; i2 < c_child_shape_segment_array.length; i2++) {
				l_polyline.push({
					"shape_pt_number": c_child_shape_segment_array[i2]["start_shape_pt_number"]
					, "next_shape_pt_number": c_child_shape_segment_array[i2]["end_shape_pt_number"]
					, "unified_shape_pt_numbers": [c_child_shape_segment_array[i2]["start_shape_pt_number"]]
					, "shape_pt_x": c_child_shape_segment_array[i2]["start_shape_pt_x"]
					, "shape_pt_y": c_child_shape_segment_array[i2]["start_shape_pt_y"]
					, "offset": c_child_shape_segment_array[i2]["offset"] * c_zoom_16
					, "width": c_child_shape_segment_array[i2]["width"] * c_zoom_16
					, "t2": undefined
					, "t1": undefined
					, "xy": [{"x": null, "y": null}]//相対、配列
					, "stops_exist": c_shape_pt_array[i2]["stops_exist"] //標柱の存在
					, "number": i2 //初期位置
				});
			}
			//最後の点
			const c_x_n = c_child_shape_segment_array[c_child_shape_segment_array.length - 1]["end_shape_pt_x"] - c_child_shape_segment_array[c_child_shape_segment_array.length - 1]["start_shape_pt_x"];
			const c_y_n = c_child_shape_segment_array[c_child_shape_segment_array.length - 1]["end_shape_pt_y"] - c_child_shape_segment_array[c_child_shape_segment_array.length - 1]["start_shape_pt_y"];
			const c_r_n = (c_x_n * c_x_n + c_y_n * c_y_n) ** 0.5;
			const c_offset_n = c_child_shape_segment_array[c_child_shape_segment_array.length - 1]["offset"];
			l_polyline.push({
				"shape_pt_number": c_child_shape_segment_array[c_child_shape_segment_array.length - 1]["end_shape_pt_number"]
				, "next_shape_pt_number": undefined
				, "unified_shape_pt_numbers": [c_child_shape_segment_array[c_child_shape_segment_array.length - 1]["end_shape_pt_number"]]
				, "shape_pt_x": c_child_shape_segment_array[c_child_shape_segment_array.length - 1]["end_shape_pt_x"]
				, "shape_pt_y": c_child_shape_segment_array[c_child_shape_segment_array.length - 1]["end_shape_pt_y"]
				, "offset": c_offset_n * c_zoom_16
				, "width": c_child_shape_segment_array[c_child_shape_segment_array.length - 1]["width"] * c_zoom_16
				, "t2": undefined
				, "t1": 1
				, "xy": [{"x": c_offset_n * c_zoom_16 * c_y_n / c_r_n, "y": c_offset_n * c_zoom_16 * (-1) * c_x_n / c_r_n}]//相対、配列、左手系
				, "stops_exist": c_shape_pt_array[c_shape_pt_array.length - 1]["stops_exist"] //標柱の存在
				, "number": c_shape_pt_array.length - 1 //初期位置
			});
			//コピーを記録しておく。
			const c_polyline_4 = [];
			for (let i2 = 0; i2 < l_polyline.length; i2++) {
				c_polyline_4.push({
					"shape_pt_number": l_polyline[i2]["shape_pt_number"]
					, "next_shape_pt_number": l_polyline[i2]["next_shape_pt_number"]
					, "unified_shape_pt_numbers": []
					, "shape_pt_x": l_polyline[i2]["shape_pt_x"]
					, "shape_pt_y": l_polyline[i2]["shape_pt_y"]
					, "offset": l_polyline[i2]["offset"]
					, "width": l_polyline[i2]["width"]
					, "t2": l_polyline[i2]["t2"]
					, "t1": l_polyline[i2]["t1"]
					, "xy": [{"x": l_polyline[i2]["xy"][0]["x"], "y": l_polyline[i2]["xy"][0]["y"]}]//相対、配列、暫定処理長さ1
					, "stops_exist": l_polyline[i2]["stops_exist"] //標柱の存在
					, "number": l_polyline[i2]["number"] //初期位置
				});
				for (let i3 = 0; i3 < l_polyline[i2]["unified_shape_pt_numbers"].length; i3++) {
					c_polyline_4[c_polyline_4.length - 1]["unified_shape_pt_numbers"].push(l_polyline[i2]["unified_shape_pt_numbers"][i3]);
				}
			}
			//交点を計算する。初回。
			for (let i2 = 1; i2 < l_polyline.length - 1; i2++) {//最初と最後を除く
				//segment_pairを探す。
				const c_shape_pt_number_1 = l_polyline[i2 - 1]["shape_pt_number"];
				const c_shape_pt_number_2 = l_polyline[i2 - 1]["next_shape_pt_number"];
				const c_shape_pt_number_3 = l_polyline[i2]["shape_pt_number"];
				const c_shape_pt_number_4 = l_polyline[i2]["next_shape_pt_number"];
				const c_segment_pair_number = String(c_shape_pt_number_1) + "_" + String(c_shape_pt_number_2) + "_" + String(c_shape_pt_number_3) + "_" + String(c_shape_pt_number_4);
				//もしなければ、追加で作る。
				if (c_segment_pairs[c_segment_pair_number] === undefined) {
					c_segment_pairs[c_segment_pair_number] = f_offset(c_shape_pt_number_1, c_shape_pt_number_2, c_shape_pt_number_3, c_shape_pt_number_4, a_data);
				}
				
				const c_segment_pair = c_segment_pairs[c_segment_pair_number];
				const c_offset_1 = l_polyline[i2 - 1]["offset"];
				const c_offset_2 = l_polyline[i2]["offset"];
				//オフセットを計算する。
				l_polyline[i2 - 1]["t1"] = c_segment_pair["t1"](c_offset_1, c_offset_2);
				l_polyline[i2]["t2"] = c_segment_pair["t2"](c_offset_1, c_offset_2);
				l_polyline[i2]["xy"] = c_segment_pair["xy"](c_offset_1, c_offset_2);
				if (c_segment_pair["xy2"] !== undefined) {
					l_polyline[i2]["xy2"] = c_segment_pair["xy2"](c_offset_1, c_offset_2);
				}
			}
			
			
			let l_count = 0;
			//2回目以降。l_polylineのオフセットを計算し、不要なsegmentを消す。
			
			while (0 < l_polyline.length) { //無限ループ注意
				l_count++;
				const c_polyline_2 = [];
				let l_exist = false; //逆の順序が存在
				let l_unified_shape_pt_numbers = [];
				for (let i2 = 0; i2 < l_polyline.length; i2++) {
					//統合するshape_pt_numberをまとめる。
					for (let i3 = 0; i3 < l_polyline[i2]["unified_shape_pt_numbers"].length; i3++) {
						l_unified_shape_pt_numbers.push(l_polyline[i2]["unified_shape_pt_numbers"][i3]);
					}
					//不要なsegmentを消す。
					if ((0 < i2) && (i2 < l_polyline.length - 1) //最初と最後は残す
						&& (l_polyline[i2]["t2"] > l_polyline[i2]["t1"])//順序が逆
						&& (a_data["shape_points"][l_polyline[i2]["shape_pt_number"]]["original"] !== false && a_data["shape_points"][l_polyline[i2]["next_shape_pt_number"]]["original"] !== false)
					) { //逆の順序の場合
						l_exist = true; //逆の順序が存在
					} else {
						//残す。c_polyline_2に移す。
						c_polyline_2.push({
							"shape_pt_number": l_polyline[i2]["shape_pt_number"]
							, "next_shape_pt_number": l_polyline[i2]["next_shape_pt_number"]
							, "unified_shape_pt_numbers": l_unified_shape_pt_numbers
							, "shape_pt_x": l_polyline[i2]["shape_pt_x"]
							, "shape_pt_y": l_polyline[i2]["shape_pt_y"]
							, "offset": l_polyline[i2]["offset"]
							, "width": l_polyline[i2]["width"]
							, "t2": l_polyline[i2]["t2"]
							, "t1": l_polyline[i2]["t1"]
							, "xy": l_polyline[i2]["xy"]
							, "xy2": l_polyline[i2]["xy2"]
							, "stops_exist": l_polyline[i2]["stops_exist"] //標柱の存在
							, "number": l_polyline[i2]["number"] //初期位置
						});
						l_unified_shape_pt_numbers = [];
					}
				}
				
				l_polyline = c_polyline_2; //代入
				
				
				//交点を計算する。
				for (let i2 = 1; i2 < l_polyline.length - 1; i2++) {//最初と最後を除く
					//segment_pairを探す。
					const c_shape_pt_number_1 = l_polyline[i2 - 1]["shape_pt_number"];
					const c_shape_pt_number_2 = l_polyline[i2 - 1]["next_shape_pt_number"];
					const c_shape_pt_number_3 = l_polyline[i2]["shape_pt_number"];
					const c_shape_pt_number_4 = l_polyline[i2]["next_shape_pt_number"];
					const c_segment_pair_number = String(c_shape_pt_number_1) + "_" + String(c_shape_pt_number_2) + "_" + String(c_shape_pt_number_3) + "_" + String(c_shape_pt_number_4);
					//もしなければ、追加で作る。
					if (c_segment_pairs[c_segment_pair_number] === undefined) {
						c_segment_pairs[c_segment_pair_number] = f_offset(c_shape_pt_number_1, c_shape_pt_number_2, c_shape_pt_number_3, c_shape_pt_number_4, a_data);
					}
					
					const c_segment_pair = c_segment_pairs[c_segment_pair_number];
					const c_offset_1 = l_polyline[i2 - 1]["offset"];
					const c_offset_2 = l_polyline[i2]["offset"];
					//オフセットを計算する。
					l_polyline[i2 - 1]["t1"] = c_segment_pair["t1"](c_offset_1, c_offset_2);
					l_polyline[i2]["t2"] = c_segment_pair["t2"](c_offset_1, c_offset_2);
					l_polyline[i2]["xy"] = c_segment_pair["xy"](c_offset_1, c_offset_2);
					if (c_segment_pair["xy2"] !== undefined) {
						l_polyline[i2]["xy2"] = c_segment_pair["xy2"](c_offset_1, c_offset_2);
					}
				}
				
				
				
				if (l_exist === false) { //逆の順序が存在しなければ終了する。
					break;
				}
			}
			
			
			//l_polylineにできた。
			//以下、標柱のある部分を除外する再計算部分、使用停止。
			
			/*
			//c_polyline_4と照合する
			for (let i2 = 0; i2 < l_polyline.length; i2++) {
				for (let i3 = i2; i3 < c_polyline_4.length; i3++) {
					if (l_polyline[i2]["number"] === c_polyline_4[i3]["number"]) {
						c_polyline_4[i3]["exist"] = true; //残存を記録
						break;
					}
				}
			}
			//標柱が残存しない所があれば、残存に変更する
			let l_count_2 = 0; //i2がここから連続してexist !== true
			let l_exist = false; //この間に標柱が存在
			for (let i2 = 0; i2 < c_polyline_4.length; i2++) {
				if (c_polyline_4[i2]["exist"] === true) { //残る
					if (l_exist === true) { //標柱が存在
						for (let i3 = l_count_2; i3 < i2; i3++) {
							c_polyline_4[i3]["exist"] = true;
						}
					}
					l_count_2 = i2 + 1;
					l_exist = false;
				} else { //残らない
					if (c_polyline_4[i2]["stops_exist"] === true || c_polyline_4[i2 + 1]["stops_exist"] === true) { //前後どちらかに標柱が存在
						l_exist = true;
					}
				}
			}
			console.log(c_polyline_4);
			//l_polylineに移す
			l_polyline = [];
			for (let i2 = 0; i2 < c_polyline_4.length; i2++) {
				if (c_polyline_4[i2]["exist"] === true) {
					l_polyline.push({
					"shape_pt_number": c_polyline_4[i2]["shape_pt_number"]
					, "next_shape_pt_number": c_polyline_4[i2]["next_shape_pt_number"]
					, "unified_shape_pt_numbers": []
					, "shape_pt_x": c_polyline_4[i2]["shape_pt_x"]
					, "shape_pt_y": c_polyline_4[i2]["shape_pt_y"]
					, "offset": c_polyline_4[i2]["offset"]
					, "width": c_polyline_4[i2]["width"]
					, "t2": c_polyline_4[i2]["t2"]
					, "t1": c_polyline_4[i2]["t1"]
					, "x": [c_polyline_4[i2]["x"][0]]//相対、配列、暫定処理長さ1
					, "y": [c_polyline_4[i2]["y"][0]]//相対、配列、暫定処理長さ1
					, "stops_exist": c_polyline_4[i2]["stops_exist"] //標柱の存在
					, "number": c_polyline_4[i2]["number"] //初期位置
					});
					for (let i3 = 0; i3 < c_polyline_4[i2]["unified_shape_pt_numbers"].lengh; i3++) {
						l_polyline[l_polyline.length - 1]["unified_shape_pt_numbers"].push(c_polyline_4[i2]["unified_shape_pt_numbers"][i3]);
					}
				}
			}
			//交点を計算する。最終回。
			for (let i2 = 1; i2 < l_polyline.length - 1; i2++) {//最初と最後を除く
				//segment_pairを探す。
				const c_shape_pt_number_1 = l_polyline[i2 - 1]["shape_pt_number"];
				const c_shape_pt_number_2 = l_polyline[i2 - 1]["next_shape_pt_number"];
				const c_shape_pt_number_3 = l_polyline[i2]["shape_pt_number"];
				const c_shape_pt_number_4 = l_polyline[i2]["next_shape_pt_number"];
				const c_segment_pair_number = String(c_shape_pt_number_1) + "_" + String(c_shape_pt_number_2) + "_" + String(c_shape_pt_number_3) + "_" + String(c_shape_pt_number_4);
				//もしなければ、追加で作る。
				if (c_segment_pairs[c_segment_pair_number] === undefined) {
					c_segment_pairs[c_segment_pair_number] = f_offset(c_shape_pt_number_1, c_shape_pt_number_2, c_shape_pt_number_3, c_shape_pt_number_4, a_data);
				}
				
				const c_segment_pair = c_segment_pairs[c_segment_pair_number];
				const c_offset_1 = l_polyline[i2 - 1]["offset"];
				const c_offset_2 = l_polyline[i2]["offset"];
				//オフセットを計算する。
				l_polyline[i2 - 1]["t1"] = c_segment_pair["t1"](c_offset_1, c_offset_2);
				l_polyline[i2]["t2"] = c_segment_pair["t2"](c_offset_1, c_offset_2);
				l_polyline[i2]["x"] = c_segment_pair["x"](c_offset_1, c_offset_2);
				l_polyline[i2]["y"] = c_segment_pair["y"](c_offset_1, c_offset_2);
			}
			*/
			
			//整理する。
			const c_polyline_3 = [];
			for (let i2 = 0; i2 < l_polyline.length; i2++) {
				//widthごとに区切る。widthが変わると配列を進める。
				if (c_polyline_3.length === 0 || (c_polyline_3[c_polyline_3.length - 1]["width"] !== l_polyline[i2]["width"] && i2 !== l_polyline.length - 1)) {
					c_polyline_3.push({
						"width": l_polyline[i2]["width"]
						, "polyline": []
					});
				}
				//座標とshape_pt_numberを追加する。
				for (let i3 = 0; i3 < l_polyline[i2]["xy"].length; i3++) {
					c_polyline_3[c_polyline_3.length - 1]["polyline"].push({
						"x": l_polyline[i2]["xy"][i3]["x"] + l_polyline[i2]["shape_pt_x"]
						, "y": l_polyline[i2]["xy"][i3]["y"] + l_polyline[i2]["shape_pt_y"]
					});
					//中央の点にshape_pt_numberを入れる。
					if (l_polyline[i2]["xy"].length === 1 || (l_polyline[i2]["xy"].length === 3 && i3 === 1)) {
						c_polyline_3[c_polyline_3.length - 1]["polyline"][c_polyline_3[c_polyline_3.length - 1]["polyline"].length - 1]["unified_shape_pt_numbers"] = l_polyline[i2]["unified_shape_pt_numbers"];
					} else {
						c_polyline_3[c_polyline_3.length - 1]["polyline"][c_polyline_3[c_polyline_3.length - 1]["polyline"].length - 1]["unified_shape_pt_numbers"] = [];
					}
					//曲線計算用
					if (l_polyline[i2]["xy2"] !== undefined && l_polyline[i2]["xy2"] !== null) {
						const c_polyline_3_last = c_polyline_3[c_polyline_3.length - 1]["polyline"][c_polyline_3[c_polyline_3.length - 1]["polyline"].length - 1];
						c_polyline_3_last["sx"] = l_polyline[i2]["xy2"]["sx"] + l_polyline[i2]["shape_pt_x"];
						c_polyline_3_last["sy"] = l_polyline[i2]["xy2"]["sy"] + l_polyline[i2]["shape_pt_y"];
						c_polyline_3_last["ex"] = l_polyline[i2]["xy2"]["ex"] + l_polyline[i2]["shape_pt_x"];
						c_polyline_3_last["ey"] = l_polyline[i2]["xy2"]["ey"] + l_polyline[i2]["shape_pt_y"];
					}
				}
			}
			
			return c_polyline_3;
		}
		
		
		
		
	}
}

//左手系に要注意！
function f_offset(a_1, a_2, a_3, a_4, a_bmd) {
	//各点の座標
	const c_p1x = a_bmd["shape_points"][a_1]["shape_pt_x"];
	const c_p1y = a_bmd["shape_points"][a_1]["shape_pt_y"];
	const c_p2x = a_bmd["shape_points"][a_2]["shape_pt_x"];
	const c_p2y = a_bmd["shape_points"][a_2]["shape_pt_y"];
	const c_p3x = a_bmd["shape_points"][a_3]["shape_pt_x"];
	const c_p3y = a_bmd["shape_points"][a_3]["shape_pt_y"];
	const c_p4x = a_bmd["shape_points"][a_4]["shape_pt_x"];
	const c_p4y = a_bmd["shape_points"][a_4]["shape_pt_y"];
	const c_p2o = a_bmd["shape_points"][a_2]["original"];
	const c_p3o = a_bmd["shape_points"][a_3]["original"];
	
	//交点
	const c_cross_point = f_cross_point(c_p1x, c_p1y, c_p2x, c_p2y, c_p3x, c_p3y, c_p4x, c_p4y);
	if (c_cross_point["parallel"] === true) {
		console.log("平行");
		if (a_1 === a_3 && a_2 === a_4) {
			console.log("同一");
		}
	}
	
	const c_cpx = c_cross_point["x"];
	const c_cpy = c_cross_point["y"];
	
	//基準をc_p2としてt1などのずれる分
	const c_dx1 = c_cpx - c_p2x;
	const c_dy1 = c_cpy - c_p2y;
	let l_dt1;
	if (c_p2x !== c_p1x) {
		l_dt1 = (c_cpx - c_p2x) / (c_p2x - c_p1x);
	} else {
		l_dt1 = (c_cpy - c_p2y) / (c_p2y - c_p1y);
	}
	//基準をc_p3としてt2などのずれる分
	const c_dx2 = c_cpx - c_p3x;
	const c_dy2 = c_cpy - c_p3y;
	let l_dt2;
	if (c_p4x !== c_p3x) {
		l_dt2 = (c_cpx - c_p3x) / (c_p4x - c_p3x);
	} else {
		l_dt2 = (c_cpy - c_p3y) / (c_p4y - c_p3y);
	}
	
	
	//仮
	const a_x1 = c_p2x - c_p1x;
	const a_y1 = c_p2y - c_p1y;
	const a_x2 = c_p4x - c_p3x;
	const a_y2 = c_p4y - c_p3y;
	//2つのベクトルが離れている場合を考慮。
	
	//ベクトル(a_x1, a_y1)とベクトル(a_x2, a_y2)
	//ベクトルの大きさ
	let c_r1 = (a_x1 * a_x1 + a_y1 * a_y1) ** 0.5;
	let c_r2 = (a_x2 * a_x2 + a_y2 * a_y2) ** 0.5;
	//大きさが十分小さいとき、
	if (c_r1 < 0.01 || c_r2 < 0.01) { //例外処置。小さい場合。仮。
		//console.log("大きさが小さいので注意");
		//未完成
	}
	
	const c_xy1 = a_x1 * a_x2 + a_y1 * a_y2;
	const c_xy2_0 = a_x1 * a_y2 - a_x2 * a_y1;//平行で0のときどうする？
	//大きさをそろえて判断したい。
	const c_xy2_1 = c_xy2_0 / (c_r1 * c_r2);
	
	//追加場合わけ
	//折返しになっている。
	if (a_1 === a_4 && a_2 === a_3) {
		const c_ft1 = function(a_z1, a_z2) {
			return 1;
		}
		const c_ft2 = function(a_z1, a_z2) {
			return 0;
		}
		const c_x1 = a_y1 / c_r1;
		const c_x2 = a_y2 / c_r2;
		const c_y1 = (-1) * a_x1 / c_r1;
		const c_y2 = (-1) * a_x2 / c_r2;
		//xyまとめて3つ
		const c_fxy = function (a_z1, a_z2) {
			return [{"x": a_z1 * c_x1, "y": a_z1 * c_y1}, {"x": (a_z1 * c_x1 + a_z2 * c_x2) * 0.5, "y": (a_z1 * c_y1 + a_z2 * c_y2) * 0.5}, {"x": a_z2 * c_x2, "y": a_z2 * c_y2}];
		}
		
		return {"t1":c_ft1, "t2": c_ft2, "xy": c_fxy};
	}
	
	
	if (a_2 === a_3 && c_p2o === false && c_p3o === false) { //例外処置。
		//前の線分の終点と次の線分始点が一致
		//折れ曲がりが新たに切断した点
		//（このときオフセットは必ず一致する）
		const c_ft1 = function(a_z1, a_z2) {
			return 1;
		}
		const c_ft2 = function(a_z1, a_z2) {
			return 0;
		}
		const c_x1 = a_y1 / c_r1;
		const c_x2 = a_y2 / c_r2;
		const c_y1 = (-1) * a_x1 / c_r1;
		const c_y2 = (-1) * a_x2 / c_r2;
		const c_fxy = function (a_z1, a_z2) {
			return [{"x": (a_z1 * c_x1 + a_z2 * c_x2) * 0.5, "y": (a_z1 * c_y1 + a_z2 * c_y2) * 0.5}];
		}
		return {"t1":c_ft1, "t2": c_ft2, "xy": c_fxy};
	}
	
	if (a_2 === a_3 && Math.abs(c_xy2_1) < 0.1) { //例外処置。
		//c_xy2_1が十分小さい平行
		//前の線分の終点と次の線分の始点が一致
		//折れ線を1点で曲げたい。
		const c_ft1 = function(a_z1, a_z2) {
			return 1;
		}
		const c_ft2 = function(a_z1, a_z2) {
			return 0;
		}
		const c_x1 = a_y1 / c_r1;
		const c_x2 = a_y2 / c_r2;
		const c_y1 = (-1) * a_x1 / c_r1;
		const c_y2 = (-1) * a_x2 / c_r2;
		const c_fxy = function (a_z1, a_z2) {
			if (a_z1 === a_z2) {
				return [{"x": (a_z1 * c_x1 + a_z2 * c_x2) * 0.5, "y": (a_z1 * c_y1 + a_z2 * c_y2) * 0.5}];
			}
			//座標3つ
			return [{"x": a_z1 * c_x1, "y": a_z1 * c_y1}, {"x": (a_z1 * c_x1 + a_z2 * c_x2) * 0.5, "y": (a_z1 * c_y1 + a_z2 * c_y2) * 0.5}, {"x": a_z2 * c_x2, "y": a_z2 * c_y2}];
		}
		return {"t1":c_ft1, "t2": c_ft2, "xy": c_fxy};
	}
	
	
	if (Math.abs(c_xy2_1) < 0.1) { //例外処置。
		//c_xy2_1が十分小さい平行
		const c_ft1 = function(a_z1, a_z2) {
			return 1 + l_dt1;
		}
		const c_ft2 = function(a_z1, a_z2) {
			return 0 + l_dt2;
		}
		const c_x1 = a_y1 / c_r1;
		const c_x2 = a_y2 / c_r2;
		const c_y1 = (-1) * a_x1 / c_r1;
		const c_y2 = (-1) * a_x2 / c_r2;
		const c_fxy = function (a_z1, a_z2) {
			//座標3つ
			return [{"x": a_z1 * c_x1 + c_dx2, "y": a_z1 * c_y1 + c_dy2}, {"x": (a_z1 * c_x1 + a_z2 * c_x2) * 0.5 + c_dx2, "y": (a_z1 * c_y1 + a_z2 * c_y2) * 0.5 + c_dy2}, {"x": a_z2 * c_x2 + c_dx2, "y": a_z2 * c_y2 + c_dy2}];
		}
		return {"t1":c_ft1, "t2": c_ft2, "xy": c_fxy};
	}
	
	const c_xy2 = 1 / c_xy2_0;
	
	//交点の相対的な位置
	//const c_t1 = c_xy2 * c_xy1 / c_r1 * a_z1 - c_xy2 * c_r2 * a_z2;
	const c_t11 = (-1) * c_xy2 * c_xy1 / c_r1;
	const c_t12 = c_xy2 * c_r2;
	const c_ft1 = function(a_z1, a_z2) {
		if ((a_z1 * c_t11 + a_z2 * c_t12 + 1/* + l_dt1*/ > 1) && (a_z1 * c_t21 + a_z2 * c_t22/* + l_dt2*/ < 0)) { //曲線用、l_dt1とl_dt2は必要か？
			return 1 + l_dt1;
		}
		return a_z1 * c_t11 + a_z2 * c_t12 + 1 + l_dt1;//1を加えて調整
	}
	
	// const c_t2 = c_xy2 * c_r1 * a_z1 - c_xy2 * c_xy1 / c_r2 * a_z2;
	const c_t21 = (-1) * c_xy2 * c_r1;
	const c_t22 = c_xy2 * c_xy1 / c_r2;
	const c_ft2 = function(a_z1, a_z2) {
		if ((a_z1 * c_t11 + a_z2 * c_t12 + 1/* + l_dt1*/ > 1) && (a_z1 * c_t21 + a_z2 * c_t22/* + l_dt2*/ < 0)) { //曲線用、l_dt1とl_dt2は必要か？
			return l_dt2;
		}
		return a_z1 * c_t21 + a_z2 * c_t22 + l_dt2;
	}
	
	//交点の座標
	const c_x1 = (-1) * c_r1 * a_x2 * c_xy2;
	const c_x2 = c_r2 * a_x1 * c_xy2;
	const c_y1 = (-1) * c_r1 * a_y2 * c_xy2;
	const c_y2 = c_r2 * a_y1 * c_xy2;
	const c_fxy = function (a_z1, a_z2) {
		return [{"x": a_z1 * c_x1 + a_z2 * c_x2 + c_dx2, "y": a_z1 * c_y1 + a_z2 * c_y2 + c_dy2}]; //座標
	}
	//終点と起点をそのままオフセットした位置、曲線計算用
	//sxとsyが前の線分の終点側、exとeyが次の線分の始点側
	const c_fxy2 = function (a_z1, a_z2) {
		if ((a_z1 * c_t11 + a_z2 * c_t12 + 1/* + l_dt1*/ > 1) && (a_z1 * c_t21 + a_z2 * c_t22/* + l_dt2*/ < 0)) { //l_dt1とl_dt2は必要か？
			return {"sx": a_z1 * a_y1 / c_r1 + c_dx2,"sy": a_z1 * (-1) * a_x1 / c_r1 + c_dy2, "ex": a_z2 * a_y2 / c_r2 + c_dx2,"ey": a_z2 * (-1) * a_x2 / c_r2 + c_dy2};
		} else {
			return null;
		}
	}
	return {"t1":c_ft1, "t2": c_ft2, "xy": c_fxy, "xy2": c_fxy2};
}




function f_cross_point(a_x1, a_y1, a_x2, a_y2, a_x3, a_y3, a_x4, a_y4){
	const c_vy1 = a_y2 - a_y1;
	const c_vx1 = a_x1 - a_x2;
	const c_1 = -1 * c_vy1 * a_x1 - c_vx1 * a_y1;
	const c_vy2 = a_y4 - a_y3;
	const c_vx2 = a_x3 - a_x4;
	const c_2 = -1 * c_vy2 * a_x3 - c_vx2 * a_y3;
	
	const c_3 = c_vx1 * c_vy2 - c_vx2 * c_vy1;
	if(c_3 === 0){ //平行によりうまく求められないとき。
		return {"x": (a_x2 + a_x3) * 0.5, "y": (a_y2 + a_y3) * 0.5, "parallel": true};
	} else {
		return {"x": (c_1 * c_vx2 - c_2 * c_vx1) / c_3, "y": (c_vy1 * c_2 - c_vy2 * c_1) / c_3, "parallel": false};
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

