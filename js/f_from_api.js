export function f_from_api(a_api) {
	const c_stops = [];
	const c_ur_routes = [];
	for (let i1 in a_api["station"]) {
		c_stops.push({
			"stop_id": a_api["station"][i1]["id"],
			"stop_name": a_api["station"][i1]["name"],
			"parent_station": a_api["station"][i1]["id"],
			"stop_lat": a_api["station"][i1]["lat"],
			"stop_lon": a_api["station"][i1]["lon"]//,
		});
	}
	for (let i1 in a_api["route"]) {
		const c_stop_array = [];
		for (let i2 = 0; i2 < a_api["route"][i1]["stationList"].length; i2++) {
			c_stop_array.push({"stop_id": a_api["route"][i1]["stationList"][i2]});
		}
		c_ur_routes.push({
			"route_id": a_api["route"][i1]["id"],
			"route_short_name": a_api["route"][i1]["name"],
			"route_long_name": a_api["route"][i1]["name"],
			"jp_parent_route_id": a_api["route"][i1]["name"],
			"route_color": a_api["route"][i1]["color"].replace(/#/, ""),
			"stop_array": c_stop_array//,
		});
	}
	return {"stops": c_stops, "ur_routes": c_ur_routes};
}