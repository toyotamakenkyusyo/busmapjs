"use strict";
const busmapjs = {}; // ここに関数を追加する

// 汎用

busmapjs.sort_object_array = function(a_array, a_key) {
	// objectの配列をa_key基準で昇順にソートする
	function f_sort(a1, a2) {
		if (a1[a_key] < a2[a_key]) {
			return -1;
		}
		if (a1[a_key] > a2[a_key]) {
			return 1;
		}
		return 0;
	}
	a_array.sort(f_sort);
}



// ファイル入出力関係

//FileオブジェクトをArrayBufferに変換
//Promiseを使用しているため、使用時はasync/awaitをつける
busmapjs.convert_file_to_array_buffer = function (a_file) {
	const c_array_buffer = new Promise(f_promise);
	function f_promise(a_resolve, a_reject) {
		const c_reader = new FileReader();
		c_reader.addEventListener("load", f_load, false);
		function f_load() {
			a_resolve(c_reader.result);
		}
		c_reader.readAsArrayBuffer(a_file);
	}
	return c_array_buffer;
}


//Fileオブジェクトをtextに変換
//Promiseを使用しているため、使用時はasync/awaitをつける
busmapjs.convert_file_to_text = function (a_file) {
	const c_text = new Promise(f_promise);
	function f_promise(a_resolve, a_reject) {
		const c_reader = new FileReader();
		c_reader.addEventListener("load", f_load, false);
		function f_load() {
			a_resolve(c_reader.result);
		}
		c_reader.readAsText(a_file);
	}
	return c_text;
}


//ZIPの解凍
//https://cdn.jsdelivr.net/npm/zlibjs@0.3.1/bin/unzip.min.jsが必要
busmapjs.convert_zip_to_text_files = function(a_Uint8Array) {
	const c_unzip = new Zlib.Unzip(a_Uint8Array);
	const c_filenames = c_unzip.getFilenames();
	const c_text_files = {};
	for (const c_filename of c_filenames) {
		c_text_files[c_filename] = new TextDecoder().decode(c_unzip.decompress(c_filename));
	}
	return c_text_files;
}

//ZIPの圧縮
//https://cdn.jsdelivr.net/npm/zlibjs@0.3.1/bin/zip.min.jsが必要
busmapjs.convert_text_files_to_zip = function(a_text_files) {
	const c_zip = new Zlib.Zip();
	for (const c_filename in a_text_files) {
		if (a_text_files[c_filename] !== "" && a_text_files[c_filename] !== null && a_text_files[c_filename] !== undefined) {
			c_zip.addFile(new TextEncoder().encode(a_text_files[c_filename]), {"filename": new TextEncoder().encode(c_filename)});
		}
	}
	const c_Uint8Array = c_zip.compress();
	return c_Uint8Array;
}


busmapjs.convert_csv_to_json = function(a_csv) {
	//CSVを2次元配列にする
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
	//二次元配列をJSONに変換する
	const c_json = [];
	for (let i1 = 1; i1 < c_array.length; i1++) {
		c_json.push({});
		for (let i2 = 0; i2 < c_array[i1].length; i2++) {
			c_json[i1 - 1][c_array[0][i2]] = c_array[i1][i2].replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&apos;");
		}
	}
	//この段階では全て文字列型になっている
	return c_json;
}


busmapjs.convert_json_to_csv = function(a_json) {
	//JSONからGTFSのCSVを出力する
	let l_csv = "";
	//1行目
	for (const c_row of a_json) {
		for (let i1 = 0; i1 < Object.keys(c_row).length; i1++) {
			if (i1 !== 0) {
				l_csv += ",";
			}
			l_csv += String(Object.keys(c_row)[i1]);
		}
		break;
	}
	//2行目以降
	for (const c_row of a_json) {
		const c_keys = Object.keys(c_row);
		l_csv += "\r\n";
		for (let i1 = 0; i1 < c_keys.length; i1++) {
			if (i1 !== 0) {
				l_csv += ",";
			}
			let l_text = String(c_row[c_keys[i1]]);
			//"をエスケープし、カンマと"があれば"で囲む
			if (l_text.indexOf("\"") !== -1 || l_text.indexOf(",") !== -1) { //どちらかある
				l_text.replace(/"/g, "\"\"");
				l_text = "\"" + l_text + "\"";
			}
			l_csv += l_text
		}
	}
	return l_csv;
}


// GTFSの基本的な処理


busmapjs.create_gtfs_index = function (a_gtfs) {
	// fareは非対応
	
	a_gtfs["index"] = {};
	
	// 任意のファイルがない場合は空の列にしておく
	if (a_gtfs["shapes"] === undefined) {
		a_gtfs["shapes"] = [];
	}
	if (a_gtfs["calendar"] === undefined) {
		a_gtfs["calendar"] = [];
	}
	if (a_gtfs["calendar_dates"] === undefined) {
		a_gtfs["calendar_dates"] = [];
	}
	
	// stop_sequenceは数値にしておく
	for (const c_stop_time of a_gtfs["stop_times"]) {
		c_stop_time["stop_sequence"] = Number(c_stop_time["stop_sequence"]);
	}
	
	// shape_pt_sequenceは数値にしておく
	for (const c_shape of a_gtfs["shapes"]) {
		c_shape["shape_pt_sequence"] = Number(c_shape["shape_pt_sequence"]);
	}
	
	
	// agency.txt（agency_id 任意）
	a_gtfs["index"]["agency"] = {};
	for (const c_agency of a_gtfs["agency"]) {
		if (c_agency["agency_id"] !== "" && c_agency["agency_id"] !== null && c_agency["agency_id"] !== undefined) {
			a_gtfs["index"]["agency"][c_agency["agency_id"]] = c_agency;
		}
		
	}
	
	// routes.txt
	a_gtfs["index"]["route"] = {};
	for (const c_route of a_gtfs["routes"]) {
		a_gtfs["index"]["route"][c_route["route_id"]] = c_route;
	}
	
	// trips.txt
	a_gtfs["index"]["trip"] = {};
	for (const c_trip of a_gtfs["trips"]) {
		a_gtfs["index"]["trip"][c_trip["trip_id"]] = c_trip;
	}
	
	// stop_times.txt
	for (const c_stop_time of a_gtfs["stop_times"]) {
		if (a_gtfs["index"]["trip"][c_stop_time["trip_id"]]["stop_times"] === undefined) {
			a_gtfs["index"]["trip"][c_stop_time["trip_id"]]["stop_times"] = [];
		}
		a_gtfs["index"]["trip"][c_stop_time["trip_id"]]["stop_times"].push(c_stop_time);
	}
	for (const c_trip_id in a_gtfs["index"]["trip"]) {
		busmapjs.sort_object_array(a_gtfs["index"]["trip"][c_trip_id]["stop_times"], "stop_sequence");
	}
	
	// stops.txt
	a_gtfs["index"]["stop"] = {};
	for (const c_stop of a_gtfs["stops"]) {
		a_gtfs["index"]["stop"][c_stop["stop_id"]] = c_stop;
	}
	
	// calendar.txt
	a_gtfs["index"]["service"] = {};
	for (const c_calendar of a_gtfs["calendar"]) {
		a_gtfs["index"]["service"][c_calendar["service_id"]] = c_calendar;
	}
	
	// calendar_dates.txt
	for (const c_calendar_date of a_gtfs["calendar_dates"]) {
		if (a_gtfs["index"]["service"][c_calendar_date["service_id"]] === undefined) {
			a_gtfs["index"]["service"][c_calendar_date["service_id"]] = {
				"service_id": c_calendar_date["service_id"],
				"monday": 0,
				"tuesday": 0,
				"wednesday": 0,
				"thursday": 0,
				"friday": 0,
				"saturday": 0,
				"sunday": 0,
				"start_date": null,
				"end_date": null
			};
		}
		if (a_gtfs["index"]["service"][c_calendar_date["service_id"]]["dates"] === undefined) {
			a_gtfs["index"]["service"][c_calendar_date["service_id"]]["dates"] = [];
		}
		a_gtfs["index"]["service"][c_calendar_date["service_id"]]["dates"].push(c_calendar_date);
	}
	
	// shapes.txt
	a_gtfs["index"]["shape"] = {};
	for (const c_shape of a_gtfs["shapes"]) {
		if (a_gtfs["index"]["shape"][c_shape["shape_id"]] === undefined) {
			a_gtfs["index"]["shape"][c_shape["shape_id"]] = [];
		}
		a_gtfs["index"]["shape"][c_shape["shape_id"]].push(c_shape);
	}
	for (const c_shape_id in a_gtfs["index"]["shape"]) {
		busmapjs.sort_object_array(a_gtfs["index"]["shape"][c_shape_id], "shape_pt_sequence");
	}
}


busmapjs.create_ur_routes = function(a_gtfs) {
	// 先にbusmapjs.create_gtfs_indexを要実行
	
	if (a_gtfs["index"] === undefined) {
		console.log("indexなし（先にbusmapjs.create_gtfs_indexを要実行）");
		return;
	}
	if (a_gtfs["index"]["ur_route"] !== undefined) {
		console.log("既存のur_routeは上書き");
	}
	
	// pickup_typeとdrop_off_typeとshape_dist_traveledは埋めておく
	for (const c_stop_time of a_gtfs["stop_times"]) {
		if (c_stop_time["pickup_type"] === "" || c_stop_time["pickup_type"] === undefined || c_stop_time["pickup_type"] === null) {
			c_stop_time["pickup_type"] === "0";
		}
		if (c_stop_time["drop_off_type"] === "" || c_stop_time["drop_off_type"] === undefined || c_stop_time["drop_off_type"] === null) {
			c_stop_time["drop_off_type"] === "0";
		}
		if (c_stop_time["shape_dist_traveled"] === undefined || c_stop_time["shape_dist_traveled"] === null) {
			c_stop_time["shape_dist_traveled"] === "";
		}
	}
	
	for (const c_shape of a_gtfs["shapes"]) {
		if (c_shape["shape_dist_traveled"] === undefined || c_shape["shape_dist_traveled"] === null) {
			c_shape["shape_dist_traveled"] === "";
		}
	}
	
	// 準備として、ur_shapeの作成
	const c_ur_shape_index = {};
	const c_shape_id_to_ur_shape = {};
	for (const c_shape_id in a_gtfs["index"]["shape"]) {
		let l_ur_shape_id = "";
		for (let i2 = 0; i2 < a_gtfs["index"]["shape"][c_shape_id].length; i2++) {
			l_ur_shape_id += "__" + a_gtfs["index"]["shape"][c_shape_id][i2]["shape_pt_lat"] + "_" + a_gtfs["index"]["shape"][c_shape_id][i2]["shape_pt_lon"] + "_" + a_gtfs["index"]["shape"][c_shape_id][i2]["shape_dist_traveled"];
		}
		if (c_ur_shape_index[l_ur_shape_id] === undefined) {
			c_ur_shape_index[l_ur_shape_id] = {"shape_ids": []};
		}
		c_ur_shape_index[l_ur_shape_id]["shape_ids"].push(c_shape_id);
		c_shape_id_to_ur_shape[c_shape_id] = c_ur_shape_index[l_ur_shape_id];
	}
	
	// ur_routeの作成
	a_gtfs["index"]["ur_route"] = {};
	for (const c_trip_id in a_gtfs["index"]["trip"]) {
		// ur_route_idを作成
		let l_ur_route_id = a_gtfs["index"]["trip"][c_trip_id]["route_id"];
		l_ur_route_id += "_";
		for (let i2 = 0; i2 < a_gtfs["index"]["trip"][c_trip_id]["stop_times"].length; i2++) {
			l_ur_route_id += "__" + a_gtfs["index"]["trip"][c_trip_id]["stop_times"][i2]["stop_id"] + "_" + a_gtfs["index"]["trip"][c_trip_id]["stop_times"][i2]["pickup_type"] + "_" + a_gtfs["index"]["trip"][c_trip_id]["stop_times"][i2]["drop_off_type"] + "_" + a_gtfs["index"]["trip"][c_trip_id]["stop_times"][i2]["shape_dist_traveled"];
		}
		const c_shape_id = a_gtfs["index"]["trip"][c_trip_id]["shape_id"];
		if (c_shape_id !== "" && c_shape_id !== undefined && c_shape_id !== null) {
			if (c_shape_id_to_ur_shape[c_shape_id] !== undefined) {
				l_ur_route_id += "___" + c_shape_id_to_ur_shape[c_shape_id]["shape_ids"].join("_");
			}
		}
		
		// ur_routeを追加
		if (a_gtfs["index"]["ur_route"][l_ur_route_id] === undefined) {
			a_gtfs["index"]["ur_route"][l_ur_route_id] = {
				"route_id": a_gtfs["index"]["trip"][c_trip_id]["route_id"],
				"shape_ids": {},
				"trip_ids": [],
				"services": {},
				"monday": 0,
				"tuesday": 0,
				"wednesday": 0,
				"thursday": 0,
				"friday": 0,
				"saturday": 0,
				"sunday": 0
			};
		}
		
		a_gtfs["index"]["ur_route"][l_ur_route_id]["trip_ids"].push(c_trip_id);
		
		if (c_shape_id !== "" && c_shape_id !== undefined && c_shape_id !== null) {
			a_gtfs["index"]["ur_route"][l_ur_route_id]["shape_ids"][c_shape_id] = true;
		}
		
		const c_service_id = a_gtfs["index"]["trip"][c_trip_id]["service_id"];
		if (a_gtfs["index"]["ur_route"][l_ur_route_id]["services"][c_service_id] === undefined) {
			a_gtfs["index"]["ur_route"][l_ur_route_id]["services"][c_service_id] = 0;
		}
		a_gtfs["index"]["ur_route"][l_ur_route_id]["services"][c_service_id] += 1;
	}
	
	const c_day_of_week = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
	for (const c_ur_route_id in a_gtfs["index"]["ur_route"]) {
		for (const c_service_id in a_gtfs["index"]["ur_route"][c_ur_route_id]["services"]) {
			if (a_gtfs["index"]["service"][c_service_id] === undefined) {
				continue;
			}
			for (const c_field_name of c_day_of_week) {
				if (a_gtfs["index"]["service"][c_service_id][c_field_name] === "1") {
					a_gtfs["index"]["ur_route"][c_ur_route_id][c_field_name] += a_gtfs["index"]["ur_route"][c_ur_route_id]["services"][c_service_id];
				}
			}
		}
	}
}


busmapjs.convert_stop_lat_lon_to_parent_station = function(a_gtfs) {
	const c_parent_station_index = {};
	for (const c_stop of a_gtfs["stops"]) {
		if (c_stop["location_type"] === "1") {
			c_parent_station_index[c_stop["stop_id"]] = c_stop;
		}
	}
	for (const c_stop of a_gtfs["stops"]) {
		if (c_stop["location_type"] === "" || c_stop["location_type"] === "0") {
			if (c_stop["parent_station"] !== undefined && c_stop["parent_station"] !== null && c_stop["parent_station"] !== "") {
				c_stop["stop_lat"] = c_parent_station_index[c_stop["parent_station"]]["stop_lat"];
				c_stop["stop_lon"] = c_parent_station_index[c_stop["parent_station"]]["stop_lon"];
			}
		}
	}
}


busmapjs.convert_stop_lat_lon_to_splitted_stop_id = function(a_gtfs, a_separator) {
	const c_parent_index = {};
	for (const c_stop of a_gtfs["stops"]) {
		if (c_stop["location_type"] === "" || c_stop["location_type"] === "0") {
			const c_parent_id = c_stop["stop_id"].split(a_separator)[0];
			if (c_parent_index[c_parent_id] === undefined) {
				c_parent_index[c_parent_id] = {"stop_lon": 0, "stop_lat": 0, "count": 0};
			}
			c_parent_index[c_parent_id]["stop_lon"] += Number(c_stop["stop_lon"]);
			c_parent_index[c_parent_id]["stop_lat"] += Number(c_stop["stop_lat"]);
			c_parent_index[c_parent_id]["count"] += 1;
		}
	}
	for (const c_parent_id in c_parent_index) {
		c_parent_index[c_parent_id]["stop_lon"] = c_parent_index[c_parent_id]["stop_lon"] / c_parent_index[c_parent_id]["count"];
		c_parent_index[c_parent_id]["stop_lat"] = c_parent_index[c_parent_id]["stop_lat"] / c_parent_index[c_parent_id]["count"];
	}
	for (const c_stop of a_gtfs["stops"]) {
		if (c_stop["location_type"] === "" || c_stop["location_type"] === "0") {
			const c_parent_id = c_stop["stop_id"].split(a_separator)[0];
			c_stop["stop_lon"] = c_parent_index[c_parent_id]["stop_lon"];
			c_stop["stop_lat"] = c_parent_index[c_parent_id]["stop_lat"];
		}
	}
}


busmapjs.convert_ur_route_to_geojson = function(a_gtfs, a_output_m_value) {
	// ur_routeをGeoJSON出力
	const c_route_field_names = ["route_id", "agency_id", "route_short_name", "route_long_name", "route_desc", "route_type", "route_url", "route_color", "route_text_color", "route_sort_order", "continuous_pickup", "continuous_drop_off", "jp_parent_route_id"];
	const c_day_of_week = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
	
	let l_string_id = 0;
	const c_geojson = {"type": "FeatureCollection", "features": []};
	for (const c_ur_route_id in a_gtfs["index"]["ur_route"]) {
		l_string_id += 1;
		
		const c_feature = {
			"type": "Feature",
			"geometry": {
				"type": "LineString",
				"coordinates": []
			},
			"properties": {
				"trip_ids": [],
				"shape_ids": []
			}
		};
		
		for (const c_trip_id of a_gtfs["index"]["ur_route"][c_ur_route_id]["trip_ids"]) {
			c_feature["properties"]["trip_ids"].push(c_trip_id);
		}
		for (const c_shape_id in a_gtfs["index"]["ur_route"][c_ur_route_id]["shape_ids"]) {
			c_feature["properties"]["shape_ids"].push(c_shape_id);
		}
		
		const c_shape_id = c_feature["properties"]["shape_ids"][0];
		for (let i2 = 0; i2 < a_gtfs["index"]["shape"][c_shape_id].length; i2++) {
			const c_lon = Number(a_gtfs["index"]["shape"][c_shape_id][i2]["shape_pt_lon"]);
			const c_lat = Number(a_gtfs["index"]["shape"][c_shape_id][i2]["shape_pt_lat"]);
			if (a_output_m_value === true) {
				const c_m = Number(a_gtfs["index"]["shape"][c_shape_id][i2]["shape_dist_traveled"]);
				c_feature["geometry"]["coordinates"].push([c_lon, c_lat, , c_m]);
			} else {
				c_feature["geometry"]["coordinates"].push([c_lon, c_lat]);
			}
		}
		
		const c_route_id = a_gtfs["index"]["ur_route"][c_ur_route_id]["route_id"];
		for (const c_route_field_name of c_route_field_names) {
			if (a_gtfs["index"]["route"][c_route_id][c_route_field_name] === undefined) {
				c_feature["properties"][c_route_field_name] = "";
			} else {
				c_feature["properties"][c_route_field_name] = a_gtfs["index"]["route"][c_route_id][c_route_field_name];
			}
		}
		c_feature["properties"]["route_sort_order"] = Number(c_feature["properties"]["route_sort_order"]);
		
		for (const c_field_name of c_day_of_week) {
			c_feature["properties"][c_field_name] = a_gtfs["index"]["ur_route"][c_ur_route_id][c_field_name];
		}
		for (const c_service_id in a_gtfs["index"]["ur_route"][c_ur_route_id]["services"]) {
			c_feature["properties"]["service_id_" + c_service_id] = a_gtfs["index"]["ur_route"][c_ur_route_id]["services"][c_service_id];
		}
		c_feature["properties"]["string_id"] = l_string_id;
		
		c_geojson["features"].push(c_feature);
		
		
		// stopsも追加
		const c_trip_id = c_feature["properties"]["trip_ids"][0];
		for (let i2 = 0; i2 < a_gtfs["index"]["trip"][c_trip_id]["stop_times"].length; i2++) {
			const c_stop_id = a_gtfs["index"]["trip"][c_trip_id]["stop_times"][i2]["stop_id"];
			const c_lon = Number(a_gtfs["index"]["stop"][c_stop_id]["stop_lon"]);
			const c_lat = Number(a_gtfs["index"]["stop"][c_stop_id]["stop_lat"]);
			let l_coordinates;
			if (a_output_m_value === true) {
				const c_m = Number(a_gtfs["index"]["trip"][c_trip_id]["stop_times"][i2]["shape_dist_traveled"]);
				l_coordinates = [c_lon, c_lat, , c_m];
			} else {
				l_coordinates = [c_lon, c_lat];
			}
			c_geojson["features"].push({
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": l_coordinates
				},
				"properties": {
					"string_id": l_string_id,
					"stop_id": c_stop_id,
					"stop_sequence": a_gtfs["index"]["trip"][c_trip_id]["stop_times"][i2]["stop_sequence"],
					"pickup_type": a_gtfs["index"]["trip"][c_trip_id]["stop_times"][i2]["pickup_type"],
					"drop_off_type": a_gtfs["index"]["trip"][c_trip_id]["stop_times"][i2]["drop_off_type"],
					"stop_code": a_gtfs["index"]["stop"][c_stop_id]["stop_code"],
					"stop_name": a_gtfs["index"]["stop"][c_stop_id]["stop_name"],
					"stop_desc": a_gtfs["index"]["stop"][c_stop_id]["stop_desc"],
					"zone_id": a_gtfs["index"]["stop"][c_stop_id]["zone_id"],
					"stop_url": a_gtfs["index"]["stop"][c_stop_id]["stop_url"],
					"location_type": a_gtfs["index"]["stop"][c_stop_id]["location_type"],
					"parent_station": a_gtfs["index"]["stop"][c_stop_id]["parent_station"],
					"stop_timezone": a_gtfs["index"]["stop"][c_stop_id]["stop_timezone"],
					"wheelchair_boarding": a_gtfs["index"]["stop"][c_stop_id]["wheelchair_boarding"],
					"platform_code": a_gtfs["index"]["stop"][c_stop_id]["platform_code"]
				}
			});
		}
	}
	
	return c_geojson;
}




busmapjs.add_undefined_shapes = function(a_gtfs) {
	// 先にbusmapjs.create_gtfs_indexを要実行
	
	// shapesの追加が必要か判定
	let l_exist = true;
	for (const c_trip_id in a_gtfs["index"]["trip"]) {
		if (a_gtfs["index"]["shape"][a_gtfs["index"]["trip"][c_trip_id]["shape_id"]] === undefined) {
			l_exist = false;
		}
	}
	if (l_exist === true) {
		return;
	}
	
	// shape_idの検討
	const c_stop_shape_ids = {};
	const c_stop_shape_index = {
		"shape_id": {},
		"route_id": {},
		"jp_pattern_id": {},
		"sequence": {}
	};
	for (const c_trip_id in a_gtfs["index"]["trip"]) {
		const c_trip = a_gtfs["index"]["trip"][c_trip_id];
		let l_stop_shape_id = "";
		for (let i2 = 0; i2 < c_trip["stop_times"].length; i2++) {
			l_stop_shape_id += "__" + String(c_trip["stop_times"][i2]["stop_lat"]) + "_" + String(c_trip["stop_times"][i2]["stop_lon"]);
		}
		if (c_stop_shape_ids[l_stop_shape_id] === undefined) {
			c_stop_shape_ids[l_stop_shape_id] = String(Object.keys(c_stop_shape_ids).length + 1);
		}
		
		for (const c_id_name of ["shape_id", "route_id", "jp_pattern_id", "sequence"]) {
			let l_id;
			if (c_id_name === "sequence") {
				l_id = c_stop_shape_ids[l_stop_shape_id];
			} else {
				l_id = c_trip[c_id_name];
			}
			if (l_id === undefined || l_id === null) {
				l_id = "";
			}
			if (c_stop_shape_index[c_id_name][l_id] === undefined) {
				c_stop_shape_index[c_id_name][l_id] = {};
			}
			if (c_stop_shape_index[c_id_name][l_id][l_stop_shape_id] === undefined) {
				c_stop_shape_index[c_id_name][l_id][l_stop_shape_id] = [];
			}
			c_stop_shape_index[c_id_name][l_id][l_stop_shape_id].push(c_trip_id);
		}
	}
	
	let l_new_id_name;
	for (const c_id_name of ["shape_id", "route_id", "jp_pattern_id", "sequence"]) {
		l_new_id_name = c_id_name;
		for (const c_id in c_stop_shape_index[c_id_name]) {
			if (1 < Object.keys(c_stop_shape_index[c_id_name][c_id]).length) {
				l_new_id_name = null;
			}
		}
		if (l_new_id_name !== null) {
			break;
		}
	}
	
	
	//shapes作成
	for (const c_id in c_stop_shape_index[l_new_id_name]) {
		const c_new_shape_id = "shape_id_" + c_id;
		let l_trip;
		l_exist = false;
		for (const c_stop_shape_id in c_stop_shape_index[l_new_id_name][c_id]) { // 1回のみ
			for (const c_trip_id of c_stop_shape_index[l_new_id_name][c_id][c_stop_shape_id]) {
				l_trip = a_gtfs["index"]["trip"][c_trip_id];
				if (l_trip["shape_id"] === "" || l_trip["shape_id"] === null || l_trip["shape_id"] === undefined) {
					l_trip["shape_id"] = c_new_shape_id;
					l_exist = true;
				} else if (a_gtfs["index"]["shape"][l_trip["shape_id"]] === undefined) {
					l_trip["shape_id"] = c_new_shape_id;
					l_exist = true;
				}
			}
		}
		if (l_exist === true) {
			a_gtfs["index"]["shape"][c_new_shape_id] = [];
			for (let i2 = 0; i2 < l_trip["stop_times"].length; i2++) {
				
				a_gtfs["index"]["shape"][c_new_shape_id].push({
					"shape_id": c_new_shape_id,
					"shape_pt_lat": a_gtfs["index"]["stop"][l_trip["stop_times"][i2]["stop_id"]]["stop_lat"],
					"shape_pt_lon": a_gtfs["index"]["stop"][l_trip["stop_times"][i2]["stop_id"]]["stop_lon"],
					"shape_pt_sequence": i2 + 1
				});
			}
			for (let i2 = 0; i2 < a_gtfs["index"]["shape"][c_new_shape_id].length; i2++) {
				a_gtfs["shapes"].push(a_gtfs["index"]["shape"][c_new_shape_id][i2]);
			}
		}
	}
}


busmapjs.set_geojson_offset_id_offset_seq = function(a_geojson, a_offset_id_property, a_offset_order_property) {
	// GeoJSONのLineString型featureのpropertiesにoffset_idとoffset_seqを設定する
	// 入力：a_geojson["features"][]["properties"][a_offset_id_property]
	// 入力：a_geojson["features"][]["properties"][a_offset_order_property]
	// 出力：a_geojson["features"][]["properties"]["offset_id"]
	// 出力：a_geojson["features"][]["properties"]["offset_seq"]
	// offset_idは、a_offset_id_propertyが""の場合は全て""にし、ない場合は補完する
	// offset_seqは連続した正整数を出力する
	
	// offset_idの確認・設定
	let l_count = 0;
	for (const c_feature of a_geojson["features"]) {
		if (c_feature["geometry"]["type"] !== "LineString") {
			continue;
		}
		if (a_offset_id_property === "") {
			c_feature["properties"]["offset_id"] = "";
		} else if (c_feature["properties"][a_offset_id_property] !== undefined) {
			c_feature["properties"]["offset_id"] = c_feature["properties"][a_offset_id_property];
		} else {
			l_count += 1;
			c_feature["properties"]["offset_id"] = "offset_id_" + String(i1);
		}
	}
	
	
	// offset_orderの確認・設定
	const c_offset_ids = {};
	for (const c_feature of a_geojson["features"]) {
		if (c_feature["geometry"]["type"] !== "LineString") {
			continue;
		}
		const c_offset_id = c_feature["properties"]["offset_id"];
		if (c_offset_ids[c_offset_id] === undefined) {
			c_offset_ids[c_offset_id] = "未";
		}
		const c_offset_order = Number(c_feature["properties"][a_offset_order_property]);
		if (isNaN(c_offset_order) === false) {
			if (c_offset_ids[c_offset_id] === "未" || c_offset_order < c_offset_ids[c_offset_id]) {
				c_offset_ids[c_offset_id] = c_offset_order;
			}
		}
	}
	
	const c_offset_id_order_array = [];
	for (const c_feature of a_geojson["features"]) {
		if (c_feature["geometry"]["type"] !== "LineString") {
			continue;
		}
		const c_offset_id = c_feature["properties"]["offset_id"];
		if (c_offset_ids[c_offset_id] !== "未" && c_offset_ids[c_offset_id] !== "済") {
			c_offset_id_order_array.push({"offset_id": c_offset_id, "offset_order": c_offset_ids[c_offset_id]});
			c_offset_ids[c_offset_id] = "済";
		}
	}
	
	let l_max_count = 0;
	for (const c_offset_id_order of c_offset_id_order_array) {
		l_max_count = Math.max(l_max_count, c_offset_id_order["offset_order"]);
	}
	for (const c_feature of a_geojson["features"]) {
		if (c_feature["geometry"]["type"] !== "LineString") {
			continue;
		}
		const c_offset_id = c_feature["properties"]["offset_id"];
		if (c_offset_ids[c_offset_id] === "未") {
			l_max_count += 1;
			c_offset_id_order_array.push({"offset_id": c_offset_id, "offset_order": l_max_count});
			c_offset_ids[c_offset_id] = "済";
		}
	}
	
	busmapjs.sort_object_array(c_offset_id_order_array, "offset_order");
	for (let i1 = 0; i1 < c_offset_id_order_array.length; i1++) {
		c_offset_ids[c_offset_id_order_array[i1]["offset_id"]] = i1 + 1;
		// c_offset_id_order_array[i1]["offset_seq"] = i1 + 1;
	}
	
	for (const c_feature of a_geojson["features"]) {
		if (c_feature["geometry"]["type"] !== "LineString") {
			continue;
		}
		const c_offset_id = c_feature["properties"]["offset_id"];
		c_feature["properties"]["offset_seq"] = c_offset_ids[c_offset_id];
	}
}


busmapjs.create_paths_from_walks = function(a_walk_array, a_path_ids) {
	// walkを次数が2以外のnodeとwalkの端で分割してpathを作成する
	// 入力：a_walk_array: [{"node_id_array": [node_id]}];
	// 出力：a_walk_array: [{"node_id_array": [node_id], "path_id_array": [path_id], "path_direction_array": [-1 | 1]}];
	// 入力：a_path_ids: {};
	// 出力：a_path_ids: {path_id: {}};
	
	// node_id別に区切り位置（end）を判定
	const c_node_ids = {};
	for (const c_walk of a_walk_array) {
		for (let i2 = 0; i2 < c_walk["node_id_array"].length; i2++) {
			const c_node_id = c_walk["node_id_array"][i2];
			if (c_node_ids[c_node_id] === undefined) {
				c_node_ids[c_node_id] = {"next_node_ids": {}, "end": false};
			}
			if (i2 === 0) {
				c_node_ids[c_node_id]["end"] = true;
			} else {
				c_node_ids[c_node_id]["next_node_ids"][c_walk["node_id_array"][i2 - 1]] = true;
			}
			if (i2 === c_walk["node_id_array"].length - 1) {
				c_node_ids[c_node_id]["end"] = true;
			} else {
				c_node_ids[c_node_id]["next_node_ids"][c_walk["node_id_array"][i2 + 1]] = true;
			}
		}
	}
	for (const c_node_id in c_node_ids) {
		if (Object.keys(c_node_ids[c_node_id]["next_node_ids"]).length !== 2) {
			c_node_ids[c_node_id]["end"] = true;
		}
	}
	
	// walkをpathの列へ分解
	for (const c_walk of a_walk_array) {
		c_walk["path_id_array"] = []; // 既存のものがあれば上書き
		c_walk["path_direction_array"] = []; // 既存のものがあれば上書き
		let l_start = 0;
		
		for (let i2 = 1; i2 < c_walk["node_id_array"].length; i2++) {
			if (c_node_ids[c_walk["node_id_array"][i2]]["end"] === true) { // 分割位置
				const c_path_id_1 = c_walk["node_id_array"].slice(l_start, i2 + 1).join("__");
				const c_path_id_2 = c_walk["node_id_array"].slice(l_start, i2 + 1).reverse().join("__");
				if (a_path_ids[c_path_id_2] !== undefined) {
					c_walk["path_id_array"].push(c_path_id_2);
					c_walk["path_direction_array"].push(-1);
				} else {
					c_walk["path_id_array"].push(c_path_id_1);
					c_walk["path_direction_array"].push(1);
					if (a_path_ids[c_path_id_1] === undefined) {
						// a_path_ids[c_path_id_1] = {"node_id_array": c_walk["node_id_array"].slice(l_start, i2 + 1)};
						a_path_ids[c_path_id_1] = {};
					}
				}
				l_start = i2;
			}
		}
	}
}


busmapjs.add_path_direction = function(a_walk_array, a_path_ids) {
	// walkの繋がりにできるだけ合うようにpathに向きをつける
	// a_walk_array[]["weight"]に重みを入れておく（ない場合は補完する）
	// a_path_ids[c_path_id]["direction"]に向きを入れる（既にある場合は上書きする）
	
	// 入出力：a_walk_array: [{"path_id_array": [path_id], "path_direction_array": [-1 | 1], "weight"?: number}];
	// 入力：a_path_ids: {path_id: {}};
	// 出力：a_path_ids: {path_id: {"direction": -1 | 1}};
	
	for (const c_path_id in a_path_ids) {
		a_path_ids[c_path_id]["direction"] = undefined;
	}
	
	// 隣接するpath間のつながりの強さを点数評価する
	const c_next_path_scores = {};
	for (const c_walk of a_walk_array) {
		let l_weight = Number(c_walk["weight"]);
		if (isNaN(l_weight)) {
			l_weight = 1;
		}
		for (let i2 = 1; i2 < c_walk["path_id_array"].length; i2++) {
			const c_path_id_1 = c_walk["path_id_array"][i2 - 1];
			const c_path_direction_1 = c_walk["path_direction_array"][i2 - 1];
			const c_path_id_2 = c_walk["path_id_array"][i2];
			const c_path_direction_2 = c_walk["path_direction_array"][i2];
			if (c_next_path_scores[c_path_id_1] === undefined) {
				c_next_path_scores[c_path_id_1] = {};
			}
			if (c_next_path_scores[c_path_id_1][c_path_id_2] === undefined) {
				c_next_path_scores[c_path_id_1][c_path_id_2] = 0;
			}
			if (c_next_path_scores[c_path_id_2] === undefined) {
				c_next_path_scores[c_path_id_2] = {};
			}
			if (c_next_path_scores[c_path_id_2][c_path_id_1] === undefined) {
				c_next_path_scores[c_path_id_2][c_path_id_1] = 0;
			}
			c_next_path_scores[c_path_id_1][c_path_id_2] += l_weight * c_path_direction_1 * c_path_direction_2;
			c_next_path_scores[c_path_id_2][c_path_id_1] += l_weight * c_path_direction_1 * c_path_direction_2;
		}
	}
	
	// 点数順に並べる
	const c_score_order = [];
	for (const c_path_id_1 in c_next_path_scores) {
		for (const c_path_id_2 in c_next_path_scores[c_path_id_1]) {
			c_score_order.push({
				"score": c_next_path_scores[c_path_id_1][c_path_id_2],
				"abs_score": Math.abs(c_next_path_scores[c_path_id_1][c_path_id_2]),
				"path_id_1": c_path_id_1,
				"path_id_2": c_path_id_2
			});
		}
	}
	busmapjs.sort_object_array(c_score_order, "abs_score");
	c_score_order.reverse();
	
	// つながりが強い順（点数が大きい順）に向きを決める
	let l_exist = true;
	while (l_exist === true) {
		l_exist = false;
		for (let i1 = 0; i1 < c_score_order.length; i1++) {
			if (c_score_order[i1]["used"] !== undefined) {
				continue;
			}
			const c_path_id_1 = c_score_order[i1]["path_id_1"];
			const c_path_id_2 = c_score_order[i1]["path_id_2"];
			let l_direction = 1;
			if (c_score_order[i1]["score"] < 0) {
				l_direction = -1;
			}
			
			// 向きの反映
			if (a_path_ids[c_path_id_1]["direction"] !== undefined && a_path_ids[c_path_id_2]["direction"] === undefined) {
				a_path_ids[c_path_id_2]["direction"] = l_direction * a_path_ids[c_path_id_1]["direction"];
				c_score_order[i1]["used"] = true;
				l_exist = true;
				break;
			} else if (a_path_ids[c_path_id_1]["direction"] === undefined && a_path_ids[c_path_id_2]["direction"] !== undefined) {
				a_path_ids[c_path_id_1]["direction"] = l_direction * a_path_ids[c_path_id_2]["direction"];
				c_score_order[i1]["used"] = true;
				l_exist = true;
				break;
			} else if (a_path_ids[c_path_id_1]["direction"] !== undefined && a_path_ids[c_path_id_2]["direction"] !== undefined) {
				c_score_order[i1]["used"] = true;
			}
		}
		if (l_exist === false) { // directionの追加がない場合
			for (let i1 = 0; i1 < c_score_order.length; i1++) {
				if (c_score_order[i1]["used"] !== undefined) {
					continue;
				}
				const c_path_id_1 = c_score_order[i1]["path_id_1"];
				const c_path_id_2 = c_score_order[i1]["path_id_2"];
				if (a_path_ids[c_path_id_1]["direction"] === undefined) {
					a_path_ids[c_path_id_1]["direction"] = 1;
					l_exist = true;
					break;
				}
				if (a_path_ids[c_path_id_2]["direction"] === undefined) {
					a_path_ids[c_path_id_2]["direction"] = 1;
					l_exist = true;
					break;
				}
			}
			//追加できるものがない場合、終了
		}
	}
	
	//残りの向きを1で埋める（孤立しているもの）
	for (const c_path_id in a_path_ids) {
		if (a_path_ids[c_path_id]["direction"] === undefined) {
			a_path_ids[c_path_id]["direction"] = 1;
		}
	}
}


busmapjs.add_path_offset_seq = function(a_walk_array, a_path_ids) {
	// pathごとにwalkのオフセット順をつける
	// a_walk_arrayの入力順でオフセットする
	// offset_idが同じものは同じオフセット順とする
	// 同じpathを2回以上通る場合は、同じオフセット順とする
	
	// 入力：a_walk_array: [{"path_id_array": [path_id], "offset_id": offset_id}];
	// 出力：a_walk_array: [{"path_id_array": [path_id], "offset_id": offset_id, "path_offset_seqs": [number]}];
	// 入力：a_path_ids: {path_id: {}};
	// 出力：a_path_ids: {path_id: {"offset_id_array": [offset_id]}};
	
	for (const c_walk of a_walk_array) {
		c_walk["path_offset_seqs"] = [];
	}
	for (const c_path_id in a_path_ids) {
		a_path_ids[c_path_id]["offset_id_array"] = [];
	}
	
	for (const c_walk of a_walk_array) {
		const c_offset_id = c_walk["offset_id"];
		for (const c_path_id of c_walk["path_id_array"]) {
			if (a_path_ids[c_path_id]["offset_id_array"][a_path_ids[c_path_id]["offset_id_array"].length - 1] !== c_offset_id) {
				a_path_ids[c_path_id]["offset_id_array"].push(c_offset_id);
			}
			const c_offset_seq = a_path_ids[c_path_id]["offset_id_array"].length;
			c_walk["path_offset_seqs"].push(c_offset_seq);
		}
	}
}


// 集計aggregation
busmapjs.aggregate_properties = function(a_walk_array, a_path_ids) {
	// aggregationに入れた値を、path別・offset_id別に合計する
	// 入出力：a_walk_array: [{"path_id_array": [path_id], "offset_id": offset_id, "aggregation": {}}];
	// 入力：a_path_ids: {path_id: {}};
	// 出力：a_path_ids: {path_id: {"aggregation": {offset_id: {}}}};
	
	for (const c_walk of a_walk_array) {
		for (const c_path_id of c_walk["path_id_array"]) {
			if (a_path_ids[c_path_id]["aggregation"] === undefined) {
				a_path_ids[c_path_id]["aggregation"] = {};
			}
			if (a_path_ids[c_path_id]["aggregation"][c_walk["offset_id"]] === undefined) {
				a_path_ids[c_path_id]["aggregation"][c_walk["offset_id"]] = {};
			}
			for (const c_key in c_walk["aggregation"]) {
				if (a_path_ids[c_path_id]["aggregation"][c_walk["offset_id"]][c_key] === undefined) {
					a_path_ids[c_path_id]["aggregation"][c_walk["offset_id"]][c_key] = 0;
				}
				const c_number = Number(c_walk["aggregation"][c_key]);
				if (isNaN(c_number) === false) {
					a_path_ids[c_path_id]["aggregation"][c_walk["offset_id"]][c_key] += c_number;
				}
			}
		}
	}
}


busmapjs.distance_between_point_and_line_segment_lat_lon = function(a_p_lat, a_p_lon, a_s_lat, a_s_lon, a_e_lat, a_e_lon) {
	// 緯度経度から球面上の点と線分の距離を計算
	if ((a_p_lat === a_s_lat && a_p_lon === a_s_lon) || (a_p_lat === a_e_lat && a_p_lon === a_e_lon)) {
		return 0;
	}
	if (a_s_lat === a_e_lat && a_s_lon === a_e_lon) {
		const c_cos = Math.sin(a_p_lat * Math.PI / 180) * Math.sin(a_s_lat * Math.PI / 180) + Math.cos(a_p_lat * Math.PI / 180) * Math.cos(a_s_lat * Math.PI / 180) * Math.cos(a_p_lon * Math.PI / 180 - a_s_lon * Math.PI / 180);
		return 6378137 * Math.acos(Math.max(-1, Math.min(1, c_cos)));
	}
	const c_p_x = Math.cos(a_p_lon * Math.PI / 180) * Math.cos(a_p_lat * Math.PI / 180);
	const c_p_y = Math.sin(a_p_lon * Math.PI / 180) * Math.cos(a_p_lat * Math.PI / 180);
	const c_p_z = Math.sin(a_p_lat * Math.PI / 180);
	const c_s_x = Math.cos(a_s_lon * Math.PI / 180) * Math.cos(a_s_lat * Math.PI / 180);
	const c_s_y = Math.sin(a_s_lon * Math.PI / 180) * Math.cos(a_s_lat * Math.PI / 180);
	const c_s_z = Math.sin(a_s_lat * Math.PI / 180);
	const c_e_x = Math.cos(a_e_lon * Math.PI / 180) * Math.cos(a_e_lat * Math.PI / 180);
	const c_e_y = Math.sin(a_e_lon * Math.PI / 180) * Math.cos(a_e_lat * Math.PI / 180);
	const c_e_z = Math.sin(a_e_lat * Math.PI / 180);
	
	const c_pos = Math.acos(c_p_x * c_s_x + c_p_y * c_s_y + c_p_z * c_s_z);
	const c_poe = Math.acos(c_p_x * c_e_x + c_p_y * c_e_y + c_p_z * c_e_z);
	const c_soe = Math.acos(c_s_x * c_e_x + c_s_y * c_e_y + c_s_z * c_e_z);
	
	// 導出メモ
	// const c_s_x_2 = 1;
	// const c_s_y_2 = 0;
	// const c_s_z_2 = 0;
	// const c_e_x_2 = Math.cos(c_soe);
	// const c_e_y_2 = Math.sin(c_soe);
	// const c_e_z_2 = 0;
	// const c_p_x_2 = Math.cos(c_pos);
	// const c_p_y_2 = Math.sin(c_pos) * Math.cos(c_pse);
	// const c_p_z_2 = Math.sin(c_pos) * Math.sin(c_pse);
	// Math.cos(c_poe) = c_e_x_2 * c_p_x_2 + c_e_y_2 * c_p_y_2 + c_e_z_2 * c_p_z_2;
	// Math.cos(c_poe) = Math.cos(c_soe) * Math.cos(c_pos) + Math.sin(c_soe) * Math.sin(c_pos) * Math.cos(c_pse) + 0;
	
	const c_cos_pse = (Math.cos(c_poe) - Math.cos(c_soe) * Math.cos(c_pos)) / (Math.sin(c_soe) * Math.sin(c_pos));
	const c_cos_pes = (Math.cos(c_pos) - Math.cos(c_soe) * Math.cos(c_poe)) / (Math.sin(c_soe) * Math.sin(c_poe));
	const c_pse = Math.acos(Math.max(-1, Math.min(1, c_cos_pse)));
	const c_pes = Math.acos(Math.max(-1, Math.min(1, c_cos_pes)));
	
	if (c_pse >= Math.PI / 2) {
		const c_cos = Math.sin(a_p_lat * Math.PI / 180) * Math.sin(a_s_lat * Math.PI / 180) + Math.cos(a_p_lat * Math.PI / 180) * Math.cos(a_s_lat * Math.PI / 180) * Math.cos(a_p_lon * Math.PI / 180 - a_s_lon * Math.PI / 180);
		return 6378137 * Math.acos(Math.max(-1, Math.min(1, c_cos)));
	} else if (c_pes >= Math.PI / 2) {
		const c_cos = Math.sin(a_p_lat * Math.PI / 180) * Math.sin(a_e_lat * Math.PI / 180) + Math.cos(a_p_lat * Math.PI / 180) * Math.cos(a_e_lat * Math.PI / 180) * Math.cos(a_p_lon * Math.PI / 180 - a_e_lon * Math.PI / 180);
		return 6378137 * Math.acos(Math.max(-1, Math.min(1, c_cos)));
	} else {
		const c_sin = Math.sin(c_pos) * Math.sin(c_pse);
		return 6378137 * Math.asin(Math.max(-1, Math.min(1, c_sin)));
	}
}

busmapjs.distance_between_point_and_line_segment_lat_lon_foot = function(a_p_lat, a_p_lon, a_s_lat, a_s_lon, a_e_lat, a_e_lon) {
	// 緯度経度から球面上の点と線分の距離を計算
	// 垂線の足への距離footも出力
	let l_distance
	let l_foot;
	let l_start_point = false;
	let l_end_point = false;
	
	if (a_p_lat === a_s_lat && a_p_lon === a_s_lon && a_p_lat === a_e_lat && a_p_lon === a_e_lon) {
		l_distance = 0;
		l_foot = 0;
		l_start_point = true;
		l_end_point = true;
	} else if (a_p_lat === a_s_lat && a_p_lon === a_s_lon) {
		l_distance = 0;
		l_foot = 0;
		l_start_point = true;
	} else if (a_p_lat === a_e_lat && a_p_lon === a_e_lon) {
		l_distance = 0;
		l_foot = 0;
		l_end_point = true;
	} else if (a_s_lat === a_e_lat && a_s_lon === a_e_lon) {
		const c_cos = Math.sin(a_p_lat * Math.PI / 180) * Math.sin(a_s_lat * Math.PI / 180) + Math.cos(a_p_lat * Math.PI / 180) * Math.cos(a_s_lat * Math.PI / 180) * Math.cos(a_p_lon * Math.PI / 180 - a_s_lon * Math.PI / 180);
		l_distance = 6378137 * Math.acos(Math.max(-1, Math.min(1, c_cos)));
		l_foot = 0;
		l_start_point = true;
		l_end_point = true;
	} else {
		const c_p_x = Math.cos(a_p_lon * Math.PI / 180) * Math.cos(a_p_lat * Math.PI / 180);
		const c_p_y = Math.sin(a_p_lon * Math.PI / 180) * Math.cos(a_p_lat * Math.PI / 180);
		const c_p_z = Math.sin(a_p_lat * Math.PI / 180);
		const c_s_x = Math.cos(a_s_lon * Math.PI / 180) * Math.cos(a_s_lat * Math.PI / 180);
		const c_s_y = Math.sin(a_s_lon * Math.PI / 180) * Math.cos(a_s_lat * Math.PI / 180);
		const c_s_z = Math.sin(a_s_lat * Math.PI / 180);
		const c_e_x = Math.cos(a_e_lon * Math.PI / 180) * Math.cos(a_e_lat * Math.PI / 180);
		const c_e_y = Math.sin(a_e_lon * Math.PI / 180) * Math.cos(a_e_lat * Math.PI / 180);
		const c_e_z = Math.sin(a_e_lat * Math.PI / 180);
		
		const c_pos = Math.acos(c_p_x * c_s_x + c_p_y * c_s_y + c_p_z * c_s_z);
		const c_poe = Math.acos(c_p_x * c_e_x + c_p_y * c_e_y + c_p_z * c_e_z);
		const c_soe = Math.acos(c_s_x * c_e_x + c_s_y * c_e_y + c_s_z * c_e_z);
		
		// 導出メモ
		// const c_s_x_2 = 1;
		// const c_s_y_2 = 0;
		// const c_s_z_2 = 0;
		// const c_e_x_2 = Math.cos(c_soe);
		// const c_e_y_2 = Math.sin(c_soe);
		// const c_e_z_2 = 0;
		// const c_p_x_2 = Math.cos(c_pos);
		// const c_p_y_2 = Math.sin(c_pos) * Math.cos(c_pse);
		// const c_p_z_2 = Math.sin(c_pos) * Math.sin(c_pse);
		// Math.cos(c_poe) = c_e_x_2 * c_p_x_2 + c_e_y_2 * c_p_y_2 + c_e_z_2 * c_p_z_2;
		// Math.cos(c_poe) = Math.cos(c_soe) * Math.cos(c_pos) + Math.sin(c_soe) * Math.sin(c_pos) * Math.cos(c_pse) + 0;
		
		const c_cos_pse = (Math.cos(c_poe) - Math.cos(c_soe) * Math.cos(c_pos)) / (Math.sin(c_soe) * Math.sin(c_pos));
		const c_cos_pes = (Math.cos(c_pos) - Math.cos(c_soe) * Math.cos(c_poe)) / (Math.sin(c_soe) * Math.sin(c_poe));
		const c_pse = Math.acos(Math.max(-1, Math.min(1, c_cos_pse)));
		const c_pes = Math.acos(Math.max(-1, Math.min(1, c_cos_pes)));
		
		if (c_pse >= Math.PI / 2) {
			const c_cos = Math.sin(a_p_lat * Math.PI / 180) * Math.sin(a_s_lat * Math.PI / 180) + Math.cos(a_p_lat * Math.PI / 180) * Math.cos(a_s_lat * Math.PI / 180) * Math.cos(a_p_lon * Math.PI / 180 - a_s_lon * Math.PI / 180);
			l_distance = 6378137 * Math.acos(Math.max(-1, Math.min(1, c_cos)));
			l_foot = 0;
			l_start_point = true;
		} else if (c_pes >= Math.PI / 2) {
			const c_cos = Math.sin(a_p_lat * Math.PI / 180) * Math.sin(a_e_lat * Math.PI / 180) + Math.cos(a_p_lat * Math.PI / 180) * Math.cos(a_e_lat * Math.PI / 180) * Math.cos(a_p_lon * Math.PI / 180 - a_e_lon * Math.PI / 180);
			l_distance = 6378137 * Math.acos(Math.max(-1, Math.min(1, c_cos)));
			l_foot = 6378137 * Math.acos(Math.sin(a_s_lat * Math.PI / 180) * Math.sin(a_e_lat * Math.PI / 180) + Math.cos(a_s_lat * Math.PI / 180) * Math.cos(a_e_lat * Math.PI / 180) * Math.cos(a_s_lon * Math.PI / 180 - a_e_lon * Math.PI / 180));
			l_end_point = true;
		} else {
			const c_sin = Math.sin(c_pos) * Math.sin(c_pse);
			l_distance = 6378137 * Math.asin(Math.max(-1, Math.min(1, c_sin)));
			const c_cos_foot = Math.cos(c_pos) / Math.cos(Math.asin(Math.max(-1, Math.min(1, c_sin))));
			l_foot = 6378137 * Math.acos(Math.max(-1, Math.min(1, c_cos_foot)));
		}
	}
	
	return {"distance": l_distance, "foot": l_foot, "start_point": l_start_point, "end_point": l_end_point};
}

busmapjs.simplify_line_string_lat_lon = function(a_coordinates, a_distance) {
	// ジオメトリ簡素化（Douglas-Peuckerアルゴリズム）
	// a_coordinates: [[lat, lon]];
	// a_distande: number（単位はm）
	const c_status = [];
	for (let i2 = 0; i2 < a_coordinates.length; i2++) {
		if (i2 === 0 || i2 === a_coordinates.length - 1) {
			c_status.push("残す");
		} else {
			c_status.push("未定");
		}
	}
	let l_exist = true;
	for (let i1 = 0; i1 < a_coordinates.length; i1++) { // 無限ループ防止の上限
		if (l_exist === false) {
			break;
		}
		l_exist = false;
		let l_start;
		let l_end = 0;
		let l_check = false;
		for (let i2 = 1; i2 < a_coordinates.length; i2++) {
			if (c_status[i2] === "未定") {
				l_exist = true;
				l_check = true;
			}
			if (c_status[i2] === "残す") {
				l_start = l_end;
				l_end = i2;
				if (l_check === false) {
					continue;
				}
				// 距離最大の点を探す
				let l_max_distance = 0;
				let l_arg_max_distance = null;
				for (let i3 = l_start + 1; i3 <= l_end - 1; i3++) {
					if (c_status[i3] === "未定") {
						const c_distance = busmapjs.distance_between_point_and_line_segment_lat_lon(a_coordinates[i3][1], a_coordinates[i3][0], a_coordinates[l_start][1], a_coordinates[l_start][0], a_coordinates[l_end][1], a_coordinates[l_end][0]);// 距離計算
						if (l_max_distance <= c_distance) {
							l_max_distance = c_distance;
							l_arg_max_distance = i3;
						}
					}
				}
				// 残すか判定
				if (l_arg_max_distance !== null && a_distance < l_max_distance) {
					c_status[l_arg_max_distance] = "残す";
				} else if (l_arg_max_distance !== null) {
					for (let i3 = l_start + 1; i3 <= l_end - 1; i3++) {
						c_status[i3] = "除去";
					}
				}
				l_check = false;
			}
		}
	}
	// 出力
	const c_out_coordinates = [];
	for (let i2 = 0; i2 < a_coordinates.length; i2++) {
		if (c_status[i2] === "残す") {
			c_out_coordinates.push([a_coordinates[i2][0], a_coordinates[i2][1]]);
		}
	}
	return c_out_coordinates;
}

busmapjs.add_shape_dist_traveled = function(a_gtfs) {
	// 先にbusmapjs.create_ur_routesを要実行
	
	// shapes.shape_dist_traveledを付与
	for (const c_shape_id in a_gtfs["index"]["shape"]) {
		const c_shapes = a_gtfs["index"]["shape"][c_shape_id];
		let l_distance = 0;
		c_shapes[0]["shape_dist_traveled"] = l_distance;
		for (let i2 = 1; i2 < c_shapes.length; i2++) {
			const c_lat_0 = Number(c_shapes[i2 - 1]["shape_pt_lat"]) * Math.PI / 180;
			const c_lon_0 = Number(c_shapes[i2 - 1]["shape_pt_lon"]) * Math.PI / 180;
			const c_lat_1 = Number(c_shapes[i2]["shape_pt_lat"]) * Math.PI / 180;
			const c_lon_1 = Number(c_shapes[i2]["shape_pt_lon"]) * Math.PI / 180;
			l_distance += 6378137 * Math.acos(Math.sin(c_lat_0) * Math.sin(c_lat_1) + Math.cos(c_lat_0) * Math.cos(c_lat_1) * Math.cos(c_lon_0 - c_lon_1));
			c_shapes[i2]["shape_dist_traveled"] = l_distance;
		}
	}
	
	// stop_times.shape_dist_traveledを付与
	for (const c_ur_route_id in a_gtfs["index"]["ur_route"]) {
		const c_trip_id = a_gtfs["index"]["ur_route"][c_ur_route_id]["trip_ids"][0];
		const c_stop_times = a_gtfs["index"]["trip"][c_trip_id]["stop_times"];
		const c_shape_id = a_gtfs["index"]["trip"][c_trip_id]["shape_id"];
		const c_shapes = a_gtfs["index"]["shape"][c_shape_id];
		
		// 各stopからshapeの各線分への距離を計算
		const c_distance_array = [];
		for (let i2 = 0; i2 < c_stop_times.length; i2++) {
			const c_stop_id = c_stop_times[i2]["stop_id"];
			const c_p_lat = Number(a_gtfs["index"]["stop"][c_stop_id]["stop_lat"]);
			const c_p_lon = Number(a_gtfs["index"]["stop"][c_stop_id]["stop_lon"]);
			c_distance_array.push([]);
			for (let i3 = 1; i3 < c_shapes.length; i3++) {
				const c_s_lat = Number(c_shapes[i3 - 1]["shape_pt_lat"]);
				const c_s_lon = Number(c_shapes[i3 - 1]["shape_pt_lon"]);
				const c_e_lat = Number(c_shapes[i3]["shape_pt_lat"]);
				const c_e_lon = Number(c_shapes[i3]["shape_pt_lon"]);
				const c_distance_foot = busmapjs.distance_between_point_and_line_segment_lat_lon_foot(c_p_lat, c_p_lon, c_s_lat, c_s_lon, c_e_lat, c_e_lon);
				if (1 < c_distance_array[i2].length && c_distance_array[i2][c_distance_array[i2].length - 2]["end_point"] === true && c_distance_foot["start_point"] === true) {
					continue; // 境界部分で前と重複する場合を除く
				}
				c_distance_foot["sequence"] = i3 - 1;
				c_distance_foot["shape_dist_traveled"] = c_shapes[i3 - 1]["shape_dist_traveled"] + c_distance_foot["foot"];
				c_distance_foot["total_distance"] = Number.MAX_SAFE_INTEGER; // 適当に大きい数
				c_distance_foot["pre_sequence"] = null;
				c_distance_array[i2].push(c_distance_foot);
			}
		}
		
		// 距離の合計が最短になるものを探す
		// 最初の距離を設定
		for (let i3 = 0; i3 < c_distance_array[0].length; i3++) {
			c_distance_array[0][i3]["total_distance"] = c_distance_array[0][i3]["distance"];
		}
		for (let i2 = 0; i2 < c_distance_array.length - 1; i2++) { // 最後以外
			// 各段階でのtotal_distanceの最小値を求めておく
			const c_pre_array = [];
			for (let i3 = 0; i3 < c_distance_array[i2].length; i3++) {
				if (i2 !== 0 && c_distance_array[i2][i3]["pre_sequence"] === null) {
					continue;
				}
				if (c_pre_array.length === 0 || c_distance_array[i2][i3]["total_distance"] < c_pre_array[c_pre_array.length - 1]["total_distance"]) {
					c_pre_array.push({
						"sequence": i3,
						"shape_dist_traveled": c_distance_array[i2][i3]["shape_dist_traveled"],
						"total_distance": c_distance_array[i2][i3]["total_distance"]
					});
				}
			}
			// 次の計算
			let i3_pre = 0;
			for (let i3 = 0; i3 < c_distance_array[i2 + 1].length; i3++) {
				for (let i4 = i3_pre; i4 < c_pre_array.length; i4++) {
					if (c_pre_array[i4]["shape_dist_traveled"] > c_distance_array[i2 + 1][i3]["shape_dist_traveled"]) {
						break;
					}
					i3_pre = i4;
				}
				if (c_pre_array[i3_pre]["shape_dist_traveled"] > c_distance_array[i2 + 1][i3]["shape_dist_traveled"]) {
					continue;
				}
				if ((c_pre_array[i3_pre]["total_distance"] + c_distance_array[i2 + 1][i3]["distance"]) < c_distance_array[i2 + 1][i3]["total_distance"]) {
					c_distance_array[i2 + 1][i3]["total_distance"] = c_pre_array[i3_pre]["total_distance"] + c_distance_array[i2 + 1][i3]["distance"];
					c_distance_array[i2 + 1][i3]["pre_sequence"] = c_pre_array[i3_pre]["sequence"];
				}
			}
		}
		// 最短のものを探す
		let l_min = Number.MAX_SAFE_INTEGER; // 適当に大きい数
		let l_sequence = null;
		for (let i3 = 0; i3 < c_distance_array[c_distance_array.length - 1].length; i3++) {
			if (c_distance_array[c_distance_array.length - 1][i3]["total_distance"] < l_min) {
				l_min = c_distance_array[c_distance_array.length - 1][i3]["total_distance"];
				l_sequence = i3;
			}
		}
		if (l_sequence === null) {
			console.log("順序通りのものなし");
			continue;
		}
		// 最後から辿る
		const c_shape_dist_traveled_array = [];
		for (let i2 = c_distance_array.length - 1; i2 >= 0; i2--) {
			c_shape_dist_traveled_array.push(c_distance_array[i2][l_sequence]["shape_dist_traveled"]);
			l_sequence = c_distance_array[i2][l_sequence]["pre_sequence"];
		}
		c_shape_dist_traveled_array.reverse();
		
		// stop_times.txtへ反映
		for (const c_trip_id of a_gtfs["index"]["ur_route"][c_ur_route_id]["trip_ids"]) {
			const c_stop_times = a_gtfs["index"]["trip"][c_trip_id]["stop_times"];
			for (let i2 = 0; i2 < c_stop_times.length; i2++) {
				c_stop_times[i2]["shape_dist_traveled"] = c_shape_dist_traveled_array[i2];
			}
		}
	}
}
