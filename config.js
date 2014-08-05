module.exports = {
	port: process.env.PORT || 5000,
	host: process.env.HOST || 'localhost',
	dbURL: process.env.MONGOHQ_URL || "localhost/test"
}