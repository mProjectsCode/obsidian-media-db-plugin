export abstract class MediaTypeModel {
	type: string;
	title: string;
	premiere: string;
	dataSource: string;
	id: string;

	abstract toMetaData(): string;
}
