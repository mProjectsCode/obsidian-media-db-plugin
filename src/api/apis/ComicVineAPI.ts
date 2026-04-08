/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

import { requestUrl } from 'obsidian';
import { ComicMangaModel } from 'src/models/ComicMangaModel';
import type MediaDbPlugin from '../../main';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { ApiSecretID, getApiSecretValue } from '../../settings/apiSecretsHelper';
import { MediaType } from '../../utils/MediaType';
import { coerceYear } from '../../utils/Utils';
import { verboseDebug, verboseLog } from '../../utils/verboseLog';
import { APIModel } from '../APIModel';

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

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		verboseLog(`api "${this.apiName}" queried by Title`);

		const apiKey = getApiSecretValue(this.plugin.app, this.plugin.settings.linkedApiSecretIds, ApiSecretID.comicVine);
		if (!apiKey) {
			throw Error(`[Media DB] API key for ${this.apiName} missing.`);
		}

		const searchUrl = `${this.apiUrl}/search/?api_key=${apiKey}&format=json&resources=volume&query=${encodeURIComponent(title)}`;
		const fetchData = await requestUrl({
			url: searchUrl,
		});
		// console.debug(fetchData);
		if (fetchData.status !== 200) {
			throw Error(`[Media DB] Received status code ${fetchData.status} from ${this.apiName}.`);
		}

		const data = await fetchData.json;
		// console.debug(data);
		const ret: MediaTypeModel[] = [];
		for (const result of data.results) {
			ret.push(
				new ComicMangaModel({
					title: result.name,
					englishTitle: result.name,
					year: coerceYear(result.start_year),
					dataSource: this.apiName,
					id: `4050-${result.id}`,
					publishers: result.publisher?.name,
				}),
			);
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		verboseLog(`api "${this.apiName}" queried by ID`);

		const apiKey = getApiSecretValue(this.plugin.app, this.plugin.settings.linkedApiSecretIds, ApiSecretID.comicVine);
		if (!apiKey) {
			throw Error(`[Media DB] API key for ${this.apiName} missing.`);
		}

		const searchUrl = `${this.apiUrl}/volume/${encodeURIComponent(id)}/?api_key=${apiKey}&format=json`;
		const fetchData = await requestUrl({
			url: searchUrl,
		});

		verboseDebug(fetchData);

		if (fetchData.status !== 200) {
			throw Error(`[Media DB] Received status code ${fetchData.status} from ${this.apiName}.`);
		}

		const data = await fetchData.json;
		const result = data.results;

		const authors = result.people as
			| {
					name: string;
			  }[]
			| undefined;

		return new ComicMangaModel({
			type: MediaType.ComicManga,
			title: result.name,
			englishTitle: result.name,
			alternateTitles: result.aliases,
			plot: result.deck,
			year: coerceYear(result.start_year),
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
		});
	}
	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.ComicVineAPI_disabledMediaTypes;
	}
}
