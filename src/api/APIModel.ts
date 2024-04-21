import { MediaTypeModel } from '../models/MediaTypeModel';
import { MediaType } from '../utils/MediaType';
import MediaDbPlugin from '../main';

export abstract class APIModel {
	apiName: string;
	apiUrl: string;
	apiDescription: string;
	types: MediaType[];
	plugin: MediaDbPlugin;

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
	}

	hasTypeOverlap(types: MediaType[]): boolean {
		for (const type of types) {
			if (this.hasType(type)) {
				return true;
			}
		}
		return false;
	}
}
