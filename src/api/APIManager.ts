import {APIModel} from './APIModel';
import {MediaTypeModel} from '../models/MediaTypeModel';

export class APIManager {
	apis: APIModel[];

	constructor() {
		this.apis = [];
	}

	async query(query: string, types: string[] = []): Promise<MediaTypeModel[]> {
		console.log('MDB | api manager queried');

		let res: MediaTypeModel[] = [];

		for (const api of this.apis) {
			if (types.length === 0 || api.hasTypeOverlap(types)) {
				const apiRes = await api.searchByTitle(query);
				// console.log(apiRes);
				res = res.concat(apiRes);
			}
		}

		return res;
	}

	async queryDetailedInfo(item: MediaTypeModel): Promise<MediaTypeModel> {
		for (const api of this.apis) {
			if (api.apiName === item.dataSource) {
				return api.getById(item);
			}
		}
	}

	registerAPI(api: APIModel): void {
		this.apis.push(api);
	}
}
