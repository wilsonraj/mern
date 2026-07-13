import { Controller } from 'react-hook-form';
import Form from 'react-bootstrap/Form';

/**
 * Wires a react-bootstrap Form.Control to React Hook Form using Controller,
 * automatically surfacing yup validation errors as Bootstrap's invalid-feedback.
 */
const BootstrapFormField = ({
  name,
  control,
  label,
  type = 'text',
  as = 'input',
  rows,
  ...rest
}) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <Form.Group className="mb-3" controlId={name}>
          {label && <Form.Label>{label}</Form.Label>}
          <Form.Control
            {...field}
            {...rest}
            as={as}
            rows={rows}
            type={type}
            value={field.value ?? ''}
            isInvalid={Boolean(error)}
          />
          {error && (
            <Form.Control.Feedback type="invalid">{error.message}</Form.Control.Feedback>
          )}
        </Form.Group>
      )}
    />
  );
};

export default BootstrapFormField;
