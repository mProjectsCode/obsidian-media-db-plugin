export abstract class MediaTypeModel {
	type: string;
	title: string;
	year: string;
	dataSource: string;
	id: string;

	abstract toMetaData(): string;

	abstract getFileName(): string;
}
