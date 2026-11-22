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

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required."
      });
    }

    const token = authHeader.split(" ")[1];
    const { jwtVerify } = await import("jose");

    const { payload } = await jwtVerify(token, await getJWKS(), {
      issuer: AUTH_URL,
      audience: AUTH_URL
    });

    req.user = { ...payload, id: payload.sub };

    if (!req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token."
      });
    }

    next();
  } catch (error) {
    console.error("JWT verification failed:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token."
    });
  }
}

module.exports = verifyToken;
