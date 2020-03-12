"use strict";
//これ以外に読み込みが必要なもの
//leaflet
//zip.min.js
//rt関係

//クリックできるところを青字下線
document.getElementsByTagName("style")[0].innerHTML += " span[onclick] {color: blue; text-decoration: underline;}";


//グローバル変数
let l_map; //leaflet
let l_data = {};//グローバルな情報を扱う。
let l_tooltip_x = 0;//ツールチップの位置
let l_tooltip_y = 0;//ツールチップの位置
let l_settings = {};//設定



//基本となる関数
async function f_busmap(a_settings) {
	//a_settingsは設定
	const c_input = a_settings["data"];
	//const c_response = [];//XHR
	const c_bmd = {"rt": null, "stops": [], "ur_stops": [], "parent_stations": [], "ur_routes": [], "calendar": [], "trips": []};//バスマップに用いるデータをここにまとめる、stopsは仮に残す

	//初期設定
	const c_input_settings = f_input_settings(a_settings);

	//HTMLの変更
	document.getElementById(c_input_settings["div_id"]).innerHTML = f_html(c_input_settings);
	//leafletの初期設定
	if (c_input_settings["leaflet"] === true) {
		f_set_leaflet(c_input_settings);
	}
	//GTFS-RTの読み込み
	if (c_input_settings["rt"] !== false) {
		const c_grb = module.exports.transit_realtime;
		const c_cors_url = c_input_settings["cors_url"];//クロスオリジンを回避するphpをかませる
		const c_rt_url = c_cors_url + c_input_settings["rt"];
		c_bmd["rt"] = f_binary_to_json((await f_xhr_get(c_rt_url, "arraybuffer")).response, c_grb);
		function f_binary_to_json(a_binary, a_grb) {
			const c_array_1 = new Uint8Array(a_binary);
			const c_array_2 = [];
			for (i1 = 3; i1 < c_array_1.length; i1++) {
				c_array_2.push(c_array_1[i1]);
			}
			return a_grb.FeedMessage.decode(c_array_2);
		}
	}
	//XHR
	const c_data = [{}];
	//GTFSの場合、ZIPの解凍
	console.log(c_input_settings);
	if (c_input_settings["data_type"] === "gtfs") {
		const c_response = await f_zip_to_text(c_input_settings["data"]);
		//c_responseに取得したデータがある
		//これをc_dataにまとめる
		const c_file_names = ["agency", "agency_jp", "stops", "routes", "routes_jp", "trips", "office_jp", "stop_times", "calendar", "calendar_dates", "fare_attributes", "fare_rules", "shapes", "frequencies", "transfers", "feed_info", "translations"];
		for (let i1 = 0; i1 < c_file_names.length; i1++) {
			if (c_response[c_file_names[i1]] !== undefined) {
				c_data[0][c_file_names[i1]] =  f_csv_to_json(c_response[c_file_names[i1]]);
			} else if (c_response[c_file_names[i1] + ".txt"] !== undefined) {
				c_data[0][c_file_names[i1]] =  f_csv_to_json(c_response[c_file_names[i1] + ".txt"]);
			}
		}
	} else if (c_input_settings["data_type"] === "json" || c_input_settings["data_type"] === "geojson" || c_input_settings["data_type"] === "topojson" || c_input_settings["data_type"] === "api") {
		c_data[0] = JSON.parse((await f_xhr_get(c_input_settings["data"], "text")).responseText);
		console.log(c_data[0]);
		if (c_input_settings["data_type"] === "topojson") {
			c_data[0] = f_topojson_to_geojson(c_data[0]);
			c_data[0] = f_from_geojson(c_data[0]["stops"]["features"], c_data[0]["ur_routes"]["features"]);
		}
		console.log(c_data[0]);
		if (c_input_settings["data_type"] === "geojson") {
			c_data[0] = f_geojson_to_json(c_data[0]);
		}
		if (c_input_settings["data_type"] === "api") {
			c_data[0] = f_from_api(c_data[0]);
		}
		console.log(c_data[0]);
	}
	//準備
	for (let i1 = 0; i1 < c_data.length; i1++) {
		console.log(c_data);
		if (c_data[i1]["stop_times"] === undefined) {//json由来
			f_prepare_json(c_data[i1]);
		} else {//gtfs由来
			f_prepare_gtfs(c_data[i1]);
		}
	}
	//c_bmdに移す
	f_make_bmd(c_data, c_bmd);
	//f_prepare_common(a_data[0]);
	//f_next_2(c_bmd, c_input_settings);//ここから仮につなげる
	if (c_input_settings["change"] === true) {
		//当面機能停止
		//document.getElementById("ur_route_list").innerHTML = f_ur_route_list(c_bmd);
	}
	console.time("t_5");
	f_make_shape_points(c_bmd);
	console.timeEnd("t_5");
	console.time("t_6");
	f_set_xy(c_bmd, c_input_settings["zoom_level"]); //shape_pointsとstopsに座標xyを加える。
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
	f_cut_shape_segments(c_bmd, c_input_settings); //3s遅い。高速化困難。ここでshape_pointが増加、stopにnearest_shape_pt_idを追加、shape_pt_arrayに変更あり。
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
	if (c_input_settings["global"] === true) {
		l_data = c_bmd;
		l_settings = c_input_settings;
	}
	
	console.time("t_14");
	f_open(c_bmd, c_input_settings); //6s遅い！
	console.timeEnd("t_14");
	
}




//データの変換
function f_topojson_to_geojson(a_topojson) {
	//arcsをcoordinatesに変換
	for (let i1 in a_topojson["objects"]) {
		//以下、GeometryCollectionのみ対象
		if (a_topojson["objects"][i1]["type"] !== "GeometryCollection") {
			continue;
		}
		for (let i2 = 0; i2 < a_topojson["objects"][i1]["geometries"].length; i2++) {
			const c_geometry = a_topojson["objects"][i1]["geometries"][i2];
			//以下、LineStringのみ対象
			if (c_geometry["type"] !== "LineString") {
				continue;
			}
			c_geometry["coordinates"] = [];
			for (let i3 = 0; i3 < c_geometry["arcs"].length; i3++) {
				const c_number = c_geometry["arcs"][i3];
				if (c_number >= 0) {
					const c_arc = a_topojson["arcs"][c_number];
					for (let i4 = 0; i4 < c_arc.length; i4++) {
						if (c_geometry["coordinates"].length > 0) {
							if (i4 === 0 && c_arc[0][0] === c_geometry["coordinates"][c_geometry["coordinates"].length - 1][0] && c_arc[0][1] === c_geometry["coordinates"][c_geometry["coordinates"].length - 1][1]) {
								continue;
							}
						}
						c_geometry["coordinates"].push(c_arc[i4]);
					}
				} else if (c_number < 0) {
					const c_arc = a_topojson["arcs"][(c_number + 1) * (-1)];
					for (let i4 = c_arc.length - 1; i4 >= 0; i4--) {
						if (c_geometry["coordinates"].length > 0) {
							if (i4 === c_arc.length - 1 && c_arc[c_arc.length - 1][0] === c_geometry["coordinates"][c_geometry["coordinates"].length - 1][0] && c_arc[c_arc.length - 1][1] === c_geometry["coordinates"][c_geometry["coordinates"].length - 1][1]) {
								continue;
							}
						}
						c_geometry["coordinates"].push(c_arc[i4]);
					}
				}
			}
		}
	}
	//GeometryCollectionをFeatureCollectionに変換
	const c_geojsons = {};
	for (let i1 in a_topojson["objects"]) {
		//以下、GeometryCollectionのみ対象
		if (a_topojson["objects"][i1]["type"] !== "GeometryCollection") {
			continue;
		}
		c_geojsons[i1] = {"type": "FeatureCollection", "features": []};
		for (let i2 = 0; i2 < a_topojson["objects"][i1]["geometries"].length; i2++) {
			const c_geometry = a_topojson["objects"][i1]["geometries"][i2];
			//以下、PointとLineStringのみ対象
			if (c_geometry["type"] !== "Point" && c_geometry["type"] !== "LineString") {
				continue;
			}
			c_geojsons[i1]["features"].push({"type": "Feature", "geometry": {"type": c_geometry["type"], "coordinates": c_geometry["coordinates"]}, "properties": c_geometry["properties"]});
		}
	}
	return c_geojsons;
}


function f_from_geojson(a_geojson_stops, a_geojson_ur_routes) {
	const c_stops = [];
	for (let i1 = 0; i1 < a_geojson_stops.length; i1++) {
		const c_geometry = a_geojson_stops[i1]["geometry"];
		if (c_geometry["coordinates"][0] !== undefined && c_geometry["coordinates"][1] !== undefined) {
			const c_coordinates = [];
			c_coordinates[0] = c_geometry["coordinates"][0];
			c_coordinates[1] = c_geometry["coordinates"][1];
			if (c_coordinates[1] > 90 || c_coordinates[1] < -90) { //緯度経度が逆の場合、修正する
				c_coordinates[0] = c_geometry["coordinates"][1];
				c_coordinates[1] = c_geometry["coordinates"][0];
			}
			a_geojson_stops[i1]["properties"]["stop_lon"] = c_coordinates[0];
			a_geojson_stops[i1]["properties"]["stop_lat"] = c_coordinates[1];
		}
		a_geojson_stops[i1]["properties"]["stop_name"] = a_geojson_stops[i1]["properties"]["stop_id"].split("_")[0]; //互換性確保
		c_stops.push(a_geojson_stops[i1]["properties"]);
	}
	const c_ur_routes = [];
	for (let i1 = 0; i1 < a_geojson_ur_routes.length; i1++) {
		const c_geometry = a_geojson_ur_routes[i1]["geometry"];
		a_geojson_ur_routes[i1]["properties"]["shape_pt_array"] = [];
		a_geojson_ur_routes[i1]["properties"]["service_array"] = ""; //互換性確保
		if (a_geojson_ur_routes[i1]["properties"]["trip_number"] === undefined) {
			a_geojson_ur_routes[i1]["properties"]["trip_number"] = 1; //互換性確保
		}
		for (let i2 = 0; i2 < c_geometry["coordinates"].length; i2++) {
			const c_coordinates = [];
			c_coordinates[0] = c_geometry["coordinates"][i2][0];
			c_coordinates[1] = c_geometry["coordinates"][i2][1];
			if (c_coordinates[1] > 90 || c_coordinates[1] < -90) { //緯度経度が逆の場合、修正する
				c_coordinates[0] = c_geometry["coordinates"][i2][1];
				c_coordinates[1] = c_geometry["coordinates"][i2][0];
			}
			a_geojson_ur_routes[i1]["properties"]["shape_pt_array"].push({"shape_pt_lon": c_coordinates[0], "shape_pt_lat": c_coordinates[1]});
		}
		c_ur_routes.push(a_geojson_ur_routes[i1]["properties"]);
	}
	return {"stops": c_stops, "ur_routes": c_ur_routes, "calendar": [], "routes": c_ur_routes};
	//routesとcalendarは互換性確保
}


function f_geojson_to_json(a_geojson) {
	const c_stops = [];
	for (let i1 = 0; i1 < a_geojson["features"].length; i1++) {
		const c_feature = a_geojson["features"][i1];
		if (c_feature["geometry"]["type"] === "Point" && c_feature["properties"]["stop_id"] !== undefined) { //標柱
			let l_lon = c_feature["geometry"]["coordinates"][0];
			let l_lat = c_feature["geometry"]["coordinates"][1];
			if (l_lat > 90 || l_lat < -90) { //緯度経度が逆の場合、修正する
				l_lon = c_feature["geometry"]["coordinates"][1];
				l_lat = c_feature["geometry"]["coordinates"][0];
			}
			c_feature["properties"]["stop_lon"] = l_lon;
			c_feature["properties"]["stop_lat"] = l_lat;
			c_feature["properties"]["stop_name"] = c_feature["properties"]["stop_id"].split("_")[0]; //互換性確保
			c_stops.push(c_feature["properties"]);
		}
	}
	if (a_geojson["ur_routes"] === undefined) { //普通のgeojson
		const c_ur_routes = [];
		for (let i1 = 0; i1 < a_geojson["features"].length; i1++) {
			const c_feature = a_geojson["features"][i1];
			if (c_feature["geometry"]["type"] === "LineString") { //系統
				c_feature["properties"]["service_array"] = ""; //互換性確保
				if (c_feature["properties"]["trip_number"] === undefined) {
					c_feature["properties"]["trip_number"] = 1; //互換性確保
				}
				c_feature["properties"]["shape_pt_array"] = [];
				for (let i2 = 0; i2 < c_feature["geometry"]["coordinates"].length; i2++) {
					c_feature["properties"]["shape_pt_array"].push({"shape_pt_lon": c_feature["geometry"]["coordinates"][i2][0], "shape_pt_lat": c_feature["geometry"]["coordinates"][i2][1]});
				}
			}
		}
		return {"stops": c_stops, "routes": c_ur_routes, "ur_routes": c_ur_routes, "calendar": []}; //routesとur_routes、calendarは互換性確保
	} else { //道路と系統を分離したgeojson
		for (let i1 = 0; i1 < a_geojson["ur_routes"].length; i1++) {
			const c_route = a_geojson["ur_routes"][i1];
			c_route["service_array"] = ""; //互換性確保
			if (c_route["trip_number"] === undefined) {
				c_route["trip_number"] = 999; //互換性確保
			}
			c_route["shape_pt_array"] = [];
			for (let i2 = 0; i2 < c_route["arcs"].length - 1; i2++) { //最後の1個を除く
				for (let i3 = 0; i3 < a_geojson["features"].length; i3++) {
					const c_feature = a_geojson["features"][i3];
					if (c_feature["geometry"]["type"] === "LineString") {
						if (c_feature["properties"]["start_point"] === c_route["arcs"][i2] && c_feature["properties"]["end_point"] === c_route["arcs"][i2 + 1]) {
							for (let i4 = 0; i4 < c_feature["geometry"]["coordinates"].length; i4++) {
								if (c_route["shape_pt_array"].length > 0 && i4 === 0) {
									if (c_route["shape_pt_array"][c_route["shape_pt_array"].length - 1]["shape_pt_lon"] === c_feature["geometry"]["coordinates"][0][0] && c_route["shape_pt_array"][c_route["shape_pt_array"].length - 1]["shape_pt_lat"] === c_feature["geometry"]["coordinates"][0][1]) {
										continue;
									}
								}
								c_route["shape_pt_array"].push({"shape_pt_lon": c_feature["geometry"]["coordinates"][i4][0], "shape_pt_lat": c_feature["geometry"]["coordinates"][i4][1]});
							}
							break;
						} else if (c_feature["properties"]["end_point"] === c_route["arcs"][i2] && c_feature["properties"]["start_point"] === c_route["arcs"][i2 + 1]) {
							for (let i4 = c_feature["geometry"]["coordinates"].length - 1; i4 >= 0; i4--) {
								if (c_route["shape_pt_array"].length > 0 && i4 === c_feature["geometry"]["coordinates"].length - 1) {
									if (c_route["shape_pt_array"][c_route["shape_pt_array"].length - 1][0] === c_feature["geometry"]["coordinates"][c_feature["geometry"]["coordinates"].length - 1]["shape_pt_lon"] && c_route["shape_pt_array"][c_route["shape_pt_array"].length - 1]["shape_pt_lat"] === c_feature["geometry"]["coordinates"][c_feature["geometry"]["coordinates"].length - 1][1]) {
										continue;
									}
								}
								c_route["shape_pt_array"].push({"shape_pt_lon": c_feature["geometry"]["coordinates"][i4][0], "shape_pt_lat": c_feature["geometry"]["coordinates"][i4][1]});
							}
							break;
						}
					}
				}
				//console.log("arcがみつからない？" + c_route["arcs"][i2] + " " + c_route["arcs"][i2+1]);
			}
		}
		return {"stops": c_stops, "routes": a_geojson["ur_routes"], "ur_routes": a_geojson["ur_routes"], "calendar": []}; //routesとur_routes、calendarは互換性確保
	}
}


/*
新しい案
{
	"type": "FeatureCollection",
	"features": [
		{"type": "Feature", "properties": {"stop_id": "停留所名_のりば番号"}, "geometry": {"type": "Point", "coordinates": [100, 1]}},
		{"type": "Feature", "properties": {"start_point": "始点交差点", "end_point": "終点交差点"}, "geometry": {"type": "LineString", "coordinates": [[102, 0], [103, 1]]}}
	],
	"routes": [
		{"route_id": "系統名", "jp_parent_route_id": "系統群名", "trip_number": 999, "stop_array": [{"stop_id": "標柱1"}, {"stop_id": "標柱2"}], "arcs": ["交差点1", "交差点2"]}
	]
}
*/

/*

{
	"type": "FeatureCollection",
	"features": [
		{
			"type": "Feature",
			"geometry": {"type": "Point", "coordinates": [102.0, 0.5]},
			"properties": {"prop0": "value0"}
		},
		{
			"type": "Feature",
			"geometry": {"type": "LineString", "coordinates": [[102.0, 0.0], [103.0, 1.0], [104.0, 0.0], [105.0, 1.0]]},
			"properties": {"prop0": "value0", "prop1": 0.0}
		}
	]
}


{
	"type": "Topology",
	"objects": {
		"example": {
			"type": "GeometryCollection",
			"geometries": [
				{
					"type": "Point",
					"properties": {"prop0": "value0"},
					"coordinates": [102, 0.5]
				},
				{
					"type": "LineString",
					"properties": {"prop0": "value0", "prop1": 0},
					"arcs": [0]
				}
			]
		}
	},
	"arcs": [
		[[102, 0], [103, 1], [104, 0], [105, 1]],
		[[100, 0], [101, 0], [101, 1], [100, 1], [100, 0]]
	]
}

*/

function f_from_api(a_api) {
	const c_stops = [];
	const c_routes = [];
	for (let i1 in a_api["station"]) {
		c_stops.push({
			"stop_id": a_api["station"][i1]["id"],
			"stop_name": a_api["station"][i1]["name"],
			"parent_station": a_api["station"][i1]["id"],
			"stop_lat": a_api["station"][i1]["lat"],
			"stop_lon": a_api["station"][i1]["lon"]//,
		});
	}
	for (let i1 in a_api["route"]) {
		const c_stop_array = [];
		for (let i2 = 0; i2 < a_api["route"][i1]["stationList"].length; i2++) {
			c_stop_array.push({"stop_id": a_api["route"][i1]["stationList"][i2]});
		}
		c_routes.push({
			"route_id": a_api["route"][i1]["id"],
			"route_short_name": a_api["route"][i1]["name"],
			"route_long_name": a_api["route"][i1]["name"],
			"jp_parent_route_id": a_api["route"][i1]["name"],
			"route_color": a_api["route"][i1]["color"].replace(/#/, ""),
			"stop_array": c_stop_array,
			"shape_pt_array": [],
			"service_array": "",
			"trip_number": 999//, //仮
		});
	}
	return {"stops": c_stops, "routes": c_routes, "ur_routes": c_routes, "calendar": []}; //routesとur_routes、calendarは互換性確保
}










//初期設定
function f_input_settings(a_settings) {
	//初期値
	const c_settings_temp = {
		"cors_url": "",//CORSの問題を回避するため、間にサーバーサイドのプログラムを挟む場合に前に加えるURL
		"rt": false,//GTFS-RTの読込
		"data": "data",//データのURL
		"data_type": "gtfs",//データがgtfs, json, geojson, topojson, apiか
		"div_id": "div",//挿入するdivのid
		"global": true,//trueの場合、値をc_globalに渡し、変更可能にする
		"change": true,
		"leaflet": true,
		"clickable": true,//線等をクリックできる
		"timetable": true,//時刻表を表示する
		"direction": true,
		"parent_route_id": "route_id",
		"stop_name": true,
		"stop_name_overlap":true,
		"zoom_level": 16,
		"svg_zoom_level": 16, //互換性のため残す
		"cut_zoom_level": 16, //f_cut_shape_segments用
		"svg_zoom_ratio": 0, //SVG表示縮小率=zoom_level - svg_zoom_level
		"background_map": true,
		"background_layers": [["https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png", {attribution: "<a href=\"https://maps.gsi.go.jp/development/ichiran.html\">地理院タイル</a>", opacity: 0.25}]],
		"font_size": 16, //停留所名のフォントサイズ
		"font_family": "'源ノ角ゴシック'", //停留所名のフォント、二重のクオーテーションマークに注意
		"stop_color_standard": "#000000", //通常の停留所記号の色
		"stop_color_nonstandard": "#FFFFFF", //起終点等の停留所記号の色
		"stop_color_location": "#C0C0C0", //位置を示す停留所記号の色
		"stop_stroke_color": "#000000", //停留所記号の縁の色
		"stop_stroke_width": 1, //停留所記号の縁の太さ
		"show_stop_location": true, //停留所位置の記号を表示
		"stop_direction": true, //停留所記号を三角形にして向きを明示
		"min_space_width": 2, //線の間隔の最小幅
		"min_width": 4, //線の最小幅
		"max_width": 8, //線の最大幅
		"round": true //, //角を丸める
	};
	//change trueの場合、設定を変更する
	//leaflet trueの場合、使用
	//direction trueの場合、上り下りを分けて描画する
	//parent_route_id まとめる単位
	//stop_name trueの場合、表示する
	//stop_name_overlap trueの場合、重なりを許容する
	//zoom_level 途中計算で使うズームレベル。なんでもよいが16にしておく。
	//svg_zoom_lavel SVG出力時のズームレベル。表示される相対的なオフセット幅や文字サイズに影響する。1614は可変。拡大縮小のscaleはここを使う。
	//background_map trueの場合、表示する
	//min_width 線の最小幅、単位はpx

	//入力した値を渡す
	for (let i1 in a_settings) {
		c_settings_temp[i1] = a_settings[i1];
	}
	//設定の制限（暫定的に連動）
	if (c_settings_temp["global"] === true) {
		c_settings_temp["change"] = true;
		c_settings_temp["leaflet"] = true;
		c_settings_temp["clickable"] = true;
		c_settings_temp["timetable"] = true;
	}
	//設定の制限
	//グローバルにしないと後から変えられない
	if (c_settings_temp["global"] !== true) {
		c_settings_temp["change"] = false;
		c_settings_temp["leaflet"] = false;
		c_settings_temp["clickable"] = false;
		c_settings_temp["timetable"] = false;
	}
	//設定の制限
	//クリックできないと時刻表を表示できない
	if (c_settings_temp["clickable"] !== true) {
		c_settings_temp["timetable"] = false;
	}
	//設定の互換性
	if (a_settings["svg_zoom_ratio"] === undefined) {
		if (c_settings_temp["svg_zoom_level"] === 1614) {
			c_settings_temp["svg_zoom_ratio"] = 2;
		} else {
			c_settings_temp["svg_zoom_ratio"] = 0;
		}
	}
	return c_settings_temp;
}

//HTMLの変更
function f_html(a_settings) {
	let l_html = "";
	//leaflet
	if (a_settings["leaflet"] === true) {
		l_html += "<div id=\"div_leaflet\" style=\"width: auto; height: 768px; background: #FFFFFF;\"></div>"; //背景色を白にしておく
	}
	//clickable
	if (a_settings["clickable"] === true) {
		l_html += "<div><a id=\"output_svg\" href=\"#\" download=\"busmap.svg\" onclick=\"f_output_svg()\">SVG保存</a></div>";
		l_html += "<div>地図上の線や停留所記号、停留所名をクリックすると、強調表示や時刻表の表示ができる。</div>";
		l_html += "<div><span onclick=\"f_route_color()\">全路線を着色</span> <span onclick=\"f_tooltip()\">補足非表示</span></div>";
	}
	//設定変更項目の表示
	if (a_settings["change"] === true) {
		let l_setting_table = "<div><span onclick=\"f_open(l_data, l_settings)\">設定</span></div>";
		l_setting_table += "<table><tbody>";
		l_setting_table += "<tr><td>項目</td><td>現在の値</td><td>変更</td></tr>";
		l_setting_table += "<tr><td>往復を分けて表示</td><td id=\"td_direction\">" + a_settings["direction"] + "</td><td><span onclick=\"f_change_setting('direction',true)\">true</span> <span onclick=\"f_change_setting('direction',false)\">false</span></td></tr>";
		l_setting_table += "<tr><td>表示する単位</td><td id=\"td_parent_route_id\">" + a_settings["parent_route_id"] + "</td><td><span onclick=\"f_change_setting('parent_route_id','ur_route_id')\">最小</span> <span onclick=\"f_change_setting('parent_route_id','route_id')\">route_id</span> <span onclick=\"f_change_setting('parent_route_id','jp_parent_route_id')\">jp_parent_route_id</span> <span onclick=\"f_change_setting('parent_route_id','route_short_name')\">route_short_name</span> <span onclick=\"f_change_setting('parent_route_id','route_long_name')\">route_long_name</span> <span onclick=\"f_change_setting('parent_route_id','route_desc')\">route_desc</span> <span onclick=\"f_change_setting('parent_route_id','jp_office_id')\">jp_office_id</span> <span onclick=\"f_change_setting('parent_route_id','agency_id')\">agency_id</span> <span onclick=\"f_change_setting('parent_route_id','')\">全て</span></td></tr>";
		l_setting_table += "<tr><td>停留所名を表示</td><td id=\"td_stop_name\">" + a_settings["stop_name"] + "</td><td><span onclick=\"f_change_setting('stop_name',true)\">true</span> <span onclick=\"f_change_setting('stop_name',false)\">false</span></td></tr>";
		l_setting_table += "<tr><td>停留所名の重なりを回避（非常に遅いので注意）</td><td id=\"td_stop_name_overlap\">" + a_settings["stop_name_overlap"] + "</td><td><span onclick=\"f_change_setting('stop_name_overlap',true)\">true</span> <span onclick=\"f_change_setting('stop_name_overlap',false)\">false</span></td></tr>";
		l_setting_table += "<tr><td>背景地図を表示</td><td id=\"td_background_map\">" + a_settings["background_map"] + "</td><td><span onclick=\"f_change_setting('background_map',true)\">true</span> <span onclick=\"f_change_setting('background_map',false)\">false</span></td></tr>";
		l_setting_table += "</tbody></table>";
		l_setting_table += "<div id=\"ur_route_list\"></div>";
		l_html += "<div id=\"div_setting_table\">" + l_setting_table + "</div>";
	}
	//timetable
	if (a_settings["timetable"] === true) {
		let l_div4 = "";
		l_div4 += "<div>路線時刻表</div>";
		l_div4 += "<div id=\"parent_route_timetable\" style=\"height: 256px; overflow: scroll; white-space: nowrap;\"></div>";
		l_div4 += "<div>ダイヤグラム</div>";
		l_div4 += "<div id=\"svg_timetable\" style=\"height: 256px; overflow: scroll; white-space: nowrap;\"></div>";
		l_div4 += "<div><span id=\"stop_name\">標柱</span><span>の時刻表（便をクリックすると地図上に到着時刻を表示）</span> <span onclick=\"f_timetable()\">地図上の到着時刻を非表示</span></div>";
		l_div4 += "<div id=\"timetable\" style=\"height: 256px; overflow: scroll; white-space: nowrap;\"></div>";
		l_div4 += "<div>経由路線（路線をクリックすると路線時刻表とダイヤグラムを表示し、地図上で強調表示）</div>";
		l_div4 += "<ul id=\"route_list\"></ul>";
		l_html += "<div id=\"div_timetable\">" + l_div4 + "</div>";
	}
	return l_html;
}


function f_set_leaflet(a_settings) {
	//leaflet関係
	l_map = L.map("div_leaflet"); //leafletの読み込み。
	//背景地図（地理院地図等）を表示する。
	for (let i1 = 0; i1 < a_settings["background_layers"].length; i1++) {
		L.tileLayer(a_settings["background_layers"][i1][0], a_settings["background_layers"][i1][1]).addTo(l_map);
	}
	//svg地図を入れる。
	L.svg().addTo(l_map);
}





//設定変更
function f_change_setting(a_key, a_value) {
	l_settings[a_key] = a_value;
	document.getElementById("td_" + a_key).innerHTML = a_value;
}



//XHR
function f_xhr_get(a_url, a_type) {
	function f_promise(a_resolve, a_reject) {
		const c_xhr = new XMLHttpRequest();
		c_xhr.responseType = a_type;//"arraybuffer";
		c_xhr.open("get", a_url);
		function f_resolve() {
			a_resolve(c_xhr);
		}
		function f_reject() {
			a_reject("error");
		}
		c_xhr.onload = f_resolve;
		c_xhr.onerror = f_reject;
		c_xhr.send(null);
	}
	return new Promise(f_promise);
}

//ZIPの解凍
async function f_zip_to_text(a_url) {//トップレベルawaitではasync不要？
	const c_array = (await f_xhr_get(a_url, "arraybuffer")).response;
	const c_byte = new Uint8Array(c_array);
	const c_unzip = new Zlib.Unzip(c_byte);
	const c_filenames = c_unzip.getFilenames();
	const c_plain = c_unzip.decompress(c_filenames[0]);
	const c_files = {};
	for (let i1 = 0; i1 < c_filenames.length; i1++) {
		c_files[c_filenames[i1]] = new TextDecoder("utf-8").decode(Uint8Array.from(c_unzip.decompress(c_filenames[i1])).buffer);
	}
	return c_files;
}






function f_prepare_json(a_data) {
	a_data["ur_routes"] = a_data["routes"];//古いデータとの互換性？
	a_data["trips"] = [];//（互換性のため。こうしないと後でエラーになる）
	//stop_numberをつける。（互換性のため）
	for (let i1 = 0; i1 < a_data["stops"].length; i1++) {
		const c_stop_id = a_data["stops"][i1]["stop_id"];
		for (let i2 = 0; i2 < a_data["routes"].length; i2++) {
			for (let i3 = 0; i3 < a_data["routes"][i2]["stop_array"].length; i3++) {
				if (a_data["routes"][i2]["stop_array"][i3]["stop_id"] === c_stop_id) {
					a_data["routes"][i2]["stop_array"][i3]["stop_number"] = i1;
				}
			}
		}
	}
	//trip_number関係（一部データとの互換性）
	for (let i1 = 0; i1 < a_data["calendar"].length; i1++) {
		a_data["calendar"][i1]["monday"] = String(a_data["calendar"][i1]["monday"]);
		a_data["calendar"][i1]["tuesday"] = String(a_data["calendar"][i1]["tuesday"]);
		a_data["calendar"][i1]["wednesday"] = String(a_data["calendar"][i1]["wednesday"]);
		a_data["calendar"][i1]["thursday"] = String(a_data["calendar"][i1]["thursday"]);
		a_data["calendar"][i1]["friday"] = String(a_data["calendar"][i1]["friday"]);
		a_data["calendar"][i1]["saturday"] = String(a_data["calendar"][i1]["saturday"]);
		a_data["calendar"][i1]["sunday"] = String(a_data["calendar"][i1]["synday"]);//仮
		a_data["calendar"][i1]["sunday"] = String(a_data["calendar"][i1]["sonday"]);//仮
		a_data["calendar"][i1]["sunday"] = String(a_data["calendar"][i1]["sunday"]);
	}
	//shape補完
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		if (a_data["ur_routes"][i1]["shape_pt_array"].length !== 0) {
			continue;
		}
		const c_shapes = [];
		for (let i2 = 0; i2 < a_data["ur_routes"][i1]["stop_array"].length; i2++) {
			for (let i3 = 0; i3 < a_data["stops"].length; i3++) {
				if (a_data["ur_routes"][i1]["stop_array"][i2]["stop_id"] === a_data["stops"][i3]["stop_id"]) {
					c_shapes.push({
						"shape_pt_lat": a_data["stops"][i3]["stop_lat"],
						"shape_pt_lon": a_data["stops"][i3]["stop_lon"]
					});
					break;
				}
			}
		}
		a_data["ur_routes"][i1]["shape_pt_array"] = c_shapes;
	}

}


function f_prepare_gtfs(a_data) {
	f_number_gtfs(a_data);
	//GTFSの補完
	f_color_gtfs(a_data);
	f_set_stop_type(a_data);
	f_make_shape(a_data);
	//路線図用の補完

}


function f_make_bmd(a_data, a_bmd) {
	//リセット
	a_bmd["stops"] = [];//仮に残っている
	a_bmd["ur_stops"] = [];
	a_bmd["parent_stations"] = [];
	a_bmd["ur_routes"] = [];
	a_bmd["calendar"] = [];
	a_bmd["trips"] = [];
	let i1 = 0;//とりあえず1ファイルのみ対応
	if (i1 === 0) {
		if (a_data[i1]["stop_times"] === undefined) {//json由来
			const c_bmd_temp = f_make_bmd_from_gtfs(a_data[i1]);
			a_bmd["stops"] = a_bmd["stops"].concat(c_bmd_temp["ur_stops"]).concat(c_bmd_temp["parent_stations"]);//仮に残っている
			//a_bmd["ur_stops"] = a_bmd["ur_stops"].concat(c_bmd_temp["ur_stops"]);
			//a_bmd["parent_stations"] = a_bmd["parent_stations"].concat(c_bmd_temp["parent_stations"]);
			a_bmd["ur_routes"] = a_bmd["ur_routes"].concat(a_data[i1]["ur_routes"]);
			a_bmd["calendar"] = a_bmd["calendar"].concat(c_bmd_temp["calendar"]);
			//a_bmd["trips"] = a_bmd["trips"].concat(c_bmd_temp["trips"]);
		} else {//gtfs由来
			const c_bmd_temp = f_make_bmd_from_gtfs(a_data[i1]);
			a_bmd["stops"] = a_bmd["stops"].concat(c_bmd_temp["ur_stops"]).concat(c_bmd_temp["parent_stations"]);//仮に残っている
			a_bmd["ur_stops"] = a_bmd["ur_stops"].concat(c_bmd_temp["ur_stops"]);
			a_bmd["parent_stations"] = a_bmd["parent_stations"].concat(c_bmd_temp["parent_stations"]);
			a_bmd["ur_routes"] = a_bmd["ur_routes"].concat(c_bmd_temp["ur_routes"]);
			a_bmd["calendar"] = a_bmd["calendar"].concat(c_bmd_temp["calendar"]);
			a_bmd["trips"] = a_bmd["trips"].concat(c_bmd_temp["trips"]);
		}
	}
	console.log(a_bmd);
}


//元データの段階では、ur_stopsのみ、parent_stationのみ、両方の3択
//基本はur_stopsのみでparent_stationsは平均をとって自動生成
//過去のur_stopsがわからない場合はparent_stationsのみ
//標柱の区別はplatform_codeを用いる（上り・下り、路線等の区分、乗場番号等）
//同名停留所があるときの区別語（地域名、路線名等）をどうするか？distinction_code？

//統合はstop_nameで行う（緯度経度から位置を確認すべきか？）
//親も一応用意する




function f_make_bmd_from_gtfs(a_data_i1) {
	const c_bmd_i1 = {"ur_stops": [], "parent_stations": [], "trips": [], "ur_routes": [], "calendar": []};
	//[1]calendar
	for (let i2 = 0; i2 < a_data_i1["calendar"].length; i2++) {
		const c_service = a_data_i1["calendar"][i2];
		c_bmd_i1["calendar"].push({
			"service_id": c_service["service_id"],
			"monday": c_service["monday"],
			"tuesday": c_service["tuesday"],
			"wednesday": c_service["wednesday"],
			"thursday": c_service["thursday"],
			"friday": c_service["friday"],
			"saturday": c_service["saturday"],
			"sunday": c_service["sunday"],
			"start_date": c_service["start_date"],
			"end_date": c_service["end_date"]//,
		});
	}
	//[2]ur_stops
	//ur_stopをまとめる（ur_stopは標柱も親未設定の停留所の代表点もありうる）
	for (let i2 = 0; i2 < a_data_i1["stops"].length; i2++) {
		const c_stop = a_data_i1["stops"][i2];
		const c_location_type = c_stop["location_type"];
		if (c_location_type === "0" || c_location_type === "" || c_location_type === undefined) {//ur_stop
			c_bmd_i1["ur_stops"].push({
				"stop_id": c_stop["stop_id"],
				//"stop_code": c_stop["stop_code"],
				"stop_name": c_stop["stop_name"],
				//"stop_desc": c_stop["stop_desc"],
				"stop_lat": c_stop["stop_lat"],
				"stop_lon": c_stop["stop_lon"],
				//"zone_id": c_stop["zone_id"],
				//"stop_url": c_stop["stop_url"],
				"location_type": "0",//仮に残す
				"parent_station": c_stop["parent_station"],
				//"stop_timezone": c_stop["stop_timezone"],
				//"wheelchair_boarding": c_stop["wheelchair_boarding"]//,
				"platform_code": c_stop["platform_code"]//,
			});
		}
	}
	//[3]parent_stations
	//親をつくる
	//親が未設定の場合に、stop_nameを設定する
	for (let i2 = 0; i2 < c_bmd_i1["ur_stops"].length; i2++) {
		const c_ur_stop = c_bmd_i1["ur_stops"][i2];
		if (c_ur_stop["parent_station"] === "" || c_ur_stop["parent_station"] === undefined) {
			c_ur_stop["parent_station"] = c_ur_stop["stop_name"];//stop_nameで代用する
		}
	}
	//親の一覧を作る
	//親の緯度経度は子達の相加平均とするため、和を計算する
	const c_parent_station_list = {};
	for (let i2 = 0; i2 < c_bmd_i1["ur_stops"].length; i2++) {
		const c_ur_stop = c_bmd_i1["ur_stops"][i2];
		const c_parent_station = c_ur_stop["parent_station"];
		if (c_parent_station_list[c_parent_station] === undefined) {
			c_parent_station_list[c_parent_station] = {"stop_lat": 0, "stop_lon": 0, "children_number" : 0};
		}
		c_parent_station_list[c_parent_station]["stop_lat"] += c_ur_stop["stop_lat"];
		c_parent_station_list[c_parent_station]["stop_lon"] += c_ur_stop["stop_lon"];
		c_parent_station_list[c_parent_station]["children_number"] += 1;

	}
	//緯度経度の和から平均を計算
	for (let i2 in c_parent_station_list) {
		const c_inverse_number = 1 / c_parent_station_list[i2]["children_number"];
		c_parent_station_list[i2]["stop_lat"] *= c_inverse_number;
		c_parent_station_list[i2]["stop_lon"] *= c_inverse_number;
	}
	//stop_idの目次を作る
	const c_stop_id_index = {};
	for (let i2 = 0; i2 < a_data_i1["stops"].length; i2++) {
		const c_stop = a_data_i1["stops"][i2];
		c_stop_id_index[c_stop["stop_id"]] = a_data_i1["stops"][i2];
	}
	//parent_stationsを作る
	for (let i2 in c_parent_station_list) {
		if (c_stop_id_index[i2] === undefined) {//元データにないとき
			c_bmd_i1["parent_stations"].push({
				"stop_id": i2,
				//"stop_code": "",
				"stop_name": i2,
				//"stop_desc": "",
				"stop_lat": c_parent_station_list[i2]["stop_lat"],
				"stop_lon": c_parent_station_list[i2]["stop_lon"],
				//"zone_id": "",
				//"stop_url": "",
				"location_type": "1",//仮に残す
				"parent_station": ""//,//仮に残す
				//"stop_timezone": "",
				//"wheelchair_boarding": "",
				//"platform_code": ""//,
			});
		} else {//元データにあるとき
			c_bmd_i1["parent_stations"].push({
				"stop_id": i2,
				//"stop_code": c_stop_id_index[i2]["stop_code"],
				"stop_name": c_stop_id_index[i2]["stop_name"],
				//"stop_desc": c_stop_id_index[i2]["stop_desc"],
				"stop_lat": c_stop_id_index[i2]["stop_lat"],
				"stop_lon": c_stop_id_index[i2]["stop_lon"],
				//"zone_id": c_stop_id_index["zone_id"],
				//"stop_url": c_stop_id_index["stop_url"],
				"location_type": "1",//仮に残す
				"parent_station": ""//,//仮に残す
				//"stop_timezone": c_stop_id_index["stop_timezone"],
				//"wheelchair_boarding": c_stop_id_index["wheelchair_boarding"],
				//"platform_code": c_stop_id_index["platform_code"]//,
			});
		}
	}
	if (a_data_i1["stop_times"] === undefined) {
		//stop_index（stop_number）を追加（互換性のため）
		const c_stop_number = {};
		for (let i2 = 0; i2 < c_bmd_i1["ur_stops"].length; i2++) {
			c_stop_number["stop_id_" + c_bmd_i1["ur_stops"][i2]["stop_id"]] = i2;
		}
		for (let i2 = 0; i2 < c_bmd_i1["trips"].length; i2++) {
			for (let i3 = 0; i3 < c_bmd_i1["trips"][i2]["stop_times"].length; i3++) {
				c_bmd_i1["trips"][i2]["stop_times"][i3]["stop_number"] = c_stop_number["stop_id_" + c_bmd_i1["trips"][i2]["stop_times"][i3]["stop_id"]];
			}
		}
		for (let i2 = 0; i2 < c_bmd_i1["ur_routes"].length; i2++) {
			for (let i3 = 0; i3 < c_bmd_i1["ur_routes"][i2]["stop_array"].length; i3++) {
				c_bmd_i1["ur_routes"][i2]["stop_array"][i3]["stop_number"] = c_stop_number["stop_id_" + c_bmd_i1["ur_routes"][i2]["stop_array"][i3]["stop_id"]];
			}
		}
		return c_bmd_i1;
	}
	//[4]trips
	for (let i2 = 0; i2 < a_data_i1["trips"].length; i2++) {
		const c_trip = {"stop_times": [], "shapes": []};
		for (let i3 in a_data_i1["trips"][i2]) {
			c_trip[i3] = a_data_i1["trips"][i2][i3];
		}
		c_bmd_i1["trips"].push(c_trip);
	}
	//stop_timesをtripsにまとめる。
	const c_index = {}; //全体で使う目次
	for (let i2 = 0; i2 < c_bmd_i1["trips"].length; i2++) {
		c_index["trip_id_" + c_bmd_i1["trips"][i2]["trip_id"]] = c_bmd_i1["trips"][i2];
	}
	for (let i2 = 0; i2 < a_data_i1["stop_times"].length; i2++) {
		const c_stop_time = {};
		for (let i3 in a_data_i1["stop_times"][i2]) {
			c_stop_time[i3] = a_data_i1["stop_times"][i2][i3];
		}
		
		if (c_index["trip_id_" + c_stop_time["trip_id"]] === undefined) {
			console.log(c_stop_time["trip_id"]);
console.log(c_stop_time);
console.log(i2);
console.log(a_data_i1["stop_times"]);
			c_index["trip_id_" + c_stop_time["trip_id"]] = {"stop_times": []};
		}
		c_index["trip_id_" + c_stop_time["trip_id"]]["stop_times"].push(c_stop_time);
	}
	//並び替え
	for (let i2 = 0; i2 < c_bmd_i1["trips"].length; i2++) {
		c_bmd_i1["trips"][i2]["stop_times"].sort(function(a1,a2) {
			if (a1["stop_sequence"] < a2["stop_sequence"]) {
				return -1;
			}
			if (a1["stop_sequence"] > a2["stop_sequence"]) {
				return 1;
			}
			return 0;
		});
	}
	//c_shape_index
	const c_shape_index = {};
	for (let i2 = 0; i2 < a_data_i1["shapes"].length; i2++) {
		c_shape_index["shape_id_" + a_data_i1["shapes"][i2]["shape_id"]] = [];
	}
	for (let i2 = 0; i2 < a_data_i1["shapes"].length; i2++) {
		const c_shape = {};
		for (let i3 in a_data_i1["shapes"][i2]) {
			c_shape[i3] = a_data_i1["shapes"][i2][i3];
		}
		c_shape_index["shape_id_" + c_shape["shape_id"]].push(c_shape);
	}
	//並び替え
	for (let i2 in c_shape_index) {
		c_shape_index[i2].sort(function(a1,a2) {
			if (a1["shape_pt_sequence"] < a2["shape_pt_sequence"]) {
				return -1;
			}
			if (a1["shape_pt_sequence"] > a2["shape_pt_sequence"]) {
				return 1;
			}
			return 0;
		});
	}
	//shapesをtripsにまとめる。
	for (let i2 = 0; i2 < c_bmd_i1["trips"].length; i2++) {
		if (c_bmd_i1["trips"][i2]["shape_id"] === undefined || c_bmd_i1["trips"][i2]["shape_id"] === "") {
			c_bmd_i1["trips"][i2]["shape_id"] = "shape_id_" + c_bmd_i1["trips"][i2]["route_id"];
		}
		let c_shapes = c_shape_index["shape_id_" + c_bmd_i1["trips"][i2]["shape_id"]];
		if (c_shapes === undefined) { //見つからない場合の応急処置
			c_shapes = c_shape_index["shape_id_" + c_bmd_i1["trips"][0]["shape_id"]]; //仮
		}
		for (let i3 = 0; i3 < c_shapes.length; i3++) {
			const c_shape = {};
			for (let i4 in c_shapes[i3]) {
				c_shape[i4] = c_shapes[i3][i4];
			}
			c_bmd_i1["trips"][i2]["shapes"].push(c_shape);
		}
	}
	//[5]ur_routes
	//ur_routesをつくる
	const c_route_index = {};
	for (let i2 = 0; i2 < a_data_i1["routes"].length; i2++) {
		c_route_index["route_id_" + a_data_i1["routes"][i2]["route_id"]] = a_data_i1["routes"][i2];
	}
	for (let i2 = 0; i2 < c_bmd_i1["trips"].length; i2++) {
		const c_trip = c_bmd_i1["trips"][i2];
		//既に同じur_routeがあるか探す。
		let l_exist = false; //違うと仮定
		for (let i3 = 0; i3 < c_bmd_i1["ur_routes"].length; i3++) {
			const c_ur_route = c_bmd_i1["ur_routes"][i3];
			if (c_ur_route["route_id"] !== c_trip["route_id"] || c_ur_route["stop_array"].length !== c_trip["stop_times"].length || c_ur_route["shape_pt_array"].length !== c_trip["shapes"].length) {
				continue; //違う
			}
			l_exist = true; //同じと仮定
			for (let i4 = 0; i4 < c_ur_route["stop_array"].length; i4++) {
				if(c_ur_route["stop_array"][i4]["stop_id"] !== c_trip["stop_times"][i4]["stop_id"] || c_ur_route["stop_array"][i4]["pickup_type"] !== c_trip["stop_times"][i4]["pickup_type"] || c_ur_route["stop_array"][i4]["drop_off_type"] !== c_trip["stop_times"][i4]["drop_off_type"]) {
					l_exist = false; //違う
					break;
				}
			}
			for (let i4 = 0; i4 < c_ur_route["shape_pt_array"].length; i4++) {
				if(c_ur_route["shape_pt_array"][i4]["shape_pt_lat"] !== c_trip["shapes"][i4]["shape_pt_lat"] || c_ur_route["shape_pt_array"][i4]["shape_pt_lon"] !== c_trip["shapes"][i4]["shape_pt_lon"]) {
					l_exist = false; //違う
					break;
				}
			}
			if (l_exist === true) { //同じものが見つかったとき
				c_trip["ur_route_id"] = c_ur_route["ur_route_id"];
				let l_exist_2 = false;
				for (let i4 = 0; i4 < c_ur_route["service_array"].length; i4++) {
					if (c_ur_route["service_array"][i4]["service_id"] === c_trip["service_id"]) {
						c_ur_route["service_array"][i4]["number"] += 1;
						l_exist_2 = true;
					}
				}
				if (l_exist_2 === false) {
					c_ur_route["service_array"].push({
						"service_id": c_trip["service_id"]
						, "number": 1
					});
				}
				break;
			}
		}
		if (l_exist === false) { //見つからないとき
			c_trip["ur_route_id"] = "ur_route_id_" + String(i2);
			const c_ur_route = {"ur_route_id": "ur_route_id_" + String(i2), "stop_array": [], "shape_pt_array": [], "service_array": [{"service_id": c_trip["service_id"], "number": 1}]};
			for (let i3 in c_route_index["route_id_" + c_trip["route_id"]]) {
				c_ur_route[i3] = c_route_index["route_id_" + c_trip["route_id"]][i3];
			}
			for (let i3 = 0; i3 < c_trip["stop_times"].length; i3++) {
				c_ur_route["stop_array"].push({
					"stop_id": c_trip["stop_times"][i3]["stop_id"]
					, "pickup_type": c_trip["stop_times"][i3]["pickup_type"]
					, "drop_off_type": c_trip["stop_times"][i3]["drop_off_type"]
				});
			}
			for (let i3 = 0; i3 < c_trip["shapes"].length; i3++) {
				const c_shape = {};
				for (let i4 in c_trip["shapes"][i3]) {
					c_shape[i4] = c_trip["shapes"][i3][i4];
				}
				c_ur_route["shape_pt_array"].push(c_shape);
			}
			c_bmd_i1["ur_routes"].push(c_ur_route);
		}
	}
	//並び替え
	const c_route_number = {};
	for (let i2 = 0; i2 < a_data_i1["routes"].length; i2++) {
		c_route_number["route_id_" + a_data_i1["routes"][i2]["route_id"]] = i2;
	}
	c_bmd_i1["ur_routes"].sort(function(a1,a2) {
		if (c_route_number["route_id_" + a1["route_id"]] < c_route_number["route_id_" + a2["route_id"]]) {
			return -1;
		}
		if (c_route_number["route_id_" + a1["route_id"]] > c_route_number["route_id_" + a2["route_id"]]) {
			return 1;
		}
		return 0;
	});
	
	//stop_index（stop_number）を追加（互換性のため）
	const c_stop_number = {};
	for (let i2 = 0; i2 < c_bmd_i1["ur_stops"].length; i2++) {
		c_stop_number["stop_id_" + c_bmd_i1["ur_stops"][i2]["stop_id"]] = i2;
	}
	for (let i2 = 0; i2 < c_bmd_i1["trips"].length; i2++) {
		for (let i3 = 0; i3 < c_bmd_i1["trips"][i2]["stop_times"].length; i3++) {
			c_bmd_i1["trips"][i2]["stop_times"][i3]["stop_number"] = c_stop_number["stop_id_" + c_bmd_i1["trips"][i2]["stop_times"][i3]["stop_id"]];
		}
	}
	for (let i2 = 0; i2 < c_bmd_i1["ur_routes"].length; i2++) {
		for (let i3 = 0; i3 < c_bmd_i1["ur_routes"][i2]["stop_array"].length; i3++) {
			c_bmd_i1["ur_routes"][i2]["stop_array"][i3]["stop_number"] = c_stop_number["stop_id_" + c_bmd_i1["ur_routes"][i2]["stop_array"][i3]["stop_id"]];
		}
	}
	return c_bmd_i1;
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











function f_csv_to_json(a_csv) {
	//CSVを2次元配列にする。
	let l_1 = 0;
	let l_2 = 0;
	const c_array = [[]];
	a_csv.replace(/\r?\n$/, "").replace(new RegExp(',|\r?\n|[^,"\r\n][^,\r\n]*|"(?:[^"]|"")*"', "g"), function(a1) {
		if (a1 === ",") {
			l_2 += 1;
			c_array[l_1][l_2] = "";
		} else if (a1 === "\n" || a1 === "\r\n") {
			l_1 += 1;
			c_array[l_1] = [];
			l_2 = 0;
		} else if (a1.charAt(0) !== "\"") {
			c_array[l_1][l_2] = a1;
		} else {
			c_array[l_1][l_2] = a1.slice(1, -1).replace(/""/g, "\"");
		}
	});
	//二次元配列をJSONに変換する。
	const c_json = [];
	for (let i1 = 1; i1 < c_array.length; i1++) {
		c_json.push({});
		for (let i2 = 0; i2 < c_array[i1].length; i2++) {
			c_json[i1 - 1][c_array[0][i2]] = c_array[i1][i2].replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&apos;");
		}
	}
	//この段階では全てテキストになっている。
	return c_json;
}



//緯度、経度、順番の文字列を数値に変換する。
function f_number_gtfs(a_data) {
	for (let i1 = 0; i1 < a_data["stops"].length; i1++) {
		a_data["stops"][i1]["stop_lat"] = Number(a_data["stops"][i1]["stop_lat"]);
		a_data["stops"][i1]["stop_lon"] = Number(a_data["stops"][i1]["stop_lon"]);
	}
	for (let i1 = 0; i1 < a_data["stop_times"].length; i1++) {
		a_data["stop_times"][i1]["stop_sequence"] = Number(a_data["stop_times"][i1]["stop_sequence"]);
	}
	if (a_data["shapes"] !== undefined && a_data["shapes"].length !== 0) {
		for (let i1 = 0; i1 < a_data["shapes"].length; i1++) {
			a_data["shapes"][i1]["shape_pt_lat"] = Number(a_data["shapes"][i1]["shape_pt_lat"]);
			a_data["shapes"][i1]["shape_pt_lon"] = Number(a_data["shapes"][i1]["shape_pt_lon"]);
			a_data["shapes"][i1]["shape_pt_sequence"] = Number(a_data["shapes"][i1]["shape_pt_sequence"]);
		}
	}
}




//colorが未設定のところを補充する。
function f_color_gtfs(a_data) {
	for (let i1 = 0; i1 < a_data["routes"].length; i1++) {
		if ((a_data["routes"][i1]["route_color"] === "") || (a_data["routes"][i1]["route_color"] === undefined)) {
			//カラーバリアフリー
			//const c_red = Math.round((Math.random() * 15)).toString(16) + Math.round((Math.random() * 15)).toString(16);
			//const c_green = c_red;
			//const c_blue = Math.round((Math.random() * 15)).toString(16) + Math.round((Math.random() * 15)).toString(16);
			//a_data["routes"][i1]["route_color"] = c_red + c_green + c_blue;
			//完全ランダム
			a_data["routes"][i1]["route_color"] = Math.round((Math.random() * 15)).toString(16) + "F" + Math.round((Math.random() * 15)).toString(16) + "F" + Math.round((Math.random() * 15)).toString(16) + "F"; //本来はFFFFFF
			
			//青黄10色から選択。
			//const c_colors = ["8080FF", "4040FF", "0000FF", "0000C0", "000080", "FFFF80", "FFFF40", "FFFF00", "C0C000", "808000"];
			//a_data["routes"][i1]["route_color"] = c_colors[Math.round(Math.random() * 10)];
			
			
		}
		if ((a_data["routes"][i1]["route_text_color"] === "") || (a_data["routes"][i1]["route_text_color"] === undefined)) {
			a_data["routes"][i1]["route_text_color"] = "000000";
		}
	}
}

//stop_times.txtのpickup_type, drop_off_typeを埋める。
function f_set_stop_type(a_data) {
	for (let i1 = 0; i1 < a_data["stop_times"].length; i1++) {
		const c_stop = a_data["stop_times"][i1];
		if ((c_stop["drop_off_type"] === "") || (c_stop["drop_off_type"] === null) || (c_stop["drop_off_type"] === undefined)) {
			if (i1 === 0) { //最初
				c_stop["drop_off_type"] = "1";
			} else if (a_data["stop_times"][i1]["trip_id"] !== a_data["stop_times"][i1 - 1]["trip_id"]) { //前とtripが異なる
				c_stop["drop_off_type"] = "1";
			} else { //前とtripが同じ
				c_stop["drop_off_type"] = "0";
			}
		}
		if ((c_stop["pickup_type"] === "") || (c_stop["pickup_type"] === null) || (c_stop["pickup_type"] === undefined)) {
			if (i1 === a_data["stop_times"].length - 1) { //最後
				c_stop["pickup_type"] = "1";
			} else if (a_data["stop_times"][i1]["trip_id"] !== a_data["stop_times"][i1 + 1]["trip_id"]) { //後ろとtripが異なる
				c_stop["pickup_type"] = "1";
			} else { //後ろとtripが同じ
				c_stop["pickup_type"] = "0";
			}
		}
	}
}



function f_make_shape(a_data) {
	if (a_data["shapes"] === undefined || a_data["shapes"].length === 0) {
		let l_shapes = [];
		for (let i1 = 0; i1 < a_data["routes"].length; i1++) {
			let l_trip_id; //代表のtrip_id
			console.log(a_data["routes"]);
			for (let i2 = 0; i2 < a_data["trips"].length; i2++) {
				if (a_data["routes"][i1]["route_id"] === a_data["trips"][i2]["route_id"]) { //tripを1つみつける。
					l_trip_id = a_data["trips"][i2]["trip_id"];
					a_data["trips"][i2]["shape_id"] = "shape_id_" + a_data["routes"][i1]["route_id"];
				}
			}
			const c_shape_temp = []; //仮にstop_timesと緯度経度を集める
			for (let i2 = 0; i2 < a_data["stop_times"].length; i2++) {
				if (a_data["stop_times"][i2]["trip_id"] === l_trip_id) {
					for (let i3 = 0; i3 < a_data["stops"].length; i3++) {
						if (a_data["stop_times"][i2]["stop_id"] === a_data["stops"][i3]["stop_id"]) {
							c_shape_temp.push({
								"shape_id": "shape_id_" + a_data["routes"][i1]["route_id"],
								"shape_pt_lat": a_data["stops"][i3]["stop_lat"],
								"shape_pt_lon": a_data["stops"][i3]["stop_lon"],
								"shape_pt_sequence": a_data["stop_times"][i2]["stop_sequence"]
							});
							break;
						}
					}
				}
			}
			c_shape_temp.sort(function(a1,a2) {
				if (a1["shape_pt_sequence"] < a2["shape_pt_sequence"]) {
					return -1;
				}
				if (a1["shape_pt_sequence"] > a2["shape_pt_sequence"]) {
					return 1;
				}
				return 0;
			});
			l_shapes = l_shapes.concat(c_shape_temp);
		}
		a_data["shapes"] = l_shapes;
	}
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
	const c_z_tile = 2 ** (c_z - 8 - a_settings["zoom_level"]); //ズームレベルzoom_levelのタイル座標をズームレベルc_zのタイル番号に変換する。
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
		//
		
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
			for (let i3 = 0; i3 < c_stop_ids.length; i3++) {
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

