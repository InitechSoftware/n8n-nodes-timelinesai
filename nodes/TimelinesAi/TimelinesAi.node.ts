import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { chatDescription } from './resources/chat';
import { chatLabelDescription } from './resources/chatLabel';
import { chatNoteDescription } from './resources/chatNote';
import { fileDescription } from './resources/file';
import { messageDescription } from './resources/message';
import { messageReactionDescription } from './resources/messageReaction';
import { wabaChatDescription, wabaChatLabelDescription } from './resources/waba/chats';
import {
	wabaAccountDescription,
	wabaMessageDescription,
	wabaMessageReactionDescription,
	wabaTemplateDescription,
} from './resources/waba/messages';
import { getWabaAccounts, getWabaChats, getWabaTemplates } from './listSearch/waba';
import { whatsappAccountDescription } from './resources/whatsappAccount';
import { workspaceDescription } from './resources/workspace';
import { getChats } from './listSearch/getChats';
import { getWhatsAppAccounts } from './listSearch/getWhatsAppAccounts';

export class TimelinesAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TimelinesAI',
		name: 'timelinesAi',
		icon: { light: 'file:../../icons/timelinesai.svg', dark: 'file:../../icons/timelinesai.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage WhatsApp chats, messages and WABA in TimelinesAI',
		defaults: {
			name: 'TimelinesAI',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'timelinesAiApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/+$/, "")}}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Chat',
						value: 'chat',
					},
					{
						name: 'Chat Label',
						value: 'chatLabel',
					},
					{
						name: 'Chat Note',
						value: 'chatNote',
					},
					{
						name: 'File',
						value: 'file',
					},
					{
						name: 'Message',
						value: 'message',
					},
					{
						name: 'Message Reaction',
						value: 'messageReaction',
					},
					{
						name: 'WABA Account',
						value: 'wabaAccount',
					},
					{
						name: 'WABA Chat',
						value: 'wabaChat',
					},
					{
						name: 'WABA Chat Label',
						value: 'wabaChatLabel',
					},
					{
						name: 'WABA Message',
						value: 'wabaMessage',
					},
					{
						name: 'WABA Message Reaction',
						value: 'wabaMessageReaction',
					},
					{
						name: 'WABA Template',
						value: 'wabaTemplate',
					},
					{
						name: 'WhatsApp Account',
						value: 'whatsappAccount',
					},
					{
						name: 'Workspace',
						value: 'workspace',
					},
				],
				default: 'chat',
			},
			...chatDescription,
			...chatLabelDescription,
			...chatNoteDescription,
			...fileDescription,
			...messageDescription,
			...messageReactionDescription,
			...wabaAccountDescription,
			...wabaChatDescription,
			...wabaChatLabelDescription,
			...wabaMessageDescription,
			...wabaMessageReactionDescription,
			...wabaTemplateDescription,
			...whatsappAccountDescription,
			...workspaceDescription,
		],
	};

	methods = {
		listSearch: {
			getChats,
			getWabaAccounts,
			getWabaChats,
			getWabaTemplates,
			getWhatsAppAccounts,
		},
	};
}
