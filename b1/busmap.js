"use strict";
const busmapjs = {}; // ここに関数を追加する



//道路中心線に沿ったshapesを作成
busmapjs.create_rdcl_shapes = async function(a_file) { //GTFSのFileオブジェクトを入力
	const c_source = "rdcl";
	//const c_source = "bvmap";
	//const c_local = true;
	const c_local = false;
	console.time("create_rdcl_shapes");
	const c_array_buffer = await busmapjs.file_to_array_buffer(a_file);
	const c_Uint8Array = new Uint8Array(c_array_buffer);
	const c_text_files = busmapjs.zip_to_text_files(c_Uint8Array);
	const c_gtfs = {};
	for (const c_file_name in c_text_files) {
		c_gtfs[c_file_name.replace(".txt", "")] = busmapjs.csv_to_json(c_text_files[c_file_name]);
	}
	busmapjs.number_lat_lon_sequence_of_gtfs(c_gtfs); // 緯度経度と順番を数値型に変換
	c_gtfs["shapes"] = busmapjs.create_shapes(c_gtfs); // shapesがない場合に作る
	console.log(c_gtfs);
	const c_zoom_level = 16; //地理院タイルに合わせて16にしておく
	const c_shape_graph = busmapjs.create_shape_graph(c_gtfs);
	const c_tiles =  busmapjs.create_tiles(c_shape_graph["nodes"]);
	console.log(c_tiles);
	const c_rdcl_tiles = await busmapjs.get_rdcl_tiles(c_tiles, c_source, c_local); //道路中心線のダウンロード
	const c_rdcl_paths = busmapjs.create_rdcl_paths(c_rdcl_tiles);
	//ここで追加修正を行う
	const c_rdcl_graph = busmapjs.create_rdcl_graph(c_rdcl_paths); //細分化してグラフを作成
	if (c_source === "bvmap") {
		busmapjs.add_border_link(c_rdcl_graph); //境界で欠けるリンクを補う（地理院地図Vector）
	}
	busmapjs.join_graph(c_rdcl_graph, c_shape_graph); //グラフに元のshapesを紐づけ
	//2点間を経路検索
	//shapesに復元
	console.log(c_rdcl_graph);
	console.log(c_shape_graph);
	const c_rdcl_node_orders = busmapjs.search_rdcl(c_rdcl_graph, c_shape_graph);
	console.log(c_rdcl_node_orders);
	
	
	//SVG出力
	document.getElementById("div_svg").innerHTML += busmapjs.create_svg_g_rdcl_graph(c_rdcl_graph, c_shape_graph);
	//CSV出力
	c_text_files["shapes.txt"] = busmapjs.rdcl_node_orders_to_shapes(c_rdcl_node_orders, c_rdcl_graph);
	c_text_files["trips.txt"] = busmapjs.json_to_csv(c_gtfs["trips"]);
	//Zip出力
	const c_Uint8Array_out = busmapjs.text_files_to_zip(c_text_files);
	const c_ArrayBuffer_out = c_Uint8Array_out.buffer; 
	const c_blob = new Blob([c_ArrayBuffer_out], {"type": "application/zip"});
	if (window.navigator.msSaveBlob) { 
		window.navigator.msSaveBlob(c_blob, "rdcl_gtfs"); 
	} else {
		document.getElementById("output_zip").href = window.URL.createObjectURL(c_blob);
	}
	
	console.timeEnd("create_rdcl_shapes");
}






//ZIPの解凍
//https://cdn.jsdelivr.net/npm/zlibjs@0.3.1/bin/unzip.min.jsが必要
busmapjs.zip_to_text_files = function(a_Uint8Array) {
	const c_unzip = new Zlib.Unzip(a_Uint8Array);
	const c_filenames = c_unzip.getFilenames();
	const c_text_files = {};
	for (let i1 = 0; i1 < c_filenames.length; i1++) {
		c_text_files[c_filenames[i1]] = new TextDecoder().decode(c_unzip.decompress(c_filenames[i1]));
	}
	return c_text_files;
}

//ZIPの圧縮
//https://cdn.jsdelivr.net/npm/zlibjs@0.3.1/bin/zip.min.jsが必要
busmapjs.text_files_to_zip = function(a_text_files) {
	const c_zip = new Zlib.Zip();
	for (let i1 in a_text_files) {
		if (a_text_files[i1] !== "" && a_text_files[i1] !== null && a_text_files[i1] !== undefined) {
			c_zip.addFile(new TextEncoder().encode(a_text_files[i1]), {"filename": new TextEncoder().encode(i1)});
		}
	}
	const c_Uint8Array = c_zip.compress();
	return c_Uint8Array;
}


busmapjs.csv_to_json = function(a_csv) {
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


busmapjs.json_to_csv = function(a_json) {
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


//緯度、経度、順序の文字列型を数値型に変換する
busmapjs.number_lat_lon_sequence_of_gtfs = function(a_gtfs) {
	for (let i1 = 0; i1 < a_gtfs["stops"].length; i1++) {
		if (a_gtfs["stops"][i1]["stop_lat"] === undefined && a_gtfs["stops"][i1]["stop_lat"] === null && a_gtfs["stops"][i1]["stop_lat"] === "") {
			a_gtfs["stops"][i1]["stop_lat"] = null;
		} else {
			a_gtfs["stops"][i1]["stop_lat"] = Number(a_gtfs["stops"][i1]["stop_lat"]);
		}
		if (a_gtfs["stops"][i1]["stop_lon"] === undefined && a_gtfs["stops"][i1]["stop_lon"] === null && a_gtfs["stops"][i1]["stop_lon"] === "") {
			a_gtfs["stops"][i1]["stop_lon"] = null;
		} else {
			a_gtfs["stops"][i1]["stop_lon"] = Number(a_gtfs["stops"][i1]["stop_lon"]);
		}
	}
	for (let i1 = 0; i1 < a_gtfs["stop_times"].length; i1++) {
		a_gtfs["stop_times"][i1]["stop_sequence"] = Number(a_gtfs["stop_times"][i1]["stop_sequence"]);
	}
	if (a_gtfs["shapes"] !== undefined && a_gtfs["shapes"].length !== 0) {
		for (let i1 = 0; i1 < a_gtfs["shapes"].length; i1++) {
			a_gtfs["shapes"][i1]["shape_pt_lat"] = Number(a_gtfs["shapes"][i1]["shape_pt_lat"]);
			a_gtfs["shapes"][i1]["shape_pt_lon"] = Number(a_gtfs["shapes"][i1]["shape_pt_lon"]);
			a_gtfs["shapes"][i1]["shape_pt_sequence"] = Number(a_gtfs["shapes"][i1]["shape_pt_sequence"]);
		}
	}
}






busmapjs.create_shapes = function(a_gtfs) {
	
	//目次作成
	const c_index = {"stops": {}, "trips": {}};
	for (const c_stop of a_gtfs["stops"]) {
		c_index["stops"][c_stop["stop_id"]] = c_stop;
	}
	for (const c_trip of a_gtfs["trips"]) {
		c_index["trips"][c_trip["trip_id"]] = c_trip;
	}
	
	//仮データを作成
	const c_temp_data = {"trips": {}, "stop_orders": {}, "routes": {}, "shapes": {}};
	//route一覧を作成
	for (const c_route of a_gtfs["routes"]) {
		c_temp_data["routes"][c_route["route_id"]] = {"stop_order_ids": {}};
	}
	//shapesをshape_id毎に分ける
	for (const c_trip of a_gtfs["trips"]) {
		if (c_trip["shape_id"] !== undefined && c_trip["shape_id"] !== "") {
			c_temp_data["shapes"][c_trip["shape_id"]] = {"stop_order_ids": {}, "shape_pt_order": []};
		}
	}
	if (a_gtfs["shapes"] !== undefined) {
		for (const c_shape of a_gtfs["shapes"]) {
			if (c_temp_data["shapes"][c_shape["shape_id"]] === undefined) {
				c_temp_data["shapes"][c_shape["shape_id"]] = {"stop_order_ids": {}, "shape_pt_order": []};
			}
			c_temp_data["shapes"][c_shape["shape_id"]]["shape_pt_order"].push({
				"lat": c_shape["shape_pt_lat"], 
				"lon": c_shape["shape_pt_lon"], 
				"sequence": c_shape["shape_pt_sequence"]
			});
		}
	}
	//sequence順に整列
	for (const i1 in c_temp_data["shapes"]) {
		c_temp_data["shapes"][i1]["shape_pt_order"].sort(f_sort_sequence);
	}
	function f_sort_sequence(a1,a2) {
		if (a1["sequence"] < a2["sequence"]) {
			return -1;
		}
		if (a1["sequence"] > a2["sequence"]) {
			return 1;
		}
		return 0;
	};
	
	//stop_timesをtrip毎に分けて整列する
	for (const c_trip of a_gtfs["trips"]) {
		c_temp_data["trips"][c_trip["trip_id"]] = {"stop_order": [], "stop_order_id": null, "shape_id": null};
	}
	for (const c_stop_time of a_gtfs["stop_times"]) {
		c_temp_data["trips"][c_stop_time["trip_id"]]["stop_order"].push({
			"lat": c_index["stops"][c_stop_time["stop_id"]]["stop_lat"],
			"lon": c_index["stops"][c_stop_time["stop_id"]]["stop_lon"],
			"sequence": c_stop_time["stop_sequence"]
		});
	}
	for (const i1 in c_temp_data["trips"]) {
		c_temp_data["trips"][i1]["stop_order"].sort(f_sort_sequence);
	}
	//stop_order_idを作成
	let l_count = 0;
	for (let i1 in c_temp_data["trips"]) {
		let l_stop_order_id = "";
		for (let i2 = 0; i2 < c_temp_data["trips"][i1]["stop_order"].length; i2++) {
			if (i2 !== 0) {
				l_stop_order_id += "_";
			}
			l_stop_order_id += String(c_temp_data["trips"][i1]["stop_order"][i2]["lat"]) + "," + String(c_temp_data["trips"][i1]["stop_order"][i2]["lon"]);
		}
		c_temp_data["trips"][i1]["stop_order_id"] = l_stop_order_id;
		if (c_temp_data["stop_orders"][l_stop_order_id] === undefined) {
			c_temp_data["stop_orders"][l_stop_order_id] = {
				"stop_order": c_temp_data["trips"][i1]["stop_order"], 
				"shape_id": "shape_id_stop_order_" + String(l_count),
				"route_ids": {},
				"shape_ids": {}
			};
			l_count += 1;
		}
		c_temp_data["stop_orders"][l_stop_order_id]["route_ids"][c_index["trips"][i1]["route_id"]] = true;
		c_temp_data["routes"][c_index["trips"][i1]["route_id"]]["stop_order_ids"][l_stop_order_id] = true;
		if (c_index["trips"][i1]["shape_id"] !== undefined && c_index["trips"][i1]["shape_id"] !== "") {
			c_temp_data["stop_orders"][l_stop_order_id]["route_ids"][c_index["trips"][i1]["shape_id"]] = true;
			c_temp_data["shapes"][c_index["trips"][i1]["shape_id"]]["stop_order_ids"][l_stop_order_id] = true;
		}
	}
	//以下、次の順序でshape_idを定める
	// 1 shape_idと中身がある場合、そのまま
	// 2 shape_idだけがある場合、
	// 2.1 shape_idに対応するstop_orderがどれも一意ならそのまま
	// 2.2 そうでなければroute_idに対応するstop_orderがどれも一意なら、shape_id_[route_id]
	// 2.3 そうでなければ通し番号
	// 3 shape_idがない場合
	// 3.1 route_idに対応するstop_orderがどれも一意なら、shape_id_[route_id]
	// 3.2 そうでなければ通し番号
	let l_all_route_ids_relate_one_stop_order = true;
	let l_all_shape_ids_relate_one_stop_order = true;
	for (const i1 in c_temp_data["shapes"]) {
		if (c_temp_data["shapes"][i1]["shape_pt_order"].length === 0 && Object.keys(c_temp_data["shapes"][i1]["stop_order_ids"]).length > 1) {
			l_all_shape_ids_relate_one_stop_order = false;
		}
	}
	for (const i1 in c_temp_data["routes"]) {
		if (Object.keys(c_temp_data["routes"][i1]["stop_order_ids"]).length > 1) {
			l_all_route_ids_relate_one_stop_order = false;
		}
	}
	//shape_idを振り直す
	for (const c_trip of a_gtfs["trips"]) {
		let l_shape_id;
		if (c_trip["shape_id"] !== undefined && c_trip["shape_id"] !== "") { // 1 or 2
			if (c_temp_data["shapes"][c_trip["shape_id"]]["shape_pt_order"].length === 0) { // 2
				if (l_all_shape_ids_relate_one_stop_order === true) { // 2.1
					l_shape_id = c_trip["shape_id"];
					c_temp_data["shapes"][c_trip["shape_id"]]["shape_pt_order"] = c_temp_data["stop_orders"][c_temp_data["trips"][c_trip["trip_id"]]["stop_order_id"]]["stop_order"];
				} else if (l_all_route_ids_relate_one_stop_order === true) { // 2.2
					l_shape_id =  "shape_id_" + c_trip["route_id"];
				} else { // 2.3
					l_shape_id = c_temp_data["stop_orders"][c_temp_data["trips"][c_trip["trip_id"]]["stop_order_id"]]["shape_id"];
				}
			} else { // 1
				l_shape_id = c_trip["shape_id"];
			}
		} else { // 3
			if (l_all_route_ids_relate_one_stop_order === true) { // 3.1
				l_shape_id = "shape_id_" + c_trip["route_id"];
			} else { // 3.2
				l_shape_id = c_temp_data["stop_orders"][c_temp_data["trips"][c_trip["trip_id"]]["stop_order_id"]]["shape_id"];
			}
			
		}
		c_temp_data["trips"][c_trip["trip_id"]]["shape_id"] = l_shape_id;
		if (c_temp_data["shapes"][l_shape_id] === undefined) {
			const c_stop_order_id = c_temp_data["trips"][c_trip["trip_id"]]["stop_order_id"];
			c_temp_data["shapes"][l_shape_id] = {"stop_order_ids": {}, "shape_pt_order": []};
			c_temp_data["shapes"][l_shape_id]["stop_order_ids"][c_stop_order_id] = true;
			c_temp_data["shapes"][l_shape_id]["shape_pt_order"] = c_temp_data["stop_orders"][c_stop_order_id]["stop_order"];
		}
	}
	
	//肝心のshapesを作成する
	for (const c_trip of a_gtfs["trips"]) {
		c_trip["shape_id"] = c_temp_data["trips"][c_trip["trip_id"]]["shape_id"];
	}
	const c_new_shapes = [];
	for (const i1 in c_temp_data["shapes"]) {
		if (c_temp_data["shapes"][i1]["shape_pt_order"].length === 0) {
			continue;
		}
		for (let i2 = 0; i2 < c_temp_data["shapes"][i1]["shape_pt_order"].length; i2++) {
			c_new_shapes.push({
				"shape_id":i1,
				"shape_pt_lat": c_temp_data["shapes"][i1]["shape_pt_order"][i2]["lat"],
				"shape_pt_lon": c_temp_data["shapes"][i1]["shape_pt_order"][i2]["lon"],
				"shape_pt_sequence": c_temp_data["shapes"][i1]["shape_pt_order"][i2]["sequence"]
			});
		}
	}
	return c_new_shapes;
}


//緯度経度WGS84（EPSG:4326）とウェブメルカトルのタイル番号（左手系）の変換
//EPSG:3857（メートル単位）（右手系）はa_zoom_level === "m"とする

busmapjs.lon_to_x = function(a_lon, a_zoom_level) {
	if (a_zoom_level === "m") {
		return a_lon / 180 * 6378137 * Math.PI;
	}
	return (a_lon / 180 + 1) * 0.5 * (2 ** a_zoom_level);
}
busmapjs.lat_to_y = function(a_lat, a_zoom_level) {
	if (a_zoom_level === "m") {
		return  Math.atanh(Math.sin(a_lat * Math.PI / 180)) * 6378137;
	}
	return (1 - Math.atanh(Math.sin(a_lat * Math.PI / 180)) / Math.PI) * 0.5 * (2 ** a_zoom_level);
}
busmapjs.x_to_lon = function(a_x, a_zoom_level) {
	if (a_zoom_level === "m") {
		return a_x / Math.PI / 6378137 * 180;
	}
	return (a_x / (2 ** a_zoom_level) / 0.5- 1) * 180;
}
busmapjs.y_to_lat = function(a_y, a_zoom_level) {
	if (a_zoom_level === "m") {
		return Math.asin(Math.tanh(a_y / 6378137)) * 180 / Math.PI;
	}
	return Math.asin(Math.tanh((1 - a_y / (2 ** a_zoom_level) / 0.5) * Math.PI)) * 180 / Math.PI;
}



//stopとshape pointがある周辺1タイルを集める
//置き換えたので不使用
/*
busmapjs.make_tile_list = function(a_data, a_zoom_level) {
	const c_tile_list = {};
	for (const c_stop of a_data["stops"]) {
		const c_x = Math.floor(busmapjs.lon_to_x(c_stop["stop_lon"], a_zoom_level));
		const c_y = Math.floor(busmapjs.lat_to_y(c_stop["stop_lat"], a_zoom_level));
		c_tile_list["x_" + String(c_x) + "_y_" + String(c_y)] = {"x_16": c_x, "y_16": c_y};
	}
	for (const c_shape of a_data["shapes"]) {
		const c_x = Math.floor(busmapjs.lon_to_x(c_shape["shape_pt_lon"], a_zoom_level));
		const c_y = Math.floor(busmapjs.lat_to_y(c_shape["shape_pt_lat"], a_zoom_level));
		c_tile_list["x_" + String(c_x) + "_y_" + String(c_y)] = {"x_16": c_x, "y_16": c_y};
	}
	for (const c_xy in c_tile_list) {
		const c_x_16 = c_tile_list[c_xy]["x_16"];
		const c_y_16 = c_tile_list[c_xy]["y_16"];
		for (let i1 = -1; i1 <= 1; i1++) {
			for (let i2 = -1; i2 <= 1; i2++) {
				c_tile_list["x_" + String(c_x_16 + i1) + "_y_" + String(c_y_16 + i2)] = {"x_16": c_x_16 + i1, "y_16": c_y_16 + i2};
			}
		}
	}
	return c_tile_list;
}
*/

//shape pointがある周辺1タイルを集める
//stopの周辺は集めない
busmapjs.create_tiles = function(a_nodes) {
	const c_tiles = {};
	for (const c_node_id in a_nodes) {
		const c_xy = "x_" + String(Math.floor(a_nodes[c_node_id]["x"])) + "_y_" + String(Math.floor(a_nodes[c_node_id]["y"]));
		if (c_tiles[c_xy] === undefined) {
			c_tiles[c_xy] = {"x_16": Math.floor(a_nodes[c_node_id]["x"]), "y_16": Math.floor(a_nodes[c_node_id]["y"])};
		}
	}
	for (const c_xy in c_tiles) {
		const c_x_16 = c_tiles[c_xy]["x_16"];
		const c_y_16 = c_tiles[c_xy]["y_16"];
		for (let i1 = -1; i1 <= 1; i1++) {
			for (let i2 = -1; i2 <= 1; i2++) {
				const c_xy_2 = "x_" + String(c_x_16 + i1) + "_y_" + String(c_y_16 + i2);
				if (c_tiles[c_xy_2] === undefined) {
					c_tiles[c_xy_2] = {"x_16": c_x_16 + i1, "y_16": c_y_16 + i2};
				}
			}
		}
	}
	return c_tiles;
}

busmapjs.create_shape_graph = function(a_gtfs) {
	const c_shape_graph = {"nodes": {}, "links": {}, "paths" : {}};
	const c_shape_pt_arrays = {};
	for (const c_shape of a_gtfs["shapes"]) {
		if (c_shape_pt_arrays[c_shape["shape_id"]] === undefined) {
			c_shape_pt_arrays[c_shape["shape_id"]] = [];
		}
		c_shape_pt_arrays[c_shape["shape_id"]].push({"shape_pt_lon": c_shape["shape_pt_lon"], "shape_pt_lat": c_shape["shape_pt_lat"], "shape_pt_sequence": c_shape["shape_pt_sequence"]});
	}
	for (const c_shape_id in c_shape_pt_arrays) {
		c_shape_pt_arrays[c_shape_id] = busmapjs.sort_array_key(c_shape_pt_arrays[c_shape_id], "shape_pt_sequence");
		c_shape_graph["paths"][c_shape_id] = [];
		for (let i1 = 0; i1 < c_shape_pt_arrays[c_shape_id].length; i1++) {

			const c_node_id = String(c_shape_pt_arrays[c_shape_id][i1]["shape_pt_lon"]) + "_" + String(c_shape_pt_arrays[c_shape_id][i1]["shape_pt_lat"]);
			if (c_shape_graph["nodes"][c_node_id] === undefined) {
				c_shape_graph["nodes"][c_node_id] = {"lon": c_shape_pt_arrays[c_shape_id][i1]["shape_pt_lon"], "lat": c_shape_pt_arrays[c_shape_id][i1]["shape_pt_lat"]};
			}
			if (i1 === 0) {
				continue;
			}
			const c_pre_node_id = String(c_shape_pt_arrays[c_shape_id][i1 - 1]["shape_pt_lon"]) + "_" + String(c_shape_pt_arrays[c_shape_id][i1 - 1]["shape_pt_lat"]);
			const c_link_id_1 = c_pre_node_id + "__" + c_node_id;
			const c_link_id_2 = c_node_id + "__" + c_pre_node_id;
			if (c_shape_graph["links"][c_link_id_1] === undefined && c_shape_graph["links"][c_link_id_2] === undefined) {
				c_shape_graph["links"][c_link_id_1] = {"start": c_pre_node_id, "end": c_node_id};
			}
			if (c_shape_graph["links"][c_link_id_1] !== undefined) {
				c_shape_graph["paths"][c_shape_id].push({"link_id": c_link_id_1, "direction": 1});
			} else if (c_shape_graph["links"][c_link_id_2] !== undefined) {
				c_shape_graph["paths"][c_shape_id].push({"link_id": c_link_id_2, "direction": -1});
			}
		}
	}
	//緯度経度をタイル番号に変換しておく
	for (const c_node_id in c_shape_graph["nodes"]) {
		c_shape_graph["nodes"][c_node_id]["x"] = busmapjs.lon_to_x(c_shape_graph["nodes"][c_node_id]["lon"], 16);
		c_shape_graph["nodes"][c_node_id]["y"] = busmapjs.lat_to_y(c_shape_graph["nodes"][c_node_id]["lat"], 16);
	}
	return c_shape_graph;
}

busmapjs.sort_array_key = function(a_array, a_key) {
	function f_sort_2(a1, a2) {
		if (a1[a_key] < a2[a_key]) {
			return -1;
		}
		if (a1[a_key] > a2[a_key]) {
			return 1;
		}
		return 0;
	}
	return a_array.sort(f_sort_2);
}


//タイルのダウンロード
busmapjs.get_rdcl_tiles = async function(a_tile_list, a_source, a_local) {
	const c_rdcl_tiles = {};
	const c_number = Object.keys(a_tile_list).length;
	let l_count = 0;
	let l_base_url = "";
	if (a_local === true) {
		l_base_url += "http://localhost/" + a_source + ".php?dir={x}&url={y}.";
	} else {
		l_base_url += "https://cyberjapandata.gsi.go.jp/xyz/experimental_" + a_source + "/16/{x}/{y}.";
	}
	if (a_source === "rdcl") {
		l_base_url += "geojson";
	} else {
		l_base_url += "pbf";
	}
	for (const c_xy in a_tile_list) {
		c_rdcl_tiles[c_xy] = {};
		const c_url = l_base_url.replace("{x}", String(a_tile_list[c_xy]["x_16"])).replace("{y}", String(a_tile_list[c_xy]["y_16"]));
		try {
			if (a_source === "rdcl") {
				c_rdcl_tiles[c_xy]["geojson"] = await ((await (fetch(c_url))).json());
			} else if (a_source === "bvmap") {
				const c_arrayBuffer = await ((await (fetch(c_url))).arrayBuffer());
				const c_data = new VectorTile(new Pbf(c_arrayBuffer));
				const c_features = [];
				const c_rnkWidth = ["3m未満", "3m-5.5m未満", "5.5m-13m未満","13m-19.5m未満", "19.5m以上", "3m未満", "3m未満"]; //後ろ2つは仮
				for (let i2 = 0; i2 < c_data["layers"]["road"].length; i2++) {
					const c_feature = c_data["layers"]["road"].feature(i2).toGeoJSON(a_tile_list[c_xy]["x_16"], a_tile_list[c_xy]["y_16"], 16);
					if (c_feature["properties"]["ftCode"] < 2700 || 2799 < c_feature["properties"]["ftCode"]) {
						continue; //道路縁と中央分離帯は外す
					}
					if (c_feature["geometry"]["type"] === "LineString") {
						const c_line_string = c_feature["geometry"]["coordinates"];
						const c_p1 = c_line_string[0];
						const c_p2 = c_line_string[1];
						const c_p3 = c_line_string[c_line_string.length - 2];
						const c_p4 = c_line_string[c_line_string.length - 1];
						c_feature["properties"]["rID"] = String(c_p1[0]) + "_" + String(c_p1[1]) + "_" + String(c_p2[0]) + "_" + String(c_p2[1]) + "_" + String(c_p3[0]) + "_" + String(c_p3[1]) + "_" + String(c_p4[0]) + "_" + String(c_p4[1]);
						c_feature["properties"]["rnkWidth"] = c_rnkWidth[c_feature["properties"]["rnkWidth"]];
						c_features.push(c_feature);
					} else if (c_feature["geometry"]["type"] === "MultiLineString") {
						for (const c_line_string of c_feature["geometry"]["coordinates"]) {
							const c_new_feature = {"type": "Feature", "geometry": {"type": "LineString", "coordinates": c_line_string}, "properties": {}};
							for (const c_key in c_feature["properties"]) {
								c_new_feature["properties"][c_key] = c_feature["properties"][c_key];
							}
							const c_p1 = c_line_string[0];
							const c_p2 = c_line_string[1];
							const c_p3 = c_line_string[c_line_string.length - 2];
							const c_p4 = c_line_string[c_line_string.length - 1];
							c_new_feature["properties"]["rID"] = String(c_p1[0]) + "_" + String(c_p1[1]) + "_" + String(c_p2[0]) + "_" + String(c_p2[1]) + "_" + String(c_p3[0]) + "_" + String(c_p3[1]) + "_" + String(c_p4[0]) + "_" + String(c_p4[1]);
							c_new_feature["properties"]["rnkWidth"] = c_rnkWidth[c_feature["properties"]["rnkWidth"]];
							c_features.push(c_new_feature);
						}
					}
				}
				c_rdcl_tiles[c_xy]["geojson"] = {"type": "FeatureCollection", "features": c_features};
			}
			l_count += 1;
			if (l_count % 100 === 0) {
				console.log(String(c_number) + "個中" + String(l_count) + "番目まで完了");
			}
		} catch(e) {
			c_rdcl_tiles[c_xy]["geojson"] = {"features": []};
			l_count += 1;
			console.log(String(c_number) + "個中" + String(l_count) + "番目失敗：" + c_xy);
		}
	}
	return c_rdcl_tiles;
}

busmapjs.create_rdcl_paths = function(a_rdcl_tiles) {
	const c_rdcl_paths = {};
	for (const c_xy in a_rdcl_tiles) {
		const c_x = Number(c_xy.replace("x_", "").split("_y_")[0]);
		const c_y = Number(c_xy.replace("x_", "").split("_y_")[1]);
		const c_lon_min = busmapjs.x_to_lon(c_x, 16) - 0.00001;
		const c_lon_max = busmapjs.x_to_lon(c_x + 1, 16) + 0.00001;
		const c_lat_min = busmapjs.y_to_lat(c_y, 16) - 0.00001;
		const c_lat_max = busmapjs.y_to_lat(c_y + 1, 16) + 0.00001;
		const c_features = a_rdcl_tiles[c_xy]["geojson"]["features"];
		for (let i2 = 0; i2 < c_features.length; i2++) {
			let l_rid = c_features[i2]["properties"]["rID"];
			while (c_rdcl_paths[l_rid] !== undefined) {
				l_rid += "_"; //重複があるのが問題！
			}
			//タイル範囲外の点は除去する
			const c_new_coordinates = [];
			for (const c_coordinate of c_features[i2]["geometry"]["coordinates"]) {
				if (c_lon_min < c_coordinate[0] && c_coordinate[0] < c_lon_max && c_lat_min < c_coordinate[1] && c_coordinate[1] < c_lat_max) {
					c_new_coordinates.push([c_coordinate[0], c_coordinate[1]]);
				}
			}
			if (c_new_coordinates.length >= 2) {
				c_features[i2]["geometry"]["coordinates"] = c_new_coordinates;
			}
			//追加
			c_rdcl_paths[l_rid] = c_features[i2];
		}
	}
	//不足分を追加
	if (false) { //地理院地図Vector用

		
		//宇野バス　柳川付近
		if (a_rdcl_tiles["x_57148_y_26032"] !== undefined) {
			const c_feature = {"type":"Feature","geometry":{"type":"LineString","coordinates":[[133.9288330078125,34.66563918211369],[133.9288330078125,34.66564028515245]]},"properties":{"orgGILvl":"1000","ftCode":2701,"rdCtg":1,"lvOrder":0,"rnkWidth":"19.5m以上","Width":50,"tollSect":0,"medSect":"1","motorway":9,"rID":"133.9288330078125_34.66563918211369_133.9288330078125_34.66564028515245_133.9288330078125_34.66563918211369_133.9288330078125_34.66564028515245"}};
			c_rdcl_paths[c_feature["properties"]["rID"]] = c_feature;
		}
		//宇野バス　百間川橋
		if (a_rdcl_tiles["x_57153_y_26031"] !== undefined) {
			const c_feature = {"type":"Feature","geometry":{"type":"LineString","coordinates":[[133.956298828125,34.67162405411817],[133.956298828125,34.67162515707723]]},"properties":{"orgGILvl":"2500","ftCode":2703,"rdCtg":0,"lvOrder":1,"rnkWidth":"13m-19.5m未満","tollSect":0,"medSect":"0","motorway":9,"rID":"133.956298828125_34.67162405411817_133.956298828125_34.67162515707723_133.956298828125_34.67162405411817_133.956298828125_34.67162515707723"}};
			c_rdcl_paths[c_feature["properties"]["rID"]] = c_feature;
		}
		//宇野バス　四御神線と東岡山線の交差点の東側
		if (a_rdcl_tiles["x_57155_y_26028"] !== undefined) {
			const c_feature = {"type":"Feature","geometry":{"type":"LineString","coordinates":[[133.96728515625,34.68421447760258],[133.96728515625,34.68421558039394]]},"properties":{"orgGILvl":"2500","ftCode":2701,"rdCtg":1,"lvOrder":0,"rnkWidth":"5.5m-13m未満","tollSect":0,"medSect":"0","motorway":9,"rID":"133.96728515625_34.68421447760258_133.96728515625_34.68421558039394_133.96728515625_34.68421447760258_133.96728515625_34.68421558039394"}};
			c_rdcl_paths[c_feature["properties"]["rID"]] = c_feature;
		}
		//宇野バス　山陽団地西
		if (a_rdcl_tiles["x_57162_y_26013"] !== undefined) {
			const c_feature = {"type":"Feature","geometry":{"type":"LineString","coordinates":[[134.00207072496414,34.7506398050501],[134.00207206606865,34.7506398050501]]},"properties":{"orgGILvl":"25000","ftCode":2701,"rdCtg":2,"lvOrder":0,"rnkWidth":"5.5m-13m未満","tollSect":0,"medSect":"0","motorway":9,"rID":"134.00207072496414_34.7506398050501_134.00207206606865_34.7506398050501_134.00207072496414_34.7506398050501_134.00207206606865_34.7506398050501"}};
			c_rdcl_paths[c_feature["properties"]["rID"]] = c_feature;
		}
		//宇野バス　片上方面　東から1番目
		if (a_rdcl_tiles["x_57179_y_26021"] !== undefined) {
			const c_feature = {"type":"Feature","geometry":{"type":"LineString","coordinates":[[134.09912109375,34.71800813284618],[134.09912109375,34.718009235187225]]},"properties":{"orgGILvl":"25000","ftCode":2701,"rdCtg":0,"lvOrder":0,"rnkWidth":"5.5m-13m未満","tollSect":0,"medSect":"0","motorway":9,"rID":"134.09912109375_34.71800813284618_134.09912109375_34.718009235187225_134.09912109375_34.71800813284618_134.09912109375_34.718009235187225"}};
			c_rdcl_paths[c_feature["properties"]["rID"]] = c_feature;
		}
		//宇野バス　片上方面　東から2番目
		if (a_rdcl_tiles["x_57180_y_26019"] !== undefined) {
			const c_feature = {"type":"Feature","geometry":{"type":"LineString","coordinates":[[134.10320475697517,34.723554927042215],[134.10320341587067,34.723554927042215]]},"properties":{"orgGILvl":"25000","ftCode":2701,"rdCtg":0,"lvOrder":0,"rnkWidth":"5.5m-13m未満","tollSect":0,"medSect":"0","motorway":9,"rID":"134.10320475697517_34.723554927042215_134.10320341587067_34.723554927042215_134.10320475697517_34.723554927042215_134.10320341587067_34.723554927042215"}};
			c_rdcl_paths[c_feature["properties"]["rID"]] = c_feature;
		}
		//宇野バス　片上方面　東から3番目
		if (a_rdcl_tiles["x_57185_y_26018"] !== undefined) {
			const c_feature = {"type":"Feature","geometry":{"type":"LineString","coordinates":[[134.132080078125,34.73213673334472],[134.132080078125,34.7321378354974]]},"properties":{"orgGILvl":"2500","ftCode":2701,"rdCtg":0,"lvOrder":0,"rnkWidth":"5.5m-13m未満","tollSect":0,"medSect":"0","motorway":9,"rID":"134.132080078125_34.73213673334472_134.132080078125_34.7321378354974_134.132080078125_34.73213673334472_134.132080078125_34.7321378354974"}};
			c_rdcl_paths[c_feature["properties"]["rID"]] = c_feature;
		}
	}
	
	
	return c_rdcl_paths;
}

busmapjs.create_rdcl_graph = function(a_rdcl_paths) {
	const c_zoom_level = 16;
	const c_rdcl_graph = {"nodes": {}, "links": {}};
	//指定したリンクを除外する
	//宇野バスrdcl用
	const c_not_use_link = {
	
		"134.166666667_34.7404451__134.166545287_34.740546372": true, //片上方面
		"134.166683375_34.74043116__134.166666667_34.7404451": true, //片上方面
		"134.04163825_34.735196917__134.041648512_34.735029242": true, //瀬戸駅
		"134.027709960938_34.7452276210852__134.028293611_34.745650556": true, // 瀬戸線 瀬戸駅の北で外れるところ
		"134.0284635_34.744833306__134.028680861_34.744584417": true, // 瀬戸線 瀬戸駅の北で外れるところ
		"134.005559694_34.750107361__134.005589896351_34.7506398050501": true, //山陽団地中
		"134.005737304688_34.7513068526223__134.005785583_34.751299056": true, //山陽団地中
		"134.005653306_34.751320417__134.005737304688_34.7513068526223": true, //山陽団地中
		"134.008957722_34.737652417__134.009005444_34.737502944": true, //山陽団地の南
		"133.986058111_34.6939975__133.9860975_34.694024417": true, //東岡山線 四御神付近
		"133.986040778_34.693961917__133.986058111_34.6939975": true, //東岡山線 四御神付近
		"133.9759425_34.698089583__133.975927278_34.6980455": true, // 四御神線 四御神付近
		"133.975964917_34.698137056__133.977441083_34.697782083": true, // 四御神線 四御神付近
		"133.994768139_34.733079778__133.994750976563_34.7331076270141": true, //美作線
		"133.994750976563_34.7331076270141__133.994723806_34.733151722": true, //美作線
		
		"133.928160111_34.678174528__133.928141111_34.678104444": true, //美作線、岡山駅の北
		"133.928161802587_34.6783937401165__133.928160111_34.678174528": true,
		"133.928141111_34.678104444__133.928105528_34.678070306": true,
		"133.928105528_34.678070306__133.928103889_34.677814889": true,
		"133.928162139_34.678438333__133.928161802587_34.6783937401165": true,
		"133.928162139_34.678438333__133.928264706_34.678449666": true,
		"133.928162139_34.678438333__133.928092083_34.678399583": true,
		"133.928090611_34.67812675__133.928105528_34.678070306": true,
		"133.928089111_34.678213972__133.928090611_34.67812675": true,
		"133.92779025_34.678088194__133.928105528_34.678070306": true,
		"133.928083889_34.678376528__133.928089111_34.678213972": true,
		"133.928090126533_34.6783937401165__133.928083889_34.678376528": true//,
	};
	for (const c_rid in a_rdcl_paths) {
		//有料道路などを除外する場合はここで除く？
		const c_node_array = [];
		for (let i1 = 0; i1 < a_rdcl_paths[c_rid]["geometry"]["coordinates"].length; i1++) {
			const c_lon = a_rdcl_paths[c_rid]["geometry"]["coordinates"][i1][0];
			const c_lat = a_rdcl_paths[c_rid]["geometry"]["coordinates"][i1][1];
			c_node_array.push({
				"lon": c_lon,
				"lat": c_lat,
				"x": busmapjs.lon_to_x(c_lon, c_zoom_level),
				"y": busmapjs.lat_to_y(c_lat, c_zoom_level),
				"id": String(c_lon) + "_" + String(c_lat)
			});
		}
		//nodeを追加
		for (let i1 = 0; i1 < c_node_array.length; i1++) {
			const c_node_id = c_node_array[i1]["id"];
			if (c_rdcl_graph["nodes"][c_node_id] === undefined) {
				if (isNaN(c_node_array[i1]["lon"])) {
					console.log(c_node_array[i1]);
				}
				c_rdcl_graph["nodes"][c_node_id] = {
					"id": c_node_id,
					"next": {}, 
					"rdcl": true, 
					"end": false,
					"x": c_node_array[i1]["x"],
					"y": c_node_array[i1]["y"],
					"lon": c_node_array[i1]["lon"],
					"lat": c_node_array[i1]["lat"]
				};
			}
		}
		//linkを追加
		for (let i1 = 1; i1 < c_node_array.length; i1++) { // 最初1から注意
			const c_pre_node_id = c_node_array[i1 - 1]["id"];
			const c_node_id = c_node_array[i1]["id"];
			const c_sx = c_rdcl_graph["nodes"][c_pre_node_id]["x"];
			const c_sy = c_rdcl_graph["nodes"][c_pre_node_id]["y"];
			const c_ex = c_rdcl_graph["nodes"][c_node_id]["x"];
			const c_ey = c_rdcl_graph["nodes"][c_node_id]["y"];
			const c_link_id = c_pre_node_id + "__" + c_node_id;
			if (c_not_use_link[c_link_id] === true) { //指定したものを除外
				continue;
			}
			if (c_rdcl_graph["links"][c_link_id] === undefined) {
				c_rdcl_graph["links"][c_link_id] = {
					"start": c_pre_node_id,
					"end": c_node_id,
					"sx": c_sx,
					"sy": c_sy,
					"ex": c_ex,
					"ey": c_ey,
					"rnkWidth": a_rdcl_paths[c_rid]["properties"]["rnkWidth"]
				};
			}
		}
	}
	//途中点のnodeと隣接nodeのnextを追加
	let l_count = 0;
	const c_ranks = {"3m未満": 2, "3m-5.5m未満": 2, "5.5m-13m未満": 1,"13m-19.5m未満": 1, "19.5m以上": 1};
	for (const c_link_id in c_rdcl_graph["links"]) {
		const c_start_node_id = c_rdcl_graph["links"][c_link_id]["start"];
		const c_end_node_id = c_rdcl_graph["links"][c_link_id]["end"];
		const c_length = ((c_rdcl_graph["nodes"][c_start_node_id]["x"] - c_rdcl_graph["nodes"][c_end_node_id]["x"]) ** 2 + (c_rdcl_graph["nodes"][c_start_node_id]["y"] - c_rdcl_graph["nodes"][c_end_node_id]["y"]) ** 2 ) ** 0.5;
		const c_max_length = 0.0625 * 0.25 / c_ranks[c_rdcl_graph["links"][c_link_id]["rnkWidth"]]; //0.0625で約30m？
		const c_number = Math.ceil(c_length / c_max_length);
		const c_node_id_array = [];
		// そのリンクのnodeを集める
		for (let i1 = 0; i1 <= c_number; i1++) {
			if (i1 === 0) { // 最初
				c_node_id_array.push(c_start_node_id);
			} else if (i1 === c_number) { // 最後
				c_node_id_array.push(c_end_node_id);
			} else {
				l_count += 1;
				const c_node_id = "temp_node_" + String(l_count);
				c_node_id_array.push(c_node_id);
				c_rdcl_graph["nodes"][c_node_id] = {
					"id": c_node_id,
					"next": {}, 
					"rdcl": false, 
					"end": false,
					"x": null,
					"y": null,
					"lon": null,
					"lat": null
				};
			}
		}
		//各nodeをnodesに追加する
		for (let i1 = 0; i1 < c_node_id_array.length; i1++) {
			const c_node_id = c_node_id_array[i1];
			if (i1 !== 0) {
				c_rdcl_graph["nodes"][c_node_id]["next"][c_node_id_array[i1 - 1]] = true;
			}
			if (i1 !== c_node_id_array.length - 1) {
				c_rdcl_graph["nodes"][c_node_id]["next"][c_node_id_array[i1 + 1]] = true;
			}
		}
	}
	return c_rdcl_graph;
}


busmapjs.add_border_link = function(a_rdcl_graph) {
	//境界のノードをまとめる
	//緯度経度で整列
	//近ければ補完リンクを追加
	const c_xs = {};
	const c_ys = {};
	for (const c_node_id in a_rdcl_graph["nodes"]) {
		if (a_rdcl_graph["nodes"][c_node_id]["rdcl"] === false) {
			continue;
		}
		const c_x = a_rdcl_graph["nodes"][c_node_id]["x"];
		const c_rx =  Math.round(c_x);
		if (Math.abs(c_x - c_rx) < 0.00001) {
			if (c_xs[String(c_rx)] === undefined) {
				c_xs[String(c_rx)] = [];
			}
			c_xs[String(c_rx)].push(a_rdcl_graph["nodes"][c_node_id]);
		}
		const c_y = a_rdcl_graph["nodes"][c_node_id]["y"];
		const c_ry =  Math.round(c_y);
		if (Math.abs(c_y - c_ry) < 0.00001) {
			if (c_ys[String(c_ry)] === undefined) {
				c_ys[String(c_ry)] = [];
			}
			c_ys[String(c_ry)].push(a_rdcl_graph["nodes"][c_node_id]);
		}
	}
	//緯度経度で整列
	for (const c_x in c_xs) {
		busmapjs.sort_array_key(c_xs[c_x], "y");
	}
	for (const c_y in c_ys) {
		busmapjs.sort_array_key(c_ys[c_y], "x");
	}
	console.log(c_xs);
	console.log(c_ys);
	//近いものがあればリンク追加
	for (const c_x in c_xs) {
		if (c_xs[c_x].length < 2) {
			continue;
		}
		for (let i1 = 1; i1 < c_xs[c_x].length; i1++) {
			const c_dy = Math.abs(c_xs[c_x][i1]["lat"] - c_xs[c_x][i1 - 1]["lat"]);
			if (0 < c_dy && c_dy < 0.00002) {
				const c_link_id = c_xs[c_x][i1 - 1]["id"] + "__" + c_xs[c_x][i1]["id"];
				console.log(c_link_id);
				if (a_rdcl_graph["links"][c_link_id] === undefined) {
					a_rdcl_graph["links"][c_link_id] = {
						"start": c_xs[c_x][i1 - 1]["id"],
						"end": c_xs[c_x][i1]["id"],
						"sx": c_xs[c_x][i1 - 1]["x"],
						"sy": c_xs[c_x][i1 - 1]["y"],
						"ex": c_xs[c_x][i1]["x"],
						"ey": c_xs[c_x][i1]["y"],
						"rnkWidth": "3m未満" // 仮
					};
					c_xs[c_x][i1]["next"][c_xs[c_x][i1 - 1]["id"]] = true;
					c_xs[c_x][i1 - 1]["next"][c_xs[c_x][i1]["id"]] = true;
				}
			}
		}
	}
	for (const c_y in c_ys) {
		if (c_ys[c_y].length < 2) {
			continue;
		}
		for (let i1 = 1; i1 < c_ys[c_y].length; i1++) {
			const c_dx = Math.abs(c_ys[c_y][i1]["lon"] - c_ys[c_y][i1 - 1]["lon"]);
			if (0 < c_dx && c_dx < 0.00002) {
				const c_link_id = c_ys[c_y][i1 - 1]["id"] + "__" + c_ys[c_y][i1]["id"];
				console.log(c_link_id);
				if (a_rdcl_graph["links"][c_link_id] === undefined) {
					a_rdcl_graph["links"][c_link_id] = {
						"start": c_ys[c_y][i1 - 1]["id"],
						"end": c_ys[c_y][i1]["id"],
						"sx": c_ys[c_y][i1 - 1]["x"],
						"sy": c_ys[c_y][i1 - 1]["y"],
						"ex": c_ys[c_y][i1]["x"],
						"ey": c_ys[c_y][i1]["y"],
						"rnkWidth": "3m未満" // 仮
					};
					c_ys[c_y][i1]["next"][c_ys[c_y][i1 - 1]["id"]] = true;
					c_ys[c_y][i1 - 1]["next"][c_ys[c_y][i1]["id"]] = true;
				}
			}
		}
	}
	
}

busmapjs.distance_between_point_and_segment= function(a_px, a_py, a_sx, a_sy, a_ex, a_ey) {
	const c_vx = a_ex - a_sx;
	const c_vy = a_ey - a_sy;
	const c_r2 = c_vx * c_vx + c_vy * c_vy;
	const c_tt = c_vx * (a_px - a_sx) + c_vy * (a_py - a_sy);
	if(c_tt < 0){
		return {"start": true, "end": false, "distance": (a_sx - a_px) * (a_sx - a_px) + (a_sy - a_py) * (a_sy - a_py)};
	}
	if(c_tt > c_r2){
		return {"start": false, "end": true, "distance": (a_ex - a_px) * (a_ex - a_px) + (a_ey - a_py) * (a_ey - a_py)};
	}
	const c_f1 = c_vx * (a_sy - a_py) - c_vy * (a_sx - a_px);
	return {"start": true, "end": true, "distance": (c_f1 * c_f1) / c_r2};
}

busmapjs.join_graph = function(a_rdcl_graph, a_shape_graph) {
	//rdcl_graphのlinkをz=16タイル分割した目次を作る
	//除外するものはここではじく
	
	//宇野バスrdcl用
	const c_not_use = {
		"133.930499722_34.665755556__133.930411139_34.665655194": true, //岡山駅近く
		"133.930520813_34.665801661__133.930499722_34.665755556": true,
		"133.930536009_34.665849599__133.930520813_34.665801661": true,
		"133.930541389_34.665886111__133.930536009_34.665849599": true,
		"133.9308345_34.665789972__133.930499722_34.665755556": true,
		"133.930563194_34.66614425__133.930541389_34.665886111": true,
		"133.930563194_34.66614425__133.930785778_34.665862028": true,
		"133.930785778_34.665862028__133.9308345_34.665789972": true,
		"133.9308345_34.665789972__133.930499722_34.665755556": true,
		"133.931050444_34.665810861__133.9308345_34.665789972": true,
		"133.9308345_34.665789972__133.930760639_34.665485417": true,
		"133.930737472_34.665649194__133.930722417_34.665696472": true
	};
	/*
	const c_not_use = {
		"133.92995551228523_34.66165491040162__133.92996355891228_34.661990249623784": true, // bvmap 宇野バス 表町バスセンター
		"133.93000110983849_34.66165491040162__133.92995551228523_34.66165491040162": true, // bvmap 宇野バス 表町バスセンター
		"133.92999172210693_34.6607371329594__133.93000110983849_34.66165491040162": true, // bvmap 宇野バス 表町バスセンター
		"133.9841951429844_34.67830551055721__133.98415356874466_34.67839374011646": true, // bvmap 宇野バス 国道2・250号線
		"133.98422464728355_34.678241544068__133.98415356874466_34.67839374011646": true, // bvmap 宇野バス 国道2・250号線
		"133.9759674668312_34.69815258714563__133.97704973816872_34.697892371792406": true, // bvmap 宇野バス 四御神線
		"133.96247997879982_34.69773028808679__133.9627106487751_34.69773028808679": true, // bvmap 宇野バス 四御神線
		"133.9627106487751_34.69773028808679__133.96275088191032_34.69772698025275": true, // bvmap 宇野バス 四御神線
		"133.96269723773003_34.69804232650263__133.9627106487751_34.69773028808679": true, // bvmap 宇野バス 四御神線
		"133.92827108502388_34.67780480602808__133.92817452549934_34.67781142328829": true, // bvmap 宇野バス 美作線
		"133.92819195985794_34.67769672403641__133.92817452549934_34.67781142328829": true, // bvmap 宇野バス 美作線
		"133.92817452549934_34.67781142328829__133.92810344696045_34.677815834794814": true, // bvmap 宇野バス 美作線
		"133.9947670698166_34.73308017065855__133.9947509765625_34.73310662201682": true, // bvmap 宇野バス 美作線
		"133.9947509765625_34.73310662201682__133.99472281336784_34.73315180973425": true, // bvmap 宇野バス 美作線
		"134.00181725621223_34.737079740308786__134.00180652737617_34.73709847578162": true, // bvmap 宇野バス 美作線（山陽団地の南側）
		"134.00180652737617_34.73709847578162__134.0017729997635_34.737161294688974": true, // bvmap 宇野バス 美作線（山陽団地の南側）
		"134.0017729997635_34.737161294688974__134.00172874331474_34.73727480943553": true, // bvmap 宇野バス 美作線（山陽団地の南側）
		"134.00181725621223_34.737079740308786__134.00180652737617_34.73709847578162": true, // bvmap 宇野バス 美作線（山陽団地の南側）
		"134.00180652737617_34.73709847578162__134.00176227092743_34.7371866426556": true, // bvmap 宇野バス 美作線（山陽団地の南側）
		"134.01721581816673_34.74617476175321__134.01729628443718_34.7461262752594": true, // bvmap 宇野バス 美作線（山陽団地の東側）
		"134.01712998747826_34.746267326798716__134.01721581816673_34.74617476175321": true, // bvmap 宇野バス 美作線（山陽団地の東側）
		"134.01717826724052_34.74621443249971__134.01721581816673_34.74617476175321": true, // bvmap 宇野バス 美作線（山陽団地の東側）
		"134.0051418542862_34.743258909724545__134.00520354509354_34.74435319278881": true, // bvmap 宇野バス 山陽団地中
		"134.005558937788_34.75010758279723__134.00558844208717_34.7506398050501": true, // bvmap 宇野バス 山陽団地中
		"134.00359824299812_34.75243038268751__134.00440022349358_34.75255379337766": true, // bvmap 宇野バス 山陽団地西
		"134.0057373046875_34.75130755731138__134.00578558444977_34.751299844032246": true, // bvmap 宇野バス 山陽団地中
		"134.00565281510353_34.75132078007391__134.0057373046875_34.75130755731138": true, // bvmap 宇野バス 山陽団地中
		"134.0277099609375_34.74523037196852__134.0281940996647_34.74557969826961": true, // bvmap 宇野バス ネオ瀬戸線
		"134.0277099609375_34.74523037196852__134.0278172492981_34.745307510395534": true, // bvmap 宇野バス ネオ瀬戸線
		"134.04297977685928_34.738116797444604__134.04284298419952_34.73802973363722": true, // bvmap 宇野バス ネオ瀬戸線（瀬戸駅の北）
		"134.04284298419952_34.73802973363722__134.04279068112373_34.73799336518417": true, // bvmap 宇野バス ネオ瀬戸線（瀬戸駅の北）
		"134.0429851412773_34.73783025798575__134.0430562198162_34.737962507090245": true, // bvmap 宇野バス ネオ瀬戸線（瀬戸駅の北）
		"134.0430562198162_34.737962507090245__134.04314741492271_34.738144349263294": true, // bvmap 宇野バス ネオ瀬戸線（瀬戸駅の北）
		"134.04293954372406_34.737761929198854__134.0429851412773_34.73783025798575": true, // bvmap 宇野バス ネオ瀬戸線（瀬戸駅の北）
		//瀬戸駅ロータリーを要確認
		"134.02076303958893_34.87866997479975__134.02052834630013_34.878609464055": true, // bvmap 宇野バス 林野線
		"134.10102143883705_34.92314321744567__134.10105228424072_34.922944189721434": true, // bvmap 宇野バス 林野線
		"134.14653047919273_35.00322419914197__134.14593502879143_35.00424472269788": true, // bvmap 宇野バス 林野線
		"134.05781909823418_34.88752166671394__134.05794113874435_34.8875117660252": true, // bvmap 宇野バス 
		"134.05794113874435_34.8875117660252__134.05801355838776_34.88748976449037": true, // bvmap 宇野バス 
		"134.041665494442_34.73525907291946__134.04167622327805_34.73527119614005": true, // bvmap 宇野バス 瀬戸駅
		"134.04167622327805_34.73527119614005__134.0417768061161_34.73533401643654": true, // bvmap 宇野バス 瀬戸駅
		"134.04160648584366_34.735165393427536__134.04164269566536_34.735233724361535": true, // bvmap 宇野バス 瀬戸駅
		"134.04164269566536_34.735233724361535__134.041665494442_34.73525907291946": true*//*, // bvmap 宇野バス 瀬戸駅
		"": true, // bvmap 宇野バス 
		"": true*//*
	};
	*/
	
	const c_link_index = {};
	for (const c_link_id in a_rdcl_graph["links"]) {
		if (c_not_use[c_link_id] === true) {
			continue;
		}
		const c_link = a_rdcl_graph["links"][c_link_id];
		const c_x = Math.floor((c_link["sx"] + c_link["ex"]) / 2);
		const c_y = Math.floor((c_link["sy"] + c_link["ey"]) / 2);
		const c_index = "x_" + String(c_x) + "_y_" + String(c_y);
		if (c_link_index[c_index] === undefined) {
			c_link_index[c_index] = {};
		}
		c_link_index[c_index][c_link_id] = c_link;
	}
	
	
	
	const c_ranks = {"3m未満": 2, "3m-5.5m未満": 2, "5.5m-13m未満": 1,"13m-19.5m未満": 1, "19.5m以上": 1};
	//shape_graphのnodeをrdcl_graphのlinkに紐づけ、端点のnodeとつなぐ
	for (const c_node_id in a_shape_graph["nodes"]) {
		const c_px = a_shape_graph["nodes"][c_node_id]["x"];
		const c_py = a_shape_graph["nodes"][c_node_id]["y"];
		const c_index_array = [];
		c_index_array.push("x_" + String(Math.floor(c_px + 0.5)) + "_y_" + String(Math.floor(c_py + 0.5)));
		c_index_array.push("x_" + String(Math.floor(c_px + 0.5)) + "_y_" + String(Math.floor(c_py - 0.5)));
		c_index_array.push("x_" + String(Math.floor(c_px - 0.5)) + "_y_" + String(Math.floor(c_py + 0.5)));
		c_index_array.push("x_" + String(Math.floor(c_px - 0.5)) + "_y_" + String(Math.floor(c_py - 0.5)));
		let l_min_distance = {"start": false, "end": false, "distance": Number.MAX_SAFE_INTEGER};
		for (const c_index of c_index_array) {
			for (const c_link_id in c_link_index[c_index]) {
				const c_link = c_link_index[c_index][c_link_id];
				const c_distance = busmapjs.distance_between_point_and_segment(c_px, c_py, c_link["sx"], c_link["sy"], c_link["ex"], c_link["ey"]);
				c_distance["distance"] *= c_ranks[a_rdcl_graph["links"][c_link_id]["rnkWidth"]];
				if (l_min_distance["distance"] > c_distance["distance"]) {
					l_min_distance = c_distance;
					l_min_distance["start_node_id"] = c_link["start"];
					l_min_distance["end_node_id"] = c_link["end"];
					l_min_distance["link_id"] = c_link_id;
				}
			}
		}
		if (l_min_distance["start"] === false && l_min_distance["end"] === false) {
			console.log("最寄りリンク未発見");
			continue;
		}
		a_rdcl_graph["nodes"]["shape_" + c_node_id] = {
			"id": "shape_" + c_node_id,
			"next": {}, 
			"next_rdcl_id": null,
			"rdcl": false, 
			"end": true,
			"x": a_shape_graph["nodes"][c_node_id]["x"],
			"y": a_shape_graph["nodes"][c_node_id]["y"],
			"lon": a_shape_graph["nodes"][c_node_id]["lon"],
			"lat": a_shape_graph["nodes"][c_node_id]["lat"]
		};
		if (l_min_distance["start"] === true && l_min_distance["end"] === true) {
			a_rdcl_graph["nodes"]["shape_" + c_node_id]["next_rdcl_id"] = l_min_distance["link_id"];
		}
		if (l_min_distance["start"] === true) {
			a_rdcl_graph["nodes"]["shape_" + c_node_id]["next"][l_min_distance["start_node_id"]] = true;
			a_rdcl_graph["nodes"][l_min_distance["start_node_id"]]["next"]["shape_" + c_node_id] = true;
			if (l_min_distance["end"] === false) {
				a_rdcl_graph["nodes"]["shape_" + c_node_id]["next_rdcl_id"] = l_min_distance["start_node_id"];
			}
		}
		if (l_min_distance["end"] === true) {
			a_rdcl_graph["nodes"]["shape_" + c_node_id]["next"][l_min_distance["end_node_id"]] = true;
			a_rdcl_graph["nodes"][l_min_distance["end_node_id"]]["next"]["shape_" + c_node_id] = true;
			if (l_min_distance["start"] === false) {
				a_rdcl_graph["nodes"]["shape_" + c_node_id]["next_rdcl_id"] = l_min_distance["end_node_id"];
			}
		}
	}
}

busmapjs.search_rdcl = function(a_rdcl_graph, a_shape_graph) {
	console.time("探索");
	for (const c_link_id in a_shape_graph["links"]) {
		const c_start_node_id = "shape_" + a_shape_graph["links"][c_link_id]["start"];
		const c_end_node_id = "shape_" + a_shape_graph["links"][c_link_id]["end"];
		if (a_rdcl_graph["nodes"][c_start_node_id]["next_rdcl_id"] === a_rdcl_graph["nodes"][c_end_node_id]["next_rdcl_id"]) { //対応先が同じ場合
			a_shape_graph["links"][c_link_id]["rdcl_node_order"] = [];
			continue;
		}
		//幅優先探索？
		const c_index_distance = [];//距離の記録
		const c_previous_point = {};//前の点の記録
		//最初の距離を0にする
		c_index_distance[0] = {};
		c_index_distance[0][c_end_node_id] = {};
		c_previous_point[c_end_node_id] = "end";
		busmapjs.f_search_next_node(c_index_distance, c_previous_point, a_rdcl_graph["nodes"], 0, c_start_node_id);
		const c_rdcl_node_order = [];
		if (c_previous_point[c_start_node_id] !== undefined) {
			let l_add_node_id = c_previous_point[c_start_node_id]
			for (let i1 = 1; i1 < c_index_distance.length - 1; i1++) { //最初と最後は除く
				if (a_rdcl_graph["nodes"][l_add_node_id]["rdcl"] === true) {
					c_rdcl_node_order.push(l_add_node_id);
				}
				l_add_node_id = c_previous_point[l_add_node_id];
			}
		} else {
			console.log("探索失敗");
		}
		a_shape_graph["links"][c_link_id]["rdcl_node_order"] = c_rdcl_node_order; // 経路検索
	}
	console.timeEnd("探索");
	//shape_idごとにまとめる
	//端の処理が不十分
	//端が折り返しになっている場合は、重複出力しない
	//端が通り抜けになっている場合は、前後とも出す
	//一番最初と一番最後は、通り抜けの反対側を追加する
	const c_rdcl_node_orders = {};
	for (const c_shape_id in a_shape_graph["paths"]) {
		c_rdcl_node_orders[c_shape_id] = [];
		for (let i1 = 0; i1 < a_shape_graph["paths"][c_shape_id].length; i1++) {
			if (a_shape_graph["paths"][c_shape_id][i1]["direction"] === 1) {
				const c_link_id = a_shape_graph["paths"][c_shape_id][i1]["link_id"];
				for (let i2 = 0; i2 < a_shape_graph["links"][c_link_id]["rdcl_node_order"].length; i2++) {
					const c_id = a_shape_graph["links"][c_link_id]["rdcl_node_order"][i2];
					if (c_rdcl_node_orders[c_shape_id].length > 0) {
						if (c_rdcl_node_orders[c_shape_id][c_rdcl_node_orders[c_shape_id].length - 1] === c_id) { //最後と同じなら、追加しない
							continue;
						}
					}
					c_rdcl_node_orders[c_shape_id].push(c_id);
				}
			}
			if (a_shape_graph["paths"][c_shape_id][i1]["direction"] === -1) {
				const c_link_id = a_shape_graph["paths"][c_shape_id][i1]["link_id"];
				for (let i2 = a_shape_graph["links"][c_link_id]["rdcl_node_order"].length - 1; i2 >= 0 ; i2--) {
					const c_id = a_shape_graph["links"][c_link_id]["rdcl_node_order"][i2];
					if (c_rdcl_node_orders[c_shape_id].length > 0) {
						if (c_rdcl_node_orders[c_shape_id][c_rdcl_node_orders[c_shape_id].length - 1] === c_id) { //最後と同じなら、追加しない
							continue;
						}
					}
					c_rdcl_node_orders[c_shape_id].push(c_id);
				}
			}
		}
		//最初を補完
		let l_start_add;
		let l_start_node_id;
		if (a_shape_graph["paths"][c_shape_id][0]["direction"] === 1) {
			const c_link_id = a_shape_graph["paths"][c_shape_id][0]["link_id"];
			l_start_node_id = "shape_" + a_shape_graph["links"][c_link_id]["start"];
		} else if (a_shape_graph["paths"][c_shape_id][0]["direction"] === -1) {
			const c_link_id = a_shape_graph["paths"][c_shape_id][0]["link_id"];
			l_start_node_id = "shape_" + a_shape_graph["links"][c_link_id]["end"];
		}
		for (const c_next_node_id in a_rdcl_graph["nodes"][l_start_node_id]["next"]) {
			if (c_next_node_id !== c_rdcl_node_orders[c_shape_id][0]) {
				l_start_add = c_next_node_id;
			}
		}
		if (l_start_add !== undefined) {
			c_rdcl_node_orders[c_shape_id].unshift(l_start_add);
		}
		//最後を補完
		let l_end_add;
		let l_end_node_id;
		if (a_shape_graph["paths"][c_shape_id][a_shape_graph["paths"][c_shape_id].length - 1]["direction"] === 1) {
			const c_link_id = a_shape_graph["paths"][c_shape_id][a_shape_graph["paths"][c_shape_id].length - 1]["link_id"];
			l_end_node_id = "shape_" + a_shape_graph["links"][c_link_id]["end"];
		} else if (a_shape_graph["paths"][c_shape_id][a_shape_graph["paths"][c_shape_id].length - 1]["direction"] === -1) {
			const c_link_id = a_shape_graph["paths"][c_shape_id][a_shape_graph["paths"][c_shape_id].length - 1]["link_id"];
			l_end_node_id = "shape_" + a_shape_graph["links"][c_link_id]["start"];
		}
		for (const c_next_node_id in a_rdcl_graph["nodes"][l_end_node_id]["next"]) {
			if (c_next_node_id !== c_rdcl_node_orders[c_shape_id][c_rdcl_node_orders[c_shape_id].length - 1]) {
				l_end_add = c_next_node_id;
			}
		}
		if (l_end_add !== undefined) {
			c_rdcl_node_orders[c_shape_id].push(l_end_add);
		}
		
	}
	//対応するrdclのlinkを記録する
	for (const c_shape_id in c_rdcl_node_orders) {
		for (let i1 = 1; i1 < c_rdcl_node_orders[c_shape_id].length; i1++) {
			const c_link_id_1 = c_rdcl_node_orders[c_shape_id][i1 - 1] + "__" + c_rdcl_node_orders[c_shape_id][i1];
			const c_link_id_2 = c_rdcl_node_orders[c_shape_id][i1] + "__" + c_rdcl_node_orders[c_shape_id][i1 - 1];
			if (a_rdcl_graph["links"][c_link_id_1] !== undefined) {
				a_rdcl_graph["links"][c_link_id_1]["new_shapes"] = true;
			} else if (a_rdcl_graph["links"][c_link_id_2] !== undefined) {
				a_rdcl_graph["links"][c_link_id_2]["new_shapes"] = true;
			} else {
				console.log("新しいshapesに対応するrdclなし" + c_link_id_1);
			}
		}
	}
	return c_rdcl_node_orders;
}




busmapjs.f_search_next_node = function(a_index_distance, a_previous_point, a_nodes, a1, a_start_node_id) {
	const c_loop = 800;
	//距離a1の点から、次の距離a1+1の点を探す
	a_index_distance[a1 + 1] = {};
	let l_exist = false;
	for (const c_node_id in a_index_distance[a1]) {
		if (a1 !== 0 && a_nodes[c_node_id]["end"] === true) {
			continue;
		}
		for (const c_next_node_id in a_nodes[c_node_id]["next"]) {
			if (a_previous_point[c_next_node_id] === undefined) {
				l_exist = true;
				a_previous_point[c_next_node_id] = c_node_id;
				a_index_distance[a1 + 1][c_next_node_id] = {};
			}
			if (c_next_node_id === a_start_node_id) {
				return;
			}
		}
	}
	if (l_exist === false) {
		console.log("ない" + String(a1));
		return;
	}
	if (a1 > c_loop) {//無限ループ防止のため制限
		console.log(String(c_loop) + "回");
		return;
	}
	busmapjs.f_search_next_node(a_index_distance, a_previous_point, a_nodes, a1 + 1, a_start_node_id);
}





busmapjs.create_svg_g_rdcl_graph = function(a_rdcl_graph, a_shape_graph) {
	const c_scale = 1024;
	//SVG出力
	//端を探す
	const c_xy = {"top": Number.MAX_SAFE_INTEGER, "bottom": 0, "left": Number.MAX_SAFE_INTEGER, "right": 0};
	for (const c_node_id in a_rdcl_graph["nodes"]) {
		if (a_rdcl_graph["nodes"][c_node_id]["rdcl"] === false) {
			continue;
		}
		if (Math.floor(a_rdcl_graph["nodes"][c_node_id]["x"]) < c_xy["left"]) {
			c_xy["left"] = Math.floor(a_rdcl_graph["nodes"][c_node_id]["x"]);
		}
		if (Math.ceil(a_rdcl_graph["nodes"][c_node_id]["x"]) > c_xy["right"]) {
			c_xy["right"] = Math.ceil(a_rdcl_graph["nodes"][c_node_id]["x"]);
		}
		if (Math.floor(a_rdcl_graph["nodes"][c_node_id]["y"]) < c_xy["top"]) {
			c_xy["top"] = Math.floor(a_rdcl_graph["nodes"][c_node_id]["y"]);
		}
		if (Math.ceil(a_rdcl_graph["nodes"][c_node_id]["y"]) > c_xy["bottom"]) {
			c_xy["bottom"] = Math.ceil(a_rdcl_graph["nodes"][c_node_id]["y"]);
		}
	}
	c_xy["width"] = c_xy["right"] - c_xy["left"];
	c_xy["height"] = c_xy["bottom"] - c_xy["top"];
	
	let l_svg_text = "";
	//shapesの点
	l_svg_text += "<g>";
	for (const c_node_id in a_rdcl_graph["nodes"]) {
		if (a_rdcl_graph["nodes"][c_node_id]["end"] !== true) {
			continue;
		}
		if (isNaN(a_rdcl_graph["nodes"][c_node_id]["x"]) || isNaN(a_rdcl_graph["nodes"][c_node_id]["y"])) {
			console.log(a_rdcl_graph["nodes"][c_node_id]);
		}
		l_svg_text += "<circle cx=\"" + String((a_rdcl_graph["nodes"][c_node_id]["x"] - c_xy["left"]) *  c_scale) + "\" cy=\"" + String((a_rdcl_graph["nodes"][c_node_id]["y"] - c_xy["top"]) * c_scale) + "\" r=\"2\" stroke=\"#ff0000\" stroke-width=\"1\" fill=\"none\"/>";
	}
	l_svg_text += "</g>";
	//rdclの点
	l_svg_text += "<g>";
	for (const c_link_id in a_rdcl_graph["links"]) {
		if (a_rdcl_graph["links"][c_link_id]["new_shapes"] !== true) {
			continue;
		}
		const c_start_node_id = a_rdcl_graph["links"][c_link_id]["start"];
		const c_end_node_id = a_rdcl_graph["links"][c_link_id]["end"];
		l_svg_text += "<circle cx=\"" + String((a_rdcl_graph["nodes"][c_start_node_id]["x"] - c_xy["left"]) *  c_scale) + "\" cy=\"" + String((a_rdcl_graph["nodes"][c_start_node_id]["y"] - c_xy["top"]) * c_scale) + "\" r=\"2\" stroke=\"#000000\" stroke-width=\"1\" fill=\"none\"/>";
		l_svg_text += "<circle cx=\"" + String((a_rdcl_graph["nodes"][c_end_node_id]["x"] - c_xy["left"]) *  c_scale) + "\" cy=\"" + String((a_rdcl_graph["nodes"][c_end_node_id]["y"] - c_xy["top"]) * c_scale) + "\" r=\"2\" stroke=\"#000000\" stroke-width=\"1\" fill=\"none\"/>";
	}
	l_svg_text += "</g>";
	//対応線
	l_svg_text += "<g>";
	for (const c_node_id in a_rdcl_graph["nodes"]) {
		if (a_rdcl_graph["nodes"][c_node_id]["end"] !== true) {
			continue;
		}
		for (const c_next_node_id in a_rdcl_graph["nodes"][c_node_id]["next"]) {
			if (isNaN(a_rdcl_graph["nodes"][c_next_node_id]["x"]) || isNaN(a_rdcl_graph["nodes"][c_next_node_id]["y"])) {
				console.log(a_rdcl_graph["nodes"][c_next_node_id]);
			}
			l_svg_text += "<line onclick=\"navigator.clipboard.writeText('" + a_rdcl_graph["nodes"][c_node_id]["next_rdcl_id"] + "'); console.log('" + a_rdcl_graph["nodes"][c_node_id]["next_rdcl_id"] + "')\" x1=\"" + String((a_rdcl_graph["nodes"][c_node_id]["x"] - c_xy["left"]) * c_scale) + "\" y1=\"" + String((a_rdcl_graph["nodes"][c_node_id]["y"] - c_xy["top"]) * c_scale) + "\" x2=\"" + String((a_rdcl_graph["nodes"][c_next_node_id]["x"] - c_xy["left"]) * c_scale) + "\" y2=\"" + String((a_rdcl_graph["nodes"][c_next_node_id]["y"] - c_xy["top"]) * c_scale) + "\" stroke=\"#00ff00\" stroke-width=\"2\"/>";
		}
	}
	l_svg_text += "</g>";
	//元のshapes
	l_svg_text += "<g>";
	for (const c_link_id in a_shape_graph["links"]) {
		const c_start_node_id = a_shape_graph["links"][c_link_id]["start"];
		const c_end_node_id = a_shape_graph["links"][c_link_id]["end"];
		l_svg_text += "<line x1=\"" + String((a_shape_graph["nodes"][c_start_node_id]["x"] - c_xy["left"]) * c_scale) + "\" y1=\"" + String((a_shape_graph["nodes"][c_start_node_id]["y"] - c_xy["top"]) * c_scale) + "\" x2=\"" + String((a_shape_graph["nodes"][c_end_node_id]["x"] - c_xy["left"]) * c_scale) + "\" y2=\"" + String((a_shape_graph["nodes"][c_end_node_id]["y"] - c_xy["top"]) * c_scale) + "\" stroke=\"#ff0000\" stroke-width=\"1\"/>";
	}
	l_svg_text += "</g>";
	//rdcl
	l_svg_text += "<g>";
	for (const c_link_id in a_rdcl_graph["links"]) {
		if (a_rdcl_graph["links"][c_link_id]["new_shapes"] !== true) {
			const c_start_node_id = a_rdcl_graph["links"][c_link_id]["start"];
			const c_end_node_id = a_rdcl_graph["links"][c_link_id]["end"];
			l_svg_text += "<line onclick=\"navigator.clipboard.writeText('" + c_link_id + "'); console.log('" + c_link_id + "')\" x1=\"" + String((a_rdcl_graph["nodes"][c_start_node_id]["x"] - c_xy["left"]) * c_scale) + "\" y1=\"" + String((a_rdcl_graph["nodes"][c_start_node_id]["y"] - c_xy["top"]) * c_scale) + "\" x2=\"" + String((a_rdcl_graph["nodes"][c_end_node_id]["x"] - c_xy["left"]) * c_scale) + "\" y2=\"" + String((a_rdcl_graph["nodes"][c_end_node_id]["y"] - c_xy["top"]) * c_scale) + "\" stroke=\"#00ffff\" stroke-width=\"2\"/>";
		}
	}
	l_svg_text += "</g>";
	//新しいshapes
	l_svg_text += "<g>";
	for (const c_link_id in a_rdcl_graph["links"]) {
		if (a_rdcl_graph["links"][c_link_id]["new_shapes"] === true) {
			const c_start_node_id = a_rdcl_graph["links"][c_link_id]["start"];
			const c_end_node_id = a_rdcl_graph["links"][c_link_id]["end"];
			l_svg_text += "<line onclick=\"navigator.clipboard.writeText('" + c_link_id + "'); console.log('" + c_link_id + "')\" x1=\"" + String((a_rdcl_graph["nodes"][c_start_node_id]["x"] - c_xy["left"]) * c_scale) + "\" y1=\"" + String((a_rdcl_graph["nodes"][c_start_node_id]["y"] - c_xy["top"]) * c_scale) + "\" x2=\"" + String((a_rdcl_graph["nodes"][c_end_node_id]["x"] - c_xy["left"]) * c_scale) + "\" y2=\"" + String((a_rdcl_graph["nodes"][c_end_node_id]["y"] - c_xy["top"]) * c_scale) + "\" stroke=\"#000000\" stroke-width=\"2\"/>";
		}

	}
	l_svg_text += "</g>";
	
	l_svg_text = "<svg width=\"" + String(c_xy["width"] * c_scale) + "\" height=\"" + String(c_xy["height"] * c_scale) + "\" viewBox=\"0 0 " + String(c_xy["width"] * c_scale) + " " + String(c_xy["height"] * c_scale) + "\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"1.1\">" + l_svg_text + "</svg>";
	return l_svg_text;
}


//CSV作成
busmapjs.rdcl_node_orders_to_shapes = function(a_rdcl_node_orders, a_rdcl_graph) {
	let l_csv_shapes = "";
	l_csv_shapes += "shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence";
	for (const c_shape_id in a_rdcl_node_orders) {
		let l_shape_id = c_shape_id;
		//"をエスケープし、カンマと"があれば"で囲む
		if (l_shape_id.indexOf("\"") !== -1 || l_shape_id.indexOf(",") !== -1) { //どちらかある
			_shape_id.replace(/"/g, "\"\"");
			l_shape_id = "\"" + l_shape_id + "\"";
		}
		for (let i1 = 0; i1 < a_rdcl_node_orders[c_shape_id].length; i1++) {
			const c_lat = String(a_rdcl_graph["nodes"][a_rdcl_node_orders[c_shape_id][i1]]["lat"]);
			const c_lon = String(a_rdcl_graph["nodes"][a_rdcl_node_orders[c_shape_id][i1]]["lon"]);
			l_csv_shapes += "\r\n" + l_shape_id + "," + c_lat + "," + c_lon + "," + String(i1 + 1);
		}
	}
	return l_csv_shapes;
}

//FileオブジェクトをArrayBufferに変換
//Promiseを使用しているため、使用時はasync/awaitをつける
busmapjs.file_to_array_buffer = function (a_file) {
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



//路線時刻表作成
busmapjs.make_route_timetable = async function(a_file) { //GTFSのFileオブジェクトを入力
	const c_array_buffer = await busmapjs.file_to_array_buffer(a_file);
	const c_Uint8Array = new Uint8Array(c_array_buffer);
	const c_text_files = busmapjs.zip_to_text_files(c_Uint8Array);
	const c_gtfs = {};
	for (const c_file_name in c_text_files) {
		c_gtfs[c_file_name.replace(".txt", "")] = busmapjs.csv_to_json(c_text_files[c_file_name]);
	}
	busmapjs.number_lat_lon_sequence_of_gtfs(c_gtfs); // 緯度経度と順番を数値型に変換
	busmapjs.color_gtfs(c_gtfs);
	busmapjs.set_stop_type(c_gtfs);
	const c_bmd = busmapjs.create_bmd_from_gtfs(c_gtfs);
	//indexを作成
	const c_index = {"ur_stops": {}, "parent_stations": {}};
	for (const c_stop of c_bmd["ur_stops"]) {
		c_index["ur_stops"][c_stop["stop_id"]] = c_stop;
	}
	for (const c_stop of c_bmd["parent_stations"]) {
		c_index["parent_stations"][c_stop["stop_id"]] = c_stop;
	}
	//ur_routeに仮の名称を付ける
	for (const c_ur_route of c_bmd["ur_routes"]) {
		let l_trip_headsign;
		for (const c_trip of c_bmd["trips"]) {
			if (c_trip["ur_route_id"] === c_ur_route["ur_route_id"]) {
				l_trip_headsign = c_trip["trip_headsign"];
				break;
			}
		}
		c_ur_route["temp_name"] = c_index["ur_stops"][c_ur_route["stop_array"][0]["stop_id"]]["parent_station"] + "→" + l_trip_headsign;
	}
	const c_walk_array = [];
	for (const c_ur_route of c_bmd["ur_routes"]) {
		if (c_ur_route["route_id"] !== "四御神線_A") {
			//continue;
		}
		const c_node_array = [];
		for (const c_stop of c_ur_route["stop_array"]) {
			c_node_array.push(c_index["ur_stops"][c_stop["stop_id"]]["parent_station"]);
		}
		c_walk_array.push({"node_array": c_node_array, "temp_name": c_ur_route["temp_name"]});
	}
	console.log("ソート前");
	console.log(c_bmd);
	const c_stop_array = busmapjs.sort_nodes(c_walk_array);
	console.log("ソート後");

	//以下コピー
	const c_stop_array_index/*: {
		[key: string]: number; //節点idとそれが何番目か
	}*/ = {};
	for (let i1 = 0; i1 < c_stop_array.length; i1++) {
		c_stop_array_index[c_stop_array[i1]] = i1;
	}


	const c_stop_patterns/*: number[][]*/ = [];
	for (let i1 = 0; i1 < c_walk_array.length; i1++) {
		c_stop_patterns.push([]);
		for (let i2 = 0; i2 < c_stop_array.length; i2++) {
			c_stop_patterns[i1].push(""); //初期化
		}
		
		const c_number_array/*: number[]*/ = []; //何番目の停留所か
		for (let i2 = 0; i2 < c_walk_array[i1]["node_array"].length; i2++) {
			c_number_array.push(c_stop_array_index[c_walk_array[i1]["node_array"][i2]]);
		}
		
		let l_count = 0; //左側の余白数
		for (let i2 = 0; i2 < c_number_array.length; i2++) {
			for (let i3 = 0; i3 < l_count; i3++) {
				c_stop_patterns[i1][c_number_array[i2]] += "　";
			}
			
			if (i2 === 0) {
				if (c_number_array[i2] < c_number_array[i2 + 1]) {
					c_stop_patterns[i1][c_number_array[i2]] += "▽";
				} else {
					c_stop_patterns[i1][c_number_array[i2]] += "△";
				}
			} else if (i2 === c_number_array.length - 1) {
				if (c_number_array[i2 - 1] < c_number_array[i2]) {
					c_stop_patterns[i1][c_number_array[i2]] += "▽";
				} else {
					c_stop_patterns[i1][c_number_array[i2]] += "△";
				}
			} else {
				if (c_number_array[i2 - 1] < c_number_array[i2] && c_number_array[i2] < c_number_array[i2 + 1]) {
					c_stop_patterns[i1][c_number_array[i2]] += "▼";
				} else if (c_number_array[i2 - 1] > c_number_array[i2] && c_number_array[i2] > c_number_array[i2 + 1]) {
					c_stop_patterns[i1][c_number_array[i2]] += "▲";
				} else if (c_number_array[i2 - 1] < c_number_array[i2] && c_number_array[i2] > c_number_array[i2 + 1]) {
					c_stop_patterns[i1][c_number_array[i2]] += "▼▲";
					l_count += 1;
				} else if (c_number_array[i2 - 1] > c_number_array[i2] && c_number_array[i2] < c_number_array[i2 + 1]) {
					c_stop_patterns[i1][c_number_array[i2]] += "▲▼";
					l_count += 1;
				}
			}
		}
	}

	console.log(-1 < null);
	console.log(0 < null);
	console.log(1 < null);
	console.log(-2 < null);

	console.log(c_stop_patterns);

	let l_table/*: string*/ = "";
	for (let i1 = 0; i1 < c_stop_array.length; i1 ++) {
		l_table += "<tr><td>" + c_stop_array[i1] + "</td>";
		for (let i2 = 0; i2 < c_stop_patterns.length; i2++) {
			l_table += "<td>" + c_stop_patterns[i2][i1] + "</td>";
		}
		l_table += "</tr>";
	}
	document.getElementById("div2").innerHTML += "<table border=\"1\"><tbody>" + l_table + "</tbody></table>";



	const c_svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	c_svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
	c_svg.setAttribute("version", "1.1");
	c_svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
	c_svg.setAttribute("width", "256");
	c_svg.setAttribute("height", "256");
	c_svg.setAttribute("viewBox", "0 -16 256 256");
	document.getElementById("div2").appendChild(c_svg);


	const c_g_polyline = document.createElementNS("http://www.w3.org/2000/svg", "g");
	c_svg.appendChild(c_g_polyline);
	const c_g_marker = document.createElementNS("http://www.w3.org/2000/svg", "g");
	c_svg.appendChild(c_g_marker);

	let l_left/*: number*/ = 0;
	for (let i1 = 0; i1 < c_walk_array.length; i1++) {
		l_left += 1;
		const c_number_array/*: number[]*/ = []; //何番目の停留所か
		for (let i2 = 0; i2 < c_walk_array[i1]["node_array"].length; i2++) {
			c_number_array.push(c_stop_array_index[c_walk_array[i1]["node_array"][i2]]);
		}
		
		const c_polyline = document.createElementNS("http://www.w3.org/2000/svg", "path");
		c_g_polyline.appendChild(c_polyline);
		c_polyline.setAttribute("stroke-width", "4");
		c_polyline.setAttribute("stroke", "#808080");
		c_polyline.setAttribute("fill", "none");
		let l_d/*: string*/ = "";
		
		for (let i2 = 0; i2 < c_number_array.length; i2++) {
			let l_end/*: boolean*/ = false; //端のときtrue
			let l_rotate/*: boolean*/ = null; //180度回転（上向き）のときtrue
			let l_two/*: boolean*/ = false; //2つめがあるときtrue
			if (i2 === 0) {
				l_end = true;
				if (c_number_array[i2] < c_number_array[i2 + 1]) {
					l_rotate = false;
				} else {
					l_rotate = true;
				}
			} else if (i2 === c_number_array.length - 1) {
				l_end = true;
				if (c_number_array[i2 - 1] < c_number_array[i2]) {
					l_rotate = false;
				} else {
					l_rotate = true;
				}
			} else {
				if (c_number_array[i2 - 1] < c_number_array[i2] && c_number_array[i2] < c_number_array[i2 + 1]) {
					l_rotate = false;
				} else if (c_number_array[i2 - 1] > c_number_array[i2] && c_number_array[i2] > c_number_array[i2 + 1]) {
					l_rotate = true;
				} else if (c_number_array[i2 - 1] < c_number_array[i2] && c_number_array[i2] > c_number_array[i2 + 1]) {
					l_rotate = false;
					l_two = true;
				} else if (c_number_array[i2 - 1] > c_number_array[i2] && c_number_array[i2] < c_number_array[i2 + 1]) {
					l_rotate = true;
					l_two = true;
				}
			}
			
			const c_first = document.createElementNS("http://www.w3.org/2000/svg", "path");
			c_g_marker.appendChild(c_first);
			c_first.setAttribute("stroke-width", "2");
			c_first.setAttribute("stroke", "#000000");
			if (l_end === true) {
				c_first.setAttribute("fill", "#FFFFFF");
			}
			c_first.setAttribute("d", "M0,4 L4,-4 L-4,-4 Z");
			let l_translate/*: string*/ = "translate(" + String(l_left * 20) + "," + String(c_number_array[i2] * 20) + ")";
			if (l_rotate === true) {
				l_translate += " rotate(180)";
			}
			c_first.setAttribute("transform", l_translate);
			
			if (i2 === 0) {
				l_d += "M";
			} else {
				l_d += "L";
			}
			l_d += String(l_left * 20) + "," + String(c_number_array[i2] * 20) + " ";
			
			if (l_two === true) {
				l_left += 1;
				l_d += "L" + String(l_left * 20) + "," + String(c_number_array[i2] * 20) + " ";
				const c_second = document.createElementNS("http://www.w3.org/2000/svg", "path");
				c_g_marker.appendChild(c_second);
				c_second.setAttribute("stroke-width", "2");
				c_second.setAttribute("stroke", "#000000");
				c_second.setAttribute("d", "M0,4 L4,-4 L-4,-4 Z");
				l_translate = "translate(" + String(l_left * 20) + "," + String(c_number_array[i2] * 20) + ")";
				if (l_rotate === false) {
					l_translate += " rotate(180)";
				}
				c_second.setAttribute("transform", l_translate);
			}
		}
		c_polyline.setAttribute("d", l_d);
	}

	for (let i1 = 0; i1 < c_stop_array.length; i1++) {
		const c_text = document.createElementNS("http://www.w3.org/2000/svg", "text");
		c_text.textContent = c_stop_array[i1];
		c_text.setAttribute("x", (l_left + 1) * 20);
		c_text.setAttribute("y", i1 * 20 + 6);
		c_g_marker.appendChild(c_text);
	}



}



//colorが未設定のところを補充する。
busmapjs.color_gtfs = function(a_data) {
	for (let i1 = 0; i1 < a_data["routes"].length; i1++) {
		if ((a_data["routes"][i1]["route_color"] === "") || (a_data["routes"][i1]["route_color"] === undefined)) {
			a_data["routes"][i1]["route_color"] = Math.round((Math.random() * 15)).toString(16) + "F" + Math.round((Math.random() * 15)).toString(16) + "F" + Math.round((Math.random() * 15)).toString(16) + "F"; //本来はFFFFFF
		}
		if ((a_data["routes"][i1]["route_text_color"] === "") || (a_data["routes"][i1]["route_text_color"] === undefined)) {
			a_data["routes"][i1]["route_text_color"] = "000000";
		}
	}
}

//stop_times.txtのpickup_type, drop_off_typeを埋める。
busmapjs.set_stop_type = function(a_data) {
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




busmapjs.create_bmd_from_gtfs = function(a_data_i1) {
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
	if (a_data_i1["shapes"] === undefined) {
		a_data_i1["shapes"] = []; //仮に追加
	}
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
	//shapesがない場合は空の列のままにする
	for (let i2 = 0; i2 < c_bmd_i1["trips"].length; i2++) {
		if (c_bmd_i1["trips"][i2]["shape_id"] === undefined || c_bmd_i1["trips"][i2]["shape_id"] === null || c_bmd_i1["trips"][i2]["shape_id"] === "") {
			continue; //shape_idがない場合は空の列のままにする
		}
		if (c_shape_index["shape_id_" + c_bmd_i1["trips"][i2]["shape_id"]] === undefined) {
			continue; //shape_idはあるが、対応するshapeがない場合は空の列のままにする
		}
		let c_shapes = c_shape_index["shape_id_" + c_bmd_i1["trips"][i2]["shape_id"]];
		//以下、以前の処理
		/*
		if (c_bmd_i1["trips"][i2]["shape_id"] === undefined || c_bmd_i1["trips"][i2]["shape_id"] === "") {
			c_bmd_i1["trips"][i2]["shape_id"] = "shape_id_" + c_bmd_i1["trips"][i2]["route_id"]; // 以前の応急処置
		}
		let c_shapes = c_shape_index["shape_id_" + c_bmd_i1["trips"][i2]["shape_id"]];
		if (c_shapes === undefined) { //見つからない場合の応急処置
			c_shapes = c_shape_index["shape_id_" + c_bmd_i1["trips"][0]["shape_id"]]; //仮
		}
		*/
		for (let i3 = 0; i3 < c_shapes.length; i3++) {
			//同じ点が連続している場合に除去？
			if (i3 !== 0) {
				if (c_bmd_i1["trips"][i2]["shapes"][c_bmd_i1["trips"][i2]["shapes"].length - 1]["shape_pt_lon"] === c_shapes[i3]["shape_pt_lon"] && c_bmd_i1["trips"][i2]["shapes"][c_bmd_i1["trips"][i2]["shapes"].length - 1]["shape_pt_lat"] === c_shapes[i3]["shape_pt_lat"]) {
					continue;
				}
			}
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






//グラフを作り、整列した節点の列をつくる
//節点idの配列を返す
busmapjs.sort_nodes = function(a_walk_array) {
	
	//全ての節点を含むグラフ
	const c_original_graph = {"nodes": {}};
	
	//次数2の節点（始点終点のないもの）を除いたグラフ
	//多重辺はないので問題ない。self-loopは？
	const c_suppressed_graph = {"nodes": {}, "links": {}};
	
	//入力データからc_original_graphをつくる
	for (let i1 = 0; i1 < a_walk_array.length; i1++) {
		for (let i2 = 0; i2 < a_walk_array[i1]["node_array"].length; i2++) {
			const c_node_id = a_walk_array[i1]["node_array"][i2]; //節点id
			if (c_original_graph["nodes"][c_node_id] === undefined) { //まだその節点がないなら
				//節点を追加
				c_original_graph["nodes"][c_node_id] = {
					"next_nodes": {},
					"degree": null
				};
			}
			if (i2 === 0) { //最初
				c_original_graph["nodes"][c_node_id]["next_nodes"]["start"] = "start";
			}
			if (i2 !== 0) { //最初以外
				const c_from_node_id = a_walk_array[i1]["node_array"][i2 - 1]; //前の節点の節点id
				//前の節点を隣接する節点達に追加（重複あり）
				c_original_graph["nodes"][c_node_id]["next_nodes"][c_from_node_id] = c_from_node_id;
			}
			if (i2 !== a_walk_array[i1]["node_array"].length - 1) { //最後以外
				const c_to_node_id = a_walk_array[i1]["node_array"][i2 + 1]; //後の節点の節点id
				//後の節点を隣接する節点達に追加（重複あり）
				c_original_graph["nodes"][c_node_id]["next_nodes"][c_to_node_id] = c_to_node_id; 
			}
			if (i2 === a_walk_array[i1]["node_array"].length - 1) { //最後
				c_original_graph["nodes"][c_node_id]["next_nodes"]["end"] = "end";
			}
		}
	}
	
	//除外しない点を確認（次数が2でないか、始点終点）
	for (const c_node_id in c_original_graph["nodes"]) {
		c_original_graph["nodes"][c_node_id]["suppress"] = true; // 除外するものはtrue
		for (const c_next_node_id in c_original_graph["nodes"][c_node_id]["next_nodes"]) {
			if (c_next_node_id === "start" && c_next_node_id === "end") {
				c_original_graph["nodes"][c_node_id]["suppress"] = false;
			}
		}
		if (Object.keys(c_original_graph["nodes"][c_node_id]["next_nodes"]).length !== 2) {
			c_original_graph["nodes"][c_node_id]["suppress"] = false;
		}
	}
	
	
	//c_walk_array_2を準備
	const c_walk_array_2 = [];
	for (let i1 = 0; i1 < a_walk_array.length; i1++) {
		c_walk_array_2.push({"link_array": []});
	}
	
	//c_suppressed_graphをつくる
	//先に節点を集めておく
	for (const c_node_id in c_original_graph["nodes"]) {
		if (c_original_graph["nodes"][c_node_id]["suppress"] === false) { //除外しない
			c_suppressed_graph["nodes"][c_node_id] = {
				"next_nodes": {},
				"next_links": {}
			};
		}
	}
	
	//辺を追加する
	for (let i1 = 0; i1 < a_walk_array.length; i1++) {
		let l_head_node_id = a_walk_array[i1]["node_array"][0]; //最初の節点id
		let l_node_array_1 = "__"; //節点idを_区切りで順に繋げた文字列
		let l_node_array_2 = "__"; //節点idを_区切りで逆順に繋げた文字列
		//次数2でない節点（端の点、分岐点、始点終点のないもの）で分割してリンクをつくる
		for (let i2 = 0; i2 < a_walk_array[i1]["node_array"].length; i2++) {
			const c_node_id = a_walk_array[i1]["node_array"][i2]; //節点id
			l_node_array_1 = l_node_array_1 + c_node_id + "__";
			l_node_array_2 = "__" + c_node_id + l_node_array_2;
			if (c_original_graph["nodes"][c_node_id]["suppress"] === false && i2 !== 0) { //最初でない残す点
				if (c_suppressed_graph["links"][l_node_array_1] !== undefined) { //正順がある
					c_walk_array_2[i1]["link_array"].push({
						"link_id": l_node_array_1,
						"direction": 1
					});
				} else if (c_suppressed_graph["links"][l_node_array_2] !== undefined) { //逆順がある
					c_walk_array_2[i1]["link_array"].push({
						"link_id": l_node_array_2,
						"direction": -1
					});
				} else {
					c_suppressed_graph["links"][l_node_array_1] = {
						"next_links": {},
						"head_node_id": l_head_node_id,
						"tail_node_id": c_node_id
					};
					c_suppressed_graph["nodes"][l_head_node_id]["next_nodes"][c_node_id] = c_node_id;
					c_suppressed_graph["nodes"][c_node_id]["next_nodes"][l_head_node_id] = l_head_node_id;
					c_suppressed_graph["nodes"][l_head_node_id]["next_links"][l_node_array_1] = l_node_array_1;
					c_suppressed_graph["nodes"][c_node_id]["next_links"][l_node_array_1] = l_node_array_1;
					c_walk_array_2[i1]["link_array"].push({
						"link_id": l_node_array_1,
						"direction": 1
					});
				}
				l_head_node_id = c_node_id;
				l_node_array_1 = "__" + c_node_id + "__";
				l_node_array_2 = "__" + c_node_id + "__";
			}
		}
	}
	
	
	//以下、簡易方式
	
	//next_linksを追加
	for (let i1 = 0; i1 < c_walk_array_2.length; i1++) {
		for (let i2 = 1; i2 <c_walk_array_2[i1]["link_array"].length; i2++) {
			const c_link_id_1 = c_walk_array_2[i1]["link_array"][i2 - 1]["link_id"];
			const c_direction_1 = c_walk_array_2[i1]["link_array"][i2 - 1]["direction"];
			const c_link_id_2 = c_walk_array_2[i1]["link_array"][i2]["link_id"];
			const c_direction_2 = c_walk_array_2[i1]["link_array"][i2]["direction"];
			if (c_suppressed_graph["links"][c_link_id_1]["next_links"][c_link_id_2] === undefined) {
				c_suppressed_graph["links"][c_link_id_1]["next_links"][c_link_id_2] = 0;
			};
			if (c_suppressed_graph["links"][c_link_id_2]["next_links"][c_link_id_1] === undefined) {
				c_suppressed_graph["links"][c_link_id_2]["next_links"][c_link_id_1] = 0;
			};
			c_suppressed_graph["links"][c_link_id_1]["next_links"][c_link_id_2] += c_direction_1 * c_direction_2;
			c_suppressed_graph["links"][c_link_id_2]["next_links"][c_link_id_1] += c_direction_1 * c_direction_2;
		}
	}
	
	//点数順に整列しておく
	const c_score_order = [];
	for (const c_link_id_1 in c_suppressed_graph["links"]) {
		for (const c_link_id_2 in c_suppressed_graph["links"][c_link_id_1]["next_links"]) {
			c_score_order.push({
				"score": c_suppressed_graph["links"][c_link_id_1]["next_links"][c_link_id_2],
				"abs_score": Math.abs(c_suppressed_graph["links"][c_link_id_1]["next_links"][c_link_id_2]),
				"link_id_1": c_link_id_1,
				"link_id_2": c_link_id_2
			});
		}
	}
	busmapjs.sort_array_key(c_score_order, "abs_score");
	
	let l_add_exist = true;
	while (l_add_exist === true) {
		l_add_exist = false;
		for (let i1 = 0; i1 < c_score_order.length; i1++) {
			if (c_score_order[i1]["used"] !== undefined) {
				continue;
			}
			const c_link_id_1 = c_score_order[i1]["link_id_1"];
			const c_link_id_2 = c_score_order[i1]["link_id_2"];
			let l_direction = 1;
			if (c_score_order[i1]["score"] < 0) {
				l_direction = -1;
			}
			if (c_suppressed_graph["links"][c_link_id_1]["direction"] !== undefined && c_suppressed_graph["links"][c_link_id_2]["direction"] === undefined) {
				c_suppressed_graph["links"][c_link_id_2]["direction"] = l_direction * c_suppressed_graph["links"][c_link_id_1]["direction"];
				c_score_order[i1]["used"] = true;
				l_add_exist = true;
				break;
			} else if (c_suppressed_graph["links"][c_link_id_1]["direction"] === undefined && c_suppressed_graph["links"][c_link_id_2]["direction"] !== undefined) {
				c_suppressed_graph["links"][c_link_id_1]["direction"] = l_direction * c_suppressed_graph["links"][c_link_id_2]["direction"];
				c_score_order[i1]["used"] = true;
				l_add_exist = true;
				break;
			} else if (c_suppressed_graph["links"][c_link_id_1]["direction"] !== undefined && c_suppressed_graph["links"][c_link_id_2]["direction"] !== undefined) {
				c_score_order[i1]["used"] = true;
			}
		}
		if (l_add_exist === false) { //directionの追加がない場合
			for (let i1 = 0; i1 < c_score_order.length; i1++) {
				if (c_score_order[i1]["used"] !== undefined) {
					continue;
				}
				const c_link_id_1 = c_score_order[i1]["link_id_1"];
				const c_link_id_2 = c_score_order[i1]["link_id_2"];
				if (c_suppressed_graph["links"][c_link_id_1]["direction"] === undefined) {
					c_suppressed_graph["links"][c_link_id_1]["direction"] = 1;
					l_add_exist = true;
					break;
				}
				if (c_suppressed_graph["links"][c_link_id_2]["direction"] === undefined) {
					c_suppressed_graph["links"][c_link_id_2]["direction"] = 1;
					l_add_exist = true;
					break;
				}
			}
			//追加できるものがない場合、終了
		}
	}
	
	//残りを1で埋める（孤立しているもの）
	for (const c_link_id in c_suppressed_graph["links"]) {
		if (c_suppressed_graph["links"][c_link_id]["direction"] === undefined) {
			c_suppressed_graph["links"][c_link_id]["direction"] = 1;
		}
	}
	
	
	console.log(c_suppressed_graph["links"]);
	
	
	//以上、簡易方式
	
	//以下、完全な方式だが遅い
	/*
	//c_suppressed_graphの辺に適当な順番をつける（順番は向き付けに使う）
	let l_count = 1; //連続した正整数
	for (const c_link_id in c_suppressed_graph["links"]) {
		c_suppressed_graph["links"][c_link_id]["code"] = l_count;
		l_count += 1;
	}
	
	
	const c_acyclic = [];
	//2 ** l_count通りについて、ループの有無を判定し、点数をつける
	for (let i1 = 1; i1 < 2 ** l_count; i1++) {
		if (i1 % 1000 === 0) {
			console.log(String(2 ** l_count) + "中" + String(i1) + "個完了");
		}
		const c_next_nodes = {}; //ここに隣接する節点の節点idを入れていく。
		for (const c_link_id in c_suppressed_graph["links"]) {
			const c_direction = -1 + 2 * (Math.floor(i1 / (2 ** c_suppressed_graph["links"][c_link_id]["code"])) % 2); //向き（-1か1）
			c_suppressed_graph["links"][c_link_id]["direction"] = c_direction;
			const c_head_node_id = c_suppressed_graph["links"][c_link_id]["head_node_id"];
			const c_tail_node_id = c_suppressed_graph["links"][c_link_id]["tail_node_id"];
			if (c_direction === -1) {
				if (c_next_nodes[c_head_node_id] === undefined) {
					c_next_nodes[c_head_node_id] = {
						"next_nodes": {},
						"cyclic": null
					};
				}
				c_next_nodes[c_head_node_id]["next_nodes"][c_tail_node_id] = c_tail_node_id;
			} else if (c_direction === 1) {
				if (c_next_nodes[c_tail_node_id] === undefined) {
					c_next_nodes[c_tail_node_id] = {
						"next_nodes": {},
						"cyclic": null
					};
				}
				c_next_nodes[c_tail_node_id]["next_nodes"][c_head_node_id] = c_head_node_id;
			}
		}
		//巡回の有無を判定
		f_check_cyclic();
		function f_check_cyclic() {
			let l_exist = false;
			for (let i2 in c_next_nodes) {
				if (c_next_nodes[i2]["cyclic"] !== false) {
					let l_next_node_count = Object.keys(c_next_nodes[i2]["next_nodes"]).length;
					for (let i3 in c_next_nodes[i2]["next_nodes"]) {
						if (c_next_nodes[i3] === undefined) {
							l_next_node_count -= 1;
						} else if (c_next_nodes[i3]["cyclic"] === false) {
							l_next_node_count -= 1;
						}
					}
					if (l_next_node_count <= 0) {
						l_exist = true;
						c_next_nodes[i2]["cyclic"] = false;
					}
				}
			}
			if (l_exist === true) {
				f_check_cyclic();
			}
		}
		let l_exist = false; //巡回があればtrue
		for (let i2 in c_next_nodes) {
			if (c_next_nodes[i2]["cyclic"] !== false) {
				l_exist = true; //巡回あり
			}
		}
		if (l_exist === false) { //巡回なし
			//点数をつける
			let l_score = 0; //点数（大きいほどよい）
			for (let i2 = 0; i2 < c_walk_array_2.length; i2++) {
				for (let i3 = 0; i3 < c_walk_array_2[i2]["link_array"].length - 1; i3++) {
					const c_section_1 = c_walk_array_2[i2]["link_array"][i3]["link_id"];
					const c_section_2 = c_walk_array_2[i2]["link_array"][i3 + 1]["link_id"];
					l_score += c_suppressed_graph["links"][c_section_1]["direction"] * c_walk_array_2[i2]["link_array"][i3]["direction"] * c_suppressed_graph["links"][c_section_2]["direction"] * c_walk_array_2[i2]["link_array"][i3 + 1]["direction"];
				}
			}
			
			//記録
			c_acyclic.push({
				"code": i1,
				"score": l_score
			});
		}
	}
	
	console.log(c_acyclic);
	
	
	//最大になる向き付け
	let l_max_score = Number.MIN_SAFE_INTEGER; //最高点
	let l_argmax_score = null; //最高点の向き付け
	for (let i1 = 0; i1 < c_acyclic.length; i1++) {
		if (l_max_score <= c_acyclic[i1]["score"]) {
			l_max_score = c_acyclic[i1]["score"];
			l_argmax_score = c_acyclic[i1]["code"];
		}
	}
	
	//向き付け
	for (const c_link_id in c_suppressed_graph["links"]) {
		c_suppressed_graph["links"][c_link_id]["direction"] = -1 + 2 * (Math.floor(l_argmax_score / (2 ** c_suppressed_graph["links"][c_link_id]["code"])) % 2); //-1か1
	}
	*/
	//以上、完全な遅い方式
	
	const c_link_array = []; //最終的な並べ方
	//トポロジカルソート
	for (const c_link_id_1 in c_suppressed_graph["links"]) {
		f_add(c_link_id_1);
		function f_add(a_link_id) {
			if (c_suppressed_graph["links"][a_link_id]["add"] !== true) {
				c_suppressed_graph["links"][a_link_id]["add"] = true;
				let l_next_node = null;
				if (c_suppressed_graph["links"][a_link_id]["direction"] === 1) {
					l_next_node = c_suppressed_graph["links"][a_link_id]["tail_node_id"];
				} else if (c_suppressed_graph["links"][a_link_id]["direction"] === -1) {
					l_next_node = c_suppressed_graph["links"][a_link_id]["head_node_id"];
				}
				for (const c_link_id_2 in c_suppressed_graph["links"]) {
					if (c_suppressed_graph["links"][c_link_id_2]["head_node_id"] === l_next_node && c_suppressed_graph["links"][c_link_id_2]["direction"] === 1) {
						f_add(c_link_id_2);
					} else if (c_suppressed_graph["links"][c_link_id_2]["tail_node_id"] === l_next_node && c_suppressed_graph["links"][c_link_id_2]["direction"] === -1) {
						f_add(c_link_id_2);
					}
				}
				c_link_array.push({
					"id": a_link_id,
					"direction": -1 * c_suppressed_graph["links"][a_link_id]["direction"]
				});
			}
		}
	}
	
	
	
	console.log(c_link_array);
	
	
	const c_node_array = [];
	
	for (let i1 = 0; i1 < c_link_array.length; i1++) {
		const c_ids = c_link_array[i1]["id"].split("__"); //区切り文字に問題ないか（元の文字列にないか注意）
		const c_direction = c_link_array[i1]["direction"];
		if (c_direction === 1) {
			for (let i2 = 1; i2 < c_ids.length - 1; i2++) {
				let l_head = false; //始点はtrue
				let l_tail = false; //終点はtrue
				let l_delete = false;
				if (i2 === 1) {
					l_head = true;
					l_delete = true; //始点と終点は仮に全部trueにする
				}
				if (i2 === c_ids.length - 2) {
					l_tail = true;
					l_delete = true; //始点と終点は仮に全部trueにする
				}
				c_node_array.push({
					"node_id": c_ids[i2],
					"head": l_head,
					"tail": l_tail,
					"delete": l_delete
				});
			}
		} else if (c_direction === -1) {
			for (let i2 = c_ids.length - 2; i2 >= 1; i2--) {
				let l_head = false; //始点はtrue
				let l_tail = false; //終点はtrue
				let l_delete = false;
				if (i2 === c_ids.length - 2) {
					l_head = true;
					l_delete = true; //始点と終点は仮に全部trueにする
				}
				if (i2 === 1) {
					l_tail = true;
					l_delete = true; //始点と終点は仮に全部trueにする
				}
				c_node_array.push({
					"node_id": c_ids[i2],
					"head": l_head,
					"tail": l_tail,
					"delete": l_delete
				});
			}
		}
	}
	
	//複数ある節点を1つにしぼる
	for (let i1 in c_suppressed_graph["nodes"]) {
		let l_exist = false; //あったらtrue
		for (let i2 = 0; i2 < c_node_array.length; i2++) {
			if (c_node_array[i2]["node_id"] === i1 && c_node_array[i2]["head"] === true) {
				c_node_array[i2]["delete"] = false; //最初に始点にでたときに残す
				l_exist = true;
				break;
			}
		}
		if (l_exist === false) { //始点として出現しない場合
			for (let i2 = c_node_array.length - 1; i2 >= 1; i2--) {
				if (c_node_array[i2]["node_id"] === i1 && c_node_array[i2]["tail"] === true) {
					c_node_array[i2]["delete"] = false; //最後に終点にでたときに残す
					l_exist = true;
					break;
				}
			}
		}
	}
	
	const c_node_array_2 = []; //節点idのみの列
	for (let i1 = 0; i1 < c_node_array.length; i1++) {
		if (c_node_array[i1]["delete"] === false) {
			c_node_array_2.push(c_node_array[i1]["node_id"]);
		}
	}
	
	
	
	
	console.log(c_node_array);
	
	return c_node_array_2;

}