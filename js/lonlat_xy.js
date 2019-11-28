//WGS84（EPSG:4326）との変換
//ウェブメルカトルのタイル番号（左手系）
//EPSG:3857（メートル単位）（右手系）a_zoom_level === "m"とする。
export function f_lon_to_x(a_lon, a_zoom_level) {
	if (a_zoom_level === "m") {
		return a_lon / 180 * 6378137 * Math.PI;
	}
	return (a_lon / 180 + 1) * 0.5 * (2 ** a_zoom_level);
}
export function f_lat_to_y(a_lat, a_zoom_level) {
	if (a_zoom_level === "m") {
		return  Math.atanh(Math.sin(a_lat * Math.PI / 180)) * 6378137;
	}
	return (1 - Math.atanh(Math.sin(a_lat * Math.PI / 180)) / Math.PI) * 0.5 * (2 ** a_zoom_level);
}
export function f_x_to_lon(a_x, a_zoom_level) {
	if (a_zoom_level === "m") {
		return a_x / Math.PI / 6378137 * 180;
	}
	return (a_x / (2 ** a_zoom_level) / 0.5- 1) * 180;
}
export function f_y_to_lat(a_y, a_zoom_level) {
	if (a_zoom_level === "m") {
		return Math.asin(Math.tanh(a_y / 6378137)) * 180 / Math.PI;
	}
	return Math.asin(Math.tanh((1 - a_y / (2 ** a_zoom_level) / 0.5) * Math.PI)) * 180 / Math.PI;
}