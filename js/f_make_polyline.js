export function f_make_polyline(a_child_shape_segment_array) {
	const c_polyline = [];
	//最初と最後は3点にならない
	//widthは終点側に入れる
	c_polyline.push({"x": a_child_shape_segment_array[0]["sxy"][0]["x"], "y": a_child_shape_segment_array[0]["sxy"][0]["y"], "curve": a_child_shape_segment_array[0]["sxy"][0]["curve"], "original": a_child_shape_segment_array[0]["sm"], "width": null, "ids": a_child_shape_segment_array[0]["sids"]});
	for (let i2 = 0; i2 < a_child_shape_segment_array.length; i2++) {
		if (a_child_shape_segment_array[i2]["exy"].length === 3) {
			c_polyline.push({"x": a_child_shape_segment_array[i2]["exy"][0]["x"], "y": a_child_shape_segment_array[i2]["exy"][0]["y"], "curve": a_child_shape_segment_array[i2]["exy"][0]["curve"], "original": a_child_shape_segment_array[i2]["em"], "width": a_child_shape_segment_array[i2]["w"], "ids": []});
			c_polyline.push({"x": a_child_shape_segment_array[i2]["exy"][1]["x"], "y": a_child_shape_segment_array[i2]["exy"][1]["y"], "curve": a_child_shape_segment_array[i2]["exy"][1]["curve"], "original": a_child_shape_segment_array[i2]["em"], "width": a_child_shape_segment_array[i2]["w"], "ids": a_child_shape_segment_array[i2]["eids"]});
			c_polyline.push({"x": a_child_shape_segment_array[i2]["exy"][2]["x"], "y": a_child_shape_segment_array[i2]["exy"][2]["y"], "curve": a_child_shape_segment_array[i2]["exy"][2]["curve"], "original": a_child_shape_segment_array[i2]["em"], "width": a_child_shape_segment_array[i2 + 1]["w"], "ids": []});
		} else {
			c_polyline.push({"x": a_child_shape_segment_array[i2]["exy"][0]["x"], "y": a_child_shape_segment_array[i2]["exy"][0]["y"], "curve": a_child_shape_segment_array[i2]["exy"][0]["curve"], "original": a_child_shape_segment_array[i2]["em"], "width": a_child_shape_segment_array[i2]["w"], "ids": a_child_shape_segment_array[i2]["eids"]});
		}
	}
	//NaNがないか確認
	for (let i1 = 0; i1 < c_polyline.length; i1++) {
		if (isNaN(c_polyline[i1]["x"])) {
			console.log(c_polyline[i1]["x"]);
			if (i1 !== 0) {
				c_polyline[i1]["x"] = c_polyline[i1 - 1]["x"];
			} else {
				c_polyline[i1]["x"] = c_polyline[i1 + 2]["x"];
			}
		}
		if (isNaN(c_polyline[i1]["y"])) {
			console.log(c_polyline[i1]["y"]);
			if (i1 !== 0) {
				c_polyline[i1]["y"] = c_polyline[i1 - 1]["y"];
			} else {
				c_polyline[i1]["y"] = c_polyline[i1 + 2]["y"];
			}
		}
	}
	return c_polyline;
}