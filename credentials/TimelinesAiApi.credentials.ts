import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class TimelinesAiApi implements ICredentialType {
	name = 'timelinesAiApi';

	displayName = 'TimelinesAI API';

	icon: Icon = { light: 'file:../icons/timelinesai.svg', dark: 'file:../icons/timelinesai.dark.svg' };

	documentationUrl = 'https://timelines.ai/docs/public-api-reference/overview';

	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description:
				'Public API token of your TimelinesAI workspace. Find it in TimelinesAI under Integrations → Public API.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://app.timelines.ai/integrations/api',
			description: 'TimelinesAI Public API address. Keep the default.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/+$/, "")}}',
			url: '/workspace',
			method: 'GET',
		},
		rules: [
			{
				type: 'responseCode',
				properties: {
					value: 401,
					message:
						'The API token is invalid or was regenerated. Paste the current token from TimelinesAI.',
				},
			},
		],
	};
}
