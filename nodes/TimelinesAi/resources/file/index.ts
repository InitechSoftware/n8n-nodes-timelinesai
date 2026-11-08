import type {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { applyMultipart, buildMultipart, readInputFile } from '../../shared/multipart';

const forFiles = { resource: ['file'] };

async function sendFileAsMultipart(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const file = await readInputFile.call(this);
	const options = this.getNodeParameter('uploadOptions', {}) as {
		filename?: string;
		content_type?: string;
		caption?: string;
	};
	const parts: Parameters<typeof buildMultipart>[0] = [
		{
			name: 'file',
			filename: options.filename || file.filename,
			contentType: options.content_type || file.contentType,
			data: file.data,
		},
	];
	if (options.filename) parts.push({ name: 'filename', value: options.filename });
	if (options.content_type) parts.push({ name: 'content_type', value: options.content_type });
	if (options.caption) parts.push({ name: 'caption', value: options.caption });
	return applyMultipart(requestOptions, buildMultipart(parts));
}

const fileUidField: INodeProperties = {
	displayName: 'File UID',
	name: 'fileUid',
	type: 'string',
	default: '',
	required: true,
	placeholder: 'e.g. 90d353e6-44c1-48ff-b15b-69b7721e5450',
	description: 'UID of the uploaded file, as returned by Upload or Get Many',
};

export const fileDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: forFiles },
		options: [
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a file',
				description: 'Delete an uploaded file',
				routing: {
					request: { method: 'DELETE', url: '=/files/{{ $parameter.fileUid }}' },
					output: { postReceive: [{ type: 'set', properties: { value: '={{ { "deleted": true } }}' } }] },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a file',
				description: 'Get file details and a download URL that is valid for 15 minutes',
				routing: {
					request: { method: 'GET', url: '=/files/{{ $parameter.fileUid }}' },
					output: { postReceive: [{ type: 'rootProperty', properties: { property: 'data' } }] },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many files',
				description: 'Get many files uploaded to the workspace',
				routing: {
					request: { method: 'GET', url: '/files' },
					output: { postReceive: [{ type: 'rootProperty', properties: { property: 'data' } }] },
				},
			},
			{
				name: 'Upload',
				value: 'upload',
				action: 'Upload a file',
				description: 'Upload a file to send later as a message attachment',
				routing: {
					request: {
						method: 'POST',
						url: '={{ $parameter.inputType === "url" ? "/files" : "/files_upload" }}',
					},
					output: { postReceive: [{ type: 'rootProperty', properties: { property: 'data' } }] },
				},
			},
		],
		default: 'upload',
	},

	// ----- Upload -----
	{
		displayName: 'Input Type',
		name: 'inputType',
		type: 'options',
		options: [
			{
				name: 'Binary Data',
				value: 'binaryData',
				description: 'Upload a file from the binary data of an earlier node',
			},
			{
				name: 'URL',
				value: 'url',
				description: 'Let TimelinesAI download the file from a public URL',
			},
		],
		default: 'binaryData',
		displayOptions: { show: { ...forFiles, operation: ['upload'] } },
	},
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		hint: 'The name of the input binary field containing the file to upload',
		displayOptions: { show: { ...forFiles, operation: ['upload'], inputType: ['binaryData'] } },
		routing: { send: { preSend: [sendFileAsMultipart] } },
	},
	{
		displayName: 'File URL',
		name: 'fileUrl',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. https://example.com/brochure.pdf',
		description:
			'Publicly accessible URL of the file. Share links from Google Drive or OneDrive do not work.',
		displayOptions: { show: { ...forFiles, operation: ['upload'], inputType: ['url'] } },
		routing: { send: { type: 'body', property: 'download_url' } },
	},
	{
		displayName: 'Options',
		name: 'uploadOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { ...forFiles, operation: ['upload'] } },
		options: [
			{
				displayName: 'Caption',
				name: 'caption',
				type: 'string',
				default: '',
				description: 'Caption text stored with the file. Only for binary uploads.',
				displayOptions: { show: { '/inputType': ['binaryData'] } },
			},
			{
				displayName: 'Content Type',
				name: 'content_type',
				type: 'string',
				default: '',
				placeholder: 'e.g. application/pdf',
				description: 'MIME type to use instead of the detected one',
				routing: { send: { type: 'body', property: 'content_type' } },
			},
			{
				displayName: 'File Name',
				name: 'filename',
				type: 'string',
				default: '',
				placeholder: 'e.g. brochure.pdf',
				description: 'File name to use instead of the original one',
				routing: { send: { type: 'body', property: 'filename' } },
			},
		],
	},

	// ----- Get / Delete -----
	{
		...fileUidField,
		displayOptions: { show: { ...forFiles, operation: ['get', 'delete'] } },
	},

	// ----- Get Many -----
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { ...forFiles, operation: ['getAll'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { ...forFiles, operation: ['getAll'], returnAll: [false] } },
		routing: { output: { maxResults: '={{$value}}' } },
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { ...forFiles, operation: ['getAll'] } },
		options: [
			{
				displayName: 'File Name',
				name: 'filename',
				type: 'string',
				default: '',
				placeholder: 'e.g. .pdf',
				description: 'Return files whose name contains this text (case-insensitive)',
				routing: { request: { qs: { filename: '={{$value}}' } } },
			},
		],
	},
];
