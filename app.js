import express from 'express'
import fs from 'fs'
import path from 'path'
import csv from 'csv-parser'
import dayjs from 'dayjs'

const app = express()
const PORT = process.env.PORT || 5000

const DATA_DIR = path.join(import.meta.dirname, 'data')
const WEATHER_FILE = path.join(DATA_DIR, 'weather.json')
const LOG_FILE = path.join(DATA_DIR, 'weather_log.csv')

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(import.meta.dirname, 'public')))

// API to get latest weather
app.get('/api/weather', (req, res) => {
    if (!fs.existsSync(WEATHER_FILE)) return res.status(404).json({ error: 'No weather data available' })
    try {
        const weatherData = JSON.parse(fs.readFileSync(WEATHER_FILE, 'utf8'))
        res.json(weatherData)
    } catch (err) {
        console.error('Error reading weather.json:', err)
        res.status(500).json({ error: 'Failed to read weather data' })
    }
})

// API to get historical weather log
app.get('/api/weather-log', (req, res) => {
    if (!fs.existsSync(LOG_FILE)) return res.status(404).json({ error: 'No weather log available' })

    const timestamps = []
    const temps = []

    fs.createReadStream(LOG_FILE)
        .pipe(csv())
        .on('data', row => {
            if (row.timestamp && row.temperature) {
                timestamps.push(row.timestamp)
                temps.push(parseFloat(row.temperature))
            }
        })
        .on('end', () => res.json({ timestamps, temps }))
        .on('error', err => {
            console.error('Error reading CSV:', err)
            res.status(500).json({ error: 'Failed to read log' })
        })
})

app.listen(PORT, () => console.log(`Server running on PORT: ${PORT}`))
