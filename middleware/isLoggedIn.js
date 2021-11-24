// Middleware that check if the user is, or should be, logged in. If not, redirect to login page.
const isLoggedIn =  (req, res, next) => {
    if (!req.cookies.bearer) {
        req.session.returnTo = req.originalUrl
        return res.redirect('../');
    }
    next();
}

module.exports = isLoggedIn