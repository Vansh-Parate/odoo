import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import KanbanView from '../components/receipts/KanbanView';
import { Search, Plus, List, LayoutGrid } from 'lucide-react';

// Generate reference in format WH/IN/0001
function generateReference(id, warehouse = 'WH') {
  const paddedId = String(id).padStart(4, '0');
  return `${warehouse}/IN/${paddedId}`;
}

export default function ReceiptsList() {
  const { receipts } = useApp();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [viewMode, setViewMode] = useState('list');

  // Transform receipts to match wireframe format
  const transformedReceipts = useMemo(() => {
    return receipts.map((receipt, index) => ({
      ...receipt,
      reference: generateReference(receipt.id || index + 1),
      from: receipt.from || 'vendor',
      to: receipt.to || 'WH/Stock1',
      contact: receipt.contact || receipt.supplier || 'Azure Interior',
      scheduleDate: receipt.scheduleDate || receipt.date || '',
    }));
  }, [receipts]);

  // Filter receipts based on search
  const filteredReceipts = useMemo(() => {
    if (!searchValue.trim()) return transformedReceipts;
    
    const searchLower = searchValue.toLowerCase();
    return transformedReceipts.filter(
      (receipt) =>
        receipt.reference?.toLowerCase().includes(searchLower) ||
        receipt.contact?.toLowerCase().includes(searchLower) ||
        receipt.supplier?.toLowerCase().includes(searchLower)
    );
  }, [transformedReceipts, searchValue]);

  const handleNewClick = () => {
    navigate('/receipts/new');
  };

  const handleRowClick = (receipt) => {
    navigate(`/receipts/${receipt.id}`);
  };

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'default',
      ready: 'info',
      done: 'success',
      canceled: 'danger',
    };
    return <Badge variant={variants[status] || 'default'}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50 mb-2">Receipts</h1>
          <p className="text-sm text-slate-400">Manage incoming stock receipts</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleNewClick} variant="primary">
            <Plus className="h-4 w-4" />
            NEW
          </Button>
        </div>
      </div>

      {/* Search and View Switcher */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by reference or contact..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-md border border-white/10 bg-white/5 text-slate-200 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
        <div className="flex items-center border border-white/10 rounded-md overflow-hidden">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 border-r border-white/10 transition-colors ${
              viewMode === 'list'
                ? 'bg-indigo-500/20 text-indigo-300'
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`p-2 transition-colors ${
              viewMode === 'kanban'
                ? 'bg-indigo-500/20 text-indigo-300'
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Receipts View */}
      {viewMode === 'list' ? (
        <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Reference</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">From</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">To</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Contact</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Schedule date</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 px-4 text-center text-sm text-slate-400">
                      No receipts found
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((receipt) => (
                    <tr
                      key={receipt.id}
                      onClick={() => handleRowClick(receipt)}
                      className="hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 text-sm font-medium text-slate-200">
                        {receipt.reference || receipt.receiptId}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-300">
                        {receipt.from || 'vendor'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-300">
                        {receipt.to || 'WH/Stock1'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-300">
                        {receipt.contact || receipt.supplier || 'Azure Interior'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-300">
                        {receipt.scheduleDate || receipt.date || ''}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(receipt.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <KanbanView receipts={filteredReceipts} />
      )}
    </div>
  );
}

