import { apiSlice } from '../../services/apiSlice';

export const productsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query({
      query: (params = {}) => ({
        url: '/products',
        params
      }),
      providesTags: (result) =>
        result?.data?.products
          ? [
              ...result.data.products.map(({ _id }) => ({ type: 'Product', id: _id })),
              { type: 'Product', id: 'LIST' }
            ]
          : [{ type: 'Product', id: 'LIST' }]
    }),
    getProductById: builder.query({
      query: (id) => `/products/${id}`,
      providesTags: (result, error, id) => [{ type: 'Product', id }]
    }),
    createProduct: builder.mutation({
      query: (body) => ({
        url: '/products',
        method: 'POST',
        body
      }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }]
    }),
    updateProduct: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/products/${id}`,
        method: 'PUT',
        body
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Product', id },
        { type: 'Product', id: 'LIST' }
      ]
    }),
    deleteProduct: builder.mutation({
      query: (id) => ({
        url: `/products/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }]
    }),
    bulkDeleteProducts: builder.mutation({
      query: (ids) => ({
        url: '/products/bulk-delete',
        method: 'DELETE',
        body: { ids }
      }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }]
    }),
    bulkUploadProducts: builder.mutation({
      query: (formData) => ({
        url: '/upload/bulk',
        method: 'POST',
        body: formData
      }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }]
    })
  })
});

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useBulkDeleteProductsMutation,
  useBulkUploadProductsMutation
} = productsApi;
