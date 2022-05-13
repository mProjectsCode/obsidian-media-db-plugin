import {MediaTypeModel} from '../models/MediaTypeModel';

export function wrapAround(value: number, size: number): number {
	return ((value % size) + size) % size;
}

export function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export function getFileName(item: MediaTypeModel) {
	return replaceIllegalFileNameCharactersInString(item.year ? `${item.title} (${item.year})` : `${item.title}`);
}

export function replaceIllegalFileNameCharactersInString(string: string) {
	return string.replace(/[\\,#%&{}/*<>$"@.]*/g, '').replace(/:+/g, ' -');
}

export function replaceTags(template: string, mediaTypeModel: MediaTypeModel): string {
	const resolvedTemplate = template.replace(new RegExp('{{ .*? }}', 'g'), (match: string) => replaceTag(match, mediaTypeModel));

	return resolvedTemplate;
}

function replaceTag(match: string, mediaTypeModel: MediaTypeModel): string {
	let tag = match;
	tag = tag.substring(3);
	tag = tag.substring(0, tag.length - 3);

	let parts = tag.split('.');

	let o: any = mediaTypeModel;

	for (let part of parts) {
		if (o !== undefined) {
			o = o[part];
		}
	}

	if (o === undefined) {
		o = '{{ INVALID TEMPLATE TAG }}';
	}

	return o;
}
