export function f_binary_to_json(a_binary, a_grb) {
	const c_array_1 = new Uint8Array(a_binary);
	const c_array_2 = [];
	for (i1 = 3; i1 < c_array_1.length; i1++) {
		c_array_2.push(c_array_1[i1]);
	}
	return a_grb.FeedMessage.decode(c_array_2);
}