//HTMLの変更
export function f_html(a_settings) {
	let l_html = "";
	//leaflet
	if (a_settings["leaflet"] === true) {
		l_html += "<div id=\"div_leaflet\" style=\"width: auto; height: 768px; background: #FFFFFF;\"></div>"; //背景色を白にしておく
	}
	//clickable
	if (a_settings["clickable"] === true) {
		l_html += "<div><a id=\"output_svg\" href=\"#\" download=\"busmap.svg\" onclick=\"f_output_svg()\">SVG保存</a></div>";
		l_html += "<div>地図上の線や停留所記号、停留所名をクリックすると、強調表示や時刻表の表示ができる。</div>";
		l_html += "<div><span style=\"color: blue; text-decoration: underline;\" onclick=\"f_route_color()\">全路線を着色</span> <span style=\"color: blue; text-decoration: underline;\" onclick=\"f_tooltip()\">補足非表示</span></div>";
	}
	//設定変更項目の表示
	if (a_settings["change"] === true) {
		let l_setting_table = "<div><span style=\"color: blue; text-decoration: underline;\" onclick=\"f_open(l_data, l_settings)\">設定</span></div>";
		l_setting_table += "<table><tbody>";
		l_setting_table += "<tr><td>項目</td><td>現在の値</td><td>変更</td></tr>";
		l_setting_table += "<tr><td>往復を分けて表示</td><td id=\"td_direction\">" + a_settings["direction"] + "</td><td><span style=\"color: blue; text-decoration: underline;\" onclick=\"f_change_setting('direction',true)\">true</span> <span style=\"color: blue; text-decoration: underline;\" onclick=\"f_change_setting('direction',false)\">false</span></td></tr>";
		l_setting_table += "<tr><td>表示する単位</td><td id=\"td_parent_route_id\">" + a_settings["parent_route_id"] + "</td><td><span style=\"color: blue; text-decoration: underline;\" onclick=\"f_change_setting('parent_route_id','ur_route_id')\">最小</span> <span style=\"color: blue; text-decoration: underline;\" onclick=\"f_change_setting('parent_route_id','route_id')\">route_id</span> <span style=\"color: blue; text-decoration: underline;\" onclick=\"f_change_setting('parent_route_id','jp_parent_route_id')\">jp_parent_route_id</span> <span style=\"color: blue; text-decoration: underline;\" onclick=\"f_change_setting('parent_route_id','route_short_name')\">route_short_name</span> <span style=\"color: blue; text-decoration: underline;\" onclick=\"f_change_setting('parent_route_id','route_long_name')\">route_long_name</span> <span style=\"color: blue; text-decoration: underline;\" onclick=\"f_change_setting('parent_route_id','route_desc')\">route_desc</span> <span style=\"color: blue; text-decoration: underline;\" onclick=\"f_change_setting('parent_route_id','jp_office_id')\">jp_office_id</span> <span style=\"color: blue; text-decoration: underline;\" onclick=\"f_change_setting('parent_route_id','agency_id')\">agency_id</span> <span style=\"color: blue; text-decoration: underline;\" onclick=\"f_change_setting('parent_route_id','')\">全て</span></td></tr>";
		l_setting_table += "<tr><td>停留所名を表示</td><td id=\"td_stop_name\">" + a_settings["stop_name"] + "</td><td><span style=\"color: blue; text-decoration: underline;\" onclick=\"f_change_setting('stop_name',true)\">true</span> <span style=\"color: blue; text-decoration: underline;\" onclick=\"f_change_setting('stop_name',false)\">false</span></td></tr>";
		l_setting_table += "<tr><td>停留所名の重なりを回避（非常に遅いので注意）</td><td id=\"td_stop_name_overlap\">" + a_settings["stop_name_overlap"] + "</td><td><span style=\"color: blue; text-decoration: underline;\" onclick=\"f_change_setting('stop_name_overlap',true)\">true</span> <span style=\"color: blue; text-decoration: underline;\" onclick=\"f_change_setting('stop_name_overlap',false)\">false</span></td></tr>";
		l_setting_table += "<tr><td>背景地図を表示</td><td id=\"td_background_map\">" + a_settings["background_map"] + "</td><td><span style=\"color: blue; text-decoration: underline;\" onclick=\"f_change_setting('background_map',true)\">true</span> <span style=\"color: blue; text-decoration: underline;\" onclick=\"f_change_setting('background_map',false)\">false</span></td></tr>";
		l_setting_table += "</tbody></table>";
		l_setting_table += "<div id=\"ur_route_list\"></div>";
		l_html += "<div id=\"div_setting_table\">" + l_setting_table + "</div>";
	}
	//timetable
	if (a_settings["timetable"] === true) {
		let l_div4 = "";
		l_div4 += "<div>路線時刻表</div>";
		l_div4 += "<div id=\"parent_route_timetable\" style=\"height: 256px; overflow: scroll; white-space: nowrap;\"></div>";
		l_div4 += "<div>ダイヤグラム</div>";
		l_div4 += "<div id=\"svg_timetable\" style=\"height: 256px; overflow: scroll; white-space: nowrap;\"></div>";
		l_div4 += "<div><span id=\"stop_name\">標柱</span><span>の時刻表（便をクリックすると地図上に到着時刻を表示）</span> <span onclick=\"f_timetable()\">地図上の到着時刻を非表示</span></div>";
		l_div4 += "<div id=\"timetable\" style=\"height: 256px; overflow: scroll; white-space: nowrap;\"></div>";
		l_div4 += "<div>経由路線（路線をクリックすると路線時刻表とダイヤグラムを表示し、地図上で強調表示）</div>";
		l_div4 += "<ul id=\"route_list\"></ul>";
		l_html += "<div id=\"div_timetable\">" + l_div4 + "</div>";
	}
	return l_html;
}