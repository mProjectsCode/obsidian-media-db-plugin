import { Notice } from 'obsidian';
import type { MediaTypeModel } from '../models/MediaTypeModel';
import type { MediaType } from '../utils/MediaType';
import {
	isMusicBrainzFamilyDataSource,
	musicBrainzRegisteredApiName,
	MUSICBRAINZ_NOTE_DATA_SOURCE,
} from './musicBrainzConstants';
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
		return await this.queryDetailedInfoById(item.id, item.dataSource, item.getMediaType());
	}

	/**
	 * Queries detailed info for an id from an API.
	 * MusicBrainz-backed notes use on-disk dataSource `MusicBrainz`; `mediaType` picks Artist vs release/song API.
	 *
	 * @param id
	 * @param apiName Stored dataSource on the note, or an exact {@link APIModel.apiName} (e.g. bulk import / ID search).
	 * @param mediaType When set with a MusicBrainz family dataSource, selects which MusicBrainz API handles {@link getById}.
	 */
	async queryDetailedInfoById(id: string, apiName: string, mediaType?: MediaType): Promise<MediaTypeModel | undefined> {
		const trimmed = apiName.trim();
		const effectiveApiName =
			trimmed === '' && mediaType !== undefined && musicBrainzRegisteredApiName(mediaType)
				? MUSICBRAINZ_NOTE_DATA_SOURCE
				: trimmed || apiName;

		if (isMusicBrainzFamilyDataSource(effectiveApiName) && mediaType !== undefined) {
			const registeredName = musicBrainzRegisteredApiName(mediaType);
			if (registeredName) {
				const api = this.getApiByName(registeredName);
				if (api) {
					try {
						return await api.getById(id);
					} catch (e) {
						new Notice(`Error querying ${api.apiName}: ${e}`);
						console.warn(e);

						return undefined;
					}
				}
			}
		}

		for (const api of this.apis) {
			if (api.apiName === effectiveApiName) {
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
