export abstract class MediaTypeModel {
	type: string;
	title: string;
	year: string;
	dataSource: string;
	url: string;
	id: string;

	abstract toMetaData(): string;

	abstract getFileName(): string;
}
