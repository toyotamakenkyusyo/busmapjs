export function f_xhr_get(a_url, a_type) {
	//a_urlはURLの文字列
	//a_typeはresponseType（arraybuffer、json、text等）
	function f_promise(a_resolve, a_reject) {
		const c_xhr = new XMLHttpRequest();
		c_xhr.responseType = a_type;
		c_xhr.open("get", a_url);
		function f_resolve() {
			console.log(c_xhr);
			if (c_xhr.status === 200) {
				a_resolve(c_xhr.response);
			} else {
				f_reject();
			}
		}
		function f_reject() {
			a_reject(new Error("XHR失敗"));
		}
		c_xhr.onloadend = f_resolve;
		c_xhr.onabort = f_reject;
		c_xhr.ontimeout = f_reject;
		c_xhr.send(null);
	}
	return new Promise(f_promise);
	//出力はresponseTypeに応じたもの（JSONならobject、textなら文字列等）
}