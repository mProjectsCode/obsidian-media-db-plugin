import { MediaTypeModel } from '../models/MediaTypeModel';
import { TFile, TFolder, App } from 'obsidian';

export const pluginName: string = 'obsidian-media-db-plugin';
export const contactEmail: string = 'm.projects.code@gmail.com';
export const mediaDbTag: string = 'mediaDB';
export const mediaDbVersion: string = '0.5.2';
export const debug: boolean = true;

export function wrapAround(value: number, size: number): number {
	if (size <= 0) {
		throw Error('size may not be zero or negative');
	}
	return mod(value, size);
}

export function containsOnlyLettersAndUnderscores(str: string): boolean {
	return /^[a-zA-Z_]+$/.test(str);
}

export function replaceIllegalFileNameCharactersInString(string: string): string {
	return string.replace(/[\\,#%&{}/*<>$"@.?]*/g, '').replace(/:+/g, ' -');
}

export function replaceTags(template: string, mediaTypeModel: MediaTypeModel, ignoreUndefined: boolean = false): string {
	return template.replace(new RegExp('{{.*?}}', 'g'), (match: string) => replaceTag(match, mediaTypeModel, ignoreUndefined));
}

function replaceTag(match: string, mediaTypeModel: MediaTypeModel, ignoreUndefined: boolean): string {
	let tag = match;
	tag = tag.substring(2);
	tag = tag.substring(0, tag.length - 2);
	tag = tag.trim();

	const parts = tag.split(':');
	if (parts.length === 1) {
		const path = parts[0].split('.');

		const obj = traverseMetaData(path, mediaTypeModel);

		if (obj === undefined) {
			return ignoreUndefined ? '' : '{{ INVALID TEMPLATE TAG - object undefined }}';
		}

		return obj;
	} else if (parts.length === 2) {
		const operator = parts[0];

		const path = parts[1].split('.');

		const obj = traverseMetaData(path, mediaTypeModel);

		if (obj === undefined) {
			return ignoreUndefined ? '' : '{{ INVALID TEMPLATE TAG - object undefined }}';
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
		} else if (operator === 'FIRST') {
			if (!Array.isArray(obj)) {
				return '{{ INVALID TEMPLATE TAG - operator FIRST is only applicable on an array }}';
			}
			return obj[0];
		} else if (operator === 'LAST') {
			if (!Array.isArray(obj)) {
				return '{{ INVALID TEMPLATE TAG - operator LAST is only applicable on an array }}';
			}
			return obj[obj.length - 1];
		}

		return `{{ INVALID TEMPLATE TAG - unknown operator ${operator} }}`;
	}

	return '{{ INVALID TEMPLATE TAG }}';
}

function traverseMetaData(path: Array<string>, mediaTypeModel: MediaTypeModel): any {
	let o: any = mediaTypeModel;

	for (const part of path) {
		if (o !== undefined) {
			o = o[part];
		}
	}

	return o;
}

export function markdownTable(content: string[][]): string {
	const rows = content.length;
	if (rows === 0) {
		return '';
	}

	const columns = content[0].length;
	if (columns === 0) {
		return '';
	}
	for (const row of content) {
		if (row.length !== columns) {
			return '';
		}
	}

	const longestStringInColumns: number[] = [];

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

export function fragWithHTML(html: string): DocumentFragment {
	return createFragment(frag => (frag.createDiv().innerHTML = html));
}

export function dateToString(date: Date): string {
	return `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear()}`;
}

export function timeToString(time: Date): string {
	return `${time.getHours()}-${time.getMinutes()}-${time.getSeconds()}`;
}

export function dateTimeToString(dateTime: Date): string {
	return `${dateToString(dateTime)} ${timeToString(dateTime)}`;
}

// js can't even implement modulo correctly...
export function mod(n: number, m: number): number {
	return ((n % m) + m) % m;
}

export function capitalizeFirstLetter(string: string): string {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

export class PropertyMappingValidationError extends Error {
	constructor(message: string) {
		super(message);
	}
}

export class PropertyMappingNameConflictError extends Error {
	constructor(message: string) {
		super(message);
	}
}

/**
 * - attachTemplate: whether to attach the template (DEFAULT: false)
 * - attachFie: a file to attach (DEFAULT: undefined)
 * - openNote: whether to open the note after creation (DEFAULT: false)
 * - folder: folder to put the note in
 */
export interface CreateNoteOptions {
	attachTemplate?: boolean;
	attachFile?: TFile;
	openNote?: boolean;
	folder?: TFolder;
}

export function migrateObject<T extends object>(object: T, oldData: any, defaultData: T): void {
	for (const key in object) {
		object[key] = oldData.hasOwnProperty(key) ? oldData[key] : defaultData[key];
	}
}

export function unCamelCase(str: string): string {
	return (
		str
			// insert a space between lower & upper
			.replace(/([a-z])([A-Z])/g, '$1 $2')
			// space before last upper in a sequence followed by lower
			.replace(/\b([A-Z]+)([A-Z])([a-z])/, '$1 $2$3')
			// uppercase the first character
			.replace(/^./, function (str) {
				return str.toUpperCase();
			})
	);
}

export function hasTemplaterPlugin(app: App): boolean {
	const templater = (app as any).plugins.plugins['templater-obsidian'];

	return !!templater;
}

// Copied from https://github.com/anpigon/obsidian-book-search-plugin
// Licensed under the MIT license. Copyright (c) 2020 Jake Runzer
export async function useTemplaterPluginInFile(app: App, file: TFile): Promise<void> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const templater = (app as any).plugins.plugins['templater-obsidian'];
	if (templater && !templater?.settings['trigger_on_file_creation']) {
		await templater.templater.overwrite_file_commands(file);
	}
}
