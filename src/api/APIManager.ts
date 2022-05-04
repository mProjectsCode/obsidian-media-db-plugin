import {APIModel} from './APIModel';
import {APIRequestResult} from './APIRequestResult';

export class APIManager {
	apis: APIModel[];

	constructor() {
		this.apis = [];
	}

	async query(query: string, types: string[] = []): Promise<APIRequestResult[]> {
		console.log('MDB | api manager queried');

		let res: APIRequestResult[] = [];

		for (const api of this.apis) {
			if (types.length === 0 || api.hasTypeOverlap(types)) {
				const apiRes = await api.getByTitle(query);
				// console.log(apiRes);
				res = res.concat(apiRes);
			}
		}

		return res;
	}

	registerAPI(api: APIModel): void {
		this.apis.push(api);
	}
}
