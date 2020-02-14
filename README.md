# busmapjs
これは、GTFS等からバスマップを作るJavaScriptです。
使用例は<a href="https://toyotamakenkyusyo.github.io/busmapjs/busmapjs.xhtml">https://toyotamakenkyusyo.github.io/busmapjs/busmapjs.xhtml</a>にあります。
リアルタイム情報を含む使用例は<a href="https://ss1.xrea.com/toyotama.g1.xrea.com/bus/busmapjs/busmapjs.xhtml">https://ss1.xrea.com/toyotama.g1.xrea.com/bus/busmapjs/busmapjs.xhtml</a>にあります。
使い方の説明などは、今後書く予定です。
## ファイルの説明
- busmap.js  
- busmapjs.xhtml  
元々のbusmapjsで安定版的存在。  
- busmap_module.js
- busmapjs_module.xhtml  
module分割を試みたもの。未完と思われる。  
- busmap_module2.js  
- busmap_module2.xhtml  
module分割を進めたもの。簡単な経路検索機能をつけた。  
- offset_gtfs.xhtml  
-	polylineoffset.xhtml  
leaflet.polylineoffsetを使ってみた試作品
-	test.geojson  
-	test.topojson  
- busmapjs_geojson.xhtml  
-	busmapjs_topojson.xhtml  
GeoJSON、TopoJSONの入力サンプル
- busmapjs_api.xhtml
-	trarepo_map.js  
-	trarepo_map.xhtml  
TraRepoの入力サンプル

