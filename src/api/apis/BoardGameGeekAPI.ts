import {APIModel} from '../APIModel';
import {MediaTypeModel} from '../../models/MediaTypeModel';
import MediaDbPlugin from '../../main';
import {BoardGameModel} from 'src/models/BoardGameModel';
import {debugLog} from '../../utils/Utils';
import {requestUrl} from 'obsidian';

export class BoardGameGeekAPI extends APIModel {
	plugin: MediaDbPlugin;

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'BoardGameGeekAPI';
		this.apiDescription = 'A free API for BoardGameGeek things.';
		this.apiUrl = 'https://api.geekdo.com/xmlapi';
		this.types = ['boardgames'];
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		const searchUrl = `${this.apiUrl}/search?search=${encodeURIComponent(title)}`;
		const fetchData = await requestUrl({
			url: searchUrl,
		});

		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from an API.`);
		}

		const data = fetchData.text;
		const response = new window.DOMParser().parseFromString(data, 'text/xml');

		debugLog(response);

		let ret: MediaTypeModel[] = [];

		for (const boardgame of Array.from(response.querySelectorAll('boardgame'))) {
			const id = boardgame.attributes.getNamedItem('objectid')!.value;
			const title = boardgame.querySelector('name')!.textContent!;
			const year = boardgame.querySelector('yearpublished')?.textContent ?? '';

			ret.push(new BoardGameModel({
				dataSource: this.apiName,
				id,
				title,
				englishTitle: title,
				year,
			} as BoardGameModel));
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		const searchUrl = `${this.apiUrl}/boardgame/${encodeURIComponent(id)}?stats=1`;
		const fetchData = await requestUrl({
			url: searchUrl,
		});

		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from an API.`);
		}

		const data = fetchData.text;
		const response = new window.DOMParser().parseFromString(data, 'text/xml');
		debugLog(response);

		const boardgame = response.querySelector('boardgame')!;
		const title = boardgame.querySelector('name')!.textContent!;
		const year = boardgame.querySelector('yearpublished')?.textContent ?? '';
		const image = boardgame.querySelector('image')?.textContent ?? undefined;
		const onlineRating = Number.parseFloat(boardgame.querySelector('statistics ratings average')?.textContent ?? '');
		const genres = Array.from(boardgame.querySelectorAll('boardgamecategory')).map(n => n!.textContent!);

		const model = new BoardGameModel({
			title,
			englishTitle: title,
			year: year === '0' ? '' : year,
			dataSource: this.apiName,
			url: `https://boardgamegeek.com/boardgame/${id}`,
			id: id,

			genres: genres,
			onlineRating: onlineRating,
			image: image,
			released: true,

			userData: {
				played: false,
				personalRating: 0,
			},
		} as BoardGameModel);

		return model;

	}
}
