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
	return string.replace(/[\\,#%&{}/*<>$":@.]*/g, '');
}
