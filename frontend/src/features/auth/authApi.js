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
    refresh: builder.mutation({
      query: () => ({
        url: '/users/refresh',
        method: 'POST'
      })
    }),
    logout: builder.mutation({
      query: () => ({
        url: '/users/logout',
        method: 'POST'
      })
    }),
    getProfile: builder.query({
      query: () => '/users/me',
      providesTags: ['User']
    })
  })
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useRefreshMutation,
  useRegisterMutation,
  useGetProfileQuery
} = authApi;
