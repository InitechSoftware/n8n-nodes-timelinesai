import type { INodeProperties } from 'n8n-workflow';
import { CHAT_ID } from '../../shared/descriptions';
import { chatGetDescription } from './get';
import { chatGetManyDescription } from './getAll';
import { chatUpdateDescription } from './update';

const showOnlyForChats = {
	resource: ['chat'],
};

export const chatDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForChats,
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a chat',
				description: 'Get the details of a chat',
				routing: {
					request: {
						method: 'GET',
						url: `=/chats/${CHAT_ID}`,
					},
					output: {
						postReceive: [{ type: 'rootProperty', properties: { property: 'data' } }],
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many chats',
				description: 'Get a list of chats, optionally filtered',
				routing: {
					request: {
						method: 'GET',
						url: '/chats',
					},
					output: {
						postReceive: [{ type: 'rootProperty', properties: { property: 'data.chats' } }],
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a chat',
				description: 'Rename, assign, close or reopen a chat',
				routing: {
					request: {
						method: 'PATCH',
						url: `=/chats/${CHAT_ID}`,
					},
					output: {
						postReceive: [{ type: 'rootProperty', properties: { property: 'data' } }],
					},
				},
			},
		],
		default: 'getAll',
	},
	...chatGetDescription,
	...chatGetManyDescription,
	...chatUpdateDescription,
];
