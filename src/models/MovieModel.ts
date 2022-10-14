import {MediaTypeModel} from './MediaTypeModel';
import {mediaDbTag} from '../utils/Utils';
import {MediaType} from '../utils/MediaType';


export class MovieModel extends MediaTypeModel {
	genres: string[];
	producer: string;
	duration: string;
	onlineRating: number;
	image: string;

	released: boolean;
	premiere: string;

	userData: {
		watched: boolean;
		lastWatched: string;
		personalRating: number;
	};

	constructor(obj: any = {}) {
		super();

		this.genres = undefined;
		this.producer = undefined;
		this.duration = undefined;
		this.onlineRating = undefined;
		this.image = undefined;
		this.released = undefined;
		this.premiere = undefined;
		this.userData = {
			watched: undefined,
			lastWatched: undefined,
			personalRating: undefined,
		};

		Object.assign(this, obj);

		this.type = this.getMediaType();
	}

	getTags(): string[] {
		return [mediaDbTag, 'tv', 'movie'];
	}

	getMediaType(): MediaType {
		return MediaType.Movie;
	}

	getSummary(): string {
		return this.englishTitle + ' (' + this.year + ')';
	}
}
