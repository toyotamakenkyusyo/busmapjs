export function f_xhr_get(a_url, a_type) {
	function f_promise(a_resolve, a_reject) {
		const c_xhr = new XMLHttpRequest();
		c_xhr.responseType = a_type;
		c_xhr.open("get", a_url);
		function f_resolve() {
			a_resolve(c_xhr);
		}
		function f_reject() {
			a_reject("error");
		}
		c_xhr.onload = f_resolve;
		c_xhr.onerror = f_reject;
		c_xhr.send(null);
	}
	return new Promise(f_promise);
}