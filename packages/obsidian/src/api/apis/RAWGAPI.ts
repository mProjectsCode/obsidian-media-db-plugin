import { requestUrl } from 'obsidian';
import { APIModel } from 'packages/obsidian/src/api/APIModel';
import type MediaDbPlugin from 'packages/obsidian/src/main';
import { GameModel } from 'packages/obsidian/src/models/GameModel';
import type { MediaTypeModel } from 'packages/obsidian/src/models/MediaTypeModel';
import type { MDBError } from 'packages/obsidian/src/utils/MDBError';
import { MDBErrorKind, toMdbError } from 'packages/obsidian/src/utils/MDBError';
import { MediaType } from 'packages/obsidian/src/utils/MediaType';
import type { Result } from 'packages/obsidian/src/utils/result';
import { err, fromPromise, ok } from 'packages/obsidian/src/utils/result';

interface RAWGGame {
	id: number;
	name: string;
	released?: string;
	background_image?: string;
	name_original?: string;
	website?: string;
	slug?: string;
	metacritic?: number;
	developers?: { name: string }[];
	publishers?: { name: string }[];
	genres?: { name: string }[];
}

interface RAWGSearchResponse {
	results: RAWGGame[];
}

export class RAWGAPI extends APIModel {
	plugin: MediaDbPlugin;
	apiDateFormat: string = 'YYYY-MM-DD';

	constructor(plugin: MediaDbPlugin) {
		super();
		this.plugin = plugin;
		this.apiName = 'RAWGAPI';
		this.apiDescription = 'A large open video game database.';
		this.apiUrl = 'https://api.rawg.io/api';
		this.types = [MediaType.Game];
	}

	async searchByTitle(title: string): Promise<Result<MediaTypeModel[], MDBError>> {
		const key = this.plugin.app.secretStorage.getSecret(this.plugin.settings.RAWGAPIKeyId);
		if (!key) {
			return err({
				kind: MDBErrorKind.Validation,
				message: `MDB | API key for ${this.apiName} missing.`,
				userMessage: `API key for ${this.apiName} missing.`,
				context: { apiName: this.apiName },
			});
		}

		const responseResult = await fromPromise(
			requestUrl({
				url: `${this.apiUrl}/games?key=${key}&search=${encodeURIComponent(title)}&page_size=20`,
				method: 'GET',
			}),
			cause =>
				toMdbError(cause, {
					kind: MDBErrorKind.Network,
					message: `MDB | Network error querying ${this.apiName}`,
					userMessage: `Network error querying ${this.apiName}`,
					context: { apiName: this.apiName, title },
				}),
		);

		if (!responseResult.ok) {
			return err(responseResult.error);
		}
		const response = responseResult.value;
		if (response.status !== 200) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | Error ${response.status} from ${this.apiName}.`,
				userMessage: `Error ${response.status} from ${this.apiName}.`,
				context: { apiName: this.apiName, status: response.status },
			});
		}

		const data = response.json as RAWGSearchResponse;
		return ok(
			data.results.map(
				result =>
					new GameModel({
						type: MediaType.Game,
						title: result.name,
						englishTitle: result.name,
						year: result.released ? new Date(result.released).getFullYear().toString() : '',
						dataSource: this.apiName,
						id: result.id.toString(),
						image: result.background_image,
					}),
			),
		);
	}

	async getById(id: string): Promise<Result<MediaTypeModel, MDBError>> {
		const key = this.plugin.app.secretStorage.getSecret(this.plugin.settings.RAWGAPIKeyId);
		if (!key) {
			return err({
				kind: MDBErrorKind.Validation,
				message: `MDB | API key for ${this.apiName} missing.`,
				userMessage: `API key for ${this.apiName} missing.`,
				context: { apiName: this.apiName },
			});
		}

		const responseResult = await fromPromise(
			requestUrl({
				url: `${this.apiUrl}/games/${id}?key=${key}`,
				method: 'GET',
			}),
			cause =>
				toMdbError(cause, {
					kind: MDBErrorKind.Network,
					message: `MDB | Network error querying ${this.apiName}`,
					userMessage: `Network error querying ${this.apiName}`,
					context: { apiName: this.apiName, id },
				}),
		);

		if (!responseResult.ok) {
			return err(responseResult.error);
		}
		const response = responseResult.value;
		if (response.status !== 200) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | Error ${response.status} from ${this.apiName}.`,
				userMessage: `Error ${response.status} from ${this.apiName}.`,
				context: { apiName: this.apiName, status: response.status, id },
			});
		}

		const result = response.json as RAWGGame;
		return ok(
			new GameModel({
				type: MediaType.Game,
				title: result.name,
				englishTitle: result.name_original ?? result.name,
				year: result.released ? new Date(result.released).getFullYear().toString() : '',
				dataSource: this.apiName,
				url: result.website ?? `https://rawg.io/games/${result.slug}`,
				id: result.id.toString(),
				developers: result.developers?.map(d => d.name) ?? [],
				publishers: result.publishers?.map(p => p.name) ?? [],
				genres: result.genres?.map(g => g.name) ?? [],
				onlineRating: result.metacritic,
				image: result.background_image,
				released: result.released != null,
				releaseDate: result.released,
				userData: { played: false, personalRating: 0 },
			}),
		);
	}

	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.RAWGAPI_disabledMediaTypes ?? [];
	}
}
