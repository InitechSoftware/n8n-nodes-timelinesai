import {
	NodeOperationError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IDisplayOptions,
	type IHttpRequestOptions,
	type INodeProperties,
} from 'n8n-workflow';

type ShowCondition = NonNullable<IDisplayOptions['show']>;

/** Resolves the WABA chat ID from any resource-locator mode, including a pasted chat URL. */
export const WABA_CHAT_ID =
	'{{ String($parameter.wabaChat).match(/\\/chat\\/(\\d+)/)?.[1] ?? $parameter.wabaChat }}';

export const wabaChatSelect: INodeProperties = {
	displayName: 'WABA Chat',
	name: 'wabaChat',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a chat...',
			typeOptions: { searchListMethod: 'getWabaChats', searchable: true },
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 102737',
			validation: [
				{ type: 'regex', properties: { regex: '^[0-9]+$', errorMessage: 'Chat ID must be a number' } },
			],
		},
		{
			displayName: 'By URL',
			name: 'url',
			type: 'string',
			placeholder: 'e.g. https://app.timelines.ai/chat/102737/messages/',
			extractValue: { type: 'regex', regex: '\\/chat\\/([0-9]+)' },
			validation: [
				{
					type: 'regex',
					properties: { regex: '.*\\/chat\\/[0-9]+.*', errorMessage: 'Not a valid TimelinesAI chat URL' },
				},
			],
		},
	],
};

export const wabaAccountSelect: INodeProperties = {
	displayName: 'WABA Account',
	name: 'wabaAccount',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a WABA account...',
			typeOptions: { searchListMethod: 'getWabaAccounts', searchable: true },
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 56',
			validation: [
				{ type: 'regex', properties: { regex: '^[0-9]+$', errorMessage: 'Account ID must be a number' } },
			],
		},
	],
};

/** Message payload fields shared by "Send in Chat" and "Send to Phone". */
export function wabaPayloadFields(show: ShowCondition): INodeProperties[] {
	const forType = (type: string) => ({ show: { ...show, messageType: [type] } });
	const variableList = (displayName: string, name: string, section: string): INodeProperties => ({
		displayName,
		name,
		type: 'fixedCollection',
		typeOptions: { multipleValues: true, sortable: true },
		placeholder: 'Add Variable',
		default: {},
		description: `Values for the template's ${section} placeholders, in order ({{1}}, {{2}}, …)`,
		displayOptions: forType('template'),
		options: [
			{
				displayName: 'Variable',
				name: 'variables',
				values: [{ displayName: 'Value', name: 'value', type: 'string', default: '' }],
			},
		],
	});

	return [
		{
			displayName: 'Message Type',
			name: 'messageType',
			type: 'options',
			options: [
				{ name: 'Text', value: 'text', description: 'Free text. Only within the 24-hour service window.' },
				{
					name: 'File',
					value: 'file',
					description: 'A file uploaded with File → Upload, with an optional caption',
				},
				{
					name: 'Template',
					value: 'template',
					description: 'An approved template. Works outside the 24-hour service window.',
				},
			],
			default: 'text',
			displayOptions: { show },
		},
		{
			displayName: 'Text',
			name: 'text',
			type: 'string',
			typeOptions: { rows: 4 },
			default: '',
			required: true,
			displayOptions: forType('text'),
		},
		{
			displayName: 'File UID',
			name: 'fileUid',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'e.g. afa9d4dd-978d-4a14-aa1b-bd65c272e645',
			description: 'UID of a file uploaded with File → Upload',
			displayOptions: forType('file'),
		},
		{
			displayName: 'Caption',
			name: 'caption',
			type: 'string',
			default: '',
			displayOptions: forType('file'),
		},
		{
			displayName: 'Template',
			name: 'template',
			type: 'resourceLocator',
			default: { mode: 'list', value: '' },
			required: true,
			description: 'Approved template to send',
			displayOptions: forType('template'),
			modes: [
				{
					displayName: 'From List',
					name: 'list',
					type: 'list',
					placeholder: 'Select a template...',
					typeOptions: { searchListMethod: 'getWabaTemplates', searchable: true },
				},
				{
					displayName: 'By Name and Language',
					name: 'nameLanguage',
					type: 'string',
					placeholder: 'e.g. order_update|en_US',
					validation: [
						{
							type: 'regex',
							properties: {
								regex: '^[^|]+\\|[^|]+$',
								errorMessage: 'Use the format template_name|language, e.g. order_update|en_US',
							},
						},
					],
				},
			],
		},
		variableList('Header Variables', 'headerVariables', 'header'),
		variableList('Body Variables', 'bodyVariables', 'body'),
	];
}

type VariableList = { variables?: Array<{ value: string }> };

/** preSend: builds the WABA message body from "Message Type" and enforces "exactly one of". */
export async function buildWabaMessageBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const fail = (message: string, description: string) =>
		new NodeOperationError(this.getNode(), message, { description, itemIndex: this.getItemIndex() });

	const body = { ...((requestOptions.body ?? {}) as IDataObject) };
	const messageType = this.getNodeParameter('messageType', 'text') as string;

	if (messageType === 'text') {
		const text = String(this.getNodeParameter('text', '')).trim();
		if (!text) throw fail('Text is empty', 'Enter the message text, or choose another Message Type.');
		body.text = text;
	} else if (messageType === 'file') {
		const fileUid = String(this.getNodeParameter('fileUid', '')).trim();
		if (!fileUid) throw fail('File UID is empty', 'Upload the file with File → Upload and use its UID.');
		body.file_uid = fileUid;
		const caption = String(this.getNodeParameter('caption', '')).trim();
		if (caption) body.text = caption;
	} else {
		const raw = String(this.getNodeParameter('template', '', { extractValue: true }) ?? '');
		const [name, language] = raw.split('|').map((part) => part.trim());
		if (!name || !language) {
			throw fail(
				'Template is not selected',
				'Pick an approved template from the list, or enter it as template_name|language.',
			);
		}
		const toValues = (list: VariableList) => (list.variables ?? []).map((v) => v.value);
		const header = toValues(this.getNodeParameter('headerVariables', {}) as VariableList);
		const bodyVars = toValues(this.getNodeParameter('bodyVariables', {}) as VariableList);
		const variables: IDataObject = {};
		if (header.length) variables.header = header;
		if (bodyVars.length) variables.body = bodyVars;
		body.template = { name, language, ...(Object.keys(variables).length ? { variables } : {}) };
	}

	requestOptions.body = body;
	return requestOptions;
}
