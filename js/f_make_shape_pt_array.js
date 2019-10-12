export function f_make_shape_pt_array(a_data) {
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		if (a_data["ur_routes"][i1]["shape_pt_array"] !== undefined) {
			if (a_data["ur_routes"][i1]["shape_pt_array"].length !== 0) {
				continue;
			}
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