import type {
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';

export const CREDENTIAL_NAME = 'timelinesAiApi';

export async function getBaseUrl(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IWebhookFunctions,
): Promise<string> {
	const credentials = await this.getCredentials<{ baseUrl: string }>(CREDENTIAL_NAME);
	return credentials.baseUrl.replace(/\/+$/, '');
}

export async function timelinesApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	method: IHttpRequestMethods,
	resource: string,
	qs: IDataObject = {},
	body: IDataObject | undefined = undefined,
) {
	const baseUrl = await getBaseUrl.call(this);

	const options: IHttpRequestOptions = {
		method,
		qs,
		body,
		url: `${baseUrl}${resource}`,
		json: true,
	};

	return this.helpers.httpRequestWithAuthentication.call(this, CREDENTIAL_NAME, options);
}
