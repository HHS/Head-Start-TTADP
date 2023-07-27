from fastapi import Request

async def add_security_headers(request: Request, call_next):
    response = await call_next(request)

    # Content-Security-Policy has been relaxed for Swagger UI.
    # It's recommended to tighten this in production deployments and explicitly specify trusted sources for scripts, styles, and other types of content.
    if request.url.path == "/docs" or request.url.path == "/openapi.json":
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';connect-src 'self'; img-src * data:; script-src-elem 'self' https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js 'sha256-QOOQu4W1oxGqd2nbXbxiA1Di6OHQOLQD+o+G9oWL8YY='; style-src-elem https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css"
    else:
        response.headers["Content-Security-Policy"] = "default-src 'self'"

    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Strict-Transport-Security"] = "max-age=31536000 ; includeSubDomains"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Permissions-Policy"] = "geolocation=(self), midi=(self), sync-xhr=(self), microphone=(self), camera=(self), magnetometer=(self), gyroscope=(self), fullscreen=(self), payment=(self)"
    return response
