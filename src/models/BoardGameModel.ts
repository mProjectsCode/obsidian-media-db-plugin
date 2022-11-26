import { MediaTypeModel } from './MediaTypeModel';
import { mediaDbTag, migrateObject } from '../utils/Utils';
import { MediaType } from '../utils/MediaType';

export class BoardGameModel extends MediaTypeModel {
	genres: string[];
	onlineRating: number;
	complexityRating: number;
	minPlayers: number;
	maxPlayers: number;
	playtime: string;
	publishers: string[];
	image?: string;

	released: boolean;

	userData: {
		played: boolean;
		personalRating: number;
	};

	constructor(obj: any = {}) {
		super();

		this.genres = undefined;
		this.onlineRating = undefined;
		this.minPlayers = undefined;
		this.maxPlayers = undefined;
		this.playtime = undefined;
		this.publishers = undefined;
		this.complexityRating = undefined;
		this.image = undefined;

		this.released = undefined;

		this.userData = {
			played: undefined,
			personalRating: undefined,
		};

		migrateObject(this, obj, this);

		if (!obj.hasOwnProperty('userData')) {
			migrateObject(this.userData, obj, this.userData);
		}

		this.type = this.getMediaType();
	}

	getTags(): string[] {
		return [mediaDbTag, 'boardgame'];
	}

	getMediaType(): MediaType {
		return MediaType.BoardGame;
	}

	getSummary(): string {
		return this.englishTitle + ' (' + this.year + ')';
	}
}
