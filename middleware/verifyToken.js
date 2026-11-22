const AUTH_URL = process.env.BETTER_AUTH_URL || "http://localhost:3000";

let jwksPromise;

async function getJWKS() {
  if (!jwksPromise) {
    jwksPromise = import("jose").then(({ createRemoteJWKSet }) =>
      createRemoteJWKSet(new URL("/api/auth/jwks", AUTH_URL))
    );
  }

  return jwksPromise;
}

async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required.",
      });
    }

    const token = authHeader.slice(7);
    const { jwtVerify } = await import("jose");

    const { payload } = await jwtVerify(token, await getJWKS(), {
      issuer: AUTH_URL,
      audience: AUTH_URL,
    });

    if (!payload.sub) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role || "customer",
    };

    next();
  } catch (error) {
    console.error("JWT verification failed:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }
}

module.exports = verifyToken;
