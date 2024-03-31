import pg from 'pg'
const { Pool } = pg
const DBURL = process.env.DBURL

// Database connection parameters
const db = new Pool({
  ssl: {
    rejectUnauthorized: false
  },
  connectionString: DBURL
})

export default db
