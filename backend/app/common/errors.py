from typing import Any, Dict, List, Optional

class AppError(Exception):
    """Base exception for all application errors."""
    code: str = "INTERNAL_ERROR"
    status_code: int = 500
    retryable: bool = False

    def __init__(
        self, 
        message: str, 
        details: Optional[List[Dict[str, Any]]] = None,
        code: Optional[str] = None,
        status_code: Optional[int] = None,
        retryable: Optional[bool] = None
    ):
        self.message = message
        self.details = details or []
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code
        if retryable is not None:
            self.retryable = retryable
        super().__init__(self.message)

    def to_dict(self, request_id: str) -> Dict[str, Any]:
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details,
                "requestId": request_id,
                "retryable": self.retryable
            }
        }

class ValidationError(AppError):
    code = "VALIDATION_FAILED"
    status_code = 400
    retryable = False

class AuthError(AppError):
    code = "AUTHENTICATION_REQUIRED"
    status_code = 401
    retryable = False

class ForbiddenError(AppError):
    code = "INSUFFICIENT_PERMISSIONS"
    status_code = 403
    retryable = False

class NotFoundError(AppError):
    code = "RESOURCE_NOT_FOUND"
    status_code = 404
    retryable = False

class ConflictError(AppError):
    code = "DUPLICATE_RESOURCE"
    status_code = 409
    retryable = False

class RateLimitError(AppError):
    code = "RATE_LIMITED"
    status_code = 429
    retryable = True

class InternalError(AppError):
    code = "INTERNAL_ERROR"
    status_code = 500
    retryable = True
