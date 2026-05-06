import type { APIModel } from 'packages/obsidian/src/api/APIModel';
import type { MediaTypeModel } from 'packages/obsidian/src/models/MediaTypeModel';
import { Logger } from 'packages/obsidian/src/utils/Logger';
import type { MDBError } from 'packages/obsidian/src/utils/MDBError';
import { MDBErrorKind, toMdbError } from 'packages/obsidian/src/utils/MDBError';
import type { Result } from 'packages/obsidian/src/utils/result';
import { err, ok } from 'packages/obsidian/src/utils/result';

export interface ApiQueryOk {
	items: MediaTypeModel[];
	warnings: MDBError[];
}

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
	async query(query: string, apisToQuery: string[]): Promise<Result<ApiQueryOk, MDBError>> {
		Logger.debug(`MDB | api manager queried with "${query}"`);

		const apis = this.apis.filter(api => apisToQuery.includes(api.apiName));
		const results = await Promise.all(apis.map(api => api.searchByTitle(query)));

		const items: MediaTypeModel[] = [];
		const warnings: MDBError[] = [];
		for (const result of results) {
			if (result.ok) {
				items.push(...result.value);
			} else {
				warnings.push(result.error);
			}
		}

		if (items.length === 0 && warnings.length > 0) {
			// If all APIs failed, surface an error (using the first as representative)
			return err(
				toMdbError(warnings[0], {
					kind: MDBErrorKind.Api,
					message: 'Failed to query APIs',
					userMessage: 'Failed to query APIs',
					context: { query, apisToQuery },
				}),
			);
		}

		for (const warning of warnings) {
			Logger.warn(warning);
		}

		return ok({ items, warnings });
	}

	/**
	 * Queries detailed information for a MediaTypeModel.
	 *
	 * @param item
	 */
	async queryDetailedInfo(item: MediaTypeModel): Promise<Result<MediaTypeModel | undefined, MDBError>> {
		return await this.queryDetailedInfoById(item.id, item.dataSource);
	}

	/**
	 * Queries detailed info for an id from an API.
	 *
	 * @param id
	 * @param apiName
	 */
	async queryDetailedInfoById(id: string, apiName: string): Promise<Result<MediaTypeModel | undefined, MDBError>> {
		for (const api of this.apis) {
			if (api.apiName === apiName) {
				const result = await api.getById(id);

				if (!result.ok) {
					Logger.warn(result.error);
				}

				return result.ok ? ok(result.value) : err(result.error);
			}
		}

		return err(
			toMdbError(new Error(`API not found: ${apiName}`), {
				kind: MDBErrorKind.Validation,
				message: `API not found: ${apiName}`,
				userMessage: `API not found: ${apiName}`,
				context: { apiName, id },
			}),
		);
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
