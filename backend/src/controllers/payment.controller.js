import * as appointmentService from '../services/appointment.service.js';
import ApiResponse from '../utils/apiResponse.js';

const razorpayWebhook = async (req, res, next) => {
  try {
    await appointmentService.processRazorpayWebhook(
      req.body,
      req.get('x-razorpay-signature')
    );
    return ApiResponse.success(res, null, 'Razorpay webhook processed');
  } catch (error) {
    return next(error);
  }
};

export { razorpayWebhook };
