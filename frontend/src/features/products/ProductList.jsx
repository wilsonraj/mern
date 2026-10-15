import { useState } from 'react';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import MuiButton from '@mui/material/Button';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useSelector } from 'react-redux';

import DynamicModal from '../../components/common/DynamicModal';
import ProductForm from './ProductForm';
import { selectCurrentUser } from '../auth/authSlice';
import {
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation
} from './productsApi';

const ProductList = () => {
  const user = useSelector(selectCurrentUser);
  const isAdmin = user?.role === 'admin';
  const { data, isLoading, isError, error, refetch } = useGetProductsQuery();
  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formError, setFormError] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const products = data?.data?.products || [];
  const inventoryValue = products.reduce((total, product) => total + Number(product.price || 0) * Number(product.quantity || 0), 0);
  const lowStockCount = products.filter((product) => product.quantity > 0 && product.quantity <= 5).length;
  const outOfStockCount = products.filter((product) => Number(product.quantity) === 0).length;

  const openCreateForm = () => {
    setEditingProduct(null);
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (product) => {
    setEditingProduct(product);
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingProduct(null);
    setFormError('');
  };

  const handleSubmit = async (formValues) => {
    setFormError('');
    try {
      if (editingProduct) {
        await updateProduct({ id: editingProduct._id, ...formValues }).unwrap();
      } else {
        await createProduct(formValues).unwrap();
      }
      closeForm();
    } catch (err) {
      setFormError(err?.data?.message || 'Failed to save product');
    }
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    await deleteProduct(pendingDeleteId);
    setPendingDeleteId(null);
  };

  return (
    <div className="bootstrap-scope">
      <section className="glass-card p-4 p-md-5 mb-4 product-hero my-5">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-4 my-5">
          <div>
            <div className="product-eyebrow"><Inventory2OutlinedIcon fontSize="small" /> CATALOG OVERVIEW</div>
            <h1 className="product-heading mb-2">Products</h1>
            <p className="product-subtitle mb-0">Everything you sell, organized in one place.</p>
          </div>
          {isAdmin && (
            <Button
              variant="primary"
              className="add-product-button d-inline-flex align-items-center gap-2"
              onClick={openCreateForm}
            >
              <AddIcon fontSize="small" /> Add product
            </Button>
          )}
        </div>

        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mt-4">
          <div className="product-count">
            <span className="product-count-dot" />
            {isLoading ? 'Updating catalog…' : `${products.length} ${products.length === 1 ? 'product' : 'products'} in your catalog`}
          </div>
          <span className="product-live-signal">Live inventory</span>
        </div>

        <div className="product-stats">
          <div className="stat-card">
            <span className="stat-label">Inventory value</span>
            <strong className="stat-value">${inventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Low stock</span>
            <strong className="stat-value">{lowStockCount}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Out of stock</span>
            <strong className="stat-value">{outOfStockCount}</strong>
          </div>
        </div>
      </section>

      {isLoading && (
        <div className="glass-card text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="product-subtitle mt-3 mb-0">Loading your catalog…</p>
        </div>
      )}

      {isError && (
        <Alert variant="danger" className="glass-card d-flex justify-content-between align-items-center">
          <span>{error?.data?.message || 'Failed to load products'}</span>
          <Button variant="outline-primary" onClick={refetch}>
            <RefreshIcon fontSize="small" className="me-1" /> Retry
          </Button>
        </Alert>
      )}

      {!isLoading && !isError && (
        <section className="glass-card p-3 p-md-4 product-table-card my-5">
          <div className="d-flex justify-content-between align-items-center gap-3 mb-2 px-2 pt-1">
            <div>
              <h2 className="product-section-title my-5">Your inventory</h2>
              <p className="product-table-caption mb-5">
                {isAdmin ? 'View and manage your product details.' : 'Read-only view of your product catalog.'}
              </p>
            </div>
            <span className="product-total-badge">{products.length} total</span>
          </div>
          <div className="table-responsive">
            <Table borderless hover className="align-middle mb-0 product-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>In stock</th>
                  {isAdmin && <th className="text-end">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {products.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="text-center py-5">
                      <div className="empty-inventory-icon"><Inventory2OutlinedIcon /></div>
                      <strong className="d-block mt-3">Your catalog is ready for its first product</strong>
                      <span className="product-table-caption">Add an item to get your inventory organized.</span>
                    </td>
                  </tr>
                )}
                {products.map((product) => (
                  <tr key={product._id}>
                    <td>
                      <span className="product-name">{product.name}</span>
                      {product.description && <span className="product-description">{product.description}</span>}
                    </td>
                    <td>{product.sku || <span className="product-muted">—</span>}</td>
                    <td>
                      {product.category ? <Badge bg="info" pill>{product.category}</Badge> : <span className="product-muted">—</span>}
                    </td>
                    <td className="product-price">${Number(product.price).toFixed(2)}</td>
                    <td>
                      <span className={`stock-pill ${product.quantity > 0 ? 'in-stock' : 'out-of-stock'}`}>
                        <span /> {product.quantity} {product.quantity === 1 ? 'unit' : 'units'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="text-end">
                        <Button size="sm" variant="outline-primary" className="row-action me-2" onClick={() => openEditForm(product)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="outline-danger" className="row-action" onClick={() => setPendingDeleteId(product._id)}>
                          Delete
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </section>
      )}

      {isAdmin && <DynamicModal
        open={showForm}
        onClose={closeForm}
        title={editingProduct ? 'Edit product' : 'Add a product'}
        subtitle={editingProduct ? 'Update listing' : 'New listing'}
        icon={editingProduct ? <EditIcon fontSize="small" /> : <AddIcon fontSize="small" />}
        maxWidth="md"
      >
        <ProductForm
          initialValues={editingProduct}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          isSaving={isCreating || isUpdating}
          apiError={formError}
        />
      </DynamicModal>}

      {isAdmin && <DynamicModal
        open={Boolean(pendingDeleteId)}
        onClose={() => setPendingDeleteId(null)}
        title="Delete product"
        subtitle="Delete listing"
        icon={<DeleteOutlineOutlinedIcon fontSize="small" />}
        maxWidth="sm"
        actions={
          <>
            <MuiButton variant="outlined" color="inherit" onClick={() => setPendingDeleteId(null)} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
              Cancel
            </MuiButton>
            <MuiButton variant="contained" color="error" onClick={confirmDelete} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
              Delete product
            </MuiButton>
          </>
        }
      >
        <p className="delete-modal-copy mb-0">Are you sure you want to delete this product? This action cannot be undone.</p>
      </DynamicModal>}
    </div>
  );
};

export default ProductList;
