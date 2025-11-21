export default function ReceiptPrint({ receipt, products }) {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const totalQuantity = receipt.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

  return (
    <>
      <style>{`
        @media screen {
          #receipt-print {
            display: none !important;
          }
        }
        @media print {
          @page {
            margin: 1.5cm;
            size: A4;
          }
          body * {
            visibility: hidden !important;
          }
          body {
            background: white !important;
          }
          #receipt-print,
          #receipt-print * {
            visibility: visible !important;
          }
          #receipt-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 2rem !important;
            background: white !important;
            color: #000000 !important;
            z-index: 99999 !important;
            display: block !important;
          }
          #receipt-print h1,
          #receipt-print h2,
          #receipt-print h3,
          #receipt-print h4,
          #receipt-print p,
          #receipt-print span,
          #receipt-print td,
          #receipt-print th {
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
            visibility: hidden !important;
          }
        }
        #receipt-print {
          max-width: 800px;
          margin: 0 auto;
          font-family: Arial, sans-serif;
          background: white;
          color: #000000;
        }
        #receipt-print * {
          color: #000000;
        }
      `}</style>
      <div id="receipt-print" className="receipt-content p-8" style={{ background: 'white', color: '#000000' }}>
      
      {/* Header */}
      <div className="mb-8 border-b-2 border-gray-800 pb-4" style={{ borderColor: '#1f2937', paddingBottom: '1rem' }}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Arial, sans-serif', color: '#000000' }}>StockMaster</h1>
            <p className="text-base font-medium" style={{ color: '#000000' }}>Inventory Management System</p>
            <p className="text-sm mt-1" style={{ color: '#000000' }}>123 Business Street, City, State 12345</p>
            <p className="text-sm" style={{ color: '#000000' }}>Phone: (555) 123-4567 | Email: info@stockmaster.com</p>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Arial, sans-serif', color: '#000000' }}>RECEIPT</h2>
            <div className="p-3 rounded border" style={{ backgroundColor: '#f3f4f6', borderColor: '#d1d5db' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: '#000000' }}>Reference Number</p>
              <p className="text-lg font-bold" style={{ color: '#000000' }}>{receipt.reference || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Details */}
      <div className="mb-6 p-4 rounded border" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: '#000000' }}>Receive From</h3>
            <p className="text-base font-semibold" style={{ color: '#000000' }}>{receipt.receiveFrom || receipt.supplier || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: '#000000' }}>Schedule Date</h3>
            <p className="text-base font-semibold" style={{ color: '#000000' }}>{formatDate(receipt.scheduleDate || receipt.date)}</p>
          </div>
          <div>
            <h3 className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: '#000000' }}>Responsible</h3>
            <p className="text-base font-semibold" style={{ color: '#000000' }}>{receipt.responsible || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: '#000000' }}>Status</h3>
            <p className="text-base font-semibold uppercase" style={{ color: '#000000' }}>{receipt.status || 'DRAFT'}</p>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="mb-6">
        <table className="w-full" style={{ border: '2px solid #000000', width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
          <thead>
            <tr style={{ backgroundColor: '#000000' }}>
              <th className="text-left py-4 px-5 text-sm font-bold uppercase tracking-wide" style={{ color: '#ffffff', borderRight: '2px solid #ffffff', backgroundColor: '#000000', border: '1px solid #000000' }}>
                No.
              </th>
              <th className="text-left py-4 px-5 text-sm font-bold uppercase tracking-wide" style={{ color: '#ffffff', borderRight: '2px solid #ffffff', backgroundColor: '#000000', border: '1px solid #000000' }}>
                Product Description
              </th>
              <th className="text-right py-4 px-5 text-sm font-bold uppercase tracking-wide" style={{ color: '#ffffff', backgroundColor: '#000000', border: '1px solid #000000' }}>
                Quantity
              </th>
            </tr>
          </thead>
          <tbody>
            {receipt.items?.map((item, index) => {
              const product = products.find((p) => p.id === item.productId);
              // Use productName if available (from receiptProducts), otherwise construct from product data
              let productName = 'Unknown Product';
              if (item.productName) {
                productName = item.productName;
              } else if (product) {
                productName = `[${product.sku}] ${product.name}`;
              }
              return (
                <tr key={index} style={{ borderBottom: '1px solid #000000', borderTop: index === 0 ? '2px solid #000000' : '1px solid #000000' }}>
                  <td className="py-3 px-5 text-sm font-medium" style={{ color: '#000000', borderRight: '1px solid #000000', borderLeft: '1px solid #000000' }}>
                    {index + 1}
                  </td>
                  <td className="py-3 px-5 text-sm" style={{ color: '#000000', borderRight: '1px solid #000000' }}>
                    {productName}
                  </td>
                  <td className="py-3 px-5 text-sm text-right font-semibold" style={{ color: '#000000', borderRight: '1px solid #000000' }}>
                    {item.quantity}
                  </td>
                </tr>
              );
            })}
            <tr style={{ backgroundColor: '#f3f4f6', borderTop: '2px solid #000000', borderBottom: '2px solid #000000' }}>
              <td colSpan="2" className="py-4 px-5 text-sm uppercase tracking-wide font-bold" style={{ color: '#000000', borderRight: '1px solid #000000', borderLeft: '1px solid #000000' }}>
                Total Items
              </td>
              <td className="py-4 px-5 text-sm text-right font-bold" style={{ color: '#000000', borderRight: '1px solid #000000' }}>
                {totalQuantity}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-6" style={{ borderTop: '2px solid #000000', paddingTop: '1.5rem' }}>
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <h4 className="text-sm font-bold mb-2 uppercase" style={{ color: '#000000' }}>Authorized By</h4>
            <div className="pb-2 mb-1" style={{ borderBottom: '2px solid #000000', minHeight: '50px', position: 'relative' }}>
              <span className="text-sm font-semibold" style={{ color: '#000000', position: 'absolute', bottom: '8px', left: '0' }}>
                {receipt.responsible || 'N/A'}
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: '#000000' }}>Signature</p>
          </div>
          <div>
            <h4 className="text-sm font-bold mb-2 uppercase" style={{ color: '#000000' }}>Received By</h4>
            <div className="pb-2 mb-1" style={{ borderBottom: '2px solid #000000', minHeight: '50px', position: 'relative' }}>
              <span className="text-sm font-semibold" style={{ color: '#000000', position: 'absolute', bottom: '8px', left: '0' }}>
                {receipt.receiveFrom || receipt.supplier || 'N/A'}
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: '#000000' }}>Signature</p>
          </div>
        </div>
        <div className="text-center text-xs pt-4" style={{ borderTop: '1px solid #000000', color: '#000000' }}>
          <p className="font-semibold" style={{ color: '#000000' }}>This is a computer-generated receipt. No signature required.</p>
          <p className="mt-2" style={{ color: '#000000' }}>Printed on: {new Date().toLocaleString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
          <p className="mt-1" style={{ color: '#000000' }}>StockMaster Inventory Management System v1.0</p>
        </div>
      </div>
      </div>
    </>
  );
}

