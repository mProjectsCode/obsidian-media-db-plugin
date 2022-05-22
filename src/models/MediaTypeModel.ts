import {MediaType} from '../utils/MediaType';
import {stringifyYaml} from 'obsidian';

export abstract class MediaTypeModel {
	type: string;
	subType: string;
	title: string;
	englishTitle: string;
	year: string;
	dataSource: string;
	url: string;
	id: string;

	abstract getMediaType(): MediaType;

	abstract getTags(): string[];

	toMetaData(): string {
		return stringifyYaml({...this, tags: '#' + this.getTags().join('/')});
	}

}
