import { Router } from 'express'
import db from '../db.js'
import jwt from 'jsonwebtoken'
const router = Router()
const jwtSecret = process.env.JWTSECRET

router.post('/bookings', async (req, res) => {
  try {
    // Validate Token
    const decodedToken = jwt.verify(req.cookies.jwt, jwtSecret)
    if (!decodedToken || !decodedToken.user_id || !decodedToken.email) {
      throw new Error('Invalid authentication token')
    }
    // Validate fields
    let { house_id, from_date, to_date, message } =
      req.body
    if (!house_id || !from_date || !to_date || !message) {
      throw new Error('house_id, from_date, to_date, and message are required')
    }
    // Find house to get price
    let houseFound = await db.query(
      `SELECT house_id, price FROM houses WHERE house_id = ${house_id}`
    )
    if (!houseFound.rows.length) {
      throw new Error(`House with id ${house_id} not found`)
    }
    const house = houseFound.rows[0]
    // Calculate total nights
    let checkingDate = new Date(req.body.from_date)
    let checkoutDate = new Date(req.body.to_date)
    if (checkoutDate <= checkingDate) {
      throw new Error('to_date must be after from_date')
    }
    const totalNights = Math.round(
      (checkoutDate - checkingDate) / (1000 * 60 * 60 * 24)
    )
    // Calculate total price
    const totalPrice = totalNights * house.price
    // Create booking
    let { rows } = await db.query(`
      INSERT INTO bookings (house_id, user_id, from_date, to_date, message, nights, price_night, price_total)
      VALUES ('${house_id}', '${decodedToken.user_id}', '${from_date}', '${to_date}', '${message}', ${totalNights}, ${house.price}, ${totalPrice})
      RETURNING *
    `)
    // Respond
    res.json(rows[0])
  } catch (err) {
    res.json({ error: err.message })
  }
})

router.get('/bookings', async (req, res) => {
  try {
    // Validate Token
    const decodedToken = jwt.verify(req.cookies.jwt, jwtSecret)
    if (!decodedToken || !decodedToken.user_id || !decodedToken.email) {
      throw new Error('Invalid authentication token')
    }
    // Get bookings
    let sqlquery = `
      SELECT
        TO_CHAR(bookings.from_date, 'D Mon yyyy') AS from_date,
        TO_CHAR(bookings.to_date, 'D Mon yyyy') AS to_date,
        bookings.price_night AS price,
        bookings.nights,
        bookings.price_total,
        houses.house_id,
        houses.location,
        houses.rooms,
        houses.bathrooms,
        houses.reviews_count,
        houses.rating,
        photos.photo
      FROM bookings
      LEFT JOIN houses ON houses.house_id = bookings.house_id
      LEFT JOIN (
          SELECT DISTINCT ON (house_id) house_id, photo
          FROM houses_photos
      ) AS photos ON photos.house_id = houses.house_id
      WHERE bookings.user_id = ${decodedToken.user_id}
      ORDER BY bookings.from_date DESC
    `
    // Respond
    let { rows } = await db.query(sqlquery)
    res.json(rows)
  } catch (err) {
    res.json({ error: err.message })
  }
})

export default router
