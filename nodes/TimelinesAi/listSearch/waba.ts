import type { IDataObject, ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { timelinesApiRequest } from '../shared/transport';

type WabaAccount = {
	id: number;
	display_phone_number?: string;
	status?: string;
	meta_waba_id?: string;
};

type WabaTemplate = {
	id: number;
	name: string;
	language: string;
	status: string;
	category?: string;
	meta_waba_id?: string;
};

type WabaChat = { id: number; name: string; phone?: string | null; chat_url?: string };

export async function getWabaAccounts(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response = (await timelinesApiRequest.call(this, 'GET', '/waba/accounts')) as {
		data: { waba_accounts: WabaAccount[] };
	};
	const needle = filter?.toLowerCase() ?? '';
	const results = response.data.waba_accounts
		.map((account) => ({
			name: `${account.display_phone_number ?? `Account ${account.id}`}${
				account.status && account.status !== 'active' ? ` – ${account.status}` : ''
			}`,
			value: String(account.id),
		}))
		.filter((option) => !needle || option.name.toLowerCase().includes(needle));
	return { results };
}

export async function getWabaChats(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const page = paginationToken ? Number(paginationToken) : 1;
	const qs: IDataObject = { page };
	// The WABA chat list has no name filter; a number in the search box filters by phone.
	if (filter && /^[+\d\s()-]+$/.test(filter)) qs.whatsapp_phone = filter;

	const response = (await timelinesApiRequest.call(this, 'GET', '/waba/chats', qs)) as {
		data: { chats: WabaChat[]; has_more_pages: boolean };
	};
	const needle = filter && !qs.whatsapp_phone ? filter.toLowerCase() : '';
	const results = response.data.chats
		.map((chat) => ({
			name: chat.phone && chat.phone !== chat.name ? `${chat.name} (${chat.phone})` : chat.name,
			value: String(chat.id),
		}))
		.filter((option) => !needle || option.name.toLowerCase().includes(needle));
	return {
		results,
		paginationToken: response.data.has_more_pages ? String(page + 1) : undefined,
	};
}

/**
 * Approved templates only, as `name|language`. When a WABA account is chosen
 * on the node, only templates of that account's WhatsApp Business Account are
 * listed.
 */
export async function getWabaTemplates(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const page = paginationToken ? Number(paginationToken) : 1;
	const response = (await timelinesApiRequest.call(this, 'GET', '/waba/templates', { page })) as {
		data: { templates: WabaTemplate[]; has_more_pages: boolean };
	};

	let metaWabaId: string | undefined;
	try {
		const accountId = this.getCurrentNodeParameter('wabaAccount', { extractValue: true }) as
			| string
			| undefined;
		if (accountId) {
			const accounts = (await timelinesApiRequest.call(this, 'GET', '/waba/accounts')) as {
				data: { waba_accounts: WabaAccount[] };
			};
			metaWabaId = accounts.data.waba_accounts.find((a) => String(a.id) === String(accountId))
				?.meta_waba_id;
		}
	} catch {
		// No account chosen (e.g. Send in Chat): list templates of all accounts.
	}

	const needle = filter?.toLowerCase() ?? '';
	const results = response.data.templates
		.filter((t) => t.status === 'APPROVED')
		.filter((t) => !metaWabaId || t.meta_waba_id === metaWabaId)
		.map((t) => ({
			name: `${t.name} (${t.language})${t.category ? ` – ${t.category.toLowerCase()}` : ''}`,
			value: `${t.name}|${t.language}`,
		}))
		.filter((option) => !needle || option.name.toLowerCase().includes(needle));

	return {
		results,
		paginationToken: response.data.has_more_pages ? String(page + 1) : undefined,
	};
}
