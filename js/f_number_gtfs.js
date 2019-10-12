//緯度、経度、順番の文字列を数値に変換する。
export function f_number_gtfs(a_data) {
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