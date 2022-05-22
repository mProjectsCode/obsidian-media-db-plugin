import {MediaTypeModel} from '../models/MediaTypeModel';


export const pluginName: string = 'obsidian-media-db-plugin';
export const contactEmail: string = 'm.projects.code@gmail.com';
export const mediaDbTag: string = 'mediaDB';
export const mediaDbVersion: string = '0.1.8';
export const debug: boolean = false;

export function wrapAround(value: number, size: number): number {
	return ((value % size) + size) % size;
}

export function debugLog(o: any): void {
	if (debug) {
		console.log(o);
	}
}

export function replaceIllegalFileNameCharactersInString(string: string): string {
	return string.replace(/[\\,#%&{}/*<>$"@.?]*/g, '').replace(/:+/g, ' -');
}

export function replaceTags(template: string, mediaTypeModel: MediaTypeModel): string {
	const resolvedTemplate = template.replace(new RegExp('{{.*?}}', 'g'), (match: string) => replaceTag(match, mediaTypeModel));

	return resolvedTemplate;
}

function replaceTag(match: string, mediaTypeModel: MediaTypeModel): string {
	let tag = match;
	tag = tag.substring(2);
	tag = tag.substring(0, tag.length - 2);
	tag = tag.trim();

	let parts = tag.split(':');
	if (parts.length === 1) {
		let path = parts[0].split('.');

		let obj = traverseMetaData(path, mediaTypeModel);

		if (obj === undefined) {
			return '{{ INVALID TEMPLATE TAG - object undefined }}';
		}

		return obj;
	} else if (parts.length === 2) {
		let operator = parts[0];

		let path = parts[1].split('.');

		let obj = traverseMetaData(path, mediaTypeModel);

		if (obj === undefined) {
			return '{{ INVALID TEMPLATE TAG - object undefined }}';
		}

		if (operator === 'LIST') {
			if (!Array.isArray(obj)) {
				return '{{ INVALID TEMPLATE TAG - operator LIST is only applicable on an array }}';
			}
			return obj.map((e: any) => `- ${e}`).join('\n');
		} else if (operator === 'ENUM') {
			if (!Array.isArray(obj)) {
				return '{{ INVALID TEMPLATE TAG - operator ENUM is only applicable on an array }}';
			}
			return obj.join(', ');
		}

		return `{{ INVALID TEMPLATE TAG - unknown operator ${operator} }}`;
	}

	return '{{ INVALID TEMPLATE TAG }}';
}

function traverseMetaData(path: Array<string>, mediaTypeModel: MediaTypeModel): any {
	let o: any = mediaTypeModel;

	for (let part of path) {
		if (o !== undefined) {
			o = o[part];
		}
	}

	return o;
}
