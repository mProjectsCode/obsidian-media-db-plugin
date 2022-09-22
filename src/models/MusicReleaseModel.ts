import {MediaTypeModel} from './MediaTypeModel';
import {mediaDbTag} from '../utils/Utils';
import {MediaType} from '../utils/MediaType';


export class MusicReleaseModel extends MediaTypeModel {
	type: string;
	subType: string;
	title: string;
	englishTitle: string;
	year: string;
	dataSource: string;
	url: string;
	id: string;

	genres: string[];
	artists: string[];
	rating: number;

	userData: {
		personalRating: number;
	};

	constructor(obj: any = {}) {
		super();

		Object.assign(this, obj);

		this.type = this.getMediaType();
	}

	getTags(): string[] {
		return [mediaDbTag, 'music', this.subType];
	}

	getMediaType(): MediaType {
		return MediaType.MusicRelease;
	}

	getSummary(): string {
		var summary = this.title + ' (' + this.year + ')';
		if (this.artists.length > 0)
			summary += ' - ' + this.artists.join(', ');
		return summary;
	}
}
