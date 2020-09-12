import { maskSensitiveInfoFromError } from '@api/utils/maskSensitiveInfoFromError';
import { NextApiMiddleware } from './types';

// https://github.com/zeit/micro#error-handling
const handleErrors: NextApiMiddleware = (fn) => async (req, res) => {
  try {
    return await fn(req, res);
  } catch (err) {
    const maskedErr = maskSensitiveInfoFromError(err);
    const statusCode = maskedErr.statusCode || 500;
    const message = maskedErr.message || 'Something went wrong';
    res.status(statusCode).json({ statusCode, message });
  }
};

export default handleErrors;
