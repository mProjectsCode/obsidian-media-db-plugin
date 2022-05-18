import {MediaTypeModel} from './MediaTypeModel';
import {stringifyYaml} from 'obsidian';
import {mediaDbTag} from '../utils/Utils';


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
		return stringifyYaml({...this, tags: '#' + this.getTags().join('/')});
	}

	getFileName(): string {
		return this.title + ' (' + this.year + ')';
	}

	getTags(): string[] {
		return [mediaDbTag, 'tv', 'series'];
	}

}
