import { apiSlice } from '../../services/apiSlice';

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: '/users/login',
        method: 'POST',
        body: credentials
      })
    }),
    register: builder.mutation({
      query: (userData) => ({
        url: '/users/register',
        method: 'POST',
        body: userData
      })
    }),
    getProfile: builder.query({
      query: () => '/users/me',
      providesTags: ['User']
    })
  })
});

export const { useLoginMutation, useRegisterMutation, useGetProfileQuery } = authApi;
