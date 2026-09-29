import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const baseQuery = fetchBaseQuery({
  baseUrl,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const accessToken = getState().auth?.accessToken;
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
    return headers;
  }
});

const refreshBaseQuery = fetchBaseQuery({
  baseUrl,
  credentials: 'include'
});

let refreshPromise;

const baseQueryWithAuthHandling = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);
  const url = typeof args === 'string' ? args : args.url;
  const isAuthEndpoint = ['/users/login', '/users/register', '/users/refresh', '/users/logout']
    .some((endpoint) => url.endsWith(endpoint));

  if (result.error?.status === 401 && !isAuthEndpoint) {
    if (!refreshPromise) {
      refreshPromise = refreshBaseQuery(
        { url: '/users/refresh', method: 'POST' },
        api,
        extraOptions
      ).finally(() => {
        refreshPromise = null;
      });
    }

    const refreshResult = await refreshPromise;
    const credentials = refreshResult.data?.data;
    if (credentials?.accessToken && credentials.user) {
      api.dispatch({
        type: 'auth/setCredentials',
        payload: { user: credentials.user, accessToken: credentials.accessToken }
      });
      result = await baseQuery(args, api, extraOptions);
    } else {
      if (api.getState().auth?.user) {
        api.dispatch({
          type: 'notification/showNotification',
          payload: { message: 'Your session expired. Please sign in again.', severity: 'warning' }
        });
      }
      api.dispatch({ type: 'auth/forceLogout' });
    }
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuthHandling,
  tagTypes: ['Product', 'User'],
  endpoints: () => ({})
});
