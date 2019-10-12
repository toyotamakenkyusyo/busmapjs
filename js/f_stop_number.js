export function f_stop_number(a_data) {
	//stop_index（stop_number）を追加（互換性のため）
	const c_stop_number = {};
	for (let i1 = 0; i1 < a_data["ur_stops"].length; i1++) {
		c_stop_number["stop_id_" + a_data["ur_stops"][i1]["stop_id"]] = i1;
	}
	for (let i1 = 0; i1 < a_data["trips"].length; i1++) {
		for (let i2 = 0; i2 < a_data["trips"][i1]["stop_times"].length; i2++) {
			a_data["trips"][i1]["stop_times"][i2]["stop_number"] = c_stop_number["stop_id_" + a_data["trips"][i1]["stop_times"][i2]["stop_id"]];
		}
	}
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		for (let i2 = 0; i2 < a_data["ur_routes"][i1]["stop_array"].length; i2++) {
			a_data["ur_routes"][i1]["stop_array"][i2]["stop_number"] = c_stop_number["stop_id_" + a_data["ur_routes"][i1]["stop_array"][i2]["stop_id"]];
		}
	}
}