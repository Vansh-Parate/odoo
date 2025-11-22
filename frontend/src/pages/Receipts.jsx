import { useState } from 'react';
import { useApp } from '../context/AppContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Plus, Eye, Edit, Trash2, CheckCircle } from 'lucide-react';

const statusOptions = ['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'];

export default function Receipts() {
  const { receipts, products, addReceipt, updateReceipt, validateReceipt, deleteReceipt } = useApp();
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [formData, setFormData] = useState({
    supplier: '',
    date: new Date().toISOString().split('T')[0],
    items: [],
  });
  const [itemForm, setItemForm] = useState({ productId: '', quantity: '' });
  const [errors, setErrors] = useState({});

  const filteredReceipts = receipts.filter(
    (receipt) => statusFilter === 'all' || receipt.status === statusFilter.toLowerCase()
  );

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'default',
      waiting: 'warning',
      ready: 'info',
      done: 'success',
      canceled: 'danger',
    };
    return <Badge variant={variants[status] || 'default'}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const handleOpenModal = (receipt = null) => {
    if (receipt) {
      setFormData({
        supplier: receipt.supplier,
        date: receipt.date,
        items: receipt.items,
      });
      setSelectedReceipt(receipt);
    } else {
      setFormData({
        supplier: '',
        date: new Date().toISOString().split('T')[0],
        items: [],
      });
      setSelectedReceipt(null);
    }
    setItemForm({ productId: '', quantity: '' });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedReceipt(null);
    setFormData({ supplier: '', date: new Date().toISOString().split('T')[0], items: [] });
    setItemForm({ productId: '', quantity: '' });
    setErrors({});
  };

  const handleAddItem = () => {
    if (!itemForm.productId || !itemForm.quantity || isNaN(itemForm.quantity) || parseFloat(itemForm.quantity) <= 0) {
      setErrors({ ...errors, item: 'Please select a product and enter a valid quantity' });
      return;
    }

    const product = products.find((p) => p.id === parseInt(itemForm.productId));
    if (!product) return;

    setFormData({
      ...formData,
      items: [...formData.items, { productId: parseInt(itemForm.productId), quantity: parseFloat(itemForm.quantity) }],
    });
    setItemForm({ productId: '', quantity: '' });
    setErrors({ ...errors, item: '' });
  };

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.supplier.trim()) newErrors.supplier = 'Supplier name is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (formData.items.length === 0) newErrors.items = 'At least one product is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const receiptData = {
      supplier: formData.supplier.trim(),
      date: formData.date,
      items: formData.items,
      status: selectedReceipt?.status || 'draft',
    };

    if (selectedReceipt) {
      updateReceipt(selectedReceipt.id, receiptData);
    } else {
      addReceipt(receiptData);
    }

    handleCloseModal();
  };

  const handleDelete = (receipt) => {
    setSelectedReceipt(receipt);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedReceipt) {
      deleteReceipt(selectedReceipt.id);
      setIsDeleteDialogOpen(false);
      setSelectedReceipt(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50 mb-2">Receipts</h1>
          <p className="text-sm text-slate-400">Manage incoming stock receipts</p>
        </div>
        <Button onClick={() => handleOpenModal()} variant="primary">
          <Plus className="h-4 w-4" />
          New Receipt
        </Button>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-400">Filter by Status:</span>
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            statusFilter === 'all'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
          }`}
        >
          All
        </button>
        {statusOptions.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status.toLowerCase())}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === status.toLowerCase()
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Receipts Table */}
      <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Receipt ID</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Supplier Name</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Date</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Status</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Total Items</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredReceipts.map((receipt) => (
                <tr key={receipt.id} className="hover:bg-white/5">
                  <td className="py-3 px-4">
                    <span className="text-sm font-medium text-slate-200">{receipt.receiptId}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-slate-300">{receipt.supplier}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-slate-300">{receipt.date}</span>
                  </td>
                  <td className="py-3 px-4">{getStatusBadge(receipt.status)}</td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-slate-300">{receipt.totalItems}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      {receipt.status !== 'done' && (
                        <button
                          onClick={() => validateReceipt(receipt.id)}
                          className="rounded-md p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-white/5"
                          title="Validate Receipt"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenModal(receipt)}
                        className="rounded-md p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-white/5"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(receipt)}
                        className="rounded-md p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/5"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Receipt Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedReceipt ? 'Edit Receipt' : 'Create Receipt'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Supplier Name"
              value={formData.supplier}
              onChange={(e) => {
                setFormData({ ...formData, supplier: e.target.value });
                setErrors({ ...errors, supplier: '' });
              }}
              error={errors.supplier}
              required
            />

            <Input
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => {
                setFormData({ ...formData, date: e.target.value });
                setErrors({ ...errors, date: '' });
              }}
              error={errors.date}
              required
            />
          </div>

          {/* Add Products Section */}
          <div className="border-t border-white/10 pt-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Add Products</h3>
            <div className="grid grid-cols-3 gap-2">
              <Select
                value={itemForm.productId}
                onChange={(e) => setItemForm({ ...itemForm, productId: e.target.value })}
                options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
                placeholder="Select Product"
              />
              <Input
                type="number"
                value={itemForm.quantity}
                onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                placeholder="Quantity"
                min="0.01"
                step="0.01"
              />
              <Button type="button" onClick={handleAddItem} variant="secondary">
                Add Item
              </Button>
            </div>
            {errors.item && <p className="text-xs text-rose-400 mt-1">{errors.item}</p>}
          </div>

          {/* Added Items Table */}
          {formData.items.length > 0 && (
            <div className="border-t border-white/10 pt-4">
              <h3 className="text-sm font-medium text-slate-300 mb-3">Added Items</h3>
              <div className="rounded-lg border border-white/10 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="text-left py-2 px-3 text-xs font-medium text-slate-400">Product</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-slate-400">Quantity</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-slate-400">Unit</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {formData.items.map((item, index) => {
                      const product = products.find((p) => p.id === item.productId);
                      return (
                        <tr key={`item-${item.productId}-${index}`}>
                          <td className="py-2 px-3 text-slate-200">{product?.name || 'Unknown'}</td>
                          <td className="py-2 px-3 text-slate-300">{item.quantity}</td>
                          <td className="py-2 px-3 text-slate-300">{product?.uom || ''}</td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-rose-400 hover:text-rose-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-sm text-slate-400">
                Total Items: <span className="font-medium text-slate-200">{formData.items.length}</span>
              </div>
            </div>
          )}

          {errors.items && <p className="text-xs text-rose-400">{errors.items}</p>}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {selectedReceipt ? 'Update Receipt' : 'Create Receipt'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedReceipt(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Receipt"
        message={`Are you sure you want to delete receipt "${selectedReceipt?.receiptId}"? This action cannot be undone.`}
      />
    </div>
  );
}

