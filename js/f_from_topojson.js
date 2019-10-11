export function f_from_topojson(a_topojson) {
	//arcsをcoordinatesに変換
	for (let i1 in a_topojson["objects"]) {
		//以下、GeometryCollectionのみ対象
		if (a_topojson["objects"][i1]["type"] !== "GeometryCollection") {
			continue;
		}
		for (let i2 = 0; i2 < a_topojson["objects"][i1]["geometries"].length; i2++) {
			const c_geometry = a_topojson["objects"][i1]["geometries"][i2];
			//以下、LineStringのみ対象
			if (c_geometry["type"] !== "LineString") {
				continue;
			}
			c_geometry["coordinates"] = [];
			for (let i3 = 0; i3 < c_geometry["arcs"].length; i3++) {
				const c_number = c_geometry["arcs"][i3];
				if (c_number >= 0) {
					const c_arc = a_topojson["arcs"][c_number];
					for (let i4 = 0; i4 < c_arc.length; i4++) {
						if (c_geometry["coordinates"].length > 0) {
							if (i4 === 0 && c_arc[0][0] === c_geometry["coordinates"][c_geometry["coordinates"].length - 1][0] && c_arc[0][1] === c_geometry["coordinates"][c_geometry["coordinates"].length - 1][1]) {
								continue;
							}
						}
						c_geometry["coordinates"].push(c_arc[i4]);
					}
				} else if (c_number < 0) {
					const c_arc = a_topojson["arcs"][(c_number + 1) * (-1)];
					for (let i4 = c_arc.length - 1; i4 >= 0; i4--) {
						if (c_geometry["coordinates"].length > 0) {
							if (i4 === c_arc.length - 1 && c_arc[c_arc.length - 1][0] === c_geometry["coordinates"][c_geometry["coordinates"].length - 1][0] && c_arc[c_arc.length - 1][1] === c_geometry["coordinates"][c_geometry["coordinates"].length - 1][1]) {
								continue;
							}
						}
						c_geometry["coordinates"].push(c_arc[i4]);
					}
				}
			}
		}
	}
	
	//GeometryCollectionをFeatureCollectionに変換
	const c_geojsons = {};
	for (let i1 in a_topojson["objects"]) {
		//以下、GeometryCollectionのみ対象
		if (a_topojson["objects"][i1]["type"] !== "GeometryCollection") {
			continue;
		}
		c_geojsons[i1] = {"type": "FeatureCollection", "features": []};
		for (let i2 = 0; i2 < a_topojson["objects"][i1]["geometries"].length; i2++) {
			const c_geometry = a_topojson["objects"][i1]["geometries"][i2];
			//以下、PointとLineStringのみ対象
			if (c_geometry["type"] !== "Point" && c_geometry["type"] !== "LineString") {
				continue;
			}
			c_geojsons[i1]["features"].push({"type": "Feature", "geometry": {"type": c_geometry["type"], "coordinates": c_geometry["coordinates"]}, "properties": c_geometry["properties"]});
		}
	}
	
	const c_geojson_stops = c_geojsons["stops"]["features"];
	const c_geojson_ur_routes = c_geojsons["ur_routes"]["features"];
	
	const c_stops = [];
	for (let i1 = 0; i1 < c_geojson_stops.length; i1++) {
		const c_geometry = c_geojson_stops[i1]["geometry"];
		if (c_geometry["coordinates"][0] !== undefined && c_geometry["coordinates"][1] !== undefined) {
			const c_coordinates = [];
			c_coordinates[0] = c_geometry["coordinates"][0];
			c_coordinates[1] = c_geometry["coordinates"][1];
			if (c_coordinates[1] > 90 || c_coordinates[1] < -90) { //緯度経度が逆の場合、修正する
				c_coordinates[0] = c_geometry["coordinates"][1];
				c_coordinates[1] = c_geometry["coordinates"][0];
			}
			c_geojson_stops[i1]["properties"]["stop_lon"] = c_coordinates[0];
			c_geojson_stops[i1]["properties"]["stop_lat"] = c_coordinates[1];
		}
		c_stops.push(c_geojson_stops[i1]["properties"]);
	}
	const c_ur_routes = [];
	for (let i1 = 0; i1 < c_geojson_ur_routes.length; i1++) {
		const c_geometry = c_geojson_ur_routes[i1]["geometry"];
		c_geojson_ur_routes[i1]["properties"]["shape_pt_array"] = [];
		for (let i2 = 0; i2 < c_geometry["coordinates"].length; i2++) {
			const c_coordinates = [];
			c_coordinates[0] = c_geometry["coordinates"][i2][0];
			c_coordinates[1] = c_geometry["coordinates"][i2][1];
			if (c_coordinates[1] > 90 || c_coordinates[1] < -90) { //緯度経度が逆の場合、修正する
				c_coordinates[0] = c_geometry["coordinates"][i2][1];
				c_coordinates[1] = c_geometry["coordinates"][i2][0];
			}
			c_geojson_ur_routes[i1]["properties"]["shape_pt_array"].push({"shape_pt_lon": c_coordinates[0], "shape_pt_lat": c_coordinates[1]});
		}
		c_ur_routes.push(c_geojson_ur_routes[i1]["properties"]);
	}
	return {"stops": c_stops, "ur_routes": c_ur_routes};
}




/*

{
	"type": "Topology",
	"objects": {
		"stops": {
			"type": "GeometryCollection",
			"geometries": [
				{"type": "Point", "properties": {"stop_id": "山_上り"}, "coordinates": [35, 139]},
				{"type": "Point", "properties": {"stop_id": "川_上り"}, "coordinates": [36, 140]},
				{"comment": "東経が90度より大きいか、西経が90度より大きい場合、緯度経度の順番はどちらでもよい。"},
				{"comment": "stop_idは_で区切り、前半をstop_nameにする。"},
				{"comment": "最後はカンマなし"}
			]
		},
		"ur_routes": {
			"type": "GeometryCollection",
			"geometries": [
				{"type": "LineString", "properties": {"route_id": "山→川", "jp_parent_route_id": "本線", "trip_number": 64, "route_color": "FF0000", "stop_array": [{"stop_id": "山"}, {"stop_id": "川"}]}, "arcs": [0, 1]},
				{"comment": "最後はカンマなし"}
			]
		},
		"arcs": {
			"type": "GeometryCollection",
			"geometries": [
				{"type": "LineString", "properties": {"comment": "山→丘"}, "arcs": [0]},
				{"type": "LineString", "properties": {"comment": "丘→川"}, "arcs": [1]},
				{"comment": "最後はカンマなし"}
			]
		}
	},
	"arcs": [
		[[35, 139], [35, 138]],
		[[36, 138], [37, 139], [36, 140]]
	]
}

*/

