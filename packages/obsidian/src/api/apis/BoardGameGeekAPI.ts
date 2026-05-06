import { requestUrl } from 'obsidian';
import { APIModel } from 'packages/obsidian/src/api/APIModel';
import type MediaDbPlugin from 'packages/obsidian/src/main';
import { BoardGameModel } from 'packages/obsidian/src/models/BoardGameModel';
import type { MediaTypeModel } from 'packages/obsidian/src/models/MediaTypeModel';
import { Logger } from 'packages/obsidian/src/utils/Logger';
import type { MDBError } from 'packages/obsidian/src/utils/MDBError';
import { MDBErrorKind, toMdbError } from 'packages/obsidian/src/utils/MDBError';
import { MediaType } from 'packages/obsidian/src/utils/MediaType';
import type { Result } from 'packages/obsidian/src/utils/result';
import { err, fromPromise, ok } from 'packages/obsidian/src/utils/result';

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

	async searchByTitle(title: string): Promise<Result<MediaTypeModel[], MDBError>> {
		Logger.log(`MDB | api "${this.apiName}" queried by Title`);
		const key = this.plugin.app.secretStorage.getSecret(this.plugin.settings.BoardgameGeekKeyId);
		if (!key) {
			return err({
				kind: MDBErrorKind.Validation,
				message: `MDB | API key for ${this.apiName} missing.`,
				userMessage: `API key for ${this.apiName} missing.`,
				context: { apiName: this.apiName },
			});
		}

		const searchUrl = `${this.apiUrl}/search?search=${encodeURIComponent(title)}`;
		const fetchDataResult = await fromPromise(
			requestUrl({
				url: searchUrl,
				headers: {
					Authorization: `Bearer ${key}`,
				},
			}),
			cause =>
				toMdbError(cause, {
					kind: MDBErrorKind.Network,
					message: `MDB | Network error querying ${this.apiName}`,
					userMessage: `Network error querying ${this.apiName}`,
					context: { apiName: this.apiName, title },
				}),
		);

		if (!fetchDataResult.ok) {
			return err(fetchDataResult.error);
		}
		const fetchData = fetchDataResult.value;

		if (fetchData.status === 401) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | Authentication for ${this.apiName} failed. Check the API key.`,
				userMessage: `Authentication for ${this.apiName} failed. Check the API key.`,
				context: { apiName: this.apiName },
			});
		}

		if (fetchData.status !== 200) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | Received status code ${fetchData.status} from ${this.apiName}.`,
				userMessage: `Received status code ${fetchData.status} from ${this.apiName}.`,
				context: { apiName: this.apiName, status: fetchData.status },
			});
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

		return ok(ret);
	}

	async getById(id: string): Promise<Result<MediaTypeModel, MDBError>> {
		Logger.log(`MDB | api "${this.apiName}" queried by ID`);
		const key = this.plugin.app.secretStorage.getSecret(this.plugin.settings.BoardgameGeekKeyId);
		if (!key) {
			return err({
				kind: MDBErrorKind.Validation,
				message: `MDB | API key for ${this.apiName} missing.`,
				userMessage: `API key for ${this.apiName} missing.`,
				context: { apiName: this.apiName },
			});
		}

		const searchUrl = `${this.apiUrl}/boardgame/${encodeURIComponent(id)}?stats=1`;
		const fetchDataResult = await fromPromise(
			requestUrl({
				url: searchUrl,
				headers: {
					Authorization: `Bearer ${key}`,
				},
			}),
			cause =>
				toMdbError(cause, {
					kind: MDBErrorKind.Network,
					message: `MDB | Network error querying ${this.apiName}`,
					userMessage: `Network error querying ${this.apiName}`,
					context: { apiName: this.apiName, id },
				}),
		);

		if (!fetchDataResult.ok) {
			return err(fetchDataResult.error);
		}
		const fetchData = fetchDataResult.value;

		if (fetchData.status === 401) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | Authentication for ${this.apiName} failed. Check the API key.`,
				userMessage: `Authentication for ${this.apiName} failed. Check the API key.`,
				context: { apiName: this.apiName },
			});
		}

		if (fetchData.status !== 200) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | Received status code ${fetchData.status} from ${this.apiName}.`,
				userMessage: `Received status code ${fetchData.status} from ${this.apiName}.`,
				context: { apiName: this.apiName, status: fetchData.status, id },
			});
		}

		const data = fetchData.text;
		const response = new window.DOMParser().parseFromString(data, 'text/xml');
		// console.debug(response);

		const boardgame = response.querySelector('boardgame');
		if (!boardgame) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | Received invalid data from ${this.apiName}.`,
				userMessage: `Received invalid data from ${this.apiName}.`,
				context: { apiName: this.apiName, id },
			});
		}

		const title = boardgame.querySelector('name[primary=true]')?.textContent;
		const year = boardgame.querySelector('yearpublished')?.textContent ?? '';
		const image = boardgame.querySelector('image')?.textContent ?? undefined;
		const onlineRating = Number.parseFloat(boardgame.querySelector('statistics ratings average')?.textContent ?? '0');
		const genres = Array.from(boardgame.querySelectorAll('boardgamecategory'))
			.map(n => n.textContent)
			.filter(n => n !== null);
		const complexityRating = Number.parseFloat(boardgame.querySelector('averageweight')?.textContent ?? '0');
		const minPlayers = Number.parseFloat(boardgame.querySelector('minplayers')?.textContent ?? '0');
		const maxPlayers = Number.parseFloat(boardgame.querySelector('maxplayers')?.textContent ?? '0');
		const playtime = (boardgame.querySelector('playingtime')?.textContent ?? 'unknown') + ' minutes';
		const publishers = Array.from(boardgame.querySelectorAll('boardgamepublisher'))
			.map(n => n.textContent)
			.filter(n => n !== null);

		return ok(
			new BoardGameModel({
				title: title ?? undefined,
				englishTitle: title ?? undefined,
				year: year === '0' ? '' : year,
				dataSource: this.apiName,
				url: `https://boardgamegeek.com/boardgame/${id}`,
				id: id,

				genres: genres,
				onlineRating: onlineRating,
				complexityRating: complexityRating,
				minPlayers: minPlayers,
				maxPlayers: maxPlayers,
				playtime: playtime,
				publishers: publishers,
				image: image,

				released: true,

				userData: {
					played: false,
					personalRating: 0,
				},
			}),
		);
	}
	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.BoardgameGeekAPI_disabledMediaTypes;
	}
}
