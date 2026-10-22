import { apiSlice } from '../../services/apiSlice';

export const communityApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAppointmentDoctors: builder.query({
      query: () => '/appointments/doctors',
      providesTags: [{ type: 'Appointment', id: 'DOCTORS' }]
    }),
    getMyAppointments: builder.query({
      query: () => '/appointments/mine',
      providesTags: [{ type: 'Appointment', id: 'MINE' }]
    }),
    createAppointment: builder.mutation({
      query: (appointment) => ({
        url: '/appointments',
        method: 'POST',
        body: appointment
      }),
      invalidatesTags: [
        { type: 'Appointment', id: 'MINE' },
        { type: 'Appointment', id: 'DOCTORS' }
      ]
    }),
    cancelPatientAppointment: builder.mutation({
      query: (appointmentId) => ({
        url: `/appointments/${appointmentId}`,
        method: 'DELETE'
      }),
      invalidatesTags: [
        { type: 'Appointment', id: 'MINE' },
        { type: 'Appointment', id: 'DOCTORS' }
      ]
    }),
    updateDoctorProfile: builder.mutation({
      query: (profile) => ({
        url: '/appointments/doctor/profile',
        method: 'PUT',
        body: profile
      }),
      invalidatesTags: [
        { type: 'Appointment', id: 'DOCTORS' },
        { type: 'Appointment', id: 'DOCTOR_PROFILE' }
      ]
    }),
    getDoctorSlots: builder.query({
      query: () => '/appointments/doctor/slots',
      providesTags: [{ type: 'Appointment', id: 'SLOTS' }]
    }),
    getDoctorAvailability: builder.query({
      query: () => '/appointments/doctor/availability',
      providesTags: [{ type: 'Appointment', id: 'WEEKLY_AVAILABILITY' }]
    }),
    getDoctorProfile: builder.query({
      query: () => '/appointments/doctor/profile',
      providesTags: [{ type: 'Appointment', id: 'DOCTOR_PROFILE' }]
    }),
    updateDoctorAvailability: builder.mutation({
      query: (availability) => ({
        url: '/appointments/doctor/availability',
        method: 'PUT',
        body: availability
      }),
      invalidatesTags: [
        { type: 'Appointment', id: 'WEEKLY_AVAILABILITY' },
        { type: 'Appointment', id: 'SLOTS' },
        { type: 'Appointment', id: 'DOCTORS' }
      ]
    }),
    publishDoctorSlots: builder.mutation({
      query: (startsAt) => ({
        url: '/appointments/doctor/slots',
        method: 'POST',
        body: { startsAt }
      }),
      invalidatesTags: [
        { type: 'Appointment', id: 'SLOTS' },
        { type: 'Appointment', id: 'DOCTORS' }
      ]
    }),
    removeDoctorSlot: builder.mutation({
      query: (slotId) => ({
        url: `/appointments/doctor/slots/${slotId}`,
        method: 'DELETE'
      }),
      invalidatesTags: [
        { type: 'Appointment', id: 'SLOTS' },
        { type: 'Appointment', id: 'DOCTORS' }
      ]
    }),
    updateAppointmentStatus: builder.mutation({
      query: ({ appointmentId, status }) => ({
        url: `/appointments/${appointmentId}/status`,
        method: 'PATCH',
        body: { status }
      }),
      invalidatesTags: [
        { type: 'Appointment', id: 'MINE' },
        { type: 'Appointment', id: 'DOCTORS' }
      ]
    }),
    getFeed: builder.query({
      query: () => '/feed',
      providesTags: (result) => [
        { type: 'Feed', id: 'LIST' },
        ...(result?.data || []).map(({ _id }) => ({ type: 'Feed', id: _id }))
      ]
    }),
    createFeedPost: builder.mutation({
      query: (formData) => ({
        url: '/feed',
        method: 'POST',
        body: formData
      }),
      invalidatesTags: [{ type: 'Feed', id: 'LIST' }]
    }),
    toggleFeedLike: builder.mutation({
      query: (postId) => ({
        url: `/feed/${postId}/likes`,
        method: 'POST'
      }),
      invalidatesTags: [{ type: 'Feed', id: 'LIST' }]
    }),
    addFeedComment: builder.mutation({
      query: ({ postId, text }) => ({
        url: `/feed/${postId}/comments`,
        method: 'POST',
        body: { text }
      }),
      invalidatesTags: [{ type: 'Feed', id: 'LIST' }]
    }),
    shareFeedPost: builder.mutation({
      query: (postId) => ({
        url: `/feed/${postId}/shares`,
        method: 'POST'
      }),
      invalidatesTags: [{ type: 'Feed', id: 'LIST' }]
    }),
    getDirectory: builder.query({
      query: ({ search = '' } = {}) => ({
        url: '/community/directory',
        params: search ? { search } : undefined
      }),
      providesTags: [{ type: 'Community', id: 'DIRECTORY' }]
    }),
    getFriendRequests: builder.query({
      query: () => '/community/friend-requests',
      providesTags: [{ type: 'Community', id: 'REQUESTS' }]
    }),
    createFriendRequest: builder.mutation({
      query: (recipientId) => ({
        url: '/community/friend-requests',
        method: 'POST',
        body: { recipientId }
      }),
      invalidatesTags: [
        { type: 'Community', id: 'DIRECTORY' },
        { type: 'Community', id: 'REQUESTS' }
      ]
    }),
    respondToFriendRequest: builder.mutation({
      query: ({ requestId, status }) => ({
        url: `/community/friend-requests/${requestId}`,
        method: 'PATCH',
        body: { status }
      }),
      invalidatesTags: [
        { type: 'Community', id: 'DIRECTORY' },
        { type: 'Community', id: 'REQUESTS' }
      ]
    }),
    removeFriend: builder.mutation({
      query: (userId) => ({
        url: `/community/friends/${userId}`,
        method: 'DELETE'
      }),
      invalidatesTags: [
        { type: 'Community', id: 'DIRECTORY' },
        { type: 'Community', id: 'REQUESTS' }
      ]
    }),
    getMessages: builder.query({
      query: (userId) => `/community/messages/${userId}`,
      providesTags: (result, error, userId) => [
        { type: 'Community', id: `messages:${userId}` }
      ]
    }),
    getUnreadMessageCounts: builder.query({
      query: () => '/community/unread-counts',
      providesTags: [{ type: 'Community', id: 'UNREAD_MESSAGES' }]
    }),
    markMessagesRead: builder.mutation({
      query: (userId) => ({
        url: `/community/messages/${userId}/read`,
        method: 'PATCH'
      }),
      invalidatesTags: [
        { type: 'Community', id: 'UNREAD_MESSAGES' },
        { type: 'Community', id: 'DIRECTORY' }
      ]
    }),
    sendMessage: builder.mutation({
      query: ({ userId, text }) => ({
        url: `/community/messages/${userId}`,
        method: 'POST',
        body: { text }
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: 'Community', id: `messages:${userId}` }
      ]
    }),
    getAdminUsers: builder.query({
      query: () => '/community/admin/users',
      providesTags: [{ type: 'Community', id: 'ADMIN_USERS' }]
    }),
    createAdminUser: builder.mutation({
      query: (userData) => ({
        url: '/community/admin/users',
        method: 'POST',
        body: userData
      }),
      invalidatesTags: [{ type: 'Community', id: 'ADMIN_USERS' }]
    }),
    updateUserRole: builder.mutation({
      query: ({ userId, role }) => ({
        url: `/community/admin/users/${userId}/role`,
        method: 'PATCH',
        body: { role }
      }),
      invalidatesTags: [
        { type: 'Community', id: 'ADMIN_USERS' },
        { type: 'Community', id: 'DIRECTORY' }
      ]
    }),
    deleteUser: builder.mutation({
      query: (userId) => ({
        url: `/community/admin/users/${userId}`,
        method: 'DELETE'
      }),
      invalidatesTags: [
        { type: 'Community', id: 'ADMIN_USERS' },
        { type: 'Community', id: 'DIRECTORY' },
        { type: 'Community', id: 'REQUESTS' },
        { type: 'Community', id: 'UNREAD_MESSAGES' }
      ]
    })
  })
});

export const {
  useCancelPatientAppointmentMutation,
  useCreateAppointmentMutation,
  useGetDoctorAvailabilityQuery,
  useGetAppointmentDoctorsQuery,
  useGetDoctorSlotsQuery,
  useGetDoctorProfileQuery,
  useGetMyAppointmentsQuery,
  usePublishDoctorSlotsMutation,
  useRemoveDoctorSlotMutation,
  useAddFeedCommentMutation,
  useCreateFeedPostMutation,
  useCreateAdminUserMutation,
  useCreateFriendRequestMutation,
  useDeleteUserMutation,
  useGetFeedQuery,
  useGetAdminUsersQuery,
  useGetDirectoryQuery,
  useGetFriendRequestsQuery,
  useGetMessagesQuery,
  useGetUnreadMessageCountsQuery,
  useMarkMessagesReadMutation,
  useRemoveFriendMutation,
  useRespondToFriendRequestMutation,
  useShareFeedPostMutation,
  useSendMessageMutation,
  useToggleFeedLikeMutation,
  useUpdateAppointmentStatusMutation,
  useUpdateDoctorAvailabilityMutation,
  useUpdateDoctorProfileMutation,
  useUpdateUserRoleMutation
} = communityApi;
