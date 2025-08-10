import { requestUrl } from 'obsidian';
import type MediaDbPlugin from '../../main';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { MusicReleaseModel } from '../../models/MusicReleaseModel';
import { MediaType } from '../../utils/MediaType';
import { contactEmail, extractTracksFromMedia, getLanguageName, mediaDbVersion, pluginName } from '../../utils/Utils';
import { APIModel } from '../APIModel';
import { iso6392 } from 'iso-639-2';

// sadly no open api schema available

interface Tag {
	name: string;
	count: number;
}
interface Genre {
	name: string;
	count: number;
	id: string;
	disambiguation: string;
}
interface Release {
	id: string;
	'status-id': string;
	title: string;
	status: string;
}

interface SearchResponse {
	id: string;
	'type-id': string;
	score: number;
	'primary-type-id': string;
	'artists-credit-id': string;
	count: number;
	title: string;
	'first-release-date': string;
	'primary-type': string;
	'artist-credit': {
		name: string;
		artist: {
			id: string;
			name: string;
			'short-name': string;
		};
	}[];
	releases: Release[];
	tags: Tag[];
}

interface IdResponse {
	id: string;
	tags: Tag[];
	'primary-type-id': string;
	'artist-credit': {
		name: string;
		artist: {
			tags: Tag[];
			type: string;
			id: string;
			name: string;
			'short-name': string;
			country: string;
		};
	}[];
	title: string;
	genres: Genre[];
	'first-release-date': string;
	releases: Release[];
	'primary-type': string;
	rating: {
		value: number;
		'votes-count': number;
	};
}

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

		const data = (await fetchData.json) as {
			'release-groups': SearchResponse[];
		};
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

					artists: result['artist-credit'].map(a => a.name),
					subType: result['primary-type'],
				}),
			);
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		// Fetch release group
		const groupUrl = `https://musicbrainz.org/ws/2/release-group/${encodeURIComponent(id)}?inc=releases+artists+tags+ratings+genres+tags&fmt=json`;
		const groupResponse = await requestUrl({
			url: groupUrl,
			headers: {
				'User-Agent': `${pluginName}/${mediaDbVersion} (${contactEmail})`,
			},
		});

		if (groupResponse.status !== 200) {
			throw Error(`MDB | Received status code ${groupResponse.status} from ${this.apiName}.`);
		}

		const result = (await groupResponse.json) as IdResponse;

		// Get ID of the first release
		const firstRelease = result.releases?.[0];
		if (!firstRelease) {
			throw Error('MDB | No releases found in release group.');
		}

		// Fetch recordings for the first release
		const releaseUrl = `https://musicbrainz.org/ws/2/release/${firstRelease.id}?inc=recordings+artists&fmt=json`;
		console.log(`MDB | Fetching release recordings from: ${releaseUrl}`);

		const releaseResponse = await requestUrl({
			url: releaseUrl,
			headers: {
				'User-Agent': `${pluginName}/${mediaDbVersion} (${contactEmail})`,
			},
		});

		if (releaseResponse.status !== 200) {
			throw Error(`MDB | Received status code ${releaseResponse.status} from ${this.apiName}.`);
		}

		const releaseData = await releaseResponse.json;
		const tracks = extractTracksFromMedia(releaseData.media);

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

			artists: result['artist-credit'].map(a => a.name),
			language: releaseData['text-representation'].language ? getLanguageName(releaseData['text-representation'].language) : 'Unknown',
			genres: result.tags.map(g => g.name),
			subType: result['primary-type'],
			trackCount: releaseData.media[0]['track-count'] ?? 0,
			tracks: tracks,
			rating: result.rating.value * 2,

			userData: {
				personalRating: 0,
			},
		});
	}
	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.MusicBrainzAPI_disabledMediaTypes;
	}
}
