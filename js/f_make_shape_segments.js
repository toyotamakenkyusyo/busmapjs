//他に必要なもの
//lonlat_xy.js


/*
	f_make_shape_points(c_bmd);
	f_set_xy(c_bmd, a_settings["zoom_level"]); //shape_pointsとstopsに座標xyを加える。
	f_make_shape_segments(c_bmd);
	//仮に停止している
	f_delete_point(c_bmd); //余計なshape pointを消す。
	f_make_shape_segments(c_bmd);

	f_cut_shape_segments(c_bmd, a_settings); //3s遅い。高速化困難。ここでshape_pointが増加、stopにnearest_shape_pt_idを追加、shape_pt_arrayに変更あり。
	
	
	f_make_new_shape_pt_array(c_bmd);
	f_make_child_shape_segments(c_bmd);
	f_set_xy_2(c_bmd); //shape_pointsの座標をshape_pt_arrayに移す。1s遅い。
*/








export function f_make_shape_segments(a_data, a_lonlat_xy, a_settings) {
	const c_zoom_level = a_settings["cut_zoom_level"]; //タイル区切りの都合で"m"は不可？
	//点、有向線分、折れ線の3段階構造とし、冗長なデータを持たせない？
	//点
	console.log(a_data);
	const c_shape_points = {};
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		for (let i2 = 0; i2 < a_data["ur_routes"][i1]["shape_pt_array"].length; i2++) {
			const c_lon = a_data["ur_routes"][i1]["shape_pt_array"][i2]["shape_pt_lon"];
			const c_lat = a_data["ur_routes"][i1]["shape_pt_array"][i2]["shape_pt_lat"];
			const c_id = "shape_point_" + c_lon + "_" + c_lat;
			
			if (c_shape_points[c_id] === undefined) {
				c_shape_points[c_id] = {
					"lon": c_lon,
					"lat": c_lat,
					"x": a_lonlat_xy(c_lon, "lon_to_x", c_zoom_level),
					"y": a_lonlat_xy(c_lat, "lat_to_y", c_zoom_level),
					"id": c_id,
					"original": true, //元からあるときtrue
					"stops_exist" : null, //最寄りのur_stopがあるときtrue
					"near_stops": []//, //最寄りのur_stopのstop_id
				};
			}
		}
	}
	//有向線分
	const c_shape_segment_arrays = [];
	const c_shape_segments = {};
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		c_shape_segment_arrays[i1] = [];
		for (let i2 = 0; i2 < a_data["ur_routes"][i1]["shape_pt_array"].length - 1; i2++) {
			const c_s_lon = a_data["ur_routes"][i1]["shape_pt_array"][i2]["shape_pt_lon"];
			const c_s_lat = a_data["ur_routes"][i1]["shape_pt_array"][i2]["shape_pt_lat"];
			const c_sid = "shape_point_" + c_s_lon + "_" + c_s_lat;
			const c_e_lon = a_data["ur_routes"][i1]["shape_pt_array"][i2 + 1]["shape_pt_lon"];
			const c_e_lat = a_data["ur_routes"][i1]["shape_pt_array"][i2 + 1]["shape_pt_lat"];
			const c_eid = "shape_point_" + c_e_lon + "_" + c_e_lat;
			const c_seid = "shape_segment_" + c_sid + "_" + c_eid;
			const c_esid = "shape_segment_" + c_eid + "_" + c_sid;
			if (c_shape_segments[c_seid] !== undefined) { //正向きがある
				c_shape_segment_arrays[i1].push({"id": c_seid, "direction": 1});
			} else if (c_shape_segments[c_esid] !== undefined) { //逆向きがある
				c_shape_segment_arrays[i1].push({"id": c_esid, "direction": -1});
			} else { //どちらもない
				c_shape_segment_arrays[i1].push({"id": c_seid, "direction": 1});
				c_shape_segments[c_seid] = {
					"id": c_seid,
					"sid": c_sid,
					"eid": c_eid,
					"s_original": true, //元からの点
					"e_original": true, //元からの点
					"stops_exist": null, //最寄りのur_stopがあるときtrue
					"near_stops": []//, //最寄りのur_stopのstop_id
				}
			}
		}
	}
	
	//余計な点を除く
	const c_delete_overlap = false; //以下、いまくいかない
	if (c_delete_overlap === true) {
		//一直線上か否かの判定は？
		const c_delete_shape_points = {}; //消す予定のshape point
		const c_delete_shape_segments = {}; //消す予定のshape segment
		for (let i1 = 0; i1 < c_shape_segment_arrays.length; i1++) {
			let l_exist = false; //余計な点があったときtrue、次のsegmentは半分重複するので避けるため
			const c_new_shape_segment_array = [];
			for (let i2 = 0; i2 < c_shape_segment_arrays[i1].length - 1; i2++) {
				if (l_exist === true) { //前に余計な点があったときはとばす
					l_exist = false;
					continue;
				}
				let l_sid;
				let l_mid; //間の点
				let l_eid;
				const c_s1id = c_shape_segment_arrays[i1][i2]["id"]; //1つ目のsegment
				const c_s2id = c_shape_segment_arrays[i1][i2 + 1]["id"]; //2つ目のsegment
				if (c_shape_segment_arrays[i1][i2]["direction"] === 1) {
					l_sid = c_shape_segments[c_shape_segment_arrays[i1][i2]["id"]]["sid"];
					l_mid = c_shape_segments[c_shape_segment_arrays[i1][i2]["id"]]["eid"];
				} else {
					l_sid = c_shape_segments[c_shape_segment_arrays[i1][i2]["id"]]["eid"];
					l_mid = c_shape_segments[c_shape_segment_arrays[i1][i2]["id"]]["sid"];
				}
				if (c_shape_segment_arrays[i1][i2 + 1]["direction"] === 1) {
					l_eid = c_shape_segments[c_shape_segment_arrays[i1][i2]["id"]]["eid"];
				} else {
					l_eid = c_shape_segments[c_shape_segment_arrays[i1][i2]["id"]]["sid"];
				}
				const c_seid = "shape_segment_" + l_sid + "_" + l_eid;
				const c_esid = "shape_segment_" + l_eid + "_" + l_sid;
				if (c_shape_segments[c_seid] !== undefined) { //正向きがある
					c_new_shape_segment_array.push({"id": c_seid, "direction": 1});
					c_delete_shape_points[l_mid] = true;
					c_delete_shape_segments[c_s1id] = true;
					c_delete_shape_segments[c_s2id] = true;
					l_exist = true;
				} else if (c_shape_segments[c_esid] !== undefined) { //逆向きがある
					c_new_shape_segment_array.push({"id": c_esid, "direction": -1});
					c_delete_shape_points[l_mid] = true;
					c_delete_shape_segments[c_s1id] = true;
					c_delete_shape_segments[c_s2id] = true;
					l_exist = true;
				} else { //どちらもない
					c_new_shape_segment_array.push({"id": c_shape_segment_arrays[i1][i2]["id"], "direction": c_shape_segment_arrays[i1][i2]["direction"]});
				}
			}
			c_shape_segment_arrays[i1] = c_new_shape_segment_array;
		}
		//過剰に消される可能性があるので確認する
		for (let i1 = 0; i1 < c_shape_segment_arrays.length; i1++) {
			for (let i2 = 0; i2 < c_shape_segment_arrays[i1].length; i2++) {
				const c_id = c_shape_segment_arrays[i1][i2]["id"];
				if (c_delete_shape_segments[c_id] !== undefined) {
					c_delete_shape_segments[c_id] = false;
				}
			}
		}
		//不要なshape segmentを消去、
		for (let i1 in c_delete_shape_segments) {
			if (c_delete_shape_segments[i1] === true) {
				delete c_shape_segments[i1];
			}
		}
		//過剰に消されないか確認する
		for (let i1 in c_shape_segments) {
			const c_sid = c_shape_segments[i1]["sid"];
			const c_eid = c_shape_segments[i1]["eid"];
			if (c_delete_shape_points[c_sid] !== undefined) {
				c_delete_shape_points[c_sid] = false;
			}
			if (c_delete_shape_points[c_eid] !== undefined) {
				c_delete_shape_points[c_eid] = false;
			}
		}
		//不要なshape pointを消去
		for (let i1 in c_delete_shape_points) {
			if (c_delete_shape_points[i1] === true) {
				delete c_shape_points[i1];
			}
		}
	}
	
	
	//標柱の位置で切断
	//その標柱を通る全てのur_routeに共通する全ての有向線分が候補となる
	//標柱非対応の場合、全てのur_routeが通りうる全ての有向線分を候補とする？
	
	//ur_stopの再整理
	const c_ur_stops = [];
	const c_ur_stops_index = {}; //stop_idでのindex
	for (let i1 = 0; i1 < a_data["ur_stops"].length; i1++) {
		const c_stop_lon = a_data["ur_stops"][i1]["stop_lon"];
		const c_stop_lat = a_data["ur_stops"][i1]["stop_lat"];
		const c_stop_id = a_data["ur_stops"][i1]["stop_id"];
		c_ur_stops.push({
			"stop_id": c_stop_id,
			"stop_lon": c_stop_lon,
			"stop_lat": c_stop_lat,
			"stop_x": a_lonlat_xy(c_stop_lon, "lon_to_x", c_zoom_level),
			"stop_y": a_lonlat_xy(c_stop_lat, "lat_to_y", c_zoom_level)//,
			//"shape_segment_arrays": [], //通るur_routeのshape_segment_arrays
			//"shape_segments_min": {}, //通るur_routeが（全て？）通るshape_segment
			//"shape_segments_max": {}//, //通るur_routeに通るものがあるshape_sgement（機能停止中）
		});
		c_ur_stops_index[c_stop_id] = c_ur_stops[c_ur_stops.length - 1];
	}
	
	//高速化に失敗
	/*
	console.time("これは？");
	
	const c_shape_segments_stops = {};
	for (let i1 = 0; i1 < c_shape_segment_arrays.length; i1++) {
		for (let i2 = 0; i2 < c_shape_segment_arrays[i1].length; i2++) {
			const c_id = c_shape_segment_arrays[i1][i2]["id"];
			if (c_shape_segments_stops[c_id] === undefined) {
				c_shape_segments_stops[c_id] = {"ur_route_numbers": [], "ur_stops": {}};//{};
			}
			c_shape_segments_stops[c_id]["ur_route_numbers"].push(i1);
		}
	}
	for (let i1 in c_shape_segments_stops) {
		for (let i2 = 0; i2 < c_shape_segments_stops[i1]["ur_route_numbers"].length; i2++) {
			const c_number = c_shape_segments_stops[i1]["ur_route_numbers"][i2];
			for (let i3 = 0; i3 < a_data["ur_routes"][c_number]["stop_array"].length; i3++) {
				const c_stop_id = a_data["ur_routes"][c_number]["stop_array"][i3]["stop_id"];
				c_shape_segments_stops[i1]["ur_stops"][c_stop_id] = true;
			}
		}
	}
	console.timeEnd("これは？");
	*/
	
	//c_ur_stopsに通るur_routeのshape_segment_arrayをまとめる
	/*
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		for (let i2 = 0; i2 < a_data["ur_routes"][i1]["stop_array"].length; i2++) {
			const c_stop_id = a_data["ur_routes"][i1]["stop_array"][i2]["stop_id"];
			c_ur_stops_index[c_stop_id]["shape_segment_arrays"].push(c_shape_segment_arrays[i1]);
		}
	}
	*/
	/*
	console.time("ここの");
	//通るshape_segmentをまとめる
	for (let i1 = 0; i1 < c_ur_stops.length; i1++) {
		for (let i2 = 0; i2 < c_ur_stops[i1]["shape_segment_arrays"][0].length; i2++) {
			const c_id = c_ur_stops[i1]["shape_segment_arrays"][0][i2]["id"];
			c_ur_stops[i1]["shape_segments_min"][c_id] = true; //存在しうるときtrue
		}
		for (let i2 = 0; i2 < c_ur_stops[i1]["shape_segment_arrays"].length; i2++) {
			for (let i3 = 0; i3 < c_ur_stops[i1]["shape_segment_arrays"][i2].length; i3++) {
				const c_id = c_ur_stops[i1]["shape_segment_arrays"][i2][i3]["id"];
				c_ur_stops[i1]["shape_segments_max"][c_id] = true; //存在しうるときtrue
			}
		}
		
	}
	console.timeEnd("ここの");
	*/
	
	//c_zoom_levelのタイル番号に分けたshape_segmentsの目次を作る
	const c_shape_segments_index = {};
	for (let i1 in c_shape_segments) {
		const c_sid = c_shape_segments[i1]["sid"];
		const c_eid = c_shape_segments[i1]["eid"];
		const c_x = Math.floor((c_shape_points[c_sid]["x"] + c_shape_points[c_eid]["x"]) * 0.5);
		const c_y = Math.floor((c_shape_points[c_sid]["y"] + c_shape_points[c_eid]["y"]) * 0.5);
		const c_tile = "tile_" + String(c_x) + "_" + String(c_y);
		if (c_shape_segments_index[c_tile] === undefined) {
			c_shape_segments_index[c_tile] = {};
		}
		c_shape_segments_index[c_tile][i1] = c_shape_segments[i1];
	}
	
	//ur_stopの最寄りsegmentを探す
	for (let i1 = 0; i1 <c_ur_stops.length; i1++) {
		let l_nearest_distance = Number.MAX_VALUE; //shape segmentまでの最短の距離
		let l_nearest_shape_segment_id; //最寄のshape segmentのid
		const c_stop_x = c_ur_stops[i1]["stop_x"];
		const c_stop_y = c_ur_stops[i1]["stop_y"];
		const c_tile_x = Math.floor(c_stop_x);
		const c_tile_y = Math.floor(c_stop_y);
		for (let i2 = c_tile_x -1; i2 <= c_tile_x + 1; i2++) {
			for (let i3 = c_tile_y -1; i3 <= c_tile_y + 1; i3++) {
				const c_key = "tile_" + String(i2) + "_" + String(i3);
				if (c_shape_segments_index[c_key] === undefined) {
					continue;
				}
				for (let i4 in c_shape_segments_index[c_key]) {
					//if (c_ur_stops[i1]["shape_segments_min"][i4] !== true) { //仮にmaxのみ判定
					//	continue; //通り得なければとばす
					//}
					const c_sid = c_shape_segments_index[c_key][i4]["sid"];
					const c_eid = c_shape_segments_index[c_key][i4]["eid"];
					const c_sx = c_shape_points[c_sid]["x"];
					const c_sy = c_shape_points[c_sid]["y"];
					const c_ex = c_shape_points[c_eid]["x"];
					const c_ey = c_shape_points[c_eid]["y"];
					const c_distance = f_distance(c_stop_x, c_stop_y, c_sx, c_sy, c_ex, c_ey);
					if (c_distance < l_nearest_distance) {
						l_nearest_distance = c_distance;
						l_nearest_shape_segment_id = i4;
					}
				}
			}
		}
		//ここまでで最寄りsegmentが見つかった
		//もし見つからなかったら？
		if (l_nearest_shape_segment_id === undefined) {
			console.log(String(i1) + "の" + a_data["stops"][i1]["stop_name"] + "は最寄segment未発見、例外処置未完成");
			//例外処置が必要
			continue;
		}
		const c_sid = c_shape_segments[l_nearest_shape_segment_id]["sid"];
		const c_eid = c_shape_segments[l_nearest_shape_segment_id]["eid"];
		const c_sx = c_shape_points[c_sid]["x"];
		const c_sy = c_shape_points[c_sid]["y"];
		const c_ex = c_shape_points[c_eid]["x"];
		const c_ey = c_shape_points[c_eid]["y"];
		const c_px = c_stop_x;
		const c_py = c_stop_y;
		const c_vx = c_ex - c_sx;
		const c_vy = c_ey - c_sy;
		const c_r2 = c_vx * c_vx + c_vy * c_vy;
		const c_tt = c_vx * (c_px - c_sx) + c_vy * (c_py - c_sy);
		if (c_tt <= 0) {
			c_ur_stops[i1]["shape_pt_id"] = c_sid;
			c_ur_stops[i1]["shape_pt_x"] = c_sx;
			c_ur_stops[i1]["shape_pt_y"] = c_sy;
			c_ur_stops[i1]["shape_pt_lon"] = a_lonlat_xy(c_sx, "x_to_lon", c_zoom_level);
			c_ur_stops[i1]["shape_pt_lat"] = a_lonlat_xy(c_sy, "y_to_lat", c_zoom_level);
			c_shape_points[c_sid]["stops_exist"] = true; //標柱の存在
			c_shape_points[c_sid]["near_stops"].push(c_ur_stops[i1]["stop_id"]);
		} else if (c_tt >= c_r2) {
			c_ur_stops[i1]["shape_pt_id"] = c_eid;
			c_ur_stops[i1]["shape_pt_x"] = c_ex;
			c_ur_stops[i1]["shape_pt_y"] = c_ey;
			c_ur_stops[i1]["shape_pt_lon"] = a_lonlat_xy(c_ex, "x_to_lon", c_zoom_level);
			c_ur_stops[i1]["shape_pt_lat"] = a_lonlat_xy(c_ey, "y_to_lat", c_zoom_level);
			c_shape_points[c_eid]["stops_exist"] = true; //標柱の存在
			c_shape_points[c_eid]["near_stops"].push(c_ur_stops[i1]["stop_id"]);
		} else {
			const c_t = c_tt / c_r2;
			const c_x = c_sx + c_t * c_vx;
			const c_y = c_sy + c_t * c_vy;
			const c_nearest_shape_pt_id = l_nearest_shape_segment_id + "_ratio_" + String(c_t); //ur_stopに対応する点のid
			c_ur_stops[i1]["shape_pt_id"] = c_nearest_shape_pt_id; //c_ur_stopsに加える
			c_ur_stops[i1]["shape_pt_x"] = c_x;
			c_ur_stops[i1]["shape_pt_y"] = c_y;
			c_ur_stops[i1]["shape_pt_lon"] = a_lonlat_xy(c_x, "x_to_lon", c_zoom_level);
			c_ur_stops[i1]["shape_pt_lat"] = a_lonlat_xy(c_y, "y_to_lat", c_zoom_level);
			if (c_shape_points[c_nearest_shape_pt_id] === undefined) {
				c_shape_points[c_nearest_shape_pt_id] = {
					"lon": a_lonlat_xy(c_x, "x_to_lon", c_zoom_level),
					"lat": a_lonlat_xy(c_y, "y_to_lat", c_zoom_level),
					"x": c_x,
					"y": c_y,
					"id": c_nearest_shape_pt_id,
					"oroginal": false, //元からあるときtrue
					"stops_exist" : true, //最寄りのur_stopがあるときtrue
					"near_stops": []//, //最寄りのur_stopのstop_id
				};
			}
			c_shape_points[c_nearest_shape_pt_id]["near_stops"].push(c_ur_stops[i1]["stop_id"]); //c_shape_pointsに加える
			//c_shape_segmentsに加える
			c_shape_segments[l_nearest_shape_segment_id]["stops_exist"] = true;
			let l_exist = false;
			for (let i2 = 0; i2 < c_shape_segments[l_nearest_shape_segment_id]["near_stops"].length; i2++) {
				if (c_shape_segments[l_nearest_shape_segment_id]["near_stops"][i2]["id"] === c_nearest_shape_pt_id) {
					l_exist = true;
					break;
				}
			}
			if(l_exist === false) {
				//near_stopsに加える。
				c_shape_segments[l_nearest_shape_segment_id]["near_stops"].push({
					"id": c_nearest_shape_pt_id,
					"ratio": c_t//,
				});
				//ratioの値で並べ替えておく。
				c_shape_segments[l_nearest_shape_segment_id]["near_stops"].sort(function(a1,a2){
					if (a1["ratio"] < a2["ratio"]) {
						return -1;
					}
					if (a1["ratio"] > a2["ratio"]) {
						return 1;
					}
					return 0;
				});
			}
		}
	}
	
	
	
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
	
	
	
	//shape_pt_arrayを再度作る、新しいshape pointを入れる
	const c_child_shape_pt_arrays = [];
	for (let i1 = 0; i1 < c_shape_segment_arrays.length; i1++) {
		c_child_shape_pt_arrays.push([]);
		//最初の1つ
		if (c_shape_segment_arrays[i1][0]["direction"] === 1) {
			c_child_shape_pt_arrays[i1].push(c_shape_segments[c_shape_segment_arrays[i1][0]["id"]]["sid"]);
		} else if (c_shape_segment_arrays[i1][0]["direction"] === -1) {
			c_child_shape_pt_arrays[i1].push(c_shape_segments[c_shape_segment_arrays[i1][0]["id"]]["eid"]);
		}
		//2つめから
		for (let i2 = 0; i2 < c_shape_segment_arrays[i1].length; i2++) {
			const c_shape_segment = c_shape_segments[c_shape_segment_arrays[i1][i2]["id"]];
			if (c_shape_segment_arrays[i1][i2]["direction"] === 1) {
				for (let i3 = 0; i3 < c_shape_segment["near_stops"].length; i3++) {
					c_child_shape_pt_arrays[i1].push(c_shape_segment["near_stops"][i3]["id"]);
				}
				c_child_shape_pt_arrays[i1].push(c_shape_segment["eid"]);
			} else if (c_shape_segment_arrays[i1][i2]["direction"] === -1) {
				for (let i3 =  c_shape_segment["near_stops"].length - 1; i3 >=0; i3--) {
					c_child_shape_pt_arrays[i1].push(c_shape_segment["near_stops"][i3]["id"]);
				}
				c_child_shape_pt_arrays[i1].push(c_shape_segment["sid"]);
			}
		}
	}
	
	//起点終点処理
	
	//場合分け
	//途中にぬけがある
	//最初がない
	//最後がない
	//冗長な場合の短縮は省略するか
	//同じshape pointに異なる標柱があるときどうする？
	
	/*
	//仮に最初と最後以外に途中に抜けがない前提とする
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		const c_number_array = []; //child_shape_pt_arrayからstopがある位置を抽出
		for (let i2 = 0; i2 < c_child_shape_pt_arrays[i1].length; i2++) {
			const c_near_stops = c_shape_points[c_child_shape_pt_arrays[i1][i2]]["near_stops"];
			for (let i3 = 0; i3 < c_near_stops.length; i3++) {
				c_number_array.push({"number": i2, "stop_id": c_near_stops[i3]});
			}
		}
		let l_stop_id;
		let l_number; //今まで探した位置
		let l_count; //何個見つかるか
		let l_add_first = false; //最初を追加
		let l_add_last = false; //最後を追加
		let l_first; //最初の位置、ないときnull
		let l_last; //最後の位置、ないときnull
		//前から探す
		l_number = 0;
		l_count = 0;
		l_first = null;
		for (let i2 = 0; i2 < a_data["ur_routes"][i1]["stop_array"].length; i2++) {
			l_stop_id = a_data["ur_routes"][i1]["stop_array"][i2]["stop_id"];
			for (let i3 = l_number; i3 < c_number_array.length; i3++) {
				if (c_number_array[i3]["stop_id"] === l_stop_id) {
					if (i2 === 0) {
						l_first = c_number_array[i3]["number"];
					}
					l_number = i3;
					l_count += 1;
				}
			}
		}
		//最初があるが、その後の大部分が欠けているとき、最初を別に加える
		if (l_count < c_number_array.length - 5) {
			l_first = null;
		}
		if (l_first === null) {
			l_add_first = true;
			l_first = 0;
		}
		//後から探す
		l_number = c_number_array.length - 1;
		l_count = 0;
		l_last = null;
		for (let i2 = a_data["ur_routes"][i1]["stop_array"].length - 1; i2 >= 0; i2--) {
			l_stop_id = a_data["ur_routes"][i1]["stop_array"][i2]["stop_id"];
			for (let i3 = l_number; i3 >=0; i3--) {
				if (c_number_array[i3]["stop_id"] === l_stop_id) {
					if (i2 === a_data["ur_routes"][i1]["stop_array"].length - 1) {
						l_last = c_number_array[i3]["number"];
					}
					l_number = i3;
					l_count += 1;
				}
			}
		}
		//最後があるが、その前の大部分が欠けているとき、最後を別に加える
		if (l_count < a_data["ur_routes"][i1]["stop_array"].length - 5) {
			l_last = null;
		}
		if (l_last === null) {
			l_add_last = true;
			l_last = c_child_shape_pt_arrays[i1].length - 1;
		}
		//書き換える
		const c_new_array = [];
		let l_check;
		l_check = true;
		if (l_add_first === true) {
			const c_first_stop_id = a_data["ur_routes"][i1]["stop_array"][0]["stop_id"];
			l_check = false;
			for (let i2 in c_shape_points) {
				const c_near_stops = c_shape_points[i2]["near_stops"];
				for (let i3 = 0; i3 < c_near_stops.length; i3++) {
					if (c_near_stops[i3] === c_first_stop_id) {
						c_new_array.push(i2);
						l_check = true;
					}
				}
			}
		}
		if (l_check === false) {
			console.log("最初の追加失敗");
		}
		for (let i2 = l_first; i2 <= l_last; i2++) {
			c_new_array.push(c_child_shape_pt_arrays[i1][i2]);
		}
		l_check = true;
		if (l_add_last === true) {
			const c_last_stop_id = a_data["ur_routes"][i1]["stop_array"][a_data["ur_routes"][i1]["stop_array"].length - 1]["stop_id"];
			l_check = false;
			for (let i2 in c_shape_points) {
				const c_near_stops = c_shape_points[i2]["near_stops"];
				for (let i3 = 0; i3 < c_near_stops.length; i3++) {
					if (c_near_stops[i3] === c_last_stop_id) {
						c_new_array.push(i2);
						l_check = true;
					}
				}
			}
		}
		if (l_check === false) {
			console.log("最後の追加失敗");
		}
		c_child_shape_pt_arrays[i1] = c_new_array;
		
		//console.log(c_child_shape_pt_arrays[i1]);
		
	}
	
	*/
	
	
	
	//child_shape_segmentsを作る
	const c_child_shape_segments = {};
	for (let i1 in c_shape_segments) {
		if (c_shape_segments[i1]["near_stops"].length === 0) {
			const c_sid = c_shape_segments[i1]["sid"];
			const c_eid = c_shape_segments[i1]["eid"];
			const c_id = c_shape_segments[i1]["id"];
			c_child_shape_segments[c_id] = {
				"id": c_id,
				"sid": c_sid,
				"eid": c_eid,
				"parent_id": c_shape_segments[i1]["id"],
				"s_original": true, //元からの点
				"e_original": true, //元からの点
				"stops_exist": null, //最寄りのur_stopがあるときtrue
				"near_stops": null//, //最寄りのur_stopのstop_id
			}
		} else {
			const c_sid_0 = c_shape_segments[i1]["sid"];
			const c_eid_0 = c_shape_segments[i1]["near_stops"][0]["id"];
			const c_id_0 = "shape_segment_" + c_sid_0 + "_" + c_eid_0;
			c_child_shape_segments[c_id_0] = {
				"id": c_id_0,
				"sid": c_sid_0,
				"eid": c_eid_0,
				"parent_id": c_shape_segments[i1]["id"],
				"s_original": true, //元からの点
				"e_original": false, //元からの点
				"stops_exist": null, //最寄りのur_stopがあるときtrue
				"near_stops": null//, //最寄りのur_stopのstop_id
			}
			for (let i2 = 0; i2 < c_shape_segments[i1]["near_stops"].length - 1; i2++) {
				const c_sid_i2 = c_shape_segments[i1]["near_stops"][i2]["id"];
				const c_eid_i2 = c_shape_segments[i1]["near_stops"][i2 + 1]["id"];
				const c_id_i2 = "shape_segment_" + c_sid_i2 + "_" + c_eid_i2;
				c_child_shape_segments[c_id_i2] = {
					"id": c_id_i2,
					"sid": c_sid_i2,
					"eid": c_eid_i2,
					"parent_id": c_shape_segments[i1]["id"],
					"s_original": false, //元からの点
					"e_original": false, //元からの点
					"stops_exist": null, //最寄りのur_stopがあるときtrue
					"near_stops": null//, //最寄りのur_stopのstop_id
				}
			}
			const c_sid_n = c_shape_segments[i1]["near_stops"][c_shape_segments[i1]["near_stops"].length - 1]["id"];
			const c_eid_n = c_shape_segments[i1]["eid"];
			const c_id_n = "shape_segment_" + c_sid_n + "_" + c_eid_n;
			c_child_shape_segments[c_id_n] = {
				"id": c_id_n,
				"sid": c_sid_n,
				"eid": c_eid_n,
				"parent_id": c_shape_segments[i1]["id"],
				"s_original": false, //元からの点
				"e_original": true, //元からの点
				"stops_exist": null, //最寄りのur_stopがあるときtrue
				"near_stops": null//, //最寄りのur_stopのstop_id
			}
		}
	}
	
	//child_shape_segment_arraysを作る
	const c_child_shape_segment_arrays = [];
	for (let i1 = 0; i1 < c_child_shape_pt_arrays.length; i1++) {
		c_child_shape_segment_arrays.push([]);
		for (let i2 = 0; i2 < c_child_shape_pt_arrays[i1].length - 1; i2++) {
			const c_sid = c_child_shape_pt_arrays[i1][i2];
			const c_eid = c_child_shape_pt_arrays[i1][i2 + 1];
			const c_seid = "shape_segment_" + c_sid + "_" + c_eid;
			const c_esid = "shape_segment_" + c_eid + "_" + c_sid;
			if (c_child_shape_segments[c_seid] !== undefined) {
				c_child_shape_segment_arrays[i1].push({
					"id": c_seid,
					"direction": 1//,
				});
			} else if (c_child_shape_segments[c_esid] !== undefined) {
				c_child_shape_segment_arrays[i1].push({
					"id": c_esid,
					"direction": -1//,
				});
			} else {
				console.log("未発見");
				//起点終点処理で追加したものが含まれない
			}
		}
	}
	
	
	
	//child_shape_segment_arraysを作る
	//ここに全情報を詰めこむ？
	
	/*
	
	shape_pt_array
↓
shape_segment_array
↓
↓ズームレベル等指定
↓
オフセット幅計算
↓
オフセット計算




shape_pt_array
↓
shape_segment_array
↓
child_shape_segment_array
↓
↓ズームレベル等指定
↓
オフセット幅計算
↓parent対応
↓
オフセット計算



受け渡し
c_ur_stops→戻す
c_shape_segments
c_child_shape_segments
c_shape_points
c_child_shape_segment_array→戻す
	
	
	*/
	
	console.log(c_shape_segment_arrays);
	
	a_data["shape_segments"] = c_shape_segments;
	a_data["child_shape_segments"] = c_child_shape_segments;
	a_data["shape_points"] = c_shape_points;
	
	//標柱に対応する点の緯度経度を戻しておく
	for (let i1 = 0; i1 < c_ur_stops.length; i1++) {
		a_data["ur_stops"][i1]["shape_pt_lon"] = c_ur_stops[i1]["shape_pt_lon"];
		a_data["ur_stops"][i1]["shape_pt_lat"] = c_ur_stops[i1]["shape_pt_lat"];
	}
	//child_shape_segment_arrayを各ur_routeに入れておく
	for (let i1 = 0; i1 < c_child_shape_segment_arrays.length; i1++) {
		a_data["ur_routes"][i1]["child_shape_segment_array"] = c_child_shape_segment_arrays[i1];
	}
	
	
	
	
	
	
}





//stops_existやs_originalは不要？
//segmentを出力したとき、消していいかを残したい

