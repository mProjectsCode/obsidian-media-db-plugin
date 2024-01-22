import { MediaTypeModel } from './MediaTypeModel';
import { mediaDbTag, migrateObject } from '../utils/Utils';
import { MediaType } from '../utils/MediaType';

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

	constructor(obj: any = {}) {
		super();

		this.developers = undefined;
		this.publishers = undefined;
		this.genres = undefined;
		this.onlineRating = undefined;
		this.image = undefined;
		this.released = undefined;
		this.releaseDate = undefined;
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
		return [mediaDbTag, 'game'];
	}

	getMediaType(): MediaType {
		return MediaType.Game;
	}

	getSummary(): string {
		return this.englishTitle + ' (' + this.year + ')';
	}
}
