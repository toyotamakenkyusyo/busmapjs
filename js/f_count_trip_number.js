export function f_count_trip_number(a_data) {
	//trip_numberを計算する。一週間の平均とする。
	for (let i1 = 0; i1 < a_data["ur_routes"].length; i1++) {
		if (a_data["ur_routes"][i1]["service_array"] !== "") {
			a_data["ur_routes"][i1]["trip_number"] = 0;
		}
		for (let i2 = 0; i2 < a_data["ur_routes"][i1]["service_array"].length; i2++) {
			for (let i3 = 0; i3 < a_data["calendar"].length; i3++) {
				if (a_data["ur_routes"][i1]["service_array"][i2]["service_id"] === a_data["calendar"][i3]["service_id"]) {
					const c_day = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
					for (let i4 = 0; i4 < c_day.length; i4++) {
						if (a_data["calendar"][i2] === undefined) {
							continue; //calendarがない場合があるので追加
						}
						if (a_data["calendar"][i2][c_day[i4]] === "1") {
							a_data["ur_routes"][i1]["trip_number"] += a_data["ur_routes"][i1]["service_array"][i2]["number"] / 7;//trip_numberではない！
						}
					}
				}
			}
		}
	}
}