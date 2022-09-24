import {MediaTypeModel} from './MediaTypeModel';
import {mediaDbTag} from '../utils/Utils';
import {MediaType} from '../utils/MediaType';


export class GameModel extends MediaTypeModel {
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

		this.genres = undefined;
		this.onlineRating = undefined;
		this.image = undefined;
		this.released = undefined;
		this.releaseDate = undefined;
		this.userData = {
			played: undefined,
			personalRating: undefined,
		};

		Object.assign(this, obj);

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
