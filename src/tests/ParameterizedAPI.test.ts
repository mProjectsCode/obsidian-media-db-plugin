import fetchMock, {enableFetchMocks} from 'jest-fetch-mock';
import {MediaDbPluginSettings} from 'src/settings/Settings';
import {LocGovAPI} from '../api/apis/LocGovAPI';
import {MALAPI} from '../api/apis/MALAPI';
import {MusicBrainzAPI} from '../api/apis/MusicBrainzAPI';
import {OMDbAPI} from '../api/apis/OMDbAPI';
import {SteamAPI} from '../api/apis/SteamAPI';
import {WikipediaAPI} from '../api/apis/WikipediaAPI';
import MediaDbPlugin from '../main';
import {setMALResponseMock, setMusicBrainzResponseMock, setOMDbResponseMock, setSteamResponseMock, setWikipediaResponseMock} from './mockHelpers';
import MALMockMovie from './ResponseMocks/MALMockMovie.json';
import MusicBrainzResponseMock from './ResponseMocks/MusicBrainzMockResponse.json';
import OMDBMockMovie from './ResponseMocks/OMDBMockResponse.json';
import SteamAPIResponseMock from './ResponseMocks/SteamAPIMockResponse.json';
import WikipediaMockResponse from './ResponseMocks/WikipediaMockResponse.json';

enableFetchMocks();
export let apiMock: OMDbAPI | MALAPI | LocGovAPI | MusicBrainzAPI | SteamAPI | WikipediaAPI;

describe.each(
	[
		{name: OMDbAPI},
		{name: MALAPI},
		{name: LocGovAPI},
		{name: MusicBrainzAPI},
		{name: SteamAPI},
		{name: WikipediaAPI},
	],
)('$name.name', ({name: parameterizedApi}) => {
	beforeAll(() => {
		let settingsMock: MediaDbPluginSettings = {} as MediaDbPluginSettings;
		let pluginMock = {} as MediaDbPlugin;
		pluginMock.settings = settingsMock;
		// TODO: add fake API key?
		apiMock = new parameterizedApi(pluginMock);
	});

	beforeEach(() => {
		fetchMock.resetMocks();
	});

	test('searchByTitle behavior when API returns garbage data', async () => {
		const garbageResponse = JSON.stringify({
			data: 'string',
		});
		fetchMock.mockResponseOnce(garbageResponse);
		await expect(apiMock.searchByTitle('sample')).resolves.toEqual([]);
		// }
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	test('searchByTitle behavior when requestUrl/fetch returns 401', async () => {
		let sampleResponse = {
			data: 'string',
		};
		fetchMock.mockResponse(JSON.stringify(sampleResponse), {status: 401});
		// TODO: Check API name and fix message
		// TODO: Externalize string
		await expect(apiMock.searchByTitle('sample')).rejects.toThrow(`MDB | Received status code ${401} from an API.`);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	test('searchByTitle behavior when requestUrl/fetch returns 403', async () => {
		let sampleResponse = {
			data: 'string',
		};
		fetchMock.mockResponse(JSON.stringify(sampleResponse), {status: 403});
		// TODO: Check API name and fix message
		// TODO: Externalize string/import?
		await expect(apiMock.searchByTitle('sample')).rejects.toThrow(`MDB | Received status code ${403} from an API.`);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	test('searchByTitle behavior when requestUrl/fetch returns 200', async () => {
		let sampleResponse;
		let ret;
		switch (parameterizedApi) {
			case OMDbAPI:
				ret = setOMDbResponseMock();
				sampleResponse = OMDBMockMovie;
				break;
			case WikipediaAPI:
				ret = setWikipediaResponseMock();
				sampleResponse = WikipediaMockResponse;
				break;
			case MALAPI:
				// TODO: MAL needs more tests for different types of content
				ret = setMALResponseMock();
				sampleResponse = MALMockMovie;
			case LocGovAPI:
				// TODO: Add soon
				break;
			case SteamAPI:
				sampleResponse = SteamAPIResponseMock;
				ret = setSteamResponseMock();
				break;
			case MusicBrainzAPI:
				sampleResponse = MusicBrainzResponseMock;
				ret = setMusicBrainzResponseMock();
				break;
			default:
				throw Error();
		}
		fetchMock.mockResponse(JSON.stringify(sampleResponse), {status: 200});
		// TODO: Check API name and fix message
		// TODO: Externalize string
		await expect(apiMock.searchByTitle('Hooking Season Playtest')).resolves.toEqual(ret);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
