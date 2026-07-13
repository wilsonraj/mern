import Container from '@mui/material/Container';
import Box from '@mui/material/Box';

import ProductList from './ProductList';

/**
 * The outer Container/Box here are MUI (theme-aware layout spacing).
 * ProductList itself renders its content inside `.bootstrap-scope`,
 * so react-bootstrap's Table/Modal/Form styling stays isolated within it.
 */
const ProductsPage = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <ProductList />
      </Box>
    </Container>
  );
};

export default ProductsPage;
