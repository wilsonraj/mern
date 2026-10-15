import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Alert from 'react-bootstrap/Alert';

import MuiFormField from '../../components/form/MuiFormField';
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
            <MuiFormField name="name" control={control} label="Product name" />
          </Col>
          <Col md={4}>
            <MuiFormField name="sku" control={control} label="SKU" />
          </Col>
        </Row>

        <Row>
          <Col md={4}>
            <MuiFormField name="category" control={control} label="Category" />
          </Col>
          <Col md={4}>
            <MuiFormField name="price" control={control} label="Price" type="number" inputProps={{ step: '0.01' }} />
          </Col>
          <Col md={4}>
            <MuiFormField name="quantity" control={control} label="Quantity" type="number" />
          </Col>
        </Row>

        <MuiFormField
          name="description"
          control={control}
          label="Description"
          multiline
          minRows={3}
        />

        <div className="d-flex justify-content-end gap-2 mt-3">
          {onCancel && (
            <Button
              variant="outlined"
              color="inherit"
              type="button"
              onClick={onCancel}
              disabled={busy}
              sx={{
                minWidth: 110,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700
              }}
            >
              Cancel
            </Button>
          )}
          <Button
            variant="contained"
            color="primary"
            type="submit"
            disabled={busy}
            sx={{
              minWidth: 140,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700
            }}
          >
            {busy ? (
              <>
                <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
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
