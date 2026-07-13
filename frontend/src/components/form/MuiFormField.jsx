import { Controller } from 'react-hook-form';
import TextField from '@mui/material/TextField';

/**
 * Wires an MUI TextField to React Hook Form using Controller,
 * automatically surfacing yup validation errors.
 */
const MuiFormField = ({ name, control, label, type = 'text', ...rest }) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...field}
          {...rest}
          type={type}
          label={label}
          fullWidth
          margin="normal"
          error={Boolean(error)}
          helperText={error ? error.message : rest.helperText}
        />
      )}
    />
  );
};

export default MuiFormField;
