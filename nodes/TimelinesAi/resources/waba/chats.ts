import type { INodeProperties } from 'n8n-workflow';
import { paginateByPage } from '../../shared/pagination';
import { simplifyChats } from '../../shared/utils';
import { WABA_CHAT_ID, wabaAccountSelect, wabaChatSelect } from '../../shared/waba';

const forChats = { resource: ['wabaChat'] };
const forLabels = { resource: ['wabaChatLabel'] };
const dataRoot = { postReceive: [{ type: 'rootProperty' as const, properties: { property: 'data' } }] };
const LABELS_ARRAY =
	'={{ String($value).split(",").map((label) => label.trim()).filter((label) => label !== "") }}';

export const wabaChatDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: forChats },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a WABA chat',
				description: 'Get the details of a WABA chat',
				routing: { request: { method: 'GET', url: `=/waba/chats/${WABA_CHAT_ID}` }, output: dataRoot },
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many WABA chats',
				description: 'Get many WABA chats, optionally filtered',
				routing: {
					request: { method: 'GET', url: '/waba/chats' },
					output: { postReceive: [{ type: 'rootProperty', properties: { property: 'data.chats' } }] },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a WABA chat',
				description: 'Rename, assign, close or reopen a WABA chat, or mark it read or unread',
				routing: { request: { method: 'PATCH', url: `=/waba/chats/${WABA_CHAT_ID}` }, output: dataRoot },
			},
		],
		default: 'getAll',
	},
	{ ...wabaChatSelect, displayOptions: { show: { ...forChats, operation: ['get', 'update'] } } },
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...forChats, operation: ['update'] } },
		options: [
			{
				displayName: 'Closed',
				name: 'closed',
				type: 'boolean',
				default: false,
				description: 'Whether the chat is closed (on) or open (off)',
				routing: { send: { type: 'body', property: 'closed' } },
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'New chat name. Must be unique in the workspace.',
				routing: { send: { type: 'body', property: 'name' } },
			},
			{
				displayName: 'Read',
				name: 'read',
				type: 'boolean',
				default: true,
				description: 'Whether the chat is marked as read (on) or unread (off)',
				routing: { send: { type: 'body', property: 'read' } },
			},
			{
				displayName: 'Responsible',
				name: 'responsible',
				type: 'string',
				default: '',
				placeholder: 'e.g. john.doe@acme.com',
				description: 'Registration email of the teammate to assign the chat to. Leave empty to unassign.',
				routing: { send: { type: 'body', property: 'responsible' } },
			},
		],
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { ...forChats, operation: ['getAll'] } },
		routing: { send: { paginate: true }, operations: { pagination: paginateByPage } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { ...forChats, operation: ['getAll'], returnAll: [false] } },
		routing: { output: { maxResults: '={{$value}}' } },
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { ...forChats, operation: ['getAll'] } },
		options: [
			{
				displayName: 'Closed',
				name: 'closed',
				type: 'boolean',
				default: false,
				description: 'Whether to return only closed chats (on) or only open chats (off)',
				routing: { request: { qs: { closed: '={{$value}}' } } },
			},
			{
				displayName: 'Contact Phone',
				name: 'whatsapp_phone',
				type: 'string',
				default: '',
				placeholder: 'e.g. +14155550123',
				routing: { request: { qs: { whatsapp_phone: '={{$value}}' } } },
			},
			{
				displayName: 'Responsible',
				name: 'responsible',
				type: 'string',
				default: '',
				placeholder: 'e.g. john.doe@acme.com',
				description: 'Email of the teammate the chats are assigned to',
				routing: { request: { qs: { responsible: '={{$value}}' } } },
			},
			{
				displayName: 'WABA Account ID',
				name: 'waba_account_id',
				type: 'string',
				default: '',
				placeholder: 'e.g. 56',
				routing: { request: { qs: { waba_account_id: '={{$value}}' } } },
			},
		],
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
		displayOptions: { show: { ...forChats, operation: ['get', 'getAll', 'update'] } },
		routing: { output: { postReceive: [simplifyChats] } },
	},
];

export const wabaChatLabelDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: forLabels },
		options: [
			{
				name: 'Add',
				value: 'add',
				action: 'Add labels to a WABA chat',
				description: 'Add labels to a WABA chat and keep the existing ones',
				routing: { request: { method: 'PUT', url: `=/waba/chats/${WABA_CHAT_ID}/labels` } },
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get labels of a WABA chat',
				description: 'Get many labels applied to a WABA chat',
				routing: { request: { method: 'GET', url: `=/waba/chats/${WABA_CHAT_ID}/labels` } },
			},
			{
				name: 'Replace',
				value: 'replace',
				action: 'Replace labels of a WABA chat',
				description: 'Replace all labels of a WABA chat with the given set',
				routing: { request: { method: 'POST', url: `=/waba/chats/${WABA_CHAT_ID}/labels` } },
			},
		],
		default: 'add',
		routing: { output: dataRoot },
	},
	{ ...wabaChatSelect, displayOptions: { show: forLabels } },
	{
		displayName: 'Labels',
		name: 'labels',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. customer,vip',
		description: 'Comma-separated label names. Labels that do not exist in the workspace are created.',
		displayOptions: { show: { ...forLabels, operation: ['add'] } },
		routing: { send: { type: 'body', property: 'labels', value: LABELS_ARRAY } },
	},
	{
		displayName: 'Labels',
		name: 'labels',
		type: 'string',
		default: '',
		placeholder: 'e.g. customer,vip',
		description: 'Comma-separated labels that become the full label set. Leave empty to remove all labels.',
		displayOptions: { show: { ...forLabels, operation: ['replace'] } },
		routing: { send: { type: 'body', property: 'labels', value: LABELS_ARRAY } },
	},
];

export { wabaAccountSelect };
