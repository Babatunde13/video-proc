export const successResponse = <T = object>(data: T, message: string) => {
  return {
    status: "success",
    success: true,
    message,
    data,
  };
};

export const errorResponse = <T = Error>(message: string, error?: T) => {
  return {
    status: "error",
    success: false,
    message,
    error: error || {},
  };
};
