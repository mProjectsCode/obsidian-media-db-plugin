import {APIModel} from './APIModel';
import {MediaTypeModel} from '../models/MediaTypeModel';
import {debugLog} from '../utils/Utils';

export class APIManager {
	apis: APIModel[];

	constructor() {
		this.apis = [];
	}

	async query(query: string, apisToQuery: any): Promise<MediaTypeModel[]> {
		debugLog(`MDB | api manager queried with "${query}"`);

		let res: MediaTypeModel[] = [];

		for (const api of this.apis) {
			if (Object.keys(apisToQuery).contains(api.apiName) && apisToQuery[api.apiName]) {
				const apiRes = await api.searchByTitle(query);
				res = res.concat(apiRes);
			}
		}

		return res;
	}

	async queryDetailedInfo(item: MediaTypeModel): Promise<MediaTypeModel> {
		return await this.queryDetailedInfoById(item.id, item.dataSource);
	}

	async queryDetailedInfoById(id: string, dataSource: string): Promise<MediaTypeModel> {
		for (const api of this.apis) {
			if (api.apiName === dataSource) {
				return api.getById(id);
			}
		}
	}

	getApiByName(name: string): APIModel {
		for (const api of this.apis) {
			if (api.apiName === name) {
				return api;
			}
		}

		return null;
	}

	registerAPI(api: APIModel): void {
		this.apis.push(api);
	}
}
