import { iso6392 } from 'iso-639-2';
import type { TFile, TFolder, App } from 'obsidian';
import { requestUrl } from 'obsidian';
import type { MediaTypeModel } from '../models/MediaTypeModel';

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
	return /^[\p{Letter}\p{M}_]+$/u.test(str);
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

		// eslint-disable-next-line @typescript-eslint/no-base-to-string
		return obj?.toString() ?? 'null';
	} else if (parts.length === 2) {
		const operator = parts[0];
		let pathString = parts[1];

		// Check if the path is wrapped in [[]] for wikilinks
		const wikilinkMatch = pathString.match(/^\[\[(.+?)\]\]$/);
		const useWikilinks = !!wikilinkMatch;

		// Extract the actual path (remove [[ ]] if present)
		if (wikilinkMatch) {
			pathString = wikilinkMatch[1];
		}

		const path = pathString.split('.');
		const obj = traverseMetaData(path, mediaTypeModel);

		if (obj === undefined) {
			return ignoreUndefined ? '' : '{{ INVALID TEMPLATE TAG - object undefined }}';
		}

		if (operator === 'LIST') {
			if (!Array.isArray(obj)) {
				return '{{ INVALID TEMPLATE TAG - operator LIST is only applicable on an array }}';
			}

			if (useWikilinks) {
				// LIST with wikilinks: no quotes for body text
				return obj.map((e: unknown) => `\n  - [[${e}]]`).join('');
			} else {
				return obj.map((e: unknown) => `\n  - ${e}`).join('');
			}
		} else if (operator === 'LISTYAML') {
			if (!Array.isArray(obj)) {
				return '{{ INVALID TEMPLATE TAG - operator LISTYAML is only applicable on an array }}';
			}

			if (useWikilinks) {
				// LISTYAML with wikilinks: quoted for frontmatter
				return obj.map((e: unknown) => `\n  - "[[${e}]]"`).join('');
			} else {
				return obj.map((e: unknown) => `\n  - ${e}`).join('');
			}
		} else if (operator === 'ENUM') {
			if (!Array.isArray(obj)) {
				return '{{ INVALID TEMPLATE TAG - operator ENUM is only applicable on an array }}';
			}

			if (useWikilinks) {
				// ENUM with wikilinks: no quotes for body text
				return obj.map((e: unknown) => `[[${e}]]`).join(', ');
			} else {
				return obj.join(', ');
			}
		} else if (operator === 'ENUMYAML') {
			if (!Array.isArray(obj)) {
				return '{{ INVALID TEMPLATE TAG - operator ENUMYAML is only applicable on an array }}';
			}
			// ENUMYAML - always comma-separated, no wikilinks support and [[]] syntax is simply ignored since they are not valid in comma-separated YAML values
			return obj.join(', ');
		} else if (operator === 'FIRST') {
			if (!Array.isArray(obj)) {
				return '{{ INVALID TEMPLATE TAG - operator FIRST is only applicable on an array }}';
			}

			const first = obj[0] as unknown;
			const value = first?.toString() ?? 'null';

			if (useWikilinks && value !== 'null') {
				return `[[${value}]]`;
			} else {
				return value;
			}
		} else if (operator === 'LAST') {
			if (!Array.isArray(obj)) {
				return '{{ INVALID TEMPLATE TAG - operator LAST is only applicable on an array }}';
			}

			const last = obj[obj.length - 1] as unknown;
			const value = last?.toString() ?? 'null';

			if (useWikilinks && value !== 'null') {
				return `[[${value}]]`;
			} else {
				return value;
			}
		}

		return `{{ INVALID TEMPLATE TAG - unknown operator ${operator} }}`;
	}

	return '{{ INVALID TEMPLATE TAG }}';
}

function traverseMetaData(path: string[], mediaTypeModel: MediaTypeModel): unknown {
	let o: unknown = mediaTypeModel;

	for (const part of path) {
		if (o !== undefined) {
			o = (o as Record<string, unknown>)[part];
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

export function migrateObject<T extends object>(object: T, oldData: Record<string, unknown>, defaultData: T): void {
	for (const key in object) {
		object[key] = Object.hasOwn(oldData, key) && oldData[key] !== undefined && oldData[key] !== null ? (oldData[key] as T[typeof key]) : defaultData[key];
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

/* eslint-disable */

export function hasTemplaterPlugin(app: App): boolean {
	const templater = (app as any).plugins.plugins['templater-obsidian'];

	return !!templater;
}

// Copied from https://github.com/anpigon/obsidian-book-search-plugin
// Licensed under the MIT license. Copyright (c) 2020 Jake Runzer
export async function useTemplaterPluginInFile(app: App, file: TFile): Promise<void> {
	const templater = (app as any).plugins.plugins['templater-obsidian'];
	if (templater && !templater?.settings.trigger_on_file_creation) {
		await templater.templater.overwrite_file_commands(file);
	}
}

/* eslint-enable */

export type ModelToData<T> = {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	[K in keyof T as T[K] extends Function ? never : K]?: T[K] | null;
};

// Checks if a given URL points to an existing image (status 200), or returns false for 404/other errors.

export async function imageUrlExists(url: string): Promise<boolean> {
	try {
		// @ts-ignore
		const response = await requestUrl({
			url,
			method: 'HEAD',
			throw: false,
		});
		return response.status === 200;
	} catch {
		return false;
	}
}

export function isTruthy<T>(value: T): value is Exclude<T, false | 0 | '' | null | undefined> {
	return Boolean(value);
}

/**
 * Wraps Obsidians `requestUrl` in a fetch like API.
 */
export async function obsidianFetch(input: Request): Promise<Response> {
	const obs_headers: Record<string, string> = {};
	input.headers.forEach((header, value) => {
		obs_headers[header] = value;
	});

	const res = await requestUrl({
		url: input.url,
		method: input.method,
		headers: obs_headers,
		throw: false, // Do not throw on error, handle it manually
	});

	const responseHeaders: Headers = new Headers();
	for (const [key, value] of Object.entries(res.headers)) {
		responseHeaders.append(key, value);
	}

	return {
		ok: res.status >= 200 && res.status < 300,
		status: res.status,
		headers: responseHeaders,
		// eslint-disable-next-line
		json: async () => res.json,
		text: async () => res.text,
	} as Response;
}

export function getLanguageName(code: string): string | null {
	const language = iso6392.find(lang => lang.iso6392B === code || lang.iso6392T === code);

	return language?.name ?? null;
}
