import { requestUrl } from 'obsidian';
import type MediaDbPlugin from '../../main';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { MusicReleaseModel } from '../../models/MusicReleaseModel';
import { MediaType } from '../../utils/MediaType';
import { contactEmail, getLanguageName, mediaDbVersion, pluginName } from '../../utils/Utils';
import { APIModel } from '../APIModel';

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

interface ArtistCredit {
	name: string;
	artist: {
		tags: Tag[];
		type: string;
		id: string;
		name: string;
		'short-name': string;
		country: string;
	};
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
	'artist-credit': ArtistCredit[];
	releases: Release[];
	tags: Tag[];
}

interface IdResponse {
	id: string;
	tags: Tag[];
	'primary-type-id': string;
	'artist-credit': ArtistCredit[];
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

interface MediaResponse {
	media: {
		'track-count': number;
		tracks: {
			'artist-credit': ArtistCredit[];
			length: number | null;
			number: string;
			position: number;
			title: string;
			recording: {
				length: number;
				title: string;
			};
		}[];
	}[];
	'text-representation': {
		language: string;
		script: string;
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
		const groupUrl = `https://musicbrainz.org/ws/2/release-group/${encodeURIComponent(id)}?inc=releases+artists+tags+ratings+genres&fmt=json`;
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

		const releaseData = (await releaseResponse.json) as MediaResponse;
		const tracks = extractTracksFromMedia(releaseData.media);

		// Calculate total album length for the first release
		const totalrawLength =
			releaseData.media[0]?.tracks.reduce((sum, track) => {
				const len = track.length ?? track.recording?.length;
				return typeof len === 'number' && !isNaN(len) ? sum + len : sum;
			}, 0) ?? 0;
		const albumLengthCalc = millisecondsToMinutes(totalrawLength);

		console.log(releaseData);

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
			genres: result.genres.map(g => g.name),
			subType: result['primary-type'],
			albumDuration: albumLengthCalc,
			trackCount: releaseData.media[0]?.['track-count'] ?? 0,
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

function extractTracksFromMedia(media: MediaResponse['media']): {
	number: number;
	title: string;
	duration: string;
	featuredArtists: string[];
}[] {
	if (!media || media.length === 0 || !media[0].tracks) return [];

	return media[0].tracks.map((track, index) => {
		const title = track.title ?? track.recording?.title ?? 'Unknown Title';
		const rawLength = track.length ?? track.recording?.length;
		const duration = rawLength ? millisecondsToMinutes(rawLength) : 'unknown';
		const featuredArtists = track['artist-credit']?.map(ac => ac.name) ?? [];

		return {
			number: index + 1,
			title,
			duration,
			featuredArtists,
		};
	});
}

function millisecondsToMinutes(milliseconds: number): string {
	const minutes = Math.floor(milliseconds / 60000);
	const seconds = Math.floor((milliseconds % 60000) / 1000);
	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
