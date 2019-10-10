//元データの段階では、ur_stopsのみ、parent_stationのみ、両方の3択
//基本はur_stopsのみでparent_stationsは平均をとって自動生成
//過去のur_stopsがわからない場合はparent_stationsのみ
//標柱の区別はplatform_codeを用いる（上り・下り、路線等の区分、乗場番号等）
//同名停留所があるときの区別語（地域名、路線名等）をどうするか？distinction_code？

//統合はstop_nameで行う（緯度経度から位置を確認すべきか？）
//親も一応用意する

export function f_make_bmd(a_data) {
	const c_bmd = {"ur_stops": [], "parent_stations": [], "trips": [], "ur_routes": [], "calendar": []};
	//[1]calendar
	for (let i2 = 0; i2 < a_data["calendar"].length; i2++) {
		const c_service = a_data["calendar"][i2];
		c_bmd["calendar"].push({
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
	for (let i2 = 0; i2 < a_data["stops"].length; i2++) {
		const c_stop = a_data["stops"][i2];
		const c_location_type = c_stop["location_type"];
		if (c_location_type === "0" || c_location_type === "" || c_location_type === undefined) {//ur_stop
			c_bmd["ur_stops"].push({
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
	for (let i2 = 0; i2 < c_bmd["ur_stops"].length; i2++) {
		const c_ur_stop = c_bmd["ur_stops"][i2];
		if (c_ur_stop["parent_station"] === "" || c_ur_stop["parent_station"] === undefined) {
			c_ur_stop["parent_station"] = c_ur_stop["stop_name"];//stop_nameで代用する
		}
	}
	//親の一覧を作る
	//親の緯度経度は子達の相加平均とするため、和を計算する
	const c_parent_station_list = {};
	for (let i2 = 0; i2 < c_bmd["ur_stops"].length; i2++) {
		const c_ur_stop = c_bmd["ur_stops"][i2];
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
	for (let i2 = 0; i2 < a_data["stops"].length; i2++) {
		const c_stop = a_data["stops"][i2];
		c_stop_id_index[c_stop["stop_id"]] = a_data["stops"][i2];
	}
	//parent_stationsを作る
	for (let i2 in c_parent_station_list) {
		if (c_stop_id_index[i2] === undefined) {//元データにないとき
			c_bmd["parent_stations"].push({
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
			c_bmd["parent_stations"].push({
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
	if (a_data["stop_times"] === undefined) {
		//stop_index（stop_number）を追加（互換性のため）
		const c_stop_number = {};
		for (let i2 = 0; i2 < c_bmd["ur_stops"].length; i2++) {
			c_stop_number["stop_id_" + c_bmd["ur_stops"][i2]["stop_id"]] = i2;
		}
		for (let i2 = 0; i2 < c_bmd["trips"].length; i2++) {
			for (let i3 = 0; i3 < c_bmd["trips"][i2]["stop_times"].length; i3++) {
				c_bmd["trips"][i2]["stop_times"][i3]["stop_number"] = c_stop_number["stop_id_" + c_bmd["trips"][i2]["stop_times"][i3]["stop_id"]];
			}
		}
		for (let i2 = 0; i2 < c_bmd["ur_routes"].length; i2++) {
			for (let i3 = 0; i3 < c_bmd["ur_routes"][i2]["stop_array"].length; i3++) {
				c_bmd["ur_routes"][i2]["stop_array"][i3]["stop_number"] = c_stop_number["stop_id_" + c_bmd["ur_routes"][i2]["stop_array"][i3]["stop_id"]];
			}
		}
		return c_bmd;
	}
	//[4]trips
	for (let i2 = 0; i2 < a_data["trips"].length; i2++) {
		const c_trip = {"stop_times": [], "shapes": []};
		for (let i3 in a_data["trips"][i2]) {
			c_trip[i3] = a_data["trips"][i2][i3];
		}
		c_bmd["trips"].push(c_trip);
	}
	//stop_timesをtripsにまとめる。
	const c_index = {}; //全体で使う目次
	for (let i2 = 0; i2 < c_bmd["trips"].length; i2++) {
		c_index["trip_id_" + c_bmd["trips"][i2]["trip_id"]] = c_bmd["trips"][i2];
	}
	for (let i2 = 0; i2 < a_data["stop_times"].length; i2++) {
		const c_stop_time = {};
		for (let i3 in a_data["stop_times"][i2]) {
			c_stop_time[i3] = a_data["stop_times"][i2][i3];
		}
		
		if (c_index["trip_id_" + c_stop_time["trip_id"]] === undefined) {
			console.log(c_stop_time["trip_id"]);
console.log(c_stop_time);
console.log(i2);
console.log(a_data["stop_times"]);
			c_index["trip_id_" + c_stop_time["trip_id"]] = {"stop_times": []};
		}
		c_index["trip_id_" + c_stop_time["trip_id"]]["stop_times"].push(c_stop_time);
	}
	//並び替え
	for (let i2 = 0; i2 < c_bmd["trips"].length; i2++) {
		c_bmd["trips"][i2]["stop_times"].sort(function(a1,a2) {
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
	for (let i2 = 0; i2 < a_data["shapes"].length; i2++) {
		c_shape_index["shape_id_" + a_data["shapes"][i2]["shape_id"]] = [];
	}
	for (let i2 = 0; i2 < a_data["shapes"].length; i2++) {
		const c_shape = {};
		for (let i3 in a_data["shapes"][i2]) {
			c_shape[i3] = a_data["shapes"][i2][i3];
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
	for (let i2 = 0; i2 < c_bmd["trips"].length; i2++) {
		const c_shapes = c_shape_index["shape_id_" + c_bmd["trips"][i2]["shape_id"]];
		for (let i3 = 0; i3 < c_shapes.length; i3++) {
			const c_shape = {};
			for (let i4 in c_shapes[i3]) {
				c_shape[i4] = c_shapes[i3][i4];
			}
			c_bmd["trips"][i2]["shapes"].push(c_shape);
		}
	}
	//[5]ur_routes
	//ur_routesをつくる
	const c_route_index = {};
	for (let i2 = 0; i2 < a_data["routes"].length; i2++) {
		c_route_index["route_id_" + a_data["routes"][i2]["route_id"]] = a_data["routes"][i2];
	}
	for (let i2 = 0; i2 < c_bmd["trips"].length; i2++) {
		const c_trip = c_bmd["trips"][i2];
		//既に同じur_routeがあるか探す。
		let l_exist = false; //違うと仮定
		for (let i3 = 0; i3 < c_bmd["ur_routes"].length; i3++) {
			const c_ur_route = c_bmd["ur_routes"][i3];
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
			c_bmd["ur_routes"].push(c_ur_route);
		}
	}
	//並び替え
	const c_route_number = {};
	for (let i2 = 0; i2 < a_data["routes"].length; i2++) {
		c_route_number["route_id_" + a_data["routes"][i2]["route_id"]] = i2;
	}
	c_bmd["ur_routes"].sort(function(a1,a2) {
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
	for (let i2 = 0; i2 < c_bmd["ur_stops"].length; i2++) {
		c_stop_number["stop_id_" + c_bmd["ur_stops"][i2]["stop_id"]] = i2;
	}
	for (let i2 = 0; i2 < c_bmd["trips"].length; i2++) {
		for (let i3 = 0; i3 < c_bmd["trips"][i2]["stop_times"].length; i3++) {
			c_bmd["trips"][i2]["stop_times"][i3]["stop_number"] = c_stop_number["stop_id_" + c_bmd["trips"][i2]["stop_times"][i3]["stop_id"]];
		}
	}
	for (let i2 = 0; i2 < c_bmd["ur_routes"].length; i2++) {
		for (let i3 = 0; i3 < c_bmd["ur_routes"][i2]["stop_array"].length; i3++) {
			c_bmd["ur_routes"][i2]["stop_array"][i3]["stop_number"] = c_stop_number["stop_id_" + c_bmd["ur_routes"][i2]["stop_array"][i3]["stop_id"]];
		}
	}
	return c_bmd;
}