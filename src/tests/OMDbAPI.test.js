require('jest-fetch-mock').enableMocks()

let OMDbApiInstance;

beforeEach(() => {
  fetchMock.resetMocks();
  let OMDbAPI = require("../api/apis/OMDbAPI").OMDbAPI;
  let MediaDbPluginMock = {};
  MediaDbPluginMock = {
    settings: {
      OMDbKey: "string"
    }
  };
  OMDbApiInstance = new OMDbAPI(MediaDbPluginMock);
})

test("searchByTitle behavior when given garbage data", async () => {
  fetchMock.mockResponseOnce(JSON.stringify({
    data: "string"
  }))
  let res = await OMDbApiInstance.searchByTitle("sample");
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
  await expect(async () => await OMDbApiInstance.searchByTitle("sample")).rejects.toThrowError("MDB | Authentication for OMDbAPI failed. Check the API key.");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("searchByTitle when fetch returns other non-200", async () => {
  let sampleResponse = {
    data: "string"
  };
  fetchMock.mockResponse(JSON.stringify(sampleResponse), { status: 400 });
  await expect(async () => await OMDbApiInstance.searchByTitle("sample")).rejects.toThrow();
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
  let ret = [];

  // import { MovieModel } from '../models/MovieModel';
  // const MovieModel = require('../models/MovieModel')
  for (const result of response.Search) {
    ret.push({
      type: 'movie',
      title: result.Title,
      englishTitle: result.Title,
      year: result.Year,
      dataSource: 'OMDbAPI',
      id: result.imdbID,
    });
  }

  let dt = await OMDbApiInstance.searchByTitle("Jackson");
  expect(dt).toEqual(ret);

})

