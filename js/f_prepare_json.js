export function f_prepare_json(a_data) {
	if (typeof a_data["stops"] !== "object") {
		new Error("stopsが不正");
	}
	if (typeof a_data["ur_routes"] !== "object") {
		a_data["ur_routes"] = a_data["routes"]; //仮、互換性
		new Error("ur_routesが不正");
	}
	if (typeof a_data["calendar"] !== "object") {
		a_data["calendar"] = []; //仮、互換性
	}
	if (typeof a_data["trips"] !== "object") {
		a_data["trips"] = []; //仮、互換性
	}
	
	for (let i1 = 0; i1 < a_data["stops"].length; i1++) {
		if (typeof a_data["stops"][i1]["stop_id"] !== "string") {
			new Error("stop_idが不正");
		}
		if (typeof a_data["stops"][i1]["stop_name"] !== "string") {
			a_data["stops"][i1]["stop_name"] = a_data["stops"][i1]["stop_id"].split("_")[0]; //仮に命名;
		}
		//緯度経度の値を検証
		const c_stop_lat = a_data["stops"][i1]["stop_lat"];
		const c_stop_lon = a_data["stops"][i1]["stop_lon"];
		if ((typeof c_stop_lat !== "number") || (typeof c_stop_lon !== "number")) {
			//location_typeが1のときは見逃す？
			new Error("stop_latかstop_lonが不正");
		} else if (c_stop_lat >= 90 || c_stop_lat <= -90 || c_stop_lon < 0 || c_stop_lon >= 180) {
			new Error("stop_latかstop_lonが不正");
		}
	}
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		if (typeof a_data["ur_routes"][i1]["route_id"] !== "string") {
			new Error("route_idが不正");
		}
		if (typeof a_data["ur_routes"][i1]["route_color"] !== "string") { //色か否かも要判定？
			a_data["ur_routes"][i1]["route_color"] = "FF0000"; //仮にFF0000とする。
		}
		if (typeof a_data["ur_routes"][i1]["shape_pt_array"] !== "object") { //配列か否かも要判定？
			a_data["ur_routes"][i1]["shape_pt_array"] = []; //仮の処置
		}
		if (typeof a_data["ur_routes"][i1]["service_array"] !== "object") { //配列か否かも要判定？
			a_data["ur_routes"][i1]["service_array"] = ""; //仮の処置
		}
		if (typeof a_data["ur_routes"][i1]["trip_number"] !== "number") {
			a_data["ur_routes"][i1]["trip_number"] = 999; //仮に999とする。
		}
	}
	
	
	//stop_numberをつける。（互換性のため）
	for (let i1 = 0; i1 < a_data["stops"].length; i1++) {
		const c_stop_id = a_data["stops"][i1]["stop_id"];
		for (let i2 = 0; i2 < a_data["ur_routes"].length; i2++) {
			for (let i3 = 0; i3 < a_data["ur_routes"][i2]["stop_array"].length; i3++) {
				if (a_data["ur_routes"][i2]["stop_array"][i3]["stop_id"] === c_stop_id) {
					a_data["ur_routes"][i2]["stop_array"][i3]["stop_number"] = i1;
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