import {MediaTypeModel} from './MediaTypeModel';
import {stringifyYaml} from 'obsidian';


export class WikiModel extends MediaTypeModel {
	type: string;
	title: string;
	englishTitle: string;
	year: string;
	dataSource: string;
	url: string;
	id: string;

	wikiUrl: string;
	lastUpdated: string;
	length: number;


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
