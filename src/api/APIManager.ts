import { APIModel } from './APIModel';
import { MediaTypeModel } from '../models/MediaTypeModel';

export class APIManager {
	apis: APIModel[];

	constructor() {
		this.apis = [];
	}

	/**
	 * Queries the basic info for one query string and multiple APIs.
	 *
	 * @param query
	 * @param apisToQuery
	 */
	async query(query: string, apisToQuery: string[]): Promise<MediaTypeModel[]> {
		console.debug(`MDB | api manager queried with "${query}"`);

		let res: MediaTypeModel[] = [];

		for (const api of this.apis) {
			if (apisToQuery.contains(api.apiName)) {
				try {
					const apiRes = await api.searchByTitle(query);
					res = res.concat(apiRes);
				} catch (e) {
					console.warn(e);
				}
			}
		}

		return res;
	}

	/**
	 * Queries detailed information for a MediaTypeModel.
	 *
	 * @param item
	 */
	async queryDetailedInfo(item: MediaTypeModel): Promise<MediaTypeModel> {
		return await this.queryDetailedInfoById(item.id, item.dataSource);
	}

	/**
	 * Queries detailed info for an id from an API.
	 *
	 * @param id
	 * @param apiName
	 */
	async queryDetailedInfoById(id: string, apiName: string): Promise<MediaTypeModel> {
		for (const api of this.apis) {
			if (api.apiName === apiName) {
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
