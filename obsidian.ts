import { RequestUrlParam, RequestUrlResponse } from 'obsidian';

export function requestUrl(request: RequestUrlParam): Promise<RequestUrlResponse> {
	return fetch(request.url, {
		method: request.method,
		headers: request.headers,
		body: request.body,
	}).then(async response => {
		if (response.status >= 400 && request.throw) {
			throw new Error(`Request failed, ${response.status}`);
		}

		// Turn response headers into Record<string, string> object
		const headers: Record<string, string> = {};
		response.headers.forEach((value, key) => {
			headers[key] = value;
		});

		const arraybuffer = await response.arrayBuffer();
		const text = arraybuffer ? new TextDecoder().decode(arraybuffer) : '';
		const json = text ? JSON.parse(text) : {};

		let response_body: RequestUrlResponse = {
			status: response.status,
			headers: headers,
			arrayBuffer: arraybuffer,
			json: json,
			text: text,
		};
		return response_body;
	});
}
