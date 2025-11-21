import { useNavigate } from 'react-router-dom';
import Badge from '../ui/Badge';

// Generate reference in format WH/IN/0001
function generateReference(id, warehouse = 'WH') {
  const paddedId = String(id).padStart(4, '0');
  return `${warehouse}/IN/${paddedId}`;
}

export default function KanbanView({ receipts }) {
  const navigate = useNavigate();

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'default',
      ready: 'info',
      done: 'success',
      canceled: 'danger',
    };
    return <Badge variant={variants[status] || 'default'}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const columns = [
    { id: 'draft', title: 'Draft', color: 'border-slate-500' },
    { id: 'ready', title: 'Ready', color: 'border-blue-500' },
    { id: 'done', title: 'Done', color: 'border-emerald-500' },
  ];

  const getReceiptsByStatus = (status) => {
    return receipts.filter((receipt) => receipt.status === status);
  };

  const handleCardClick = (receipt) => {
    navigate(`/receipts/${receipt.id}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
      {columns.map((column) => {
        const columnReceipts = getReceiptsByStatus(column.id);
        return (
          <div key={column.id} className="flex flex-col">
            <div className={`mb-3 pb-2 border-b-2 ${column.color}`}>
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                {column.title}
              </h3>
              <span className="text-xs text-slate-500">
                {columnReceipts.length} {columnReceipts.length === 1 ? 'receipt' : 'receipts'}
              </span>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-300px)] kanban-scroll custom-scrollbar">
              {columnReceipts.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-500">
                  No receipts
                </div>
              ) : (
                columnReceipts.map((receipt) => {
                  const reference = generateReference(receipt.id);
                  return (
                    <div
                      key={receipt.id}
                      onClick={() => handleCardClick(receipt)}
                      className="p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-all hover:shadow-lg hover:border-indigo-500/30"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-slate-200 mb-1">
                            {reference || receipt.receiptId}
                          </h4>
                          <p className="text-xs text-slate-400">
                            {receipt.contact || receipt.supplier || 'N/A'}
                          </p>
                        </div>
                        {getStatusBadge(receipt.status)}
                      </div>
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">From:</span>
                          <span className="text-slate-300">{receipt.from || 'vendor'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-slate-400">To:</span>
                          <span className="text-slate-300">{receipt.to || 'WH/Stock1'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-slate-400">Date:</span>
                          <span className="text-slate-300">
                            {receipt.scheduleDate || receipt.date || 'N/A'}
                          </span>
                        </div>
                        {receipt.items && receipt.items.length > 0 && (
                          <div className="flex items-center justify-between text-xs mt-1">
                            <span className="text-slate-400">Items:</span>
                            <span className="text-slate-300 font-semibold">
                              {receipt.items.length} {receipt.items.length === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

