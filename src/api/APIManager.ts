import { Notice } from 'obsidian';
import type { MediaTypeModel } from '../models/MediaTypeModel';
import type { APIModel } from './APIModel';

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

		const promises = this.apis
			.filter(api => apisToQuery.contains(api.apiName))
			.map(async api => {
				try {
					return await api.searchByTitle(query);
				} catch (e) {
					new Notice(`Error querying ${api.apiName}: ${e}`);
					console.warn(e);

					return [];
				}
			});

		return (await Promise.all(promises)).flat();
	}

	/**
	 * Queries detailed information for a MediaTypeModel.
	 *
	 * @param item
	 */
	async queryDetailedInfo(item: MediaTypeModel): Promise<MediaTypeModel | undefined> {
		return await this.queryDetailedInfoById(item.id, item.dataSource);
	}

	/**
	 * Queries detailed info for an id from an API.
	 *
	 * @param id
	 * @param apiName
	 */
	async queryDetailedInfoById(id: string, apiName: string): Promise<MediaTypeModel | undefined> {
		for (const api of this.apis) {
			if (api.apiName === apiName) {
				try {
					return api.getById(id);
				} catch (e) {
					new Notice(`Error querying ${api.apiName}: ${e}`);
					console.warn(e);

					return undefined;
				}
			}
		}

		return undefined;
	}

	getApiByName(name: string): APIModel | undefined {
		for (const api of this.apis) {
			if (api.apiName === name) {
				return api;
			}
		}

		return undefined;
	}

	registerAPI(api: APIModel): void {
		this.apis.push(api);
	}
}
