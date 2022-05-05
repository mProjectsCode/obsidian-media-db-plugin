import {MediaTypeModel} from './MediaTypeModel';
import {stringifyYaml} from 'obsidian';


export class MovieModel extends MediaTypeModel {
	type: string;
	title: string;
	premiere: string;
	dataSource: string;
	id: string;

	genres: string[];
	producer: string;
	duration: string;
	onlineRating: number;
	image: string;

	released: boolean;

	watched: boolean;
	lastWatched: string;
	personalRating: number;


	constructor(obj: any = {}) {
		super();

		Object.assign(this, obj);

		this.type = 'movie';
	}

	toMetaData(): string {
		return stringifyYaml(this);
	}

}
