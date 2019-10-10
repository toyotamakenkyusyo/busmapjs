//a_xhr_getはf_xhr_get.jsのf_xhr_getを入れる
//a_zlibはhttps://cdn.jsdelivr.net/npm/zlibjs@0.3.1/bin/unzip.min.jsのZlibを入れる
export async function f_zip_to_text(a_url, a_xhr_get, a_zlib) {
	const c_array = (await a_xhr_get(a_url, "arraybuffer")).response;
	const c_byte = new Uint8Array(c_array);
	const c_unzip = new a_zlib.Unzip(c_byte);
	const c_filenames = c_unzip.getFilenames();
	const c_plain = c_unzip.decompress(c_filenames[0]);
	const c_files = {};
	for (let i1 = 0; i1 < c_filenames.length; i1++) {
		c_files[c_filenames[i1]] = new TextDecoder("utf-8").decode(Uint8Array.from(c_unzip.decompress(c_filenames[i1])).buffer);
	}
	return c_files;
}