import StatusBadge from './StatusBadge';

export default function DataTable({ receipts, onRowClick }) {
  return (
    <div className="border border-white/10 bg-white/5 rounded overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">
                Reference
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">
                From
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">
                To
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">
                Contact
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">
                Schedule date
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {receipts.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 px-4 text-center text-sm text-slate-400">
                  No receipts found
                </td>
              </tr>
            ) : (
              receipts.map((receipt) => (
                <tr
                  key={receipt.id}
                  onClick={() => onRowClick && onRowClick(receipt)}
                  className="hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 text-sm text-slate-200">
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
                    <StatusBadge status={receipt.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

