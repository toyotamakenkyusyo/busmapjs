export function f_cut_polyline(a_polyline, a_stop_array) {
	const c_stop_number_array = [];
	for (let i1 = 0; i1 < a_polyline.length; i1++) {
		for (let i2 = 0; i2 < a_polyline[i1]["near_stops"].length; i2++) {
			c_stop_number_array.push({"number": i1, "stop_id": a_polyline[i1]["near_stops"][i2]});
		}
	}
	//途中にぬけがあってもよいが、途中からずれる可能性はある
	const c_cut_stop_number_array = [];
	let l_stop_id;
	let l_number = 0;
	for (let i1 = 0; i1 < a_stop_array.length; i1++) {
		l_stop_id = a_stop_array[i1]["stop_id"];
		for (let i2 = l_number; i2 < c_stop_number_array.length; i2++) {
			if (c_stop_number_array[i2]["stop_id"] === l_stop_id) {
				c_cut_stop_number_array.push({"number": c_stop_number_array[i2]["number"], "stop_id": l_stop_id});
				l_number = i2;
			}
		}
	}
	const c_polylines = {};
	for (let i1 = 0; i1 < c_cut_stop_number_array.length - 1; i1++) {
		const c_sid = c_cut_stop_number_array[i1]["stop_id"];
		const c_eid = c_cut_stop_number_array[i1 + 1]["stop_id"];
		const c_id = c_sid + "_to_" + c_eid;
		c_polylines[c_id] = [];
		for (let i2 = c_cut_stop_number_array[i1]["number"]; i2 <= c_cut_stop_number_array[i1 + 1]["number"]; i2++) {
			if (i2 === c_cut_stop_number_array[i1]["number"]) { //最初
				c_polylines[c_id].push({"polyline": [], "width": a_polyline[i2 + 1]["width"]});
			} else if (i2 < c_cut_stop_number_array[i1 + 1]["number"] && a_polyline[i2]["width"] !== a_polyline[i2 + 1]["width"]) { //太さが変わるとき
				c_polylines[c_id][c_polylines[c_id].length - 1]["polyline"].push({"lon": a_polyline[i2]["lon"], "lat": a_polyline[i2]["lat"]});
				c_polylines[c_id].push({"polyline": [], "width": a_polyline[i2 + 1]["width"]});
			}
			c_polylines[c_id][c_polylines[c_id].length - 1]["polyline"].push({"lon": a_polyline[i2]["lon"], "lat": a_polyline[i2]["lat"]});
		}
	}
	const c_curves = {};
	//緯度経度が{"lon": a_polyline[i2]["lon"], "lat": a_polyline[i2]["lat"]}は不可
	for (let i1 = 0; i1 < c_cut_stop_number_array.length - 1; i1++) {
		const c_sid = c_cut_stop_number_array[i1]["stop_id"];
		const c_eid = c_cut_stop_number_array[i1 + 1]["stop_id"];
		const c_id = c_sid + "_to_" + c_eid;
		c_curves[c_id] = [];
		for (let i2 = c_cut_stop_number_array[i1]["number"]; i2 <= c_cut_stop_number_array[i1 + 1]["number"]; i2++) {
			if (i2 === c_cut_stop_number_array[i1]["number"]) { //最初
				c_curves[c_id].push({"curve": [], "width": a_polyline[i2 + 1]["width"]});
				c_curves[c_id][c_curves[c_id].length - 1]["curve"].push("M");
				c_curves[c_id][c_curves[c_id].length - 1]["curve"].push([a_polyline[i2]["lat"], a_polyline[i2]["lon"]]);
			} else if (i2 < c_cut_stop_number_array[i1 + 1]["number"] && a_polyline[i2]["width"] !== a_polyline[i2 + 1]["width"]) { //太さが変わるとき
				//前の点
				if (a_polyline[i2 - 1]["curve"] === true && a_polyline[i2 - 1]["width"] === a_polyline[i2]["width"]) { //前が曲線で、太さが変わっていない
					c_curves[c_id][c_curves[c_id].length - 1]["curve"].push([a_polyline[i2]["lat"], a_polyline[i2]["lon"]]);
				} else { //前が曲線でない
					c_curves[c_id][c_curves[c_id].length - 1]["curve"].push("L");
					c_curves[c_id][c_curves[c_id].length - 1]["curve"].push([a_polyline[i2]["lat"], a_polyline[i2]["lon"]]);
				}
				//次の点
				c_curves[c_id].push({"curve": [], "width": a_polyline[i2 + 1]["width"]});
				c_curves[c_id][c_curves[c_id].length - 1]["curve"].push("M");
				c_curves[c_id][c_curves[c_id].length - 1]["curve"].push([a_polyline[i2]["lat"], a_polyline[i2]["lon"]]);
			} else { //太さが変わらないとき
				if (a_polyline[i2 - 1]["curve"] === true && a_polyline[i2 - 1]["width"] === a_polyline[i2]["width"]) { //前が曲線で、太さが変わっていない
					c_curves[c_id][c_curves[c_id].length - 1]["curve"].push([a_polyline[i2]["lat"], a_polyline[i2]["lon"]]);
				} else if (i2 < c_cut_stop_number_array[i1 + 1]["number"] && a_polyline[i2]["curve"] === true) { //曲線
					c_curves[c_id][c_curves[c_id].length - 1]["curve"].push("Q");
					c_curves[c_id][c_curves[c_id].length - 1]["curve"].push([a_polyline[i2]["lat"], a_polyline[i2]["lon"]]);
				} else { //線分
					c_curves[c_id][c_curves[c_id].length - 1]["curve"].push("L");
					c_curves[c_id][c_curves[c_id].length - 1]["curve"].push([a_polyline[i2]["lat"], a_polyline[i2]["lon"]]);
				}
			}
		}
	}
	const c_stop_array = [];
	for (let i1 = 0; i1 < c_cut_stop_number_array.length; i1++) {
		c_stop_array.push({"lon": a_polyline[c_cut_stop_number_array[i1]["number"]]["lon"], "lat": a_polyline[c_cut_stop_number_array[i1]["number"]]["lat"]});
	}
	return {"polylines": c_polylines, "curves": c_curves, "stop_array": c_stop_array};
}