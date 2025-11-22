import { createContext, useContext, useState, useEffect } from 'react';
import * as api from '../utils/api';

const AppContext = createContext();

const STORAGE_KEYS = {
  USER: 'stockmaster_user',
};

function loadFromStorage(key, defaultValue) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

// Mock warehouses for initial data
const MOCK_WAREHOUSES = [
  { id: '1', name: 'Main Warehouse', shortCode: 'WH-MAIN', address: '123 Industrial Park, City Center', createdAt: new Date().toISOString() },
  { id: '2', name: 'Secondary Warehouse', shortCode: 'WH-SEC', address: '456 Commerce Street, Downtown', createdAt: new Date().toISOString() },
  { id: '3', name: 'Distribution Center', shortCode: 'WH-DC', address: '789 Logistics Avenue, Port Area', createdAt: new Date().toISOString() },
];

export function AppProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [warehouses, setWarehouses] = useState(() => {
    const stored = loadFromStorage('stockmaster_warehouses', []);
    // If no warehouses in storage, use mock data
    return stored.length > 0 ? stored : MOCK_WAREHOUSES;
  });
  const [locations, setLocations] = useState(() => loadFromStorage('stockmaster_locations', []));
  
  // Load user from localStorage (from auth token)
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch {
        return null;
      }
    }
    return loadFromStorage(STORAGE_KEYS.USER, null);
  });
  
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch data from API on mount
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [productsData, receiptsData, deliveriesData] = await Promise.all([
          api.fetchProducts().catch(() => []),
          api.fetchReceipts().catch(() => []),
          api.fetchDeliveries().catch(() => []),
        ]);
        
        setProducts(productsData);
        setReceipts(receiptsData);
        setDeliveries(deliveriesData);
      } catch (error) {
        console.error('Error fetching data:', error);
        showToast('Failed to load data from server', 'error');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  // Sync user to localStorage
  useEffect(() => {
    if (user) {
      saveToStorage(STORAGE_KEYS.USER, user);
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  // Sync warehouses and locations to localStorage
  useEffect(() => {
    saveToStorage('stockmaster_warehouses', warehouses);
  }, [warehouses]);

  useEffect(() => {
    saveToStorage('stockmaster_locations', locations);
  }, [locations]);

  // Helper function to determine product status
  function getProductStatus(stock, reorderLevel) {
    if (stock === 0) return 'out_of_stock';
    if (stock <= reorderLevel) return 'low_stock';
    return 'in_stock';
  }

  // Product operations
  const addProduct = async (product) => {
    try {
      const newProduct = await api.createProduct({
        name: product.name,
        sku: product.sku,
        category: product.category,
        uom: product.uom,
        initialStock: product.initialStock || 0,
        reorderLevel: product.reorderLevel || 0,
        perUnitCost: product.perUnitCost || 0,
      });
      setProducts([...products, newProduct]);
      showToast('Product added successfully', 'success');
    } catch (error) {
      console.error('Error adding product:', error);
      showToast(error.message || 'Failed to add product', 'error');
    }
  };

  const updateProduct = async (id, updates) => {
    try {
      const updated = await api.updateProduct(id, {
        name: updates.name,
        sku: updates.sku,
        category: updates.category,
        uom: updates.uom,
        stock: updates.stock !== undefined ? updates.stock : updates.initialStock,
        reorderLevel: updates.reorderLevel,
        perUnitCost: updates.perUnitCost,
      });
      setProducts(products.map(p => p.id === id ? updated : p));
      showToast('Product updated successfully', 'success');
    } catch (error) {
      console.error('Error updating product:', error);
      showToast(error.message || 'Failed to update product', 'error');
    }
  };

  const deleteProduct = async (id) => {
    try {
      await api.deleteProduct(id);
      setProducts(products.filter(p => p.id !== id));
      showToast('Product deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting product:', error);
      showToast(error.message || 'Failed to delete product', 'error');
    }
  };

  // Stock update operation (for stock management page)
  const updateStock = (id, stockData) => {
    setProducts(products.map(p => {
      if (p.id === id) {
        const updated = {
          ...p,
          onHand: stockData.onHand,
          freeToUse: stockData.freeToUse,
          stock: stockData.onHand, // Keep stock in sync with onHand
        };
        // Update per unit cost if provided
        if (stockData.perUnitCost !== undefined) {
          updated.perUnitCost = stockData.perUnitCost;
        }
        updated.status = getProductStatus(updated.stock, updated.reorderLevel);
        return updated;
      }
      return p;
    }));
  };

  // Receipt operations
  const addReceipt = async (receipt) => {
    try {
      const newReceipt = await api.createReceipt({
        supplier: receipt.supplier,
        date: receipt.date,
        status: receipt.status || 'draft',
        items: receipt.items,
      });
      setReceipts([...receipts, newReceipt]);
      
      // Update product stock if receipt is validated
      if (receipt.status === 'done') {
        await refreshProducts();
      }
      
      showToast('Receipt created successfully', 'success');
    } catch (error) {
      console.error('Error adding receipt:', error);
      showToast(error.message || 'Failed to create receipt', 'error');
    }
  };

  const updateReceipt = async (id, updates) => {
    try {
      const updated = await api.updateReceipt(id, {
        supplier: updates.supplier,
        date: updates.date,
        status: updates.status,
        items: updates.items,
      });
      setReceipts(receipts.map(r => r.id === id ? updated : r));
      showToast('Receipt updated successfully', 'success');
    } catch (error) {
      console.error('Error updating receipt:', error);
      showToast(error.message || 'Failed to update receipt', 'error');
    }
  };

  const validateReceipt = async (id) => {
    try {
      await api.validateReceipt(id);
      // Refresh receipts and products to get updated data
      const [updatedReceipts, updatedProducts] = await Promise.all([
        api.fetchReceipts(),
        api.fetchProducts(),
      ]);
      setReceipts(updatedReceipts);
      setProducts(updatedProducts);
      showToast('Receipt validated successfully', 'success');
    } catch (error) {
      console.error('Error validating receipt:', error);
      showToast(error.message || 'Failed to validate receipt', 'error');
    }
  };

  const deleteReceipt = async (id) => {
    try {
      await api.deleteReceipt(id);
      setReceipts(receipts.filter(r => r.id !== id));
      showToast('Receipt deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting receipt:', error);
      showToast(error.message || 'Failed to delete receipt', 'error');
    }
  };

  // Delivery operations
  const addDelivery = async (delivery) => {
    try {
      const newDelivery = await api.createDelivery({
        customer: delivery.customer,
        date: delivery.date,
        status: delivery.status || 'draft',
        items: delivery.items,
      });
      setDeliveries([...deliveries, newDelivery]);
      
      // Update product stock if delivery is done
      if (delivery.status === 'done') {
        await refreshProducts();
      }
      
      showToast('Delivery order created successfully', 'success');
    } catch (error) {
      console.error('Error adding delivery:', error);
      showToast(error.message || 'Failed to create delivery', 'error');
    }
  };

  const updateDelivery = async (id, updates) => {
    try {
      const updated = await api.updateDelivery(id, {
        customer: updates.customer,
        date: updates.date,
        status: updates.status,
        items: updates.items,
      });
      setDeliveries(deliveries.map(d => d.id === id ? updated : d));
      showToast('Delivery updated successfully', 'success');
    } catch (error) {
      console.error('Error updating delivery:', error);
      showToast(error.message || 'Failed to update delivery', 'error');
    }
  };

  const deleteDelivery = async (id) => {
    try {
      await api.deleteDelivery(id);
      setDeliveries(deliveries.filter(d => d.id !== id));
      showToast('Delivery deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting delivery:', error);
      showToast(error.message || 'Failed to delete delivery', 'error');
    }
  };

  // Helper to refresh products
  const refreshProducts = async () => {
    try {
      const updatedProducts = await api.fetchProducts();
      setProducts(updatedProducts);
    } catch (error) {
      console.error('Error refreshing products:', error);
    }
  };

  // Auth operations
  const login = (userData) => {
    // userData can be a user object from API or email/password for backward compatibility
    if (userData && typeof userData === 'object' && userData.email) {
      // Real authentication - user object from API
      setUser(userData);
      showToast('Login successful', 'success');
      return true;
    }
    // Fallback for backward compatibility (shouldn't be used with new auth)
    const mockUser = { email: userData, name: 'Admin User' };
    setUser(mockUser);
    showToast('Login successful', 'success');
    return true;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    showToast('Logged out successfully', 'success');
  };

  // Toast notification
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const closeToast = () => {
    setToast(null);
  };

  // Calculate dashboard KPIs
  const getDashboardKPIs = () => {
    const totalProducts = products.length;
    const lowStockItems = products.filter(p => p.status === 'low_stock' || p.status === 'out_of_stock').length;
    const pendingReceipts = receipts.filter(r => r.status !== 'done' && r.status !== 'canceled').length;
    const pendingDeliveries = deliveries.filter(d => d.status !== 'done' && d.status !== 'canceled').length;
    const scheduledTransfers = 0; // Placeholder for future feature

    return {
      totalProducts,
      lowStockItems,
      pendingReceipts,
      pendingDeliveries,
      scheduledTransfers,
    };
  };

  // Warehouse operations
  const addWarehouse = (warehouse) => {
    const newWarehouse = {
      id: Date.now().toString(),
      name: warehouse.name,
      shortCode: warehouse.shortCode,
      address: warehouse.address,
      createdAt: new Date().toISOString(),
    };
    setWarehouses([...warehouses, newWarehouse]);
    showToast('Warehouse saved successfully', 'success');
    return newWarehouse;
  };

  const updateWarehouse = (id, updates) => {
    setWarehouses(warehouses.map(w => w.id === id ? { ...w, ...updates } : w));
    showToast('Warehouse updated successfully', 'success');
  };

  const deleteWarehouse = (id) => {
    setWarehouses(warehouses.filter(w => w.id !== id));
    // Also remove locations associated with this warehouse
    setLocations(locations.filter(l => l.warehouseId !== id));
    showToast('Warehouse deleted successfully', 'success');
  };

  // Location operations
  const addLocation = (location) => {
    const newLocation = {
      id: Date.now().toString(),
      name: location.name,
      shortCode: location.shortCode,
      warehouseId: location.warehouseId,
      createdAt: new Date().toISOString(),
    };
    setLocations([...locations, newLocation]);
    showToast('Location saved successfully', 'success');
    return newLocation;
  };

  const updateLocation = (id, updates) => {
    setLocations(locations.map(l => l.id === id ? { ...l, ...updates } : l));
    showToast('Location updated successfully', 'success');
  };

  const deleteLocation = (id) => {
    setLocations(locations.filter(l => l.id !== id));
    showToast('Location deleted successfully', 'success');
  };

  const value = {
    products,
    receipts,
    deliveries,
    warehouses,
    locations,
    user,
    toast,
    loading,
    addProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    addReceipt,
    updateReceipt,
    validateReceipt,
    deleteReceipt,
    addDelivery,
    updateDelivery,
    deleteDelivery,
    addWarehouse,
    updateWarehouse,
    deleteWarehouse,
    addLocation,
    updateLocation,
    deleteLocation,
    login,
    logout,
    showToast,
    closeToast,
    getDashboardKPIs,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
