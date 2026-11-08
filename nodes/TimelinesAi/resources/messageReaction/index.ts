import type { INodeProperties } from 'n8n-workflow';
import { messageUidField } from '../../shared/descriptions';

const forReactions = { resource: ['messageReaction'] };

export const messageReactionDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: forReactions },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get the reactions of a message',
				description: 'Get who reacted to a message and with which emoji',
				routing: {
					request: { method: 'GET', url: '=/messages/{{ $parameter.messageUid }}/reactions' },
					output: { postReceive: [{ type: 'rootProperty', properties: { property: 'data' } }] },
				},
			},
			{
				name: 'Set',
				value: 'set',
				action: 'Set your reaction to a message',
				description: 'Set or clear the reaction of your WhatsApp account on a message',
				routing: {
					request: { method: 'PATCH', url: '=/messages/{{ $parameter.messageUid }}/reactions' },
					output: {
						// The API omits `data` when a reaction is cleared; return a stable shape instead.
						postReceive: [
							{
								type: 'set',
								properties: {
									value:
										'={{ { "message_uid": $parameter.messageUid, "reaction": $parameter.reaction } }}',
								},
							},
						],
					},
				},
			},
		],
		default: 'get',
	},
	{
		...messageUidField,
		displayOptions: { show: forReactions },
	},
	{
		displayName: 'Reaction',
		name: 'reaction',
		type: 'string',
		default: '',
		placeholder: 'e.g. 👍',
		description: 'A single emoji. Leave empty to clear your reaction.',
		displayOptions: { show: { ...forReactions, operation: ['set'] } },
		routing: { send: { type: 'body', property: 'reaction' } },
	},
];
