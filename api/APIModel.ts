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
	 * This function should query the api and return a list of matches. The matches should be capped at 20.
	 *
	 * @param title the title to query for
	 */
	abstract searchByTitle(title: string): Promise<MediaTypeModel[]>;

	abstract getById(id: string): Promise<MediaTypeModel>;

	abstract getDisabledMediaTypes(): MediaType[];

	hasType(type: MediaType): boolean {
		const disabledMediaTypes = this.getDisabledMediaTypes();
		return this.types.includes(type) && !disabledMediaTypes.includes(type);
	}

	hasTypeOverlap(types: MediaType[]): boolean {
		return types.some(type => this.hasType(type));
	}

	/**
	 * Returns the wiki-link string for a given property value.
	 * Subclasses can override this to apply API-specific file name templates
	 * (e.g. using an Artist file name for artist links).
	 *
	 * @param _property  the property key (e.g. 'artists', 'albumTitle')
	 * @param value      the raw string value to wrap
	 * @param _obj       the full metadata object (for context)
	 * @param folderPrefix  the wiki-link folder prefix (e.g. 'Media DB/wiki/')
	 */
	wikilinkValueFor(_property: string, value: string, _obj: Record<string, unknown>, folderPrefix: string): string {
		const clean = value.replace(/^\[\[(.*?)\]\]$/, '$1').split('|').pop()!;
		return `[[${folderPrefix}${clean}|${clean}]]`;
	}
}
