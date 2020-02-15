export function f_search_route(a_start_parent_station, a_end_parent_station, a_bmd, a_parent_station_index) {
	const c_route_se = f_search_from_start_end(a_start_parent_station, a_end_parent_station, a_bmd, a_parent_station_index);
	for (let i1 = 0; i1 < c_route_se.length; i1++) {
		if (c_route_se[i1].length > 0) {
			break;
		}
		if (i1 === c_route_se.length - 1) { //直接の経路がない場合
			const c_mid_parent_station = {}; //始点からも終点からも行ける点
			const c_mid_parent_station_s = {}; //始点から行ける点
			const c_mid_parent_station_e = {}; //終点から行ける点
			const c_route_s = f_search_from_start(a_start_parent_station, a_bmd, a_parent_station_index);
			const c_route_e = f_search_from_end(a_end_parent_station, a_bmd, a_parent_station_index);
			for (let i2 = 0; i2 < c_route_s.length; i2++) {
				for (let i3 in c_route_s[i2]) {
					c_mid_parent_station_s[i3] = true;
				}
			}
			for (let i2 = 0; i2 < c_route_e.length; i2++) {
				for (let i3 in c_route_e[i2]) {
					c_mid_parent_station_e[i3] = true;
				}
			}
			for (let i2 in c_mid_parent_station_s) {
				if (c_mid_parent_station_e[i2] === true) {
					c_mid_parent_station[i2] = true;
				}
			}
			//console.log(c_route_s);
			//console.log(c_route_e);
			for (let i2 = 0; i2 < c_route_s.length; i2++) {
				for (let i3 in c_route_s[i2]) {
					if (c_mid_parent_station[i3] === true) {
						c_route_se[i2] = c_route_se[i2].concat(c_route_s[i2][i3]);
					}
				}
			}
			for (let i2 = 0; i2 < c_route_e.length; i2++) {
				for (let i3 in c_route_e[i2]) {
					if (c_mid_parent_station[i3] === true) {
						c_route_se[i2] = c_route_se[i2].concat(c_route_e[i2][i3]);
					}
				}
			}
		}
	}
	return c_route_se;
}





//2点間
function f_search_from_start_end(a_start_parent_station, a_end_parent_station, a_bmd, a_parent_station_index) {
	const c_ur_route_stop_arrays = [];
	for (let i1 = 0; i1 < a_bmd["ur_routes"].length; i1++) {
		let l_stop_array = [];
		let l_start = false;
		let l_end = false;
		for (let i2 = 0; i2 < a_bmd["ur_routes"][i1]["stop_array"].length; i2++) {
			const c_parent_station = a_parent_station_index[a_bmd["ur_routes"][i1]["stop_array"][i2]["stop_id"]];
			if (l_start === true) {
				l_stop_array.push(a_bmd["ur_routes"][i1]["stop_array"][i2 - 1]["stop_id"] + "_to_" + a_bmd["ur_routes"][i1]["stop_array"][i2]["stop_id"]);
			}
			if (c_parent_station === a_start_parent_station) {
				l_stop_array = [];
				l_start = true;
			}
			if (c_parent_station === a_end_parent_station && l_start === true) {
				l_end = true;
				break;
			}
		}
		if (l_end === true) {
			c_ur_route_stop_arrays.push(l_stop_array);
		} else {
			c_ur_route_stop_arrays.push([]);
		}
	}
	return c_ur_route_stop_arrays;
}


//始点から探す
function f_search_from_start(a_start_parent_station, a_bmd, a_parent_station_index) {
	const c_ur_route_stop_arrays = [];
	for (let i1 = 0; i1 < a_bmd["ur_routes"].length; i1++) {
		c_ur_route_stop_arrays[i1] = {};
		let l_stop_array = [];
		let l_start = false;
		for (let i2 = 0; i2 < a_bmd["ur_routes"][i1]["stop_array"].length; i2++) {
			const c_parent_station = a_parent_station_index[a_bmd["ur_routes"][i1]["stop_array"][i2]["stop_id"]];
			if (l_start === true) {
				l_stop_array.push(a_bmd["ur_routes"][i1]["stop_array"][i2 - 1]["stop_id"] + "_to_" + a_bmd["ur_routes"][i1]["stop_array"][i2]["stop_id"]);
				if (c_ur_route_stop_arrays[i1][c_parent_station] === undefined) {
					c_ur_route_stop_arrays[i1][c_parent_station] = [];
					for (let i3 = 0; i3 < l_stop_array.length; i3++) {
						c_ur_route_stop_arrays[i1][c_parent_station].push(l_stop_array[i3]);
					}
				}
			}
			if (c_parent_station === a_start_parent_station) {
				l_stop_array = [];
				l_start = true;
			}
		}
	}
	return c_ur_route_stop_arrays;
}

//終点から探す
function f_search_from_end(a_end_parent_station, a_bmd, a_parent_station_index) {
	const c_ur_route_stop_arrays = [];
	for (let i1 = 0; i1 < a_bmd["ur_routes"].length; i1++) {
		c_ur_route_stop_arrays[i1] = {};
		let l_stop_array = [];
		let l_end = false;
		for (let i2 = a_bmd["ur_routes"][i1]["stop_array"].length - 1; i2 >= 0; i2--) {
			const c_parent_station = a_parent_station_index[a_bmd["ur_routes"][i1]["stop_array"][i2]["stop_id"]];
			if (l_end === true) {
				l_stop_array.push(a_bmd["ur_routes"][i1]["stop_array"][i2]["stop_id"] + "_to_" + a_bmd["ur_routes"][i1]["stop_array"][i2 + 1]["stop_id"]);
				if (c_ur_route_stop_arrays[i1][c_parent_station] === undefined) {
					c_ur_route_stop_arrays[i1][c_parent_station] = [];
					for (let i3 = l_stop_array.length - 1; i3 >= 0; i3--) {
						c_ur_route_stop_arrays[i1][c_parent_station].push(l_stop_array[i3]);
					}
				}
			}
			if (c_parent_station === a_end_parent_station) {
				l_stop_array = [];
				l_end = true;
			}
		}
	}
	return c_ur_route_stop_arrays;
}








