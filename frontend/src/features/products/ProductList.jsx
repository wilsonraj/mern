import { useState } from 'react';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';

import { getBootstrapPortalRoot } from '../../utils/bootstrapPortalRoot';
import ProductForm from './ProductForm';
import {
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation
} from './productsApi';

const ProductList = () => {
  const { data, isLoading, isError, error, refetch } = useGetProductsQuery();
  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formError, setFormError] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const products = data?.data?.products || [];

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
   <div className="container py-4">
  {/* Header */}
  <div className="glass-card p-4 mb-4">
    <div className="d-flex justify-content-between align-items-center flex-wrap">
      <div>
        <h2 className="fw-bold mb-1 text-white">Products</h2>
        <p className="text-light opacity-75 mb-0">
          Manage your product inventory
        </p>
      </div>

      <Button
        variant="light"
        className="rounded-pill px-4 fw-semibold shadow-sm"
        onClick={openCreateForm}
      >
        + Add Product
      </Button>
    </div>
  </div>

  {/* Loading */}
  {isLoading && (
    <div className="glass-card text-center py-5">
      <Spinner animation="border" variant="light" />
    </div>
  )}

  {/* Error */}
  {isError && (
    <Alert variant="danger" className="shadow rounded-4">
      {error?.data?.message || "Failed to load products"}
      <Button variant="link" onClick={refetch}>
        Retry
      </Button>
    </Alert>
  )}

  {/* Table */}
  {!isLoading && !isError && (
    <div className="glass-card p-3">
      <div className="table-responsive">
        <Table borderless hover className="align-middle mb-0 text-white">
          <thead>
            <tr className="border-bottom border-secondary">
              <th>Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Price</th>
              <th>Quantity</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>

          <tbody>
            {products.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-5 text-light opacity-75"
                >
                  No Products Found
                </td>
              </tr>
            )}

            {products.map((product) => (
              <tr key={product._id} className="glass-row">
                <td className="fw-semibold">{product.name}</td>

                <td>
                  {product.sku || (
                    <span className="text-light opacity-50">—</span>
                  )}
                </td>

                <td>
                  {product.category ? (
                    <Badge bg="info" pill>
                      {product.category}
                    </Badge>
                  ) : (
                    <span className="text-light opacity-50">—</span>
                  )}
                </td>

                <td>${Number(product.price).toFixed(2)}</td>

                <td>
                  <Badge bg="success" pill>
                    {product.quantity}
                  </Badge>
                </td>

                <td className="text-end">
                  <Button
                    size="sm"
                    variant="light"
                    className="rounded-pill me-2 px-3"
                    onClick={() => openEditForm(product)}
                  >
                    Edit
                  </Button>

                  <Button
                    size="sm"
                    variant="danger"
                    className="rounded-pill px-3"
                    onClick={() => setPendingDeleteId(product._id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  )}

  {/* Create/Edit Modal */}
  <Modal
    show={showForm}
    onHide={closeForm}
    centered
    size="lg"
    container={getBootstrapPortalRoot}
  >
    <Modal.Header closeButton className="border-0 bg-dark text-white">
      <Modal.Title>
        {editingProduct ? "Edit Product" : "Add Product"}
      </Modal.Title>
    </Modal.Header>

    <Modal.Body className="bg-dark text-white">
      <ProductForm
        initialValues={editingProduct}
        onSubmit={handleSubmit}
        onCancel={closeForm}
        isSaving={isCreating || isUpdating}
        apiError={formError}
      />
    </Modal.Body>
  </Modal>

  {/* Delete Modal */}
  <Modal
    show={Boolean(pendingDeleteId)}
    onHide={() => setPendingDeleteId(null)}
    centered
    container={getBootstrapPortalRoot}
  >
    <Modal.Header closeButton className="border-0 bg-dark text-white">
      <Modal.Title>Delete Product</Modal.Title>
    </Modal.Header>

    <Modal.Body className="bg-dark text-white">
      Are you sure you want to delete this product?
    </Modal.Body>

    <Modal.Footer className="border-0 bg-dark">
      <Button
        variant="outline-light"
        onClick={() => setPendingDeleteId(null)}
      >
        Cancel
      </Button>

      <Button variant="danger" onClick={confirmDelete}>
        Delete
      </Button>
    </Modal.Footer>
  </Modal>
</div>
  );
};

export default ProductList;
