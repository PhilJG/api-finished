import { Router } from 'express'
import db from '../db.js'
import jwt from 'jsonwebtoken'
const router = Router()
const jwtSecret = process.env.JWTSECRET

router.post('/reviews', async (req, res) => {
  try {
    // Validate Token
    const decodedToken = jwt.verify(req.cookies.jwt, jwtSecret)
    if (!decodedToken || !decodedToken.user_id || !decodedToken.email) {
      throw new Error('Invalid authentication token')
    }
    // Validate fields
    let { house_id, content, rating } = req.body
    if (!house_id || !content || !rating) {
      throw new Error('house_id, content, and rating are required')
    }
    // Validate rating
    if (rating < 0 || rating > 5) {
      throw new Error('rating must be between 0 and 5')
    }
    // Get current date
    let date = new Date()
    date = date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate()
    // Insert review
    let { rows } = await db.query(`
      INSERT INTO reviews (house_id, user_id, date, content, rating)
      VALUES (${house_id}, ${decodedToken.user_id}, '${date}', '${content}', ${rating})
      RETURNING *
    `)
    // Add other fields
    let { rows: usersRows } = await db.query(`
      SELECT users.first_name, users.last_name, users.picture FROM users
      WHERE user_id = ${decodedToken.user_id}
    `)
    let review = rows[0]
    review.author = usersRows[0]
    const formatter = new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
    const formatted = formatter.format(new Date(review.date))
    review.date = formatted
    res.json(review)
    // Update house
    let houseUpdated = await db.query(
      `UPDATE houses SET reviews_count = reviews_count + 1, rating = ROUND((rating + ${rating}) / (reviews_count + 1)) WHERE house_id = ${house_id} RETURNING *`
    )
  } catch (err) {
    res.json({ error: err.message })
  }
})

router.get('/reviews', async (req, res) => {
  try {
    if (!req.query.house_id) {
      throw new Error('house_id is required')
    }
    let sqlquery = `
      SELECT reviews.*, users.first_name, users.last_name, users.picture FROM reviews
      LEFT JOIN users ON users.user_id = reviews.user_id
      WHERE house_id = ${req.query.house_id}
      ORDER BY date DESC
    `
    let { rows } = await db.query(sqlquery)
    const formatter = new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
    let reviews = rows.map((r) => {
      r.author = {
        firstName: r.first_name,
        lastName: r.last_name,
        picture: r.picture
      }
      r.date = formatter.format(new Date(r.date))
      delete r.first_name
      delete r.last_name
      delete r.picture
      return r
    })
    res.json(reviews)
  } catch (err) {
    res.json({ error: err.message })
  }
})

export default router
