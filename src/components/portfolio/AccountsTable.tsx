import React from 'react';
import { Account } from '../../services/PortfolioManager';
import { Edit, Trash2, Check, X, ExternalLink } from 'lucide-react';

interface AccountsTableProps {
  accounts: Account[];
  onEdit: (account: Account) => void;
  onDelete: (accountId: string) => void;
}

export function AccountsTable({ accounts, onEdit, onDelete }: AccountsTableProps) {
  if (accounts.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Accounts</h3>
        <div className="text-center text-gray-400 py-8">
          <div className="text-lg mb-2">No Accounts</div>
          <div className="text-sm">Add an account to get started</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Accounts</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left p-4 text-gray-400 font-medium">Name</th>
              <th className="text-left p-4 text-gray-400 font-medium">Exchange</th>
              <th className="text-left p-4 text-gray-400 font-medium">API Key</th>
              <th className="text-center p-4 text-gray-400 font-medium">Testnet</th>
              <th className="text-center p-4 text-gray-400 font-medium">Active</th>
              <th className="text-right p-4 text-gray-400 font-medium">Created</th>
              <th className="text-center p-4 text-gray-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="p-4">
                  <div className="text-white font-medium">{account.name}</div>
                  {account.description && (
                    <div className="text-gray-400 text-xs">{account.description}</div>
                  )}
                </td>
                <td className="p-4">
                  <div className="text-white">{account.exchange}</div>
                </td>
                <td className="p-4">
                  <div className="text-gray-400 font-mono text-sm">
                    {account.apiKey ? 
                      `${account.apiKey.substring(0, 4)}...${account.apiKey.substring(account.apiKey.length - 4)}` : 
                      'Not set'
                    }
                  </div>
                </td>
                <td className="p-4 text-center">
                  {account.testnet ? 
                    <Check size={18} className="text-green-400 mx-auto" /> : 
                    <X size={18} className="text-red-400 mx-auto" />
                  }
                </td>
                <td className="p-4 text-center">
                  <div className={`inline-block w-3 h-3 rounded-full ${
                    account.isActive ? 'bg-green-400' : 'bg-gray-400'
                  }`}></div>
                </td>
                <td className="p-4 text-right">
                  <div className="text-gray-400 text-sm">
                    {new Date(account.createdAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      onClick={() => onEdit(account)}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                      title="Edit Account"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(account.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                      title="Delete Account"
                    >
                      <Trash2 size={16} />
                    </button>
                    <a
                      href={`https://${account.exchange}.com`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gray-300 transition-colors"
                      title="Visit Exchange"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}