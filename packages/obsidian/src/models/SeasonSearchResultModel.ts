import { MediaTypeModel } from 'packages/obsidian/src/models/MediaTypeModel';
import { MediaType } from 'packages/obsidian/src/utils/MediaType';
import type { ModelToData } from 'packages/obsidian/src/utils/Utils';
import { migrateObject } from 'packages/obsidian/src/utils/Utils';

export type SeasonSearchResultData = ModelToData<SeasonSearchResultModel>;

export class SeasonSearchResultModel extends MediaTypeModel {
	seasonCount: number;

	constructor(obj: SeasonSearchResultData) {
		super();
		this.seasonCount = 0;

		migrateObject(this, obj, this);
		this.type = this.getMediaType();
	}

	getTags(): string[] {
		return [];
	}

	getMediaType(): MediaType {
		return MediaType.Season;
	}

	getSummary(): string {
		return `${this.seasonCount} ${this.seasonCount === 1 ? 'season' : 'seasons'}`;
	}
}
