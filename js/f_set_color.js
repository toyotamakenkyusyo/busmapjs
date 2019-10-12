//colorが未設定のところを補充する。
export function f_set_color(a_data) {
	for (let i1 = 0; i1 < a_data["routes"].length; i1++) {
		if ((a_data["routes"][i1]["route_color"] === "") || (a_data["routes"][i1]["route_color"] === undefined)) {
			//カラーバリアフリー
			//const c_red = Math.round((Math.random() * 15)).toString(16) + Math.round((Math.random() * 15)).toString(16);
			//const c_green = c_red;
			//const c_blue = Math.round((Math.random() * 15)).toString(16) + Math.round((Math.random() * 15)).toString(16);
			//a_data["routes"][i1]["route_color"] = c_red + c_green + c_blue;
			//完全ランダム
			a_data["routes"][i1]["route_color"] = Math.round((Math.random() * 15)).toString(16) + "F" + Math.round((Math.random() * 15)).toString(16) + "F" + Math.round((Math.random() * 15)).toString(16) + "F"; //本来はFFFFFF
			
			//青黄10色から選択。
			//const c_colors = ["8080FF", "4040FF", "0000FF", "0000C0", "000080", "FFFF80", "FFFF40", "FFFF00", "C0C000", "808000"];
			//a_data["routes"][i1]["route_color"] = c_colors[Math.round(Math.random() * 10)];
			
			
		}
		if ((a_data["routes"][i1]["route_text_color"] === "") || (a_data["routes"][i1]["route_text_color"] === undefined)) {
			a_data["routes"][i1]["route_text_color"] = "000000";
		}
	}
}