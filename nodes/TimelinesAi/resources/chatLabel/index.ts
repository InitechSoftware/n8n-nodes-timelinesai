import type { INodeProperties } from 'n8n-workflow';
import { CHAT_ID, chatSelect } from '../../shared/descriptions';

const showOnlyForChatLabels = {
	resource: ['chatLabel'],
};

const LABELS_ARRAY =
	'={{ String($value).split(",").map((label) => label.trim()).filter((label) => label !== "") }}';

export const chatLabelDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForChatLabels },
		options: [
			{
				name: 'Add',
				value: 'add',
				action: 'Add labels to a chat',
				description: 'Add labels to a chat and keep the existing ones',
				routing: {
					request: {
						method: 'PUT',
						url: `=/chats/${CHAT_ID}/labels`,
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get labels of a chat',
				description: 'Get many labels applied to a chat',
				routing: {
					request: {
						method: 'GET',
						url: `=/chats/${CHAT_ID}/labels`,
					},
				},
			},
			{
				name: 'Replace',
				value: 'replace',
				action: 'Replace labels of a chat',
				description: 'Replace all labels of a chat with the given set',
				routing: {
					request: {
						method: 'POST',
						url: `=/chats/${CHAT_ID}/labels`,
					},
				},
			},
		],
		default: 'add',
		routing: {
			output: {
				postReceive: [{ type: 'rootProperty', properties: { property: 'data' } }],
			},
		},
	},
	{
		...chatSelect,
		displayOptions: { show: showOnlyForChatLabels },
	},
	{
		displayName: 'Labels',
		name: 'labels',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. customer,vip',
		description:
			'Comma-separated label names, up to 64 characters each. Labels that do not exist in the workspace are created.',
		displayOptions: {
			show: {
				...showOnlyForChatLabels,
				operation: ['add'],
			},
		},
		routing: { send: { type: 'body', property: 'labels', value: LABELS_ARRAY } },
	},
	{
		displayName: 'Labels',
		name: 'labels',
		type: 'string',
		default: '',
		placeholder: 'e.g. customer,vip',
		description:
			'Comma-separated label names that will become the full label set of the chat. Leave empty to remove all labels.',
		displayOptions: {
			show: {
				...showOnlyForChatLabels,
				operation: ['replace'],
			},
		},
		routing: { send: { type: 'body', property: 'labels', value: LABELS_ARRAY } },
	},
];
