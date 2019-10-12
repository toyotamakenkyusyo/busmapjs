export function f_prepare_gtfs(a_data) {
	f_number_gtfs(a_data);
	//GTFSの補完
	f_color_gtfs(a_data);
	f_set_stop_type(a_data);
	f_make_shape(a_data);
	//路線図用の補完
}



function f_number_gtfs(a_data) {
	for (let i1 = 0; i1 < a_data["stops"].length; i1++) {
		a_data["stops"][i1]["stop_lat"] = Number(a_data["stops"][i1]["stop_lat"]);
		a_data["stops"][i1]["stop_lon"] = Number(a_data["stops"][i1]["stop_lon"]);
	}
	for (let i1 = 0; i1 < a_data["stop_times"].length; i1++) {
		a_data["stop_times"][i1]["stop_sequence"] = Number(a_data["stop_times"][i1]["stop_sequence"]);
	}
	for (let i1 = 0; i1 < a_data["shapes"].length; i1++) {
		a_data["shapes"][i1]["shape_pt_lat"] = Number(a_data["shapes"][i1]["shape_pt_lat"]);
		a_data["shapes"][i1]["shape_pt_lon"] = Number(a_data["shapes"][i1]["shape_pt_lon"]);
		a_data["shapes"][i1]["shape_pt_sequence"] = Number(a_data["shapes"][i1]["shape_pt_sequence"]);
	}
	for (let i1 = 0; i1 < a_data["routes"].length; i1++) {
		a_data["routes"][i1]["route_sort_order"] = Number(a_data["routes"][i1]["route_sort_order"]);
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
	if (a_data["shapes"].length !== 0) {
		return a_data;
	}
	const c_shapes = [];
	for (let i1 = 0; i1 < a_data["stop_times"].length; i1++) {
		for (let i2 = 0; i2 < a_data["stops"].length; i2++) {
			if (a_data["stop_times"][i1]["stop_id"] === a_data["stops"][i2]["stop_id"]) {
				c_shapes.push({
					"shape_id": "shape_id_" + a_data["stop_times"][i1]["trip_id"]
					, "shape_pt_lat": a_data["stops"][i2]["stop_lat"]
					, "shape_pt_lon": a_data["stops"][i2]["stop_lon"]
					, "shape_pt_sequence": a_data["stops"][i2]["stop_sequence"]
				});
				break;
			}
		}
	}
	for (let i1 = 0; i1 < a_data["trips"].length; i1++) {
		a_data["trips"][i1]["shape_id"] = "shape_id_" + a_data["trips"][i1]["trip_id"]
	}
	a_data["shapes"] = c_shapes;
}




