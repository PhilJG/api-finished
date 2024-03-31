import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import 'dotenv/config'
const app = express()

app.use(
  cors({
    origin: true,
    credentials: true
  })
)

app.use(express.json())
app.use(cookieParser())

import housesRoutes from './routes/housesRoutes.js'
import reviewsRoutes from './routes/reviewsRoutes.js'
import bookingsRoutes from './routes/bookingsRoutes.js'
import authRoutes from './routes/authRoutes.js'

app.use(housesRoutes)
app.use(reviewsRoutes)
app.use(bookingsRoutes)
app.use(authRoutes)

app.listen(process.env.PORT || 4100, () => {
  console.log(`Airbnb API ready on ${process.env.PORT || 4100}`)
})
