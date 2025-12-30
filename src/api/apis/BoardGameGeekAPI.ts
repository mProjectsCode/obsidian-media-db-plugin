import { requestUrl } from 'obsidian';
import { BoardGameModel } from 'src/models/BoardGameModel';
import type MediaDbPlugin from '../../main';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { MediaType } from '../../utils/MediaType';
import { APIModel } from '../APIModel';

// sadly no open api schema available

export class BoardGameGeekAPI extends APIModel {
	plugin: MediaDbPlugin;

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'BoardGameGeekAPI';
		this.apiDescription = 'A free API for BoardGameGeek things.';
		this.apiUrl = 'https://boardgamegeek.com/xmlapi/';
		this.types = [MediaType.BoardGame];
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		const searchUrl = `${this.apiUrl}/search?search=${encodeURIComponent(title)}`;
		const fetchData = await requestUrl({
			url: searchUrl,
			headers: {
				Authorization: `Bearer ${this.plugin.settings.BoardgameGeekKey}`,
			},
		});

		if (fetchData.status === 401) {
			throw Error(`MDB | Authentication for ${this.apiName} failed. Check the API key.`);
		}

		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from ${this.apiName}.`);
		}

		const data = fetchData.text;
		const response = new window.DOMParser().parseFromString(data, 'text/xml');

		// console.debug(response);

		const ret: MediaTypeModel[] = [];

		for (const boardgame of Array.from(response.querySelectorAll('boardgame'))) {
			const id = boardgame.attributes.getNamedItem('objectid')?.value;
			const title = boardgame.querySelector('name[primary=true]')?.textContent ?? boardgame.querySelector('name')?.textContent ?? undefined;
			const year = boardgame.querySelector('yearpublished')?.textContent ?? '';

			ret.push(
				new BoardGameModel({
					dataSource: this.apiName,
					id,
					title,
					englishTitle: title,
					year,
				}),
			);
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		const searchUrl = `${this.apiUrl}/boardgame/${encodeURIComponent(id)}?stats=1`;
		const fetchData = await requestUrl({
			url: searchUrl,
			headers: {
				Authorization: `Bearer ${this.plugin.settings.BoardgameGeekKey}`,
			},
		});

		if (fetchData.status === 401) {
			throw Error(`MDB | Authentication for ${this.apiName} failed. Check the API key.`);
		}

		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from ${this.apiName}.`);
		}

		const data = fetchData.text;
		const response = new window.DOMParser().parseFromString(data, 'text/xml');
		// console.debug(response);

		const boardgame = response.querySelector('boardgame');
		if (!boardgame) {
			throw Error(`MDB | Received invalid data from ${this.apiName}.`);
		}

		const title = boardgame.querySelector('name[primary=true]')?.textContent;
		const year = boardgame.querySelector('yearpublished')?.textContent ?? '';
		const subType = boardgame.querySelector('boardgamesubdomain')?.textContent ?? '';
		const image = boardgame.querySelector('image')?.textContent ?? undefined;
		const onlineRating = Number.parseFloat(boardgame.querySelector('statistics ratings average')?.textContent ?? '0');
		const genres = Array.from(boardgame.querySelectorAll('boardgamecategory'))
			.map(n => n.textContent)
			.filter(n => n !== null);
		const complexityRating = Number.parseFloat(boardgame.querySelector('averageweight')?.textContent ?? '0');
		const minPlayers = Number.parseFloat(boardgame.querySelector('minplayers')?.textContent ?? '0');
		const maxPlayers = Number.parseFloat(boardgame.querySelector('maxplayers')?.textContent ?? '0');
		const playtime = (boardgame.querySelector('playingtime')?.textContent ?? 'unknown') + ' minutes';
		const age = Number.parseFloat(boardgame.querySelector('age')?.textContent ?? '0');
		const publishers = Array.from(boardgame.querySelectorAll('boardgamepublisher'))
			.map(n => n.textContent)
			.filter(n => n !== null);
		const boardGameFamilies = Array.from(boardgame.querySelectorAll('boardgamefamily'))
			.map(n => n.textContent)
			.filter(n => n !== null);
		const boardGameMechanics = Array.from(boardgame.querySelectorAll('boardgamemechanic'))
			.map(n => n.textContent)
			.filter(n => n !== null);
		const awards = Array.from(boardgame.querySelectorAll('boardgamehonor'))
			.map(n => n.textContent)
			.filter(n => n !== null);
		const description = boardgame.querySelector('description')?.textContent.replace(/<[^>]*>/g, '') ?? '';

		let languageDependenceMostVotes = 0;
		let languageDependence = '';
		for (const result of Array.from(response.querySelectorAll('poll[name=language_dependence] results result'))) {
			const votes = Number.parseInt(result.attributes.getNamedItem('numvotes')?.value ?? '0');
			if (votes > languageDependenceMostVotes) {
				languageDependenceMostVotes = votes;
				languageDependence = result.attributes.getNamedItem('value')?.value ?? '';
			}
		}

		const bestWithPlayers =
			response.querySelector('poll-summary[name=suggested_numplayers] result[name=bestwith]')?.attributes.getNamedItem('value')?.value ?? '';
		const recommendedWithPlayers =
			response.querySelector('poll-summary[name=suggested_numplayers] result[name=recommmendedwith]')?.attributes.getNamedItem('value')?.value ?? '';

		return new BoardGameModel({
			title: title ?? '',
			englishTitle: title ?? '',
			year: year === '0' ? '' : year,
			dataSource: this.apiName,
			url: `https://boardgamegeek.com/boardgame/${id}`,
			id: id,
			subType: subType,
			genres: genres,
			onlineRating: onlineRating,
			complexityRating: complexityRating,
			minPlayers: minPlayers,
			maxPlayers: maxPlayers,
			playtime: playtime,
			age: age,
			publishers: publishers,
			boardGameFamilies: boardGameFamilies,
			boardGameMechanics: boardGameMechanics,
			awards: awards,
			description: description.replace(/<[^>]*>/g, ''),
			languageDependence: languageDependence,
			bestWithPlayers: bestWithPlayers,
			recommendedWithPlayers: recommendedWithPlayers,
			image: image,

			released: true,

			userData: {
				played: false,
				personalRating: 0,
			},
		});
	}
	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.BoardgameGeekAPI_disabledMediaTypes;
	}
}
