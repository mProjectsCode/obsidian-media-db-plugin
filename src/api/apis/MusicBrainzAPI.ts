import {APIModel} from '../APIModel';
import {MediaTypeModel} from '../../models/MediaTypeModel';
import MediaDbPlugin from '../../main';
import {requestUrl} from 'obsidian';
import {MusicReleaseModel} from '../../models/MusicReleaseModel';
// import {MusicBrainzApi} from 'musicbrainz-api';

// WIP
export class MusicBrainzAPI extends APIModel {
	plugin: MediaDbPlugin;

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'MusicBrainz API';
		this.apiDescription = 'Free API for music albums.';
		this.apiUrl = 'https://musicbrainz.org/';
		this.types = ['music'];
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried`);

		const searchUrl = `https://musicbrainz.org/ws/2/release-group?query=${encodeURIComponent(title)}&limit=20&fmt=json`;

		const fetchData = await requestUrl({
			url: searchUrl,
			headers: {
				'User-Agent': 'obsidian-media-db-plugin/0.1.7 ( m.projects.code@gmail.com )',
			},
		});

		console.log(fetchData);

		if (fetchData.status !== 200) {
			throw Error(`Received status code ${fetchData.status} from an API.`);
		}
		const data = await fetchData.json;

		console.log(data);

		let ret: MediaTypeModel[] = [];

		for (const result of data['release-groups']) {
			ret.push(new MusicReleaseModel({
				type: 'musicRelease',
				title: result.title,
				englishTitle: result.title,
				year: (new Date(result['first-release-date'])).getFullYear().toString(),
				dataSource: this.apiName,
				url: '',
				id: result.id,

				artists: result['artist-credit'].map((a: any) => a.name),
				subType: result['primary-type'],
			} as MusicReleaseModel));
		}

		return ret;
	}

	async getById(item: MediaTypeModel): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried`);

		const searchUrl = `https://musicbrainz.org/ws/2/release-group/${encodeURIComponent(item.id)}?inc=releases+artists+tags+ratings+genres&fmt=json`;

		const fetchData = await requestUrl({
			url: searchUrl,
			headers: {
				'User-Agent': 'MyAwesomeTagger/1.2.0 ( me@example.com )',
			},
		});

		const data = await fetchData.json;

		console.log(data);

		const result = data;

		const model = new MusicReleaseModel({
			type: 'musicRelease',
			title: result.title,
			englishTitle: result.title,
			year: (new Date(result['first-release-date'])).getFullYear().toString(),
			dataSource: this.apiName,
			url: '',
			id: result.id,

			artists: result['artist-credit'].map((a: any) => a.name),
			genres: result.genres.map((g: any) => g.name),
			subType: result['primary-type'],
			rating: result.rating.value * 2,
		} as MusicReleaseModel);

		return model;
	}
}
