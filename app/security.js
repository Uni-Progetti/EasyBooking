const jwt = require('jsonwebtoken');

const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }

            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

/* Reindirizza al login se non autenticati. */
const redirectLogin = function(req, res, next){
    if(!req.session.userId){
        res.redirect('/login');
    } else {
        next();
    }
}

/* Reindirizza alla home se autenticati. */
const redirectHome = function(req, res, next){
    if(req.session.userId){
      res.redirect('/');
    } else {
      next();
    }
}

module.exports.redirectLogin = redirectLogin;
module.exports.redirectHome = redirectHome;
module.exports.authenticateJWT = authenticateJWT;