import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Alert from 'react-bootstrap/Alert';
import Spinner from 'react-bootstrap/Spinner';

import BootstrapFormField from '../../components/form/BootstrapFormField';
import { productSchema } from './productSchema';

const defaultValues = {
  name: '',
  sku: '',
  category: '',
  price: '',
  quantity: 0,
  description: ''
};

/**
 * Product form. Pass `initialValues` to edit an existing product,
 * omit it to create a new one. Scoped under `.bootstrap-scope` so its
 * styles stay isolated from the MUI-themed parts of the app.
 */
const ProductForm = ({ initialValues, onSubmit, onCancel, isSaving, apiError }) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting }
  } = useForm({
    resolver: yupResolver(productSchema),
    defaultValues,
    mode: 'onBlur'
  });

  useEffect(() => {
    if (initialValues) {
      reset({ ...defaultValues, ...initialValues });
    }
  }, [initialValues, reset]);

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  const busy = isSubmitting || isSaving;

  return (
    <div className="bootstrap-scope">
      {apiError && <Alert variant="danger">{apiError}</Alert>}

      <Form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
        <Row>
          <Col md={8}>
            <BootstrapFormField name="name" control={control} label="Product name" />
          </Col>
          <Col md={4}>
            <BootstrapFormField name="sku" control={control} label="SKU" />
          </Col>
        </Row>

        <Row>
          <Col md={4}>
            <BootstrapFormField name="category" control={control} label="Category" />
          </Col>
          <Col md={4}>
            <BootstrapFormField name="price" control={control} label="Price" type="number" step="0.01" />
          </Col>
          <Col md={4}>
            <BootstrapFormField name="quantity" control={control} label="Quantity" type="number" />
          </Col>
        </Row>

        <BootstrapFormField
          name="description"
          control={control}
          label="Description"
          as="textarea"
          rows={3}
        />

        <div className="d-flex justify-content-end gap-2 mt-3">
          {onCancel && (
            <Button variant="outline-secondary" type="button" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
          )}
          <Button variant="primary" type="submit" disabled={busy}>
            {busy ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Saving...
              </>
            ) : (
              'Save product'
            )}
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default ProductForm;
