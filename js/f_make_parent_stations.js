//元データの段階では、ur_stopsのみ、parent_stationのみ、両方の3択
//基本はur_stopsのみでparent_stationsは平均をとって自動生成
//過去のur_stopsがわからない場合はparent_stationsのみ
//標柱の区別はplatform_codeを用いる（上り・下り、路線等の区分、乗場番号等）
//同名停留所があるときの区別語（地域名、路線名等）をどうするか？distinction_code？

//統合はstop_nameで行う（緯度経度から位置を確認すべきか？）
//親も一応用意する

export function f_make_parent_stations(a_data) {
	//stopsが必要
	//ur_stops
	a_data["ur_stops"] = [];
	a_data["parent_stations"] = [];
	//ur_stopをまとめる（ur_stopは標柱も親未設定の停留所の代表点もありうる）
	for (let i1 = 0; i1 < a_data["stops"].length; i1++) {
		const c_stop = a_data["stops"][i1];
		const c_location_type = c_stop["location_type"];
		if (c_location_type === "0" || c_location_type === "" || c_location_type === undefined) {//ur_stop
			a_data["ur_stops"].push({
				"stop_id": c_stop["stop_id"],
				//"stop_code": c_stop["stop_code"],
				"stop_name": c_stop["stop_name"],
				//"stop_desc": c_stop["stop_desc"],
				"stop_lat": c_stop["stop_lat"],
				"stop_lon": c_stop["stop_lon"],
				//"zone_id": c_stop["zone_id"],
				//"stop_url": c_stop["stop_url"],
				"location_type": "0",//仮に残す
				"parent_station": c_stop["parent_station"],
				//"stop_timezone": c_stop["stop_timezone"],
				//"wheelchair_boarding": c_stop["wheelchair_boarding"],
				"platform_code": c_stop["platform_code"]//,
			});
		}
	}
	//parent_stations
	//親をつくる
	//親が未設定の場合に、stop_nameを設定する
	for (let i1 = 0; i1 < a_data["ur_stops"].length; i1++) {
		const c_ur_stop = a_data["ur_stops"][i1];
		if (c_ur_stop["parent_station"] === "" || c_ur_stop["parent_station"] === undefined) {
			c_ur_stop["parent_station"] = c_ur_stop["stop_name"];//stop_nameで代用する
		}
	}
	//親の一覧を作る
	//親の緯度経度は子達の相加平均とするため、和を計算する
	const c_parent_station_list = {};
	for (let i1 = 0; i1 < a_data["ur_stops"].length; i1++) {
		const c_ur_stop = a_data["ur_stops"][i1];
		const c_parent_station = c_ur_stop["parent_station"];
		if (c_parent_station_list[c_parent_station] === undefined) {
			c_parent_station_list[c_parent_station] = {"stop_lat": 0, "stop_lon": 0, "children_number" : 0};
		}
		c_parent_station_list[c_parent_station]["stop_lat"] += c_ur_stop["stop_lat"];
		c_parent_station_list[c_parent_station]["stop_lon"] += c_ur_stop["stop_lon"];
		c_parent_station_list[c_parent_station]["children_number"] += 1;

	}
	//緯度経度の和から平均を計算
	for (let i1 in c_parent_station_list) {
		const c_inverse_number = 1 / c_parent_station_list[i1]["children_number"];
		c_parent_station_list[i1]["stop_lat"] *= c_inverse_number;
		c_parent_station_list[i1]["stop_lon"] *= c_inverse_number;
	}
	//stop_idの目次を作る
	const c_stop_id_index = {};
	for (let i1 = 0; i1 < a_data["stops"].length; i1++) {
		const c_stop = a_data["stops"][i1];
		c_stop_id_index[c_stop["stop_id"]] = a_data["stops"][i1];
	}
	//parent_stationsを作る
	for (let i1 in c_parent_station_list) {
		if (c_stop_id_index[i1] === undefined) {//元データにないとき
			a_data["parent_stations"].push({
				"stop_id": i1,
				//"stop_code": "",
				"stop_name": i1,
				//"stop_desc": "",
				"stop_lat": c_parent_station_list[i1]["stop_lat"],
				"stop_lon": c_parent_station_list[i1]["stop_lon"],
				//"zone_id": "",
				//"stop_url": "",
				"location_type": "1",//仮に残す
				"parent_station": ""//,//仮に残す
				//"stop_timezone": "",
				//"wheelchair_boarding": "",
				//"platform_code": ""//,
			});
		} else {//元データにあるとき
			a_data["parent_stations"].push({
				"stop_id": i1,
				//"stop_code": c_stop_id_index[i1]["stop_code"],
				"stop_name": c_stop_id_index[i1]["stop_name"],
				//"stop_desc": c_stop_id_index[i1]["stop_desc"],
				"stop_lat": c_stop_id_index[i1]["stop_lat"],
				"stop_lon": c_stop_id_index[i1]["stop_lon"],
				//"zone_id": c_stop_id_index["zone_id"],
				//"stop_url": c_stop_id_index["stop_url"],
				"location_type": "1",//仮に残す
				"parent_station": ""//,//仮に残す
				//"stop_timezone": c_stop_id_index["stop_timezone"],
				//"wheelchair_boarding": c_stop_id_index["wheelchair_boarding"],
				//"platform_code": c_stop_id_index["platform_code"]//,
			});
		}
	}
	
}