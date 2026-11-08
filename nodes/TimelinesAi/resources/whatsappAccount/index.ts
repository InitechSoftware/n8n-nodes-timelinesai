import type { INodeProperties } from 'n8n-workflow';

const forAccounts = { resource: ['whatsappAccount'] };

export const whatsappAccountDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: forAccounts },
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many connected accounts',
				description: 'Get many WhatsApp accounts connected to the workspace',
				routing: {
					request: { method: 'GET', url: '/whatsapp_accounts' },
					output: {
						postReceive: [
							{ type: 'rootProperty', properties: { property: 'data.whatsapp_accounts' } },
						],
					},
				},
			},
			{
				name: 'Get Pairing Status',
				value: 'getPairingStatus',
				action: 'Get the status of a phone pairing',
				description: 'Get the state and pairing code of a phone link started with Start Phone Pairing',
				routing: {
					request: {
						method: 'GET',
						url: '=/whatsapp_accounts/phone_pairing/{{ $parameter.pairingId }}',
					},
					output: { postReceive: [{ type: 'rootProperty', properties: { property: 'data' } }] },
				},
			},
			{
				name: 'Start Phone Pairing',
				value: 'startPairing',
				action: 'Start linking a number by pairing code',
				description:
					'Start linking a WhatsApp number with a pairing code instead of a QR scan',
				routing: {
					request: { method: 'POST', url: '/whatsapp_accounts/phone_pairing' },
					output: { postReceive: [{ type: 'rootProperty', properties: { property: 'data' } }] },
				},
			},
		],
		default: 'getAll',
	},
	{
		displayName:
			'The pairing code usually arrives a few seconds later. Use Get Pairing Status (after a Wait node) until the state is "awaiting_code", then enter the code in WhatsApp on the phone: Linked devices → Link with phone number.',
		name: 'pairingNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: { ...forAccounts, operation: ['startPairing'] } },
	},
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. +14155550123',
		description: 'WhatsApp phone number to link, in international format',
		displayOptions: { show: { ...forAccounts, operation: ['startPairing'] } },
		routing: { send: { type: 'body', property: 'phone' } },
	},
	{
		displayName: 'Options',
		name: 'pairingOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { ...forAccounts, operation: ['startPairing'] } },
		options: [
			{
				displayName: 'For Teammate (User ID)',
				name: 'user_id',
				type: 'number',
				default: 0,
				description:
					'User ID of the teammate the number is linked for, from Workspace → Get Teammates. Leave unset to link it for the token owner.',
				routing: { send: { type: 'body', property: 'user_id' } },
			},
		],
	},
	{
		displayName: 'Pairing ID',
		name: 'pairingId',
		type: 'number',
		default: 0,
		required: true,
		description: 'The "ID" returned by Start Phone Pairing',
		displayOptions: { show: { ...forAccounts, operation: ['getPairingStatus'] } },
	},
];
