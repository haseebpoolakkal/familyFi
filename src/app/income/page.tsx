"use client";

import DashboardLayout from '@/components/shared/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getIncome, addIncome, updateIncome, deleteIncome, Income } from '@/services/income';
import { useUserStore } from '@/store/userStore';
import { useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';

export default function IncomePage() {
    const { profile } = useUserStore();
    const queryClient = useQueryClient();
    const [showAdd, setShowAdd] = useState(false);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'fixed' | 'freelance'>('fixed');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState({ amount: '', description: '', type: 'fixed' as 'fixed' | 'freelance' });

    const { data: income = [] } = useQuery({
        queryKey: ['income', profile?.household_id],
        queryFn: () => getIncome(profile!.household_id),
        enabled: !!profile?.household_id,
    });

    const addMutation = useMutation({
        mutationFn: (newIncome: Partial<Income>) => addIncome(newIncome),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['income'] });
            setShowAdd(false);
            setAmount('');
            setDescription('');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Income> }) => updateIncome(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['income'] });
            setEditingId(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteIncome(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['income'] });
        },
    });

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        addMutation.mutate({
            household_id: profile!.household_id,
            profile_id: profile!.id,
            amount: parseFloat(amount),
            description,
            type,
            date: new Date().toISOString().split('T')[0],
        });
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this income entry?')) {
            deleteMutation.mutate(id);
        }
    };

    const startEdit = (item: Income) => {
        setEditingId(item.id);
        setEditValues({
            amount: item.amount.toString(),
            description: item.description,
            type: item.type
        });
    };

    const handleUpdate = (id: string) => {
        updateMutation.mutate({
            id,
            updates: {
                amount: parseFloat(editValues.amount),
                description: editValues.description,
                type: editValues.type
            }
        });
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-800">Income Management</h2>
                        <p className="text-slate-500 font-medium">Track and manage your family&apos;s earnings.</p>
                    </div>
                    <button
                        onClick={() => setShowAdd(!showAdd)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition active:scale-95 ${showAdd ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100'}`}
                    >
                        {showAdd ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        {showAdd ? 'Cancel' : 'Add Income'}
                    </button>
                </div>

                {showAdd && (
                    <form onSubmit={handleAdd} className="mb-8 p-6 bg-white rounded-2xl border-2 border-blue-50 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
                        <h3 className="text-slate-800 text-lg font-bold mb-4">New Income Entry</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Description</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-medium transition"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="e.g. Monthly Salary"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Amount</label>
                                <input
                                    type="number"
                                    required
                                    step="0.01"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-black transition"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Income Type</label>
                                <select
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-bold transition"
                                    value={type}
                                    onChange={(e) => setType(e.target.value as 'fixed' | 'freelance')}
                                >
                                    <option value="fixed">Fixed (Salary)</option>
                                    <option value="freelance">Variable (Freelance/Other)</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="submit"
                                disabled={addMutation.isPending}
                                className="bg-blue-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100 disabled:opacity-50"
                            >
                                {addMutation.isPending ? 'Saving...' : 'Save Entry'}
                            </button>
                        </div>
                    </form>
                )}

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                                <th className="px-6 py-4 w-24"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {income.length > 0 ? (
                                income.map((item) => (
                                    <tr key={item.id} className="group hover:bg-slate-50/80 transition relative">
                                        {editingId === item.id ? (
                                            <>
                                                <td className="px-6 py-3">
                                                    <input
                                                        className="w-full px-2 py-1 text-sm border rounded outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-700"
                                                        value={editValues.description}
                                                        onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                                                    />
                                                </td>
                                                <td className="px-6 py-3">
                                                    <select
                                                        className="w-full px-2 py-1 text-sm border rounded outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-700"
                                                        value={editValues.type}
                                                        onChange={(e) => setEditValues({ ...editValues, type: e.target.value as 'fixed' | 'freelance' })}
                                                    >
                                                        <option value="fixed">Fixed</option>
                                                        <option value="freelance">Freelance</option>
                                                    </select>
                                                </td>
                                                <td className="px-6 py-3 text-slate-400 text-sm">Now</td>
                                                <td className="px-6 py-3 text-right">
                                                    <input
                                                        type="number"
                                                        className="w-24 px-2 py-1 text-sm border rounded text-right outline-none focus:ring-1 focus:ring-blue-500 font-black text-slate-800"
                                                        value={editValues.amount}
                                                        onChange={(e) => setEditValues({ ...editValues, amount: e.target.value })}
                                                    />
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <div className="flex gap-1 justify-end">
                                                        <button onClick={() => handleUpdate(item.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"><Check className="w-4 h-4" /></button>
                                                        <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition"><X className="w-4 h-4" /></button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-6 py-4 font-bold text-slate-800">{item.description}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wide ${item.type === 'fixed' ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600'
                                                        }`}>
                                                        {item.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-400 text-sm font-medium">{formatDate(new Date(item.date))}</td>
                                                <td className="px-6 py-4 text-right font-black text-slate-800">{formatCurrency(item.amount)}</td>
                                                <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="flex items-center gap-1 justify-end">
                                                        <button
                                                            onClick={() => startEdit(item)}
                                                            className="p-2 text-slate-400 hover:bg-white hover:text-blue-500 rounded-lg shadow-sm border border-transparent hover:border-slate-100 transition"
                                                            title="Edit"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(item.id)}
                                                            className="p-2 text-slate-400 hover:bg-white hover:text-red-500 rounded-lg shadow-sm border border-transparent hover:border-slate-100 transition"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center text-slate-400 bg-slate-50/30">
                                        <p className="font-bold">No income records found.</p>
                                        <p className="text-xs">Start by adding your first income entry above.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}
