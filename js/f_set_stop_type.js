//stop_times.txtのpickup_type, drop_off_typeを埋める。
export function f_set_stop_type(a_data) {
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