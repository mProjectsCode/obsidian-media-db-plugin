import { MediaType } from '../utils/MediaType';
import type { ModelToData } from '../utils/Utils';
import { applyPlainObject, mediaDbTag } from '../utils/Utils';
import { MediaTypeModel } from './MediaTypeModel';

export type GameData = ModelToData<GameModel>;

export class GameModel extends MediaTypeModel {
	developers: string[];
	publishers: string[];
	genres: string[];
	onlineRating: number;
	image: string;

	released: boolean;
	releaseDate: string;

	userData: {
		played: boolean;
		personalRating: number;
	};

	constructor(obj: GameData) {
		super();

		this.developers = [];
		this.publishers = [];
		this.genres = [];
		this.onlineRating = 0;
		this.image = '';

		this.released = false;
		this.releaseDate = '';

		this.userData = {
			played: false,
			personalRating: 0,
		};

		applyPlainObject(this, obj, this);

		if (!Object.hasOwn(obj, 'userData')) {
			applyPlainObject(this.userData, obj, this.userData);
		}

		this.type = this.getMediaType();
	}

	getTags(): string[] {
		return [mediaDbTag, 'game'];
	}

	getMediaType(): MediaType {
		return MediaType.Game;
	}

	getSummary(): string {
		return this.englishTitle + ' (' + this.year + ')';
	}
}
