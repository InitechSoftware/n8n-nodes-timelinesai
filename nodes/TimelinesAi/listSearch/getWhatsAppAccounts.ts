import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { timelinesApiRequest } from '../shared/transport';

type WhatsAppAccountsResponse = {
	data: {
		whatsapp_accounts: Array<{
			id: string;
			phone: string;
			account_name?: string;
			status?: string;
		}>;
	};
};

export async function getWhatsAppAccounts(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response = (await timelinesApiRequest.call(
		this,
		'GET',
		'/whatsapp_accounts',
	)) as WhatsAppAccountsResponse;

	const needle = filter?.toLowerCase() ?? '';
	const results = response.data.whatsapp_accounts
		.map((account) => ({
			name: `${account.account_name ?? account.phone} (${account.phone})${
				account.status && account.status !== 'active' ? ` – ${account.status}` : ''
			}`,
			value: account.phone,
		}))
		.filter((option) => !needle || option.name.toLowerCase().includes(needle));

	return { results };
}
