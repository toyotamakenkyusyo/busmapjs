export function f_from_geojson(a_geojson) {
	const c_stops = [];
	for (let i1 = 0; i1 < a_geojson["features"].length; i1++) {
		const c_feature = a_geojson["features"][i1];
		if (c_feature["geometry"]["type"] === "Point") { //標柱
			let l_lon = c_feature["geometry"]["coordinates"][0];
			let l_lat = c_feature["geometry"]["coordinates"][1];
			if (l_lat > 90 || l_lat < -90) { //緯度経度が逆の場合、修正する
				l_lon = c_feature["geometry"]["coordinates"][1];
				l_lat = c_feature["geometry"]["coordinates"][0];
			}
			c_feature["properties"]["stop_lon"] = l_lon;
			c_feature["properties"]["stop_lat"] = l_lat;
			c_stops.push(c_feature["properties"]);
		}
	}
	if (a_geojson["ur_routes"] === undefined) { //普通のgeojson
		for (let i1 = 0; i1 < a_geojson["features"].length; i1++) {
			const c_feature = a_geojson["features"][i1];
			if (c_feature["geometry"]["type"] === "LineString") { //系統
				c_feature["properties"]["shape_pt_array"] = [];
				for (let i2 = 0; i2 < c_feature["geometry"]["coordinates"].length; i2++) {
					c_feature["properties"]["shape_pt_array"].push({"shape_pt_lon": c_feature["geometry"]["coordinates"][i2][0], "shape_pt_lat": c_feature["geometry"]["coordinates"][i2][1]});
				}
			}
		}
		const c_ur_routes = [];
		for (let i1 = 0; i1 < a_geojson["features"].length; i1++) {
			const c_feature = a_geojson["features"][i1];
			if (c_feature["geometry"]["type"] === "LineString") {//系統
				c_ur_routes.push(c_feature["properties"]);
			}
		}
		return {"stops": c_stops, "ur_routes": c_ur_routes};
	} else { //道路と系統を分離したgeojson
		for (let i1 = 0; i1 < a_geojson["ur_routes"].length; i1++) {
			const c_route = a_geojson["ur_routes"][i1];
			c_route["shape_pt_array"] = [];
			for (let i2 = 0; i2 < c_route["arcs"].length - 1; i2++) { //最後の1個を除く
				for (let i3 = 0; i3 < a_geojson["features"].length; i3++) {
					const c_feature = a_geojson["features"][i3];
					if (c_feature["geometry"]["type"] === "LineString") {
						if (c_feature["properties"]["start_point"] === c_route["arcs"][i2] && c_feature["properties"]["end_point"] === c_route["arcs"][i2 + 1]) {
							for (let i4 = 0; i4 < c_feature["geometry"]["coordinates"].length; i4++) {
								if (c_route["shape_pt_array"].length > 0 && i4 === 0) {
									if (c_route["shape_pt_array"][c_route["shape_pt_array"].length - 1]["shape_pt_lon"] === c_feature["geometry"]["coordinates"][0][0] && c_route["shape_pt_array"][c_route["shape_pt_array"].length - 1]["shape_pt_lat"] === c_feature["geometry"]["coordinates"][0][1]) {
										continue;
									}
								}
								c_route["shape_pt_array"].push({"shape_pt_lon": c_feature["geometry"]["coordinates"][i4][0], "shape_pt_lat": c_feature["geometry"]["coordinates"][i4][1]});
							}
							break;
						} else if (c_feature["properties"]["end_point"] === c_route["arcs"][i2] && c_feature["properties"]["start_point"] === c_route["arcs"][i2 + 1]) {
							for (let i4 = c_feature["geometry"]["coordinates"].length - 1; i4 >= 0; i4--) {
								if (c_route["shape_pt_array"].length > 0 && i4 === c_feature["geometry"]["coordinates"].length - 1) {
									if (c_route["shape_pt_array"][c_route["shape_pt_array"].length - 1][0] === c_feature["geometry"]["coordinates"][c_feature["geometry"]["coordinates"].length - 1]["shape_pt_lon"] && c_route["shape_pt_array"][c_route["shape_pt_array"].length - 1]["shape_pt_lat"] === c_feature["geometry"]["coordinates"][c_feature["geometry"]["coordinates"].length - 1][1]) {
										continue;
									}
								}
								c_route["shape_pt_array"].push({"shape_pt_lon": c_feature["geometry"]["coordinates"][i4][0], "shape_pt_lat": c_feature["geometry"]["coordinates"][i4][1]});
							}
							break;
						}
					}
				}
				//console.log("arcがみつからない？" + c_route["arcs"][i2] + " " + c_route["arcs"][i2+1]);
			}
		}
		return {"stops": c_stops, "ur_routes": a_geojson["ur_routes"]};
	}
}

/*
新しい案
{
	"type": "FeatureCollection",
	"features": [
		{"type": "Feature", "properties": {"stop_id": "停留所名_のりば番号"}, "geometry": {"type": "Point", "coordinates": [100, 1]}},
		{"type": "Feature", "properties": {"start_point": "始点交差点", "end_point": "終点交差点"}, "geometry": {"type": "LineString", "coordinates": [[102, 0], [103, 1]]}}
	],
	"ur_routes": [
		{"route_id": "系統名", "jp_parent_route_id": "系統群名", "trip_number": 999, "stop_array": [{"stop_id": "標柱1"}, {"stop_id": "標柱2"}], "arcs": ["交差点1", "交差点2"]}
	]
}
*/

/*

{
	"type": "FeatureCollection",
	"features": [
		{
			"type": "Feature",
			"geometry": {"type": "Point", "coordinates": [102.0, 0.5]},
			"properties": {"prop0": "value0"}
		},
		{
			"type": "Feature",
			"geometry": {"type": "LineString", "coordinates": [[102.0, 0.0], [103.0, 1.0], [104.0, 0.0], [105.0, 1.0]]},
			"properties": {"prop0": "value0", "prop1": 0.0}
		}
	]
}


*/

