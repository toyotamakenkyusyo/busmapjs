# busmapjs
これは、GTFS等からバスマップを作るJavaScriptです。
使用例は<a href="https://toyotamakenkyusyo.github.io/busmapjs/busmapjs.xhtml">https://toyotamakenkyusyo.github.io/busmapjs/busmapjs.xhtml</a>にあります。
リアルタイム情報を含む使用例は<a href="https://ss1.xrea.com/toyotama.g1.xrea.com/bus/busmapjs/busmapjs.xhtml">https://ss1.xrea.com/toyotama.g1.xrea.com/bus/busmapjs/busmapjs.xhtml</a>にあります。
使い方の説明などは、今後書く予定です。
## ファイルの説明
- <a href="busmap_module.js">busmap_module.js</a>  
- <a href="busmapjs_module.xhtml">busmapjs_module.xhtml</a>  
module分割を進めたもの。簡単な経路検索機能をつけた。  
- <a href="js/f_binary_to_json.js">js/f_binary_to_json.js</a>  
- <a href="js/f_csv_to_json.js">js/f_csv_to_json.js</a>  
GTFSの各CSVファイル（stops.txt等）をJavaScriptのobjectに変換する
- <a href="js/f_from_api.js">js/f_from_api.js</a>  
TraRepoのapiを読み込む
- <a href="js/f_from_geojson.js">js/f_from_geojson.js</a>  
独自形式GeoJSONを読み込む
- <a href="js/f_from_topojson.js">js/f_from_topojson.js</a>  
独自形式TopoJSONを読み込む、廃止予定
- <a href="js/f_html.js">js/f_html.js</a>  
ウェブページで表示するときの、Leafletや表示の設定を行うHTMLを書き出す
- <a href="js/f_input_settings.js">js/f_input_settings.js</a>
初期設定を読み込む
- <a href="js/f_lonlat_xy.js">js/f_lonlat_xy.js</a>  
緯度経度をxyと変換する
- <a href="js/f_make_bmd.js">js/f_make_bmd.js</a>  
使用停止？
- <a href="js/f_make_parent_stations.js">js/f_make_parent_stations.js</a>  
標柱のstopからparent_stationを作る
- <a href="js/f_make_shape_pt_array.js">js/f_make_shape_pt_array.js</a>  
- <a href="js/f_make_shape_segments.js">js/f_make_shape_segments.js</a>  
- <a href="js/f_make_ur_routes.js">js/f_make_ur_routes.js</a>  
- <a href="js/f_number_gtfs.js">js/f_number_gtfs.js</a>  
- <a href="js/f_offset_segment_array.js">js/f_offset_segment_array.js</a>  
- <a href="js/f_prepare_gtfs.js">js/f_prepare_gtfs.js</a>  
- <a href="js/f_prepare_json.js">js/f_prepare_json.js</a>  
- <a href="js/f_set_color.js">js/f_set_color.js</a>  
route_colorがない場合に設定する
- <a href="js/f_set_route_sort_order.js">js/f_set_route_sort_order.js</a>  
route_sort_orderがない場合に設定する
- <a href="js/f_set_stop_type.js">js/f_set_stop_type.js</a>  
- <a href="js/f_set_width_offset.js">js/f_set_width_offset.js</a>  
- <a href="js/f_stop_number.js">js/f_stop_number.js</a>  
- <a href="js/f_xhr_get.js">js/f_xhr_get.js</a>  
XMLHttpRequestにより外部ファイルを読み込む
- <a href="js/f_zip_to_text.js">js/f_zip_to_text.js</a>  
GTFSのZIPを展開して中のCSVファイルを読み込む
