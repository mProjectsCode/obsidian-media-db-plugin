import { requestUrl } from 'obsidian';
import type MediaDbPlugin from '../../main';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { MusicReleaseModel } from '../../models/MusicReleaseModel';
import { MediaType } from '../../utils/MediaType';
import { contactEmail, mediaDbVersion, pluginName } from '../../utils/Utils';
import { APIModel } from '../APIModel';

export class MusicBrainzAPI extends APIModel {
	plugin: MediaDbPlugin;
	apiDateFormat: string = 'YYYY-MM-DD';

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'MusicBrainz API';
		this.apiDescription = 'Free API for music albums.';
		this.apiUrl = 'https://musicbrainz.org/';
		this.types = [MediaType.MusicRelease];
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		const searchUrl = `https://musicbrainz.org/ws/2/release-group?query=${encodeURIComponent(title)}&limit=20&fmt=json`;

		const fetchData = await requestUrl({
			url: searchUrl,
			headers: {
				'User-Agent': `${pluginName}/${mediaDbVersion} (${contactEmail})`,
			},
		});

		// console.debug(fetchData);

		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from ${this.apiName}.`);
		}

		const data = await fetchData.json;
		// console.debug(data);
		const ret: MediaTypeModel[] = [];

		for (const result of data['release-groups']) {
			ret.push(
				new MusicReleaseModel({
					type: 'musicRelease',
					title: result.title,
					englishTitle: result.title,
					year: new Date(result['first-release-date']).getFullYear().toString(),
					releaseDate: this.plugin.dateFormatter.format(result['first-release-date'], this.apiDateFormat) ?? 'unknown',
					dataSource: this.apiName,
					url: 'https://musicbrainz.org/release-group/' + result.id,
					id: result.id,
					image: 'https://coverartarchive.org/release-group/' + result.id + '/front-500.jpg',

					artists: result['artist-credit'].map((a: any) => a.name),
					subType: result['primary-type'],
				}),
			);
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		const searchUrl = `https://musicbrainz.org/ws/2/release-group/${encodeURIComponent(id)}?inc=releases+artists+tags+ratings+genres&fmt=json`;
		const fetchData = await requestUrl({
			url: searchUrl,
			headers: {
				'User-Agent': `${pluginName}/${mediaDbVersion} (${contactEmail})`,
			},
		});

		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from ${this.apiName}.`);
		}

		const result = await fetchData.json;

		return new MusicReleaseModel({
			type: 'musicRelease',
			title: result.title,
			englishTitle: result.title,
			year: new Date(result['first-release-date']).getFullYear().toString(),
			releaseDate: this.plugin.dateFormatter.format(result['first-release-date'], this.apiDateFormat) ?? 'unknown',
			dataSource: this.apiName,
			url: 'https://musicbrainz.org/release-group/' + result.id,
			id: result.id,
			image: 'https://coverartarchive.org/release-group/' + result.id + '/front-500.jpg',

			artists: result['artist-credit'].map((a: any) => a.name),
			genres: result.genres.map((g: any) => g.name),
			subType: result['primary-type'],
			rating: result.rating.value * 2,

			userData: {
				personalRating: 0,
			},
		});
	}
	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.MusicBrainzAPI_disabledMediaTypes as MediaType[];
	}
}
