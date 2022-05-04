export abstract class MediaTypeModel {
	type: string;
	title: string;
	dataSource: string;

	abstract toMetaData(): string;
}
