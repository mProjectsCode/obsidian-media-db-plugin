import { enableFetchMocks } from 'jest-fetch-mock';
import fetchMock from 'jest-fetch-mock';
import { WikipediaAPI } from '../api/apis/WikipediaAPI';
import { WikiModel } from '../models/WikiModel';
import { MediaTypeModel } from '../models/MediaTypeModel';

enableFetchMocks()
let wikiInstance: WikipediaAPI;

beforeEach(() => {
    fetchMock.resetMocks();
    wikiInstance = new WikipediaAPI(new (jest.fn())());
})

test("searchByTitle behavior when given garbage data", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({
        data: "string"
    }))
    await expect(async () => await wikiInstance.searchByTitle("sample")).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("searchByTitle when fetch returns non-200", async () => {
    let sampleResponse = {
        data: "string"
    };
    fetchMock.mockResponse(JSON.stringify(sampleResponse), {status: 400});
    await expect(async () => await wikiInstance.searchByTitle("sample")).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("searchByTitle with successful request and valid response", async () => {
    let response = {
        "batchcomplete": "",
        "continue": {
            "sroffset": 20,
            "continue": "-||"
        },
        "query": {
            "searchinfo": {
                "totalhits": 214380
            },
            "search": [
                {
                    "ns": 0,
                    "title": "Jackson",
                    "pageid": 15772,
                    "size": 3524,
                    "wordcount": 392,
                    "timestamp": "2022-06-16T07:22:28Z"
                },
                {
                    "ns": 0,
                    "title": "Michael Jackson",
                    "pageid": 14995351,
                    "size": 257103,
                    "wordcount": 23309,
                    "timestamp": "2022-06-29T01:15:25Z"
                },
                {
                    "ns": 0,
                    "title": "Andrew Jackson",
                    "pageid": 1623,
                    "size": 200137,
                    "wordcount": 22743,
                    "timestamp": "2022-07-03T17:53:13Z"
                },
                {
                    "ns": 0,
                    "title": "Janet Jackson",
                    "pageid": 60070,
                    "size": 206594,
                    "wordcount": 21067,
                    "timestamp": "2022-06-24T19:40:30Z"
                }
            ]
        }
    };
    fetchMock.mockResponse(JSON.stringify(response));
    let ret: MediaTypeModel[] = [];

    for (const result of response.query.search) {
        ret.push(new WikiModel({
            type: 'wiki',
            title: result.title,
            englishTitle: result.title,
            year: '',
            dataSource: 'Wikipedia API',
            id: result.pageid,
        } as unknown as WikiModel));
    }
    let dt = await wikiInstance.searchByTitle("Jackson");
    expect(dt).toStrictEqual(ret);

})
