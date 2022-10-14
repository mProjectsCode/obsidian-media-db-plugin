import {GameModel} from '../models/GameModel';
import {MovieModel} from '../models/MovieModel';
import {MusicReleaseModel} from '../models/MusicReleaseModel';
import {WikiModel} from '../models/WikiModel';
import {MediaType} from '../utils/MediaType';
import {apiMock} from './ParameterizedAPI.test';
import MALMockMovie from './ResponseMocks/MALMockMovie.json';
import MusicBrainzResponseMock from './ResponseMocks/MusicBrainzMockResponse.json';
import OMDBMockMovie from './ResponseMocks/OMDBMockResponse.json';
import SteamAPIResponseMock from './ResponseMocks/SteamAPIMockResponse.json';
import WikipediaMockResponse from './ResponseMocks/WikipediaMockResponse.json';

export function setWikipediaResponseMock() {
	let ret = [];
	let wikiresponse = WikipediaMockResponse.query.search[0];
	ret.push(new WikiModel({
		type: 'wiki',
		title: wikiresponse.title,
		englishTitle: wikiresponse.title,
		year: '',
		dataSource: apiMock.apiName,
		id: wikiresponse.pageid,
	}));
	return ret;
}

export function setOMDbResponseMock() {
	let ret = [];
	let omdbresponse = OMDBMockMovie.Search[0];
	ret.push(new MovieModel({
		type: 'wiki',
		title: omdbresponse.Title,
		englishTitle: omdbresponse.Title,
		year: omdbresponse.Year,
		dataSource: apiMock.apiName,
		id: omdbresponse.imdbID,
	}));
	return ret;
}

export function setMALResponseMock() {
	let ret = [];
	let result = MALMockMovie.data[0];
	ret.push(new MovieModel({
		type: result.type,
		title: result.title,
		englishTitle: result.title_english,
		year: result.aired.prop.from.year,
		dataSource: apiMock.apiName,
		id: result.mal_id,
	}));
	return ret;
}

export function setSteamResponseMock() {
	let ret = [];
	let steamResponse = SteamAPIResponseMock.applist.apps[0];
	ret.push(new GameModel({
		type: MediaType.Game,
		title: steamResponse.name,
		englishTitle: steamResponse.name,
		year: '',
		dataSource: apiMock.apiName,
		id: steamResponse.appid,
	}));
	return ret;
}

export function setMusicBrainzResponseMock() {
	let ret = [];
	let result = MusicBrainzResponseMock['release-groups'][0];
	ret.push(new MusicReleaseModel({
		type: 'musicRelease',
		title: result.title,
		englishTitle: result.title,
		year: (new Date(result['first-release-date'])).getFullYear().toString(),
		dataSource: apiMock.apiName,
		url: '',
		id: result.id,

		artists: result['artist-credit'].map((a: any) => a.name),
		subType: result['primary-type'],
	} as MusicReleaseModel));
	return ret;
}
