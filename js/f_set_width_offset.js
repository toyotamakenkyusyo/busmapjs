/*
グローバルな変数は
window.busmapjs以下にする
複数あることを想定し、idで区別しておく
window.busmapjs.map1.ur_stops

ズームを変えた時のオフセットは随時計算してグローバルに残す
線のまとめ方などをかえたときは随時計算しなおす→再読み込みを不要にしたい。

頻繁に書き換えるところはデータを分けたい
ズームレベルは実用的には14～16くらいなので、まとめて作ってもよさそう
parent_routeを変えると強調表示は？
ur_routeのwidthの計算からは元のur_routeと分離すべき


*/




export function f_set_width_offset(a_data, a_lonlat_xy, a_settings) {
	//parent_routesをつくる。
	const c_tile_size = 256; //タイルの1辺のピクセル数
	const c_parent_route_id_key = a_settings["parent_route_id"]; //このkeyをidとして統合する。
	const c_parent_routes = [];
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		let l_exist = false;
		//既にそのur_routeがparent_routesにあるか探す。
		for (let i2 = 0; i2 < c_parent_routes.length; i2++) {
			if (c_parent_routes[i2]["parent_route_id"] === a_data["ur_routes"][i1][c_parent_route_id_key]) {
				l_exist = true;
				continue;
			}
		}
		//もし無かったら、ur_routeをparent_routesに加える。
		//route_colorとroute_text_colorははじめのものを流用する。
		if (l_exist === false) {
			c_parent_routes.push({
				"parent_route_id": a_data["ur_routes"][i1][c_parent_route_id_key],
				"route_color": a_data["ur_routes"][i1]["route_color"],
				"route_text_color": a_data["ur_routes"][i1]["route_text_color"],
				"shape_segments": {},
				"child_shape_segments": {}//,
			});
		}
	}
	//a_data["parent_routes"] = c_parent_routes;
	
	
	const c_parent_routes_index = {};
	for (let i1 = 0; i1 < c_parent_routes.length; i1++) {
		c_parent_routes_index[c_parent_routes[i1]["parent_route_id"]] = c_parent_routes[i1];
	}
	
	//(1) parent_routeのchild_shape_segmentでtrip_numberを合計する
	//(2) direction別に各parent_routeのchild_shape_segmentのwidthを求める。
	
	
	//(1) parent_routeのchild_shape_segmentでtrip_numberを合計する。
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		const c_ur_route = a_data["ur_routes"][i1];
		const c_child_shape_segments = c_parent_routes_index[c_ur_route[c_parent_route_id_key]]["child_shape_segments"];
		
		for (let i2 = 0; i2 < c_ur_route["child_shape_segment_array"].length; i2++) {
			const c_id = c_ur_route["child_shape_segment_array"][i2]["id"];
			if (c_child_shape_segments[c_id] === undefined) {
				c_child_shape_segments[c_id] = {
					"id": c_id,
					"trip_number_direction_1": 0,
					"trip_number_direction_-1": 0//,
				};
			}
			if (c_ur_route["child_shape_segment_array"][i2]["direction"] === 1) {
				c_child_shape_segments[c_id]["trip_number_direction_1"] += c_ur_route["trip_number"];
			} else if (c_ur_route["child_shape_segment_array"][i2]["direction"] === -1) {
				c_child_shape_segments[c_id]["trip_number_direction_-1"] += c_ur_route["trip_number"];
			}
		}
	}
	//(2) direction別に各parent_routeのchild_shape_segmentのwidthを求める。
	for (let i1 = 0; i1 < c_parent_routes.length; i1++) {
		for (let i2 in c_parent_routes[i1]["child_shape_segments"]) {
			const c_child_shape_segment = c_parent_routes[i1]["child_shape_segments"][i2];
			c_child_shape_segment["width_direction_1"] = f_trip_number_to_width(c_child_shape_segment["trip_number_direction_1"], a_settings);
			c_child_shape_segment["width_direction_-1"] = f_trip_number_to_width(c_child_shape_segment["trip_number_direction_-1"], a_settings);
			c_child_shape_segment["width"] = f_trip_number_to_width(c_child_shape_segment["trip_number_direction_1"] + c_child_shape_segment["trip_number_direction_-1"], a_settings);
		}
	}
	//各parent_routeにparent_shape_segmentを作る、最大のwidthをまとめる
	for (let i1 = 0; i1 < c_parent_routes.length; i1++) {
		for (let i2 in c_parent_routes[i1]["child_shape_segments"]) {
			const c_parent_shape_segment_id = a_data["child_shape_segments"][c_parent_routes[i1]["child_shape_segments"][i2]["id"]]["parent_id"];
			if (c_parent_routes[i1]["shape_segments"][c_parent_shape_segment_id] === undefined) {
				c_parent_routes[i1]["shape_segments"][c_parent_shape_segment_id] = {
					"width_direction_1": 0,
					"width_direction_-1": 0,
					"width": 0//,
				}
			}
			c_parent_routes[i1]["shape_segments"][c_parent_shape_segment_id]["width_direction_1"] = Math.max(c_parent_routes[i1]["shape_segments"][c_parent_shape_segment_id]["width_direction_1"], c_parent_routes[i1]["child_shape_segments"][i2]["width_direction_1"]);
			c_parent_routes[i1]["shape_segments"][c_parent_shape_segment_id]["width_direction_-1"] = Math.max(c_parent_routes[i1]["shape_segments"][c_parent_shape_segment_id]["width_direction_-1"], c_parent_routes[i1]["child_shape_segments"][i2]["width_direction_-1"]);
			c_parent_routes[i1]["shape_segments"][c_parent_shape_segment_id]["width"] = Math.max(c_parent_routes[i1]["shape_segments"][c_parent_shape_segment_id]["width"], c_parent_routes[i1]["child_shape_segments"][i2]["width"]);
		}
	}
	
	
	
	//parent_shape_segmentでoffsetを求める
	//仮に線の太さの分だけ両側に余白を取るとして計算しておく。
	for (let i1 in a_data["shape_segments"]) {
		let l_op = a_settings["min_width"] * 0.5; //offset_direction_1
		let l_om = a_settings["min_width"] * 0.5; //offset_direction_-1
		let l_o = a_settings["min_width"] * 0.5; //offset
		let l_wp = 0; //width_direction_1
		let l_wm = 0; //width_direction_-1
		let l_w = 0; //width
		for (let i2 = 0; i2 < c_parent_routes.length; i2++) {
			if (c_parent_routes[i2]["shape_segments"][i1] === undefined) {
				continue; //通るur_routeがない
			}
			l_op = l_op + l_wp * 0.5 + a_settings["min_space_width"] + c_parent_routes[i2]["shape_segments"][i1]["width_direction_1"] * 0.5;
			l_om = l_om + l_wm * 0.5 + a_settings["min_space_width"] + c_parent_routes[i2]["shape_segments"][i1]["width_direction_-1"] * 0.5;
			l_o = l_o + l_w * 0.5 + a_settings["min_space_width"] + c_parent_routes[i2]["shape_segments"][i1]["width"] * 0.5;
			c_parent_routes[i2]["shape_segments"][i1]["offset_direction_1"] = l_op;
			c_parent_routes[i2]["shape_segments"][i1]["offset_direction_-1"] = l_om;
			c_parent_routes[i2]["shape_segments"][i1]["offset"] = l_o;
			l_wp = c_parent_routes[i2]["shape_segments"][i1]["width_direction_1"];
			l_wm = c_parent_routes[i2]["shape_segments"][i1]["width_direction_-1"];
			l_w = c_parent_routes[i2]["shape_segments"][i1]["width"];
		}
	}
	
	
	
	//widthとoffsetをur_routeに移す
	const c_ur_route_child_shape_segment_arrays = [];
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		c_ur_route_child_shape_segment_arrays.push([]);
		for (let i2 = 0; i2 < a_data["ur_routes"][i1]["child_shape_segment_array"].length; i2++) {
			const c_id = a_data["ur_routes"][i1]["child_shape_segment_array"][i2]["id"];
			const c_parent_id = a_data["child_shape_segments"][c_id]["parent_id"];
			const c_direction = a_data["ur_routes"][i1]["child_shape_segment_array"][i2]["direction"];
			const c_child_shape_segment = c_parent_routes_index[a_data["ur_routes"][i1][c_parent_route_id_key]]["child_shape_segments"][c_id];
			const c_shape_segment = c_parent_routes_index[a_data["ur_routes"][i1][c_parent_route_id_key]]["shape_segments"][c_parent_id];
			let l_width;
			let l_offset;
			if (a_settings["direction"] === true) {
				if (c_direction === 1) {
					l_width = c_child_shape_segment["width_direction_1"];
					l_offset = c_shape_segment["offset_direction_1"];
				} else if (c_direction === -1) {
					l_width = c_child_shape_segment["width_direction_-1"];
					l_offset = c_shape_segment["offset_direction_-1"];
				}
			} else {
				if (c_direction === 1) {
					l_width = c_child_shape_segment["width"];
					l_offset = c_shape_segment["offset"];
				} else if (c_direction === -1) {
					l_width = c_child_shape_segment["width"];
					l_offset = c_shape_segment["offset"] * (-1);
				}
			}
			c_ur_route_child_shape_segment_arrays[i1].push({
				"id": c_id,
				"direction": c_direction,
				"w": l_width / c_tile_size, //仮
				"z": l_offset / c_tile_size//, //仮
			});
		}
	}
	
	//整理
	for (let i1 = 0; i1 < c_ur_route_child_shape_segment_arrays.length; i1++) {
		for (let i2 = 0; i2 < c_ur_route_child_shape_segment_arrays[i1].length; i2++) {
			const c_child_shape_segment = a_data["child_shape_segments"][c_ur_route_child_shape_segment_arrays[i1][i2]["id"]];
			let l_sid;
			let l_eid;
			if (c_ur_route_child_shape_segment_arrays[i1][i2]["direction"] === 1) {
				l_sid = c_child_shape_segment["sid"];
				l_eid = c_child_shape_segment["eid"];
			} else if (c_ur_route_child_shape_segment_arrays[i1][i2]["direction"] === -1) {
				l_sid = c_child_shape_segment["eid"];
				l_eid = c_child_shape_segment["sid"];
			}
			const c_s_shape_point = a_data["shape_points"][l_sid];
			const c_e_shape_point = a_data["shape_points"][l_eid];
			const c_zoom_level = 16; //仮
			c_ur_route_child_shape_segment_arrays[i1][i2]["sid"] = l_sid;
			c_ur_route_child_shape_segment_arrays[i1][i2]["eid"] = l_eid;
			c_ur_route_child_shape_segment_arrays[i1][i2]["sids"] = [l_sid];
			c_ur_route_child_shape_segment_arrays[i1][i2]["eids"] = [l_eid];
			c_ur_route_child_shape_segment_arrays[i1][i2]["sx"] = a_lonlat_xy(c_s_shape_point["lon"], "lon_to_x", c_zoom_level);
			c_ur_route_child_shape_segment_arrays[i1][i2]["sy"] = a_lonlat_xy(c_s_shape_point["lat"], "lat_to_y", c_zoom_level);
			c_ur_route_child_shape_segment_arrays[i1][i2]["ex"] = a_lonlat_xy(c_e_shape_point["lon"], "lon_to_x", c_zoom_level);
			c_ur_route_child_shape_segment_arrays[i1][i2]["ey"] = a_lonlat_xy(c_e_shape_point["lat"], "lat_to_y", c_zoom_level);
			c_ur_route_child_shape_segment_arrays[i1][i2]["s_stop"] = c_s_shape_point["stops_exist"];
			c_ur_route_child_shape_segment_arrays[i1][i2]["e_stop"] = c_e_shape_point["stops_exist"];
			c_ur_route_child_shape_segment_arrays[i1][i2]["sm"] = c_s_shape_point["original"];
			c_ur_route_child_shape_segment_arrays[i1][i2]["em"] = c_e_shape_point["original"];
		}
	}
	
	
	//仮に戻す
	a_data["ur_route_child_shape_segment_arrays"] = c_ur_route_child_shape_segment_arrays;
	a_data["parent_routes"] = c_parent_routes;

	
	
	
	//trip_numberをwidthに変換する関数。
	function f_trip_number_to_width(a_trip_number, a_settings) {
		const c_min_width = a_settings["min_width"]; //2pxか3pxくらい
		const c_max_width = a_settings["max_width"];
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
	
	
}

