//初期設定
export function f_input_settings(a_settings) {
	//初期値
	const c_input_settings = {
		"cors_url": "",//CORSの問題を回避するため、間にサーバーサイドのプログラムを挟む場合に前に加えるURL
		"rt": false,//GTFS-RTの読込
		"data": "data",//データのURL
		"data_type": "gtfs",//データがgtfs, json, geojson, topojson, apiか
		"div_id": "div",//挿入するdivのid
		"global": true,//trueの場合、値をc_globalに渡し、変更可能にする
		"change": true,
		"leaflet": true,
		"clickable": true,//線等をクリックできる
		"timetable": true,//時刻表を表示する
		"direction": true,
		"parent_route_id": "route_id",
		"stop_name": true,
		"stop_name_overlap":true,
		"zoom_level": 16,
		"svg_zoom_level": 16, //互換性のため残す
		"cut_zoom_level": 16, //f_cut_shape_segments用
		"svg_zoom_ratio": 0, //SVG表示縮小率=zoom_level - svg_zoom_level
		"background_map": true,
		"background_layers": [["https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png", {attribution: "<a href=\"https://maps.gsi.go.jp/development/ichiran.html\">地理院タイル</a>", opacity: 0.25}]],
		"font_size": 16, //停留所名のフォントサイズ
		"font_family": "'源ノ角ゴシック'", //停留所名のフォント、二重のクオーテーションマークに注意
		"stop_color_standard": "#000000", //通常の停留所記号の色
		"stop_color_nonstandard": "#FFFFFF", //起終点等の停留所記号の色
		"stop_color_location": "#C0C0C0", //位置を示す停留所記号の色
		"stop_stroke_color": "#000000", //停留所記号の縁の色
		"stop_stroke_width": 1, //停留所記号の縁の太さ
		"show_stop_location": true, //停留所位置の記号を表示
		"stop_direction": true, //停留所記号を三角形にして向きを明示
		"min_space_width": 2, //線の間隔の最小幅
		"min_width": 4, //線の最小幅
		"max_width": 8, //線の最大幅
		"round": true //, //角を丸める
	};
	//change trueの場合、設定を変更する
	//leaflet trueの場合、使用
	//direction trueの場合、上り下りを分けて描画する
	//parent_route_id まとめる単位
	//stop_name trueの場合、表示する
	//stop_name_overlap trueの場合、重なりを許容する
	//zoom_level 途中計算で使うズームレベル。なんでもよいが16にしておく。
	//svg_zoom_lavel SVG出力時のズームレベル。表示される相対的なオフセット幅や文字サイズに影響する。1614は可変。拡大縮小のscaleはここを使う。
	//background_map trueの場合、表示する
	//min_width 線の最小幅、単位はpx

	//空欄を初期値で埋める
	for (let i1 in c_input_settings) {
		if (a_settings[i1] === undefined) {
			a_settings[i1] = c_input_settings[i1];
		}
	}
	
	//設定の制限（暫定的に連動）
	if (a_settings["global"] === true) {
		a_settings["change"] = true;
		a_settings["leaflet"] = true;
		a_settings["clickable"] = true;
		a_settings["timetable"] = true;
	}
	//設定の制限
	//グローバルにしないと後から変えられない
	if (a_settings["global"] !== true) {
		a_settings["change"] = false;
		a_settings["leaflet"] = false;
		a_settings["clickable"] = false;
		a_settings["timetable"] = false;
	}
	//設定の制限
	//クリックできないと時刻表を表示できない
	if (a_settings["clickable"] !== true) {
		a_settings["timetable"] = false;
	}
	//設定の互換性
	if (a_settings["svg_zoom_ratio"] === undefined) {
		if (a_settings["svg_zoom_level"] === 1614) {
			a_settings["svg_zoom_ratio"] = 2;
		} else {
			a_settings["svg_zoom_ratio"] = 0;
		}
	}
	return a_settings;
}