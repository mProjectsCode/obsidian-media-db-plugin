import {MediaTypeModel} from './MediaTypeModel';

export class MovieModel extends MediaTypeModel {
	type: string;
	title: string;
	dataSource: string;
	id: string;

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


	constructor(obj: any = {}) {
		super();

		Object.assign(this, obj);

		this.type = 'movie';
	}

	toMetaData(): string {
		return JSON.stringify(this);
	}

}
