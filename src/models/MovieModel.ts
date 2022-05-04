import {MediaTypeModel} from './MediaTypeModel';

export class MovieModel extends MediaTypeModel {
	type: string;
	title: string;
	dataSource: string;

	genres: string[];
	producer: string;
	duration: string;
	onlineRating: number;
	image: string;

	released: boolean;
	premiere: string;

	watched: boolean;
	lastWatched: string;
	personalRating: number;


	constructor() {
		super();

		this.type = 'movie';
	}

	toMetaData(): string {
		return '';
	}

}
