'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '@/lib/api';
import DashboardLayout from '../../components/DashboardLayout';
import { Edit3, Trash2, Plus, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

type FAQ = {
  id: number;
  category: string;
  question: string;
  answer: string;
  is_active: boolean;
};

export default function AdminFaqsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    category: '',
    question: '',
    answer: '',
    is_active: true,
  });

  const fetchFaqs = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/faqs?all_faqs=true`);
      setFaqs(res.data);
    } catch (e) {
      console.error('Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const handleSave = async () => {
    try {
      if (editingId) {
        await axios.put(`${API_BASE_URL}/faqs/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
      } else {
        await axios.post(`${API_BASE_URL}/faqs/`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
      }
      setEditingId(null);
      setFormData({ category: '', question: '', answer: '', is_active: true });
      fetchFaqs();
    } catch (e) {
      alert('Failed to save FAQ. Are you an admin?');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/faqs/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      fetchFaqs();
    } catch (e) {
      alert('Failed to delete FAQ');
    }
  };

  const handleEdit = (faq: FAQ) => {
    setEditingId(faq.id);
    setFormData({
      category: faq.category,
      question: faq.question,
      answer: faq.answer,
      is_active: faq.is_active,
    });
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 pb-12 max-w-6xl mx-auto">
        {/* Editor Card */}
        <div className="bg-[#1e293b] rounded-2xl p-6 border border-slate-700/50 shadow-lg shadow-black/20">
          <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
            {editingId ? (
              <Edit3 className="text-blue-400" />
            ) : (
              <Plus className="text-emerald-400" />
            )}
            {editingId ? 'Edit FAQ Content' : 'Create New App FAQ'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Category
              </label>
              <input
                type="text"
                placeholder="e.g. Medical Emergencies"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="bg-[#0f172a] border border-slate-700 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Localization Key (Question)
              </label>
              <input
                type="text"
                placeholder="e.g. faq.med.1.q"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                className="bg-[#0f172a] border border-slate-700 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Localization Key (Answer)
              </label>
              <textarea
                placeholder="e.g. faq.med.1.a"
                rows={3}
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                className="bg-[#0f172a] border border-slate-700 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-slate-700/50 pt-6">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                className={`w-12 h-6 rounded-full transition-colors relative ${formData.is_active ? 'bg-emerald-500' : 'bg-slate-600'}`}
              >
                <div
                  className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.is_active ? 'translate-x-6' : 'translate-x-0'}`}
                ></div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              </div>
              <span className="text-slate-300 font-medium group-hover:text-slate-200">
                Active in Mobile App
              </span>
            </label>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {editingId && (
                <button
                  onClick={() => {
                    setEditingId(null);
                    setFormData({ category: '', question: '', answer: '', is_active: true });
                  }}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSave}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-all"
              >
                {editingId ? 'Save Changes' : 'Publish FAQ'}
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-[#1e293b] rounded-2xl border border-slate-700/50 shadow-lg shadow-black/20 overflow-hidden flex flex-col min-h-[400px]">
          <div className="p-6 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/30">
            <h2 className="text-xl font-bold text-slate-100">Live FAQ Database</h2>
            <button
              onClick={fetchFaqs}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors group"
            >
              <RefreshCw className="w-5 h-5 text-slate-400 group-hover:text-slate-200" />
            </button>
          </div>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 opacity-50">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
              <p className="text-slate-400 font-medium">Synchronizing with cloud...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-800/80">
                  <tr>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Question Key
                    </th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
                      Status
                    </th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {faqs.map((faq) => (
                    <tr key={faq.id} className="hover:bg-slate-800/50 transition-colors group">
                      <td className="p-4 text-slate-500 font-mono text-sm">#{faq.id}</td>
                      <td className="p-4 font-semibold text-slate-200">{faq.category}</td>
                      <td className="p-4 text-slate-400 text-sm max-w-[200px] truncate">
                        {faq.question}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center">
                          {faq.is_active ? (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle className="w-3.5 h-3.5" /> Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                              <XCircle className="w-3.5 h-3.5" /> Hidden
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(faq)}
                            className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(faq.id)}
                            className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {faqs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-12 text-center">
                        <p className="text-slate-400 font-medium">No FAQs found in the database.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
