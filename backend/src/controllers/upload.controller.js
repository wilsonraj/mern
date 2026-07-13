import * as bulkUploadService from '../services/bulkUpload.service.js';
import ApiResponse from '../utils/apiResponse.js';

// @desc    Bulk upload products via CSV/Excel file
// @route   POST /api/upload/bulk
const bulkUploadProducts = async (req, res, next) => {
  try {
    if (!req.file) {
      return ApiResponse.error(res, 'No file uploaded', 400);
    }

    const result = await bulkUploadService.processBulkUpload(
      req.file.path,
      req.file.originalname
    );

    return ApiResponse.success(res, result, 'Bulk upload processed', 201);
  } catch (error) {
    next(error);
  }
};

export { bulkUploadProducts };
