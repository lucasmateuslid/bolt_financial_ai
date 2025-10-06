import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Wallet, Plus, CreditCard as Edit2, Trash2, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

interface WalletData {
  id: string;
  name: string;
  balance: number;
  type: string;
  color: string;
  currency: string;
}

const WALLET_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
];

const WALLET_TYPES = ['personal', 'business', 'investment'];

export function Wallets() {
  const { user } = useAuth();
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<WalletData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'personal',
    color: '#3B82F6',
    currency: 'BRL',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchWallets();
    }
  }, [user]);

  const fetchWallets = async () => {
    try {
      const { data } = await supabase
        .from('wallets')
        .select('*')
        .order('created_at', { ascending: true });

      if (data) setWallets(data);
    } catch (error) {
      console.error('Error fetching wallets:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (wallet?: WalletData) => {
    if (wallet) {
      setEditingWallet(wallet);
      setFormData({
        name: wallet.name,
        type: wallet.type,
        color: wallet.color,
        currency: wallet.currency,
      });
    } else {
      setEditingWallet(null);
      setFormData({
        name: '',
        type: 'personal',
        color: '#3B82F6',
        currency: 'BRL',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingWallet(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (editingWallet) {
        await supabase
          .from('wallets')
          .update(formData)
          .eq('id', editingWallet.id);
      } else {
        await supabase
          .from('wallets')
          .insert([{ ...formData, user_id: user?.id }]);
      }

      await fetchWallets();
      closeModal();
    } catch (error) {
      console.error('Error saving wallet:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this wallet?')) return;

    try {
      await supabase.from('wallets').delete().eq('id', id);
      await fetchWallets();
    } catch (error) {
      console.error('Error deleting wallet:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Wallets</h1>
          <p className="text-gray-600 mt-1">Manage your financial accounts</p>
        </div>
        <Button onClick={() => openModal()} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Wallet
        </Button>
      </div>

      {wallets.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No wallets yet</h3>
          <p className="text-gray-600 mb-6">Create your first wallet to start tracking your finances</p>
          <Button onClick={() => openModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Create Wallet
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wallets.map((wallet) => (
            <div
              key={wallet.id}
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${wallet.color}20` }}
                >
                  <Wallet className="w-6 h-6" style={{ color: wallet.color }} />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => openModal(wallet)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(wallet.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{wallet.name}</h3>
              <p className="text-sm text-gray-500 capitalize mb-3">{wallet.type}</p>
              <p className="text-2xl font-bold text-gray-900">
                R$ {Number(wallet.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingWallet ? 'Edit Wallet' : 'Create Wallet'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Wallet Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Personal Account"
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {WALLET_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, type })}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${
                        formData.type === type
                          ? 'border-blue-600 bg-blue-50 text-blue-600'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="grid grid-cols-8 gap-2">
                  {WALLET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-lg transition-transform ${
                        formData.color === color ? 'ring-2 ring-offset-2 ring-blue-600 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSaving} className="flex-1">
                  {editingWallet ? 'Save Changes' : 'Create Wallet'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
