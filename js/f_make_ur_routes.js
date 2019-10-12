export function f_make_ur_routes(a_data) {
	//trips、stop_times、routes、shapesが必要
	const c_index = {}; //全体で使う目次
	for (let i1 = 0; i1 < a_data["trips"].length; i1++) {
		c_index["trip_id_" + a_data["trips"][i1]["trip_id"]] = a_data["trips"][i1];
	}
	for (let i1 = 0; i1 < a_data["routes"].length; i1++) {
		c_index["route_id_" + a_data["routes"][i1]["route_id"]] = a_data["routes"][i1];
	}
	for (let i1 = 0; i1 < a_data["routes"].length; i1++) {
		if (typeof a_data["routes"][i1]["route_sort_order"] !== "number") {
			a_data["routes"][i1]["route_sort_order"] = i1;
		}
	}
	
	//stop_timesの整理
	for (let i1 = 0; i1 < a_data["trips"].length; i1++) {
		a_data["trips"][i1]["stop_times"] = [];
	}
	for (let i1 = 0; i1 < a_data["stop_times"].length; i1++) {
		const c_stop_time = a_data["stop_times"][i1];
		if (c_index["trip_id_" + c_stop_time["trip_id"]] === undefined) {
			new Error("stop_times.txtにあるtripがtrips.txtにない");
		}
		c_index["trip_id_" + c_stop_time["trip_id"]]["stop_times"].push(c_stop_time);
	}
	//並び替え
	for (let i1 = 0; i1 < a_data["trips"].length; i1++) {
		f_sort(a_data["trips"][i1]["stop_times"], "stop_sequence");
	}
	
	//c_shape_index
	const c_shape_index = {};
	for (let i1 = 0; i1 < a_data["shapes"].length; i1++) {
		c_shape_index["shape_id_" + a_data["shapes"][i1]["shape_id"]] = [];
	}
	for (let i1 = 0; i1 < a_data["shapes"].length; i1++) {
		const c_shape = a_data["shapes"][i1];
		c_shape_index["shape_id_" + c_shape["shape_id"]].push(c_shape);
	}
	//並び替え
	for (let i1 in c_shape_index) {
		f_sort(c_shape_index[i1], "shape_pt_sequence");
	}
	//shapesをtripsにまとめる。
	for (let i1 = 0; i1 < a_data["trips"].length; i1++) {
		a_data["trips"][i1]["shapes"] = [];
	}
	for (let i1 = 0; i1 < a_data["trips"].length; i1++) {
		const c_shapes = c_shape_index["shape_id_" + a_data["trips"][i1]["shape_id"]];
		for (let i2 = 0; i2 < c_shapes.length; i2++) {
			const c_shape = {};
			for (let i3 in c_shapes[i2]) {
				c_shape[i3] = c_shapes[i2][i3];
			}
			a_data["trips"][i1]["shapes"].push(c_shape);
		}
	}
	
	
	//ur_routesをつくる
	a_data["ur_routes"] = [];
	for (let i1 = 0; i1 < a_data["trips"].length; i1++) {
		const c_trip = a_data["trips"][i1];
		//既に同じur_routeがあるか探す。
		let l_exist = false; //違うと仮定
		for (let i2 = 0; i2 < a_data["ur_routes"].length; i2++) {
			const c_ur_route = a_data["ur_routes"][i2];
			if (c_ur_route["route_id"] !== c_trip["route_id"] || c_ur_route["stop_array"].length !== c_trip["stop_times"].length || c_ur_route["shape_pt_array"].length !== c_trip["shapes"].length) {
				
				
				continue; //違う
			}
			l_exist = true; //同じと仮定
			for (let i3 = 0; i3 < c_ur_route["stop_array"].length; i3++) {
				if(c_ur_route["stop_array"][i3]["stop_id"] !== c_trip["stop_times"][i3]["stop_id"] || c_ur_route["stop_array"][i3]["pickup_type"] !== c_trip["stop_times"][i3]["pickup_type"] || c_ur_route["stop_array"][i3]["drop_off_type"] !== c_trip["stop_times"][i3]["drop_off_type"]) {
					l_exist = false; //違う
					break;
				}
			}
			console.log(l_exist);
			for (let i3 = 0; i3 < c_ur_route["shape_pt_array"].length; i3++) {
				if(c_ur_route["shape_pt_array"][i3]["shape_pt_lat"] !== c_trip["shapes"][i3]["shape_pt_lat"] || c_ur_route["shape_pt_array"][i3]["shape_pt_lon"] !== c_trip["shapes"][i3]["shape_pt_lon"]) {
					l_exist = false; //違う
					break;
				}
			}
			if (l_exist === true) { //同じものが見つかったとき
				c_trip["ur_route_id"] = c_ur_route["ur_route_id"];
				let l_exist_2 = false;
				for (let i3 = 0; i3 < c_ur_route["service_array"].length; i3++) {
					if (c_ur_route["service_array"][i3]["service_id"] === c_trip["service_id"]) {
						c_ur_route["service_array"][i3]["number"] += 1;
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
			const c_ur_route_id = "ur_route_id_" + String(i1);
			c_trip["ur_route_id"] = c_ur_route_id;
			const c_ur_route = {"ur_route_id": c_ur_route_id, "stop_array": [], "shape_pt_array": [], "service_array": [{"service_id": c_trip["service_id"], "number": 1}]};
			for (let i2 in c_index["route_id_" + c_trip["route_id"]]) {
				c_ur_route[i2] = c_index["route_id_" + c_trip["route_id"]][i2];
			}
			for (let i2 = 0; i2 < c_trip["stop_times"].length; i2++) {
				c_ur_route["stop_array"].push({
					"stop_id": c_trip["stop_times"][i2]["stop_id"],
					"pickup_type": c_trip["stop_times"][i2]["pickup_type"],
					"drop_off_type": c_trip["stop_times"][i2]["drop_off_type"]
				});
			}
			for (let i2 = 0; i2 < c_trip["shapes"].length; i2++) {
				c_ur_route["shape_pt_array"].push({
					"shape_pt_lat": c_trip["shapes"][i2]["shape_pt_lat"],
					"shape_pt_lon": c_trip["shapes"][i2]["shape_pt_lon"]
				});
			}
			a_data["ur_routes"].push(c_ur_route);
		}
	}
	//並び替え
	f_sort(a_data["ur_routes"], "route_sort_order");
	
}

function f_sort(a_array, a_key) {
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