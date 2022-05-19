import {MediaTypeModel} from './MediaTypeModel';
import {stringifyYaml} from 'obsidian';
import {mediaDbTag} from '../utils/Utils';


export class WikiModel extends MediaTypeModel {
	type: string;
	subType: string;
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

		this.type = 'wiki';
	}

	toMetaData(): string {
		return stringifyYaml({...this, tags: '#' + this.getTags().join('/')});
	}

	getFileName(): string {
		return this.title;
	}

	getTags(): string[] {
		return [mediaDbTag, 'wiki'];
	}

}
