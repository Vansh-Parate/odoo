import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import ReceiptPrint from '../components/receipts/ReceiptPrint';
import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react';

// Generate reference in format WH/IN/0001
function generateReference(id, warehouse = 'WH') {
  const paddedId = String(id).padStart(4, '0');
  return `${warehouse}/IN/${paddedId}`;
}

export default function ReceiptDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { receipts, products, user, updateReceipt, addReceipt, deleteReceipt, showToast } = useApp();
  const isNew = id === 'new';

  const [formData, setFormData] = useState({
    reference: '',
    receiveFrom: '',
    responsible: user?.name || '',
    scheduleDate: new Date().toISOString().split('T')[0],
    status: 'draft',
  });

  const [receiptProducts, setReceiptProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({ product: '', quantity: '' });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const printRef = useRef(null);
  const isUpdatingStatusRef = useRef(false);
  const pendingReceiptRef = useRef(null);

  // Watch for newly created receipts when creating a new receipt
  useEffect(() => {
    if (isNew && pendingReceiptRef.current && receipts.length > 0) {
      // Find the newly created receipt (should be the most recent one matching our criteria)
      const newReceipt = receipts
        .filter(r => 
          r.supplier === pendingReceiptRef.current.supplier &&
          r.date === pendingReceiptRef.current.date &&
          r.status === pendingReceiptRef.current.status
        )
        .sort((a, b) => b.id - a.id)[0]; // Get the most recent one
      
      if (newReceipt && newReceipt.id && !receipts.find(r => r.id === parseInt(id))) {
        // Only update URL if we're not navigating away (i.e., not for Save Draft)
        // For Save Draft, shouldNavigate is true and navigation happens in saveReceipt
        // For TODO, we want to stay on the page, so we update the URL here
        if (pendingReceiptRef.current && !pendingReceiptRef.current.shouldNavigate) {
          // Update URL to the new receipt ID
          window.history.replaceState(null, '', `/receipts/${newReceipt.id}`);
          setFormData(prev => ({
            ...prev,
            reference: generateReference(newReceipt.id),
            status: newReceipt.status,
          }));
        }
        pendingReceiptRef.current = null;
      }
    }
  }, [receipts, isNew, id]);

  useEffect(() => {
    if (!isNew && id) {
      const receipt = receipts.find((r) => r.id === parseInt(id));
      if (receipt) {
        // Only update if receipt data has actually changed to avoid clearing products unnecessarily
        const currentStatus = receipt.status || 'draft';
        if (formData.status !== currentStatus || !formData.receiveFrom) {
          setFormData({
            reference: generateReference(receipt.id),
            receiveFrom: receipt.supplier || receipt.from || '',
            responsible: user?.name || '',
            scheduleDate: receipt.date || receipt.scheduleDate || new Date().toISOString().split('T')[0],
            status: currentStatus,
          });
        }
        
        // Only reload products if they're not already set or if receipt items have changed
        if (receipt.items && receipt.items.length > 0 && receiptProducts.length === 0) {
          const transformedProducts = receipt.items.map((item) => {
            // Use productName from item if available, otherwise construct from product data
            if (item.productName) {
              return {
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
              };
            }
            const product = products.find((p) => p.id === item.productId);
            return {
              productId: item.productId,
              productName: product ? `[${product.sku}] ${product.name}` : 'Unknown Product',
              quantity: item.quantity,
            };
          });
          setReceiptProducts(transformedProducts);
        } else if (receipt.items && receipt.items.length > 0) {
          // Update products if receipt items exist and we have products in state
          const transformedProducts = receipt.items.map((item) => {
            if (item.productName) {
              return {
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
              };
            }
            const product = products.find((p) => p.id === item.productId);
            return {
              productId: item.productId,
              productName: product ? `[${product.sku}] ${product.name}` : 'Unknown Product',
              quantity: item.quantity,
            };
          });
          // Only update if products have actually changed
          if (JSON.stringify(transformedProducts) !== JSON.stringify(receiptProducts)) {
            setReceiptProducts(transformedProducts);
          }
        }
      }
    } else if (isNew) {
      // Generate reference for new receipt
      const nextId = receipts.length > 0 ? Math.max(...receipts.map((r) => r.id)) + 1 : 1;
      // Only reset if form is empty
      if (!formData.reference || formData.reference === generateReference(nextId)) {
        setFormData({
          reference: generateReference(nextId),
          receiveFrom: '',
          responsible: user?.name || '',
          scheduleDate: new Date().toISOString().split('T')[0],
          status: 'draft',
        });
        // Only clear products if they're empty
        if (receiptProducts.length === 0) {
          setReceiptProducts([]);
        }
      }
    }
  }, [id, receipts, products, user, isNew]);

  const handleFieldChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.receiveFrom?.trim()) {
      newErrors.receiveFrom = 'Receive From is required';
    }
    
    if (!formData.scheduleDate) {
      newErrors.scheduleDate = 'Schedule Date is required';
    }
    
    if (receiptProducts.length === 0) {
      newErrors.products = 'At least one product is required';
    }
    
    // Validate each product
    receiptProducts.forEach((product, index) => {
      if (!product.productName?.trim() && !product.product?.trim()) {
        newErrors[`product_${index}`] = 'Product name is required';
      }
      if (!product.quantity || product.quantity <= 0) {
        newErrors[`quantity_${index}`] = 'Valid quantity is required';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddProduct = () => {
    if (!newProduct.product?.trim()) {
      setErrors({ ...errors, newProduct: 'Product name is required' });
      return;
    }
    if (!newProduct.quantity || parseFloat(newProduct.quantity) <= 0) {
      setErrors({ ...errors, newQuantity: 'Valid quantity is required' });
      return;
    }
    
    const product = products.find((p) => 
      p.name.toLowerCase().includes(newProduct.product.toLowerCase()) ||
      p.sku.toLowerCase().includes(newProduct.product.toLowerCase())
    );
    
    setReceiptProducts([
      ...receiptProducts,
      {
        productId: product?.id || null,
        productName: product ? `[${product.sku}] ${product.name}` : newProduct.product,
        quantity: parseFloat(newProduct.quantity),
      },
    ]);
    setNewProduct({ product: '', quantity: '' });
    setErrors({ ...errors, newProduct: '', newQuantity: '' });
  };

  const handleRemoveProduct = (index) => {
    setReceiptProducts(receiptProducts.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index, delta) => {
    const updatedProducts = [...receiptProducts];
    const newQuantity = (updatedProducts[index].quantity || 0) + delta;
    if (newQuantity > 0) {
      updatedProducts[index].quantity = newQuantity;
      setReceiptProducts(updatedProducts);
    }
  };

  const handleNewQuantityChange = (delta) => {
    const currentQty = parseFloat(newProduct.quantity) || 0;
    const newQty = currentQty + delta;
    if (newQty >= 0) {
      setNewProduct({ ...newProduct, quantity: newQty.toString() });
    }
  };

  const saveReceipt = (status = formData.status, shouldNavigate = false) => {
    // For draft, allow saving even with minimal data (just need at least receiveFrom)
    if (status === 'draft') {
      if (!formData.receiveFrom?.trim()) {
        setErrors({ ...errors, receiveFrom: 'Receive From is required' });
        return false;
      }
    } else {
      // For other statuses, full validation
      if (!validateForm()) {
        return false;
      }
    }

    const receiptData = {
      supplier: formData.receiveFrom,
      from: 'vendor',
      to: 'WH/Stock1',
      date: formData.scheduleDate || new Date().toISOString().split('T')[0],
      status: status,
      items: receiptProducts.map((p) => ({
        productId: p.productId,
        productName: p.productName, // Preserve productName
        quantity: p.quantity,
      })),
    };

    if (isNew) {
      pendingReceiptRef.current = { ...receiptData, shouldNavigate };
      addReceipt(receiptData);
      if (shouldNavigate) {
        // For Save Draft, navigate immediately after a short delay to allow receipt to be created
        setTimeout(() => {
          navigate('/receipts');
          pendingReceiptRef.current = null;
        }, 300);
      }
      // The useEffect will handle updating the form when receipt is added (for TODO, not Save Draft)
    } else {
      updateReceipt(parseInt(id), receiptData);
      setFormData({ ...formData, status: status });
    }
    return true;
  };

  const handleSaveDraft = () => {
    setIsSaving(true);
    saveReceipt('draft', true); // Navigate to receipts after saving
    setTimeout(() => {
      setIsSaving(false);
    }, 500);
  };

  const handleValidate = () => {
    if (!validateForm()) {
      return;
    }

    if (formData.status === 'draft') {
      // TODO: Move Draft → Ready
      const receiptData = {
        supplier: formData.receiveFrom,
        from: 'vendor',
        to: 'WH/Stock1',
        date: formData.scheduleDate,
        status: 'ready',
        items: receiptProducts.map((p) => ({
          productId: p.productId,
          productName: p.productName, // Preserve productName
          quantity: p.quantity,
        })),
      };
      
      if (isNew) {
        // Preserve products before saving
        const preservedProducts = [...receiptProducts];
        isUpdatingStatusRef.current = true;
        pendingReceiptRef.current = { ...receiptData, shouldNavigate: false };
        addReceipt(receiptData);
        // The useEffect will handle updating the form when receipt is added
        // Explicitly preserve products
        setReceiptProducts(preservedProducts);
        // Reset flag after a delay to allow useEffect to run normally
        setTimeout(() => {
          isUpdatingStatusRef.current = false;
        }, 300);
        // Stay on the page - no navigation
      } else {
        updateReceipt(parseInt(id), receiptData);
        setFormData({ ...formData, status: 'ready' });
        // Products are already preserved in state
      }
    } else if (formData.status === 'ready') {
      // Validate: Move Ready → Done
      const receiptData = {
        supplier: formData.receiveFrom,
        from: 'vendor',
        to: 'WH/Stock1',
        date: formData.scheduleDate,
        status: 'done',
        items: receiptProducts.map((p) => ({
          productId: p.productId,
          productName: p.productName, // Preserve productName
          quantity: p.quantity,
        })),
      };

      if (isNew) {
        addReceipt(receiptData);
        navigate('/receipts');
      } else {
        updateReceipt(parseInt(id), receiptData);
        setFormData({ ...formData, status: 'done' });
      }
    }
  };

  const handlePrint = () => {
    if (formData.status === 'done') {
      // Show print view
      const printElement = document.getElementById('receipt-print');
      if (printElement) {
        // Force display for print
        printElement.style.display = 'block';
        printElement.style.visibility = 'visible';
        printElement.style.position = 'absolute';
        printElement.style.left = '0';
        printElement.style.top = '0';
        printElement.style.width = '100%';
        printElement.style.zIndex = '99999';
        printElement.style.background = 'white';
        printElement.style.color = '#000000';
        
        // Trigger print
        setTimeout(() => {
          window.print();
          // Hide after print
          setTimeout(() => {
            printElement.style.display = 'none';
          }, 500);
        }, 100);
      }
    }
  };

  const handleCancel = () => {
    navigate('/receipts');
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this receipt? This action cannot be undone.')) {
      if (!isNew) {
        deleteReceipt(parseInt(id));
        showToast('Receipt deleted successfully', 'success');
        navigate('/receipts');
      }
    }
  };

  const getStatusFlow = () => {
    const statuses = ['Draft', 'Ready', 'Done'];
    const currentIndex = statuses.findIndex((s) => s.toLowerCase() === formData.status);
    
    return statuses.map((status, index) => ({
      label: status,
      isActive: index <= currentIndex,
      isCurrent: index === currentIndex,
    }));
  };

  const statusFlow = getStatusFlow();
  const canPrint = formData.status === 'done';
  const canValidate = formData.status === 'ready';
  const canTodo = formData.status === 'draft';
  const canSaveDraft = formData.status !== 'done';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => navigate('/receipts')}
              className="text-sm text-slate-400 hover:text-slate-200"
            >
              New
            </button>
            <span className="text-slate-400">|</span>
            <h1 className="text-2xl font-semibold text-slate-50">Receipt</h1>
          </div>
          <p className="text-sm text-slate-400">Manage receipt details</p>
        </div>

        {/* Status Flow */}
        <div className="flex items-center gap-2">
          {statusFlow.map((status, index) => (
            <div key={status.label} className="flex items-center">
              <span
                className={`text-xs font-medium ${
                  status.isActive ? 'text-indigo-400' : 'text-slate-500'
                }`}
              >
                {status.label}
              </span>
              {index < statusFlow.length - 1 && (
                <span className="mx-2 text-slate-500">→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {canSaveDraft && (
          <Button
            onClick={handleSaveDraft}
            variant="secondary"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>
        )}
        {canTodo && (
          <Button
            onClick={handleValidate}
            variant="secondary"
          >
            TODO
          </Button>
        )}
        {canValidate && (
          <Button
            onClick={handleValidate}
            variant="primary"
          >
            Validate
          </Button>
        )}
        {canPrint && (
          <Button
            onClick={handlePrint}
            variant="secondary"
          >
            Print
          </Button>
        )}
        {!isNew && (
          <Button
            onClick={handleDelete}
            variant="danger"
          >
            Delete
          </Button>
        )}
        <Button
          onClick={handleCancel}
          variant="secondary"
        >
          Cancel
        </Button>
      </div>

      {/* Form Fields */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-6 space-y-4">
        <Input
          label="Reference"
          value={formData.reference}
          readOnly
        />
        <div>
          <Input
            label="Receive From"
            value={formData.receiveFrom}
            onChange={(e) => handleFieldChange('receiveFrom', e.target.value)}
            placeholder="Vendor name"
            required
          />
          {errors.receiveFrom && (
            <p className="mt-1 text-xs text-rose-400">{errors.receiveFrom}</p>
          )}
        </div>
        <Input
          label="Responsible"
          value={formData.responsible}
          readOnly
        />
        <div>
          <Input
            label="Schedule Date"
            type="date"
            value={formData.scheduleDate}
            onChange={(e) => handleFieldChange('scheduleDate', e.target.value)}
            required
          />
          {errors.scheduleDate && (
            <p className="mt-1 text-xs text-rose-400">{errors.scheduleDate}</p>
          )}
        </div>
        {errors.products && (
          <p className="text-xs text-rose-400">{errors.products}</p>
        )}
      </div>

      {/* Products Table */}
      <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
        <div className="border-b border-white/10 bg-white/5 px-4 py-3">
          <h3 className="text-sm font-medium text-slate-300">Products</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Product</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {receiptProducts.map((product, index) => (
                <tr key={index} className="hover:bg-white/5">
                  <td className="py-3 px-4 text-sm text-slate-200">
                    {product.productName || `[${product.productId}] ${product.name || 'Product'}`}
                    {errors[`product_${index}`] && (
                      <p className="mt-1 text-xs text-rose-400">{errors[`product_${index}`]}</p>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleQuantityChange(index, -1)}
                        className="p-1 rounded-md border border-white/10 bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
                        type="button"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <span className="text-sm text-slate-300 min-w-[3rem] text-center">
                        {product.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(index, 1)}
                        className="p-1 rounded-md border border-white/10 bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
                        type="button"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveProduct(index)}
                        className="p-1 rounded-md border border-white/10 bg-white/5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors ml-2"
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {errors[`quantity_${index}`] && (
                      <p className="mt-1 text-xs text-rose-400">{errors[`quantity_${index}`]}</p>
                    )}
                  </td>
                </tr>
              ))}
              {/* New Product Row */}
              <tr className="bg-white/5">
                <td className="py-3 px-4">
                  <input
                    type="text"
                    value={newProduct.product || ''}
                    onChange={(e) => {
                      setNewProduct({ ...newProduct, product: e.target.value });
                      if (errors.newProduct) {
                        setErrors({ ...errors, newProduct: '' });
                      }
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddProduct();
                      }
                    }}
                    placeholder="New Product"
                    className={`w-full px-3 py-2 text-sm rounded-md border ${
                      errors.newProduct ? 'border-rose-500' : 'border-white/10'
                    } bg-white/5 text-slate-200 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/30`}
                  />
                  {errors.newProduct && (
                    <p className="mt-1 text-xs text-rose-400">{errors.newProduct}</p>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleNewQuantityChange(-1)}
                      className="p-1 rounded-md border border-white/10 bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
                      type="button"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      value={newProduct.quantity || ''}
                      onChange={(e) => {
                        setNewProduct({ ...newProduct, quantity: e.target.value });
                        if (errors.newQuantity) {
                          setErrors({ ...errors, newQuantity: '' });
                        }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddProduct();
                        }
                      }}
                      placeholder="Quantity"
                      min="0"
                      step="0.01"
                      className={`flex-1 px-3 py-2 text-sm rounded-md border ${
                        errors.newQuantity ? 'border-rose-500' : 'border-white/10'
                      } bg-white/5 text-slate-200 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/30`}
                    />
                    <button
                      onClick={() => handleNewQuantityChange(1)}
                      className="p-1 rounded-md border border-white/10 bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
                      type="button"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <Button
                      onClick={handleAddProduct}
                      variant="secondary"
                      className="ml-2"
                    >
                      Add
                    </Button>
                  </div>
                  {errors.newQuantity && (
                    <p className="mt-1 text-xs text-rose-400">{errors.newQuantity}</p>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Print View - Hidden by default, shown only when printing */}
      <div id="receipt-print" style={{ display: 'none' }}>
        <ReceiptPrint
          receipt={{
            ...formData,
            receiveFrom: formData.receiveFrom,
            scheduleDate: formData.scheduleDate,
            responsible: formData.responsible,
            status: formData.status,
            items: receiptProducts.map((p) => ({
              productId: p.productId,
              productName: p.productName, // Include productName to match what's shown in form
              quantity: p.quantity,
            })),
          }}
          products={products}
        />
      </div>
    </div>
  );
}

