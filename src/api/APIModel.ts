import type MediaDbPlugin from '../main';
import type { MediaTypeModel } from '../models/MediaTypeModel';
import type { MediaType } from '../utils/MediaType';

export abstract class APIModel {
	apiName!: string;
	apiUrl!: string;
	apiDescription!: string;
	types!: MediaType[];
	plugin!: MediaDbPlugin;

	/**
	 * This function should query the api and return a list of matches. The matches should be caped at 20.
	 *
	 * @param title the title to query for
	 */
	abstract searchByTitle(title: string): Promise<MediaTypeModel[]>;

	abstract getById(id: string): Promise<MediaTypeModel>;

	hasType(type: MediaType): boolean {
		if (
			this.types.contains(type) &&
			(Boolean((this.plugin.settings.apiToggle as any)?.[this.apiName]?.[type]) === true || (this.plugin.settings.apiToggle as any)?.[this.apiName]?.[type] === undefined)
		) {
			return true;
		}
		return false;
	}

	hasTypeOverlap(types: MediaType[]): boolean {
		return types.some(type => this.hasType(type));
	}
}
