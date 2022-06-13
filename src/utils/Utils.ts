import {MediaTypeModel} from '../models/MediaTypeModel';


export const pluginName: string = 'obsidian-media-db-plugin';
export const contactEmail: string = 'm.projects.code@gmail.com';
export const mediaDbTag: string = 'mediaDB';
export const mediaDbVersion: string = '0.2.1';
export const debug: boolean = true;

export function wrapAround(value: number, size: number): number {
	return ((value % size) + size) % size;
}

export function debugLog(o: any): void {
	if (debug) {
		console.log(o);
	}
}

export function containsOnlyLettersAndUnderscores(str: string): boolean {
	return /^[a-zA-Z_]+$/.test(str);
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

export function markdownTable(content: string[][]): string {
	let rows = content.length;
	if (rows === 0) {
		return '';
	}

	let columns = content[0].length;
	if (columns === 0) {
		return '';
	}
	for (const row of content) {
		if (row.length !== columns) {
			return '';
		}
	}

	let longestStringInColumns: number[] = [];

	for (let i = 0; i < columns; i++) {
		let longestStringInColumn = 0;
		for (const row of content) {
			if (row[i].length > longestStringInColumn) {
				longestStringInColumn = row[i].length;
			}
		}

		longestStringInColumns.push(longestStringInColumn);
	}

	let table = '';

	for (let i = 0; i < rows; i++) {
		table += '|';
		for (let j = 0; j < columns; j++) {
			let element = content[i][j];
			element += ' '.repeat(longestStringInColumns[j] - element.length);
			table += ' ' + element + ' |';
		}
		table += '\n';
		if (i === 0) {
			table += '|';
			for (let j = 0; j < columns; j++) {
				table += ' ' + '-'.repeat(longestStringInColumns[j]) + ' |';
			}
			table += '\n';
		}
	}

	return table;
}

export function dateToString(date: Date) {
	return `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear()}`;
}

export function timeToString(time: Date) {
	return `${time.getHours()}-${time.getMinutes()}-${time.getSeconds()}`;
}

export function dateTimeToString(dateTime: Date) {
	return `${dateToString(dateTime)} ${timeToString(dateTime)}`;
}

export class UserCancelError extends Error {
	constructor(message: string) {
		super(message);
	}
}

export class UserSkipError extends Error {
	constructor(message: string) {
		super(message);
	}
}

