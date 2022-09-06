import {MediaTypeModel} from './MediaTypeModel';
import {mediaDbTag} from '../utils/Utils';
import {MediaType} from '../utils/MediaType';


export class BoardGameModel extends MediaTypeModel {
	genres: string[];
	onlineRating: number;
	image?: string;

	released: boolean;

	userData: {
		played: boolean;
		personalRating: number;
	};


	constructor(obj: any = {}) {
		super();

		Object.assign(this, obj);

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
