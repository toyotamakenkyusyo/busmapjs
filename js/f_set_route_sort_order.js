export function f_set_route_sort_order(a_data) {
	for (let i1 = 0; i1 < a_data["routes"].length; i1++) {
		if (a_data["routes"][i1]["route_sort_order"] === "" || a_data["routes"][i1]["route_sort_order"] === undefined) {
			a_data["routes"][i1]["route_sort_order"] = String(i1);
		}
	}
}