import { enableFetchMocks } from 'jest-fetch-mock';
import fetchMock from 'jest-fetch-mock';
import { OMDbAPI } from '../api/apis/OMDbAPI';
import MediaDbPlugin from '../main';
import { MediaDbPluginSettings } from 'src/settings/Settings';
import { MALAPI } from '../api/apis/MALAPI';
import { LocGovAPI } from '../api/apis/LocGovAPI';
import { MusicBrainzAPI } from '../api/apis/MusicBrainzAPI';
import { SteamAPI } from '../api/apis/SteamAPI';
import { WikipediaAPI } from '../api/apis/WikipediaAPI';

enableFetchMocks()
let apiMock: OMDbAPI | MALAPI | LocGovAPI | MusicBrainzAPI | SteamAPI | WikipediaAPI;
let api: typeof OMDbAPI | typeof MALAPI | typeof LocGovAPI | typeof MusicBrainzAPI | typeof SteamAPI | typeof WikipediaAPI;

describe.each(
	[
		{ name: OMDbAPI },
		{ name: MALAPI },
		{ name: LocGovAPI },
		{ name: MusicBrainzAPI },
		{ name: SteamAPI },
		{ name: WikipediaAPI }
	]
)('$name.name', ({ name: parameterizedApi }) => {
	beforeAll(() => {
		api = parameterizedApi;
		let settingsMock: MediaDbPluginSettings = {
		} as MediaDbPluginSettings;
		let pluginMock = {} as MediaDbPlugin;
		pluginMock.settings = settingsMock;
		// TODO: add fake API key
		apiMock = new parameterizedApi(pluginMock);
	})

	beforeEach(() => {
		fetchMock.resetMocks();
	})

	test("searchByTitle behavior when given garbage data", async () => {
		const garbageResponse = JSON.stringify({
			data: "string"
		});
		fetchMock.mockResponseOnce(garbageResponse)
		let res;
		// LocGovAPI throws an error because not implemented
		if (parameterizedApi.name === "LocGovAPI") {
			await expect(apiMock.searchByTitle("sample")).rejects.toThrow();

		} else {
			res = await apiMock.searchByTitle("sample");
			expect(res).toEqual([]);
		}
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	test("searchByTitle when fetch returns 401", async () => {
		let sampleResponse = {
			data: "string"
		};
		fetchMock.mockResponse(JSON.stringify(sampleResponse), { status: 401 });
		// TODO: Check API name and fix message
		// TODO: Externalize string
		await expect(async () => await apiMock.searchByTitle("sample")).rejects.toThrow();
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
})