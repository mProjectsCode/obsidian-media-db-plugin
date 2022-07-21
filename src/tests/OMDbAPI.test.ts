import { enableFetchMocks } from 'jest-fetch-mock';
import fetchMock from 'jest-fetch-mock';
import { OMDbAPI } from '../api/apis/OMDbAPI';
import { MovieModel } from '../models/MovieModel';
import { MediaTypeModel } from '../models/MediaTypeModel';
import MediaDbPlugin from '../main';
import { MediaDbPluginSettings } from 'src/settings/Settings';

enableFetchMocks()
let OMDbApiMock: OMDbAPI;

beforeEach(() => {
    fetchMock.resetMocks();
    let settingsMock: MediaDbPluginSettings = {
        OMDbKey: "string"
    } as MediaDbPluginSettings;
    let pluginMock: MediaDbPlugin = {} as MediaDbPlugin;
    pluginMock.settings = settingsMock;
    OMDbApiMock = new OMDbAPI(pluginMock);
})

test("searchByTitle behavior when given garbage data", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({
        data: "string"
    }))
    let res = await OMDbApiMock.searchByTitle("sample");
    expect(res).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("searchByTitle when fetch returns 401", async () => {
    let sampleResponse = {
        data: "string"
    };
    fetchMock.mockResponse(JSON.stringify(sampleResponse), { status: 401 });
    // TODO: Check API name and fix message
    // TODO: Externalize string
    await expect(async () => await OMDbApiMock.searchByTitle("sample")).rejects.toThrowError("MDB | Authentication for OMDbAPI failed. Check the API key.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("searchByTitle when fetch returns other non-200", async () => {
    let sampleResponse = {
        data: "string"
    };
    fetchMock.mockResponse(JSON.stringify(sampleResponse), { status: 400 });
    await expect(async () => await OMDbApiMock.searchByTitle("sample")).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("searchByTitle with successful request and valid response", async () => {
    let response = {
        "Search": [
            {
                "Title": "Guardians of the Galaxy",
                "Year": "2014",
                "imdbID": "tt2015381",
                "Type": "movie",
                "Poster": "https://m.media-amazon.com/images/M/MV5BMTAwMjU5OTgxNjZeQTJeQWpwZ15BbWU4MDUxNDYxODEx._V1_SX300.jpg"
            },
            {
                "Title": "Guardians of the Galaxy Vol. 2",
                "Year": "2017",
                "imdbID": "tt3896198",
                "Type": "movie",
                "Poster": "https://m.media-amazon.com/images/M/MV5BNjM0NTc0NzItM2FlYS00YzEwLWE0YmUtNTA2ZWIzODc2OTgxXkEyXkFqcGdeQXVyNTgwNzIyNzg@._V1_SX300.jpg"
            },
            {
                "Title": "Guardians of the Galaxy: Inferno",
                "Year": "2017",
                "imdbID": "tt7131308",
                "Type": "movie",
                "Poster": "https://m.media-amazon.com/images/M/MV5BZGQ0YzEyNWQtNGJiMi00NTAxLThkNDctNGY2ODkzYWMxZmZkXkEyXkFqcGdeQXVyNTAyODkwOQ@@._V1_SX300.jpg"
            },
            {
                "Title": "LEGO Marvel Super Heroes - Guardians of the Galaxy: The Thanos Threat",
                "Year": "2017",
                "imdbID": "tt7387224",
                "Type": "movie",
                "Poster": "https://m.media-amazon.com/images/M/MV5BMjhlYzVhNTMtMmFkYy00NDhiLTkyNDgtYzhhMTZiMzM2OTA5XkEyXkFqcGdeQXVyNjI2OTgxNzY@._V1_SX300.jpg"
            },
        ],
        "totalResults": "4",
        "Response": "True"
    }
    fetchMock.mockResponse(JSON.stringify(response));
    let ret: MediaTypeModel[] = [];

    for (const result of response.Search) {
        ret.push(new MovieModel({
            type: 'wiki',
            title: result.Title,
            englishTitle: result.Title,
            year: result.Year,
            dataSource: 'OMDbAPI',
            id: result.imdbID,
        } as unknown as MovieModel));
    }
    let dt = await OMDbApiMock.searchByTitle("Jackson");
    expect(dt).toStrictEqual(ret);

})

