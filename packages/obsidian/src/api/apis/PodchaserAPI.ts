
import { PodcastModel } from 'packages/obsidian/src/models/PodcastModel';
import { APIModel } from 'packages/obsidian/src/api/APIModel';
import type MediaDbPlugin from 'packages/obsidian/src/main';
import type { MediaTypeModel } from 'packages/obsidian/src/models/MediaTypeModel';
import { MediaType } from 'packages/obsidian/src/utils/MediaType';
import { gql, GraphQLClient } from 'graphql-request'

import { Logger } from 'packages/obsidian/src/utils/Logger';
import type { MDBError } from 'packages/obsidian/src/utils/MDBError';
import { MDBErrorKind, toMdbError } from 'packages/obsidian/src/utils/MDBError';
import type { Result } from 'packages/obsidian/src/utils/result';
import { err, fromPromise, ok } from 'packages/obsidian/src/utils/result';
import { obsidianFetch } from 'packages/obsidian/src/utils/Utils';

interface SearchResponse { 

	title: string;
	description: string;
	id: string;
	applePodcastsId: string;
	spotifyId: string;
	webUrl: string;
	rssUrl: string;
	imageUrl: string;
	credits: {
		data: [{
			creator:{
				name: string;
			} 
		}]
	}
}

interface PodchaserAuthResponse {
	requestAccessToken: {
		access_token: string;
		expires_in: number;
	}
}

export class PodchaserAPI extends APIModel  {
    plugin: MediaDbPlugin;
	apiDateFormat: string = 'DD MMM, YYYY';
	
		constructor(plugin: MediaDbPlugin) {
			super();
			this.plugin = plugin;
			this.apiName = 'PodchaserAPI';
			this.apiDescription = 'A free API for podcasts';
			this.apiUrl = 'https://api.podchaser.com/graphql';
			this.types = [MediaType.Podcast];
		}
	

	private async getAuthToken(): Promise<Result<string, MDBError>> {
		const currentTime = Date.now();
		if (this.accessToken && currentTime < this.tokenExpiry) return ok(this.accessToken);

		const clientId = this.plugin.app.secretStorage.getSecret(this.plugin.settings.PodchaserClientId);
		const clientSecret = this.plugin.app.secretStorage.getSecret(this.plugin.settings.PodchaserClientSecret);
		if (!clientId || !clientSecret) {
			return err({
				kind: MDBErrorKind.Validation,
				message: `MDB | Client ID or Client Secret for ${this.apiName} missing.`,
				userMessage: `Client ID or Client Secret for ${this.apiName} missing.`,
				context: { apiName: this.apiName },
			});
		}

		Logger.log(`MDB | Refreshing Podchaser Auth Token for ${this.apiName}`);
		const endpoint = `https://api.podchaser.com/graphql`
		const graphQLClient = new GraphQLClient(endpoint)
		
		//create query
		const auth_variables = { 
					YOURAPIKEY: clientId,
					YOURAPISECRET: clientSecret,
				} 
		
		const query = gql`
			mutation ($YOURAPIKEY: String!, $YOURAPISECRET: String!){
				requestAccessToken(
					input:{
						grant_type: CLIENT_CREDENTIALS
						client_id: $YOURAPIKEY
						client_secret: $YOURAPISECRET
					}
				) {
					access_token
					token_type
					expires_in
				}
			}
		`
		
		//make the request 
		const response = await graphQLClient.request(query,auth_variables) 
		const data = response as PodchaserAuthResponse; 
		this.accessToken = data.requestAccessToken.access_token;
		this.tokenExpiry = currentTime + data.requestAccessToken.expires_in * 1000 - 60000;
		return ok(this.accessToken);
	}


	async searchByTitle(title: string): Promise<MediaTypeModel[], MDBError> {
		
		Logger.log(`MDB | api "${this.apiName}" queried by Title`);

		//confirm credentials 
		const clientId = this.plugin.app.secretStorage.getSecret(this.plugin.settings.PodchaserClientId);
		if (!clientId) {
			return err({
				kind: MDBErrorKind.Validation,
				message: `MDB | Client ID for ${this.apiName} missing.`,
				userMessage: `Client ID for ${this.apiName} missing.`,
				context: { apiName: this.apiName },
			});
		}

		//get auth token
		const tokenResult = await this.getAuthToken();
		if (!tokenResult.ok) {
			return err(tokenResult.error);
		}
		const token = tokenResult.value;
		const endpoint = `https://api.podchaser.com/graphql`
		const graphQLClient = new GraphQLClient(endpoint,  {
			headers: {
				authorization: `Bearer ${token}`,
			},
		})

		//create query 
		const variables = { //asign title to the varible named search
			search: title,
		} 

		const query = gql`
			query  byTitle ($search: String!) {
					podcasts(searchTerm: $search) {
						paginatorInfo {
							currentPage,
							hasMorePages,
							lastPage,
						},
						data {
							title,
							description,
							id,
							applePodcastsId,
							spotifyId,
							webUrl,
							rssUrl,
							imageUrl,

							credits {
								data{
									creator {
										name
									}
									role {
										title
									}
								}
							}
						}
					}
				}
			`

		//make the request 
		const response = await graphQLClient.request(query, variables) 
		const data = response.podcasts.data as SearchResponse[] //type asertion lets me use methods that i know exist even if the complier dosent

		//format the data
		const ret: MediaTypeModel[] = [];

		for (const result of data) {

			if (result.credits.data.length > 0){
				//create list of cast members
				let castList: string[] = []
				for (const person of result.credits.data)
					castList.push(person.creator.name)

				ret.push(
					new PodcastModel({
						title: result.title,
						englishTitle: result.title,
						dataSource: this.apiName,
						description: result.description,
						id: result.id,
						rss: result.rssUrl,
						image: result.imageUrl,
						appleid: result.applePodcastsId,
						spotifyid: result.spotifyId,
						cast: castList, //needs a list of names and not just a single string
						url: result.webUrl,

					}),
				);
			}

			else{
				ret.push(
					new PodcastModel({
						title: result.title,
						englishTitle: result.title,
						dataSource: this.apiName,
						id: result.id,
						rss: result.rssUrl,
						image: result.imageUrl,
						appleid: result.applePodcastsId,
						spotifyid: result.spotifyId,
						url: result.webUrl,
						
					}),
				);
			}
		}

		return ok (ret); 
				
	}
		

	async getById(id: string): Promise<MediaTypeModel, MDBError> {
		
		Logger.log(`MDB | api "${this.apiName}" queried by ID`);

		//confirm credentials 
		const clientId = this.plugin.app.secretStorage.getSecret(this.plugin.settings.PodchaserClientId);
		if (!clientId) {
			return err({
				kind: MDBErrorKind.Validation,
				message: `MDB | Client ID for ${this.apiName} missing.`,
				userMessage: `Client ID for ${this.apiName} missing.`,
				context: { apiName: this.apiName },
			});
		}

		//get auth token
		const tokenResult = await this.getAuthToken();
		if (!tokenResult.ok) {
			return err(tokenResult.error);
		}
		const token = tokenResult.value;
		const endpoint = `https://api.podchaser.com/graphql`
		const graphQLClient = new GraphQLClient(endpoint,  {
			headers: {
				authorization: `Bearer ${token}`,
			},
		})

		//create query
		const variables = {
			podchaserId: id,
		}
		
		const query = gql`
			query byID ($podchaserId: String!){
				podcast(identifier: {id: $podchaserId type: PODCHASER}) {

					id,
					title,
					description,
					webUrl,
					rssUrl,
					imageUrl,
					applePodcastsId,
					spotifyId,

					credits {

						data{

							creator {
								name
							}

							role {
								title
							}
						} 
					}
				}
			}
		`
    
		//make the request 
		const response = await graphQLClient.request(query,variables)
		const data = response.podcast as SearchResponse //type asertion
		
		//create list of cast
		let castList: string[] = []
		for (const person of data.credits.data)
			castList.push(person.creator.name)
		
		if (data.credits.data.length > 0){ //check if podcast contains credits
			return ok ( 
				new PodcastModel ({
					title: data.title,
					description: data.description,
					englishTitle: data.title,
					dataSource: this.apiName,
					id: data.id,
					rss: data.rssUrl,
					image: data.imageUrl,
					appleid: data.applePodcastsId,
					spotifyid: data.spotifyId,
					cast: castList, //needs a list of names and not just a single string
					url: data.webUrl,

					userData: {
						played: false,
						personalRating: 0,
					},
				})
			) 
		}

		else{
			return ok(  
				new PodcastModel ({
					title: data.title,
					englishTitle: data.title,
					dataSource: this.apiName,
					id: data.id,
					rss: data.rssUrl,
					image: data.imageUrl,
					appleid: data.applePodcastsId,
					spotifyid: data.spotifyId,
					url: data.webUrl,

					userData: {
						played: false,
						personalRating: 0,
					},
				}) 
			)
		}
	}

	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.PodchaserAPI_disabledMediaTypes;
	}
}
