import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { timelinesApiRequest } from '../shared/transport';

type ChatListResponse = {
	data: {
		has_more_pages: boolean;
		chats: Array<{ id: number; name: string; phone?: string | null; chat_url: string }>;
	};
};

export async function getChats(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const page = paginationToken ? Number(paginationToken) : 1;
	const qs: IDataObject = { page };
	if (filter) qs.name = filter;

	const response = (await timelinesApiRequest.call(this, 'GET', '/chats', qs)) as ChatListResponse;

	const results: INodeListSearchItems[] = response.data.chats.map((chat) => ({
		name: chat.phone ? `${chat.name} (${chat.phone})` : chat.name,
		value: String(chat.id),
		url: chat.chat_url,
	}));

	return {
		results,
		paginationToken: response.data.has_more_pages ? String(page + 1) : undefined,
	};
}
