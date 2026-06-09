/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

import { requestUrl } from 'obsidian';
import { APIModel } from 'packages/obsidian/src/api/APIModel';
import type MediaDbPlugin from 'packages/obsidian/src/main';
import { ComicMangaModel } from 'packages/obsidian/src/models/ComicMangaModel';
import type { MediaTypeModel } from 'packages/obsidian/src/models/MediaTypeModel';
import { Logger } from 'packages/obsidian/src/utils/Logger';
import type { MDBError } from 'packages/obsidian/src/utils/MDBError';
import { MDBErrorKind, toMdbError } from 'packages/obsidian/src/utils/MDBError';
import { MediaType } from 'packages/obsidian/src/utils/MediaType';
import type { Result } from 'packages/obsidian/src/utils/result';
import { err, fromPromise, ok } from 'packages/obsidian/src/utils/result';

// sadly no open api schema available

export class ComicVineAPI extends APIModel {
	plugin: MediaDbPlugin;

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'ComicVineAPI';
		this.apiDescription = 'A free API for comic books.';
		this.apiUrl = 'https://comicvine.gamespot.com/api';
		this.types = [MediaType.ComicManga];
	}

	async searchByTitle(title: string): Promise<Result<MediaTypeModel[], MDBError>> {
		Logger.log(`MDB | api "${this.apiName}" queried by Title`);
		const key = this.plugin.app.secretStorage.getSecret(this.plugin.settings.ComicVineKeyId);
		if (!key) {
			return err({
				kind: MDBErrorKind.Validation,
				message: `MDB | API key for ${this.apiName} missing.`,
				userMessage: `API key for ${this.apiName} missing.`,
				context: { apiName: this.apiName },
			});
		}

		const searchUrl = `${this.apiUrl}/search/?api_key=${key}&format=json&resources=volume&query=${encodeURIComponent(title)}`;
		const fetchDataResult = await fromPromise(
			requestUrl({
				url: searchUrl,
			}),
			cause =>
				toMdbError(cause, {
					kind: MDBErrorKind.Network,
					message: `MDB | Network error querying ${this.apiName}`,
					userMessage: `Network error querying ${this.apiName}`,
					context: { apiName: this.apiName, title },
				}),
		);
		if (!fetchDataResult.ok) {
			return err(fetchDataResult.error);
		}
		const fetchData = fetchDataResult.value;
		// console.debug(fetchData);
		if (fetchData.status !== 200) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | Received status code ${fetchData.status} from ${this.apiName}.`,
				userMessage: `Received status code ${fetchData.status} from ${this.apiName}.`,
				context: { apiName: this.apiName, status: fetchData.status },
			});
		}

		const data = await fetchData.json;
		// console.debug(data);
		const ret: MediaTypeModel[] = [];
		for (const result of data.results) {
			ret.push(
				new ComicMangaModel({
					title: result.name,
					englishTitle: result.name,
					year: result.start_year,
					dataSource: this.apiName,
					id: `4050-${result.id}`,
					publishers: result.publisher?.name,
				}),
			);
		}

		return ok(ret);
	}

	async getById(id: string): Promise<Result<MediaTypeModel, MDBError>> {
		Logger.log(`MDB | api "${this.apiName}" queried by ID`);
		const key = this.plugin.app.secretStorage.getSecret(this.plugin.settings.ComicVineKeyId);
		if (!key) {
			return err({
				kind: MDBErrorKind.Validation,
				message: `MDB | API key for ${this.apiName} missing.`,
				userMessage: `API key for ${this.apiName} missing.`,
				context: { apiName: this.apiName, id },
			});
		}

		const searchUrl = `${this.apiUrl}/volume/${encodeURIComponent(id)}/?api_key=${key}&format=json`;
		const fetchDataResult = await fromPromise(
			requestUrl({
				url: searchUrl,
			}),
			cause =>
				toMdbError(cause, {
					kind: MDBErrorKind.Network,
					message: `MDB | Network error querying ${this.apiName}`,
					userMessage: `Network error querying ${this.apiName}`,
					context: { apiName: this.apiName, id },
				}),
		);
		if (!fetchDataResult.ok) {
			return err(fetchDataResult.error);
		}
		const fetchData = fetchDataResult.value;

		Logger.debug(fetchData);

		if (fetchData.status !== 200) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | Received status code ${fetchData.status} from ${this.apiName}.`,
				userMessage: `Received status code ${fetchData.status} from ${this.apiName}.`,
				context: { apiName: this.apiName, status: fetchData.status, id },
			});
		}

		const data = await fetchData.json;
		const result = data.results;

		const authors = result.people as
			| {
					name: string;
			  }[]
			| undefined;

		return ok(
			new ComicMangaModel({
				type: MediaType.ComicManga,
				title: result.name,
				englishTitle: result.name,
				alternateTitles: result.aliases,
				plot: result.deck,
				year: result.start_year,
				dataSource: this.apiName,
				url: result.site_detail_url,
				id: `4050-${result.id}`,

				authors: authors?.map(x => x.name),
				chapters: result.count_of_issues,
				image: result.image?.original_url,

				released: true,
				publishers: result.publisher?.name,
				publishedFrom: result.start_year,
				status: result.status,

				userData: {
					read: false,
					lastRead: '',
					personalRating: 0,
				},
			}),
		);
	}
	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.ComicVineAPI_disabledMediaTypes;
	}
}
