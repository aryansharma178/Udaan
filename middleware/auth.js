const jwt = require('jsonwebtoken');

const JWT_SECRET = 'UDAAN_SECRET_CHANGE_THIS_LATER';

function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization || '';

        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const token = authHeader.slice(7).trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication token missing'
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        req.user = decoded;
        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
}

module.exports = { requireAuth };
