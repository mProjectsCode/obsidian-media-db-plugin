import {MediaTypeModel} from './MediaTypeModel';
import {stringifyYaml} from 'obsidian';


export class SeriesModel extends MediaTypeModel {
	type: string;
	title: string;
	englishTitle: string;
	year: string;
	dataSource: string;
	url: string;
	id: string;

	genres: string[];
	studios: string[];
	episodes: number;
	duration: string;
	onlineRating: number;
	image: string;

	released: boolean;
	airing: boolean;
	airedFrom: string;
	airedTo: string;

	watched: boolean;
	lastWatched: string;
	personalRating: number;


	constructor(obj: any = {}) {
		super();

		Object.assign(this, obj);
	}

	toMetaData(): string {
		return stringifyYaml(this);
	}

	getFileName(): string {
		return this.title;
	}

}
