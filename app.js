import express from 'express'
import fs from 'fs'
import path from 'path'
import csv from 'csv-parser'
import { ChartJSNodeCanvas } from 'chartjs-node-canvas'
import dayjs from 'dayjs'

const app = express()

const PORT = process.env.PORT || 5000

const DATA_DIR = path.join(import.meta.dirname, 'data')
const WEATHER_FILE = path.join(DATA_DIR, 'weather.json')
const LOG_FILE = path.join(DATA_DIR, 'weather_log.csv')

app.use(express.static(path.join(import.meta.dirname, 'public')))

app.get('/api/weather', (req, res) => {
    if (!fs.existsSync(WEATHER_FILE)) {
        return res.status(404).json({ error: 'No weather data available' })
    }

    try {
        const weatherData = JSON.parse(fs.readFileSync(WEATHER_FILE, 'utf8'))
        res.json(weatherData)
    } catch (err) {
        console.error('Error reading weather.json:', err)
        res.status(500).json({ error: 'Failed to read weather data' })
    }
})

const readCSV = (filePath) => {
    return new Promise((resolve, reject) => {
        const timestamps = []
        const temps = []

        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                if (row.timestamp && row.temperature) {
                    timestamps.push(dayjs(row.timestamp).format('DD-MM-YYYY'))
                    temps.push(parseFloat(row.temperature))
                }
            })
            .on('end', () => resolve({ timestamps, temps}))
            .on('error', reject)
    })
}

const generateChart = async (timestamps, temps) => {
    const width = 800
    const height = 400

    const chartJS = new ChartJSNodeCanvas({ width, height })

    const configuration = {
        type: 'line',
        data: {
            labels: timestamps,
            datasets: [{
                label: 'Temperature C',
                data: temps,
                borderColor: 'Purple'
            }]
        },
        options: {
            scales: {
                x: { title: { display: true, text: 'Data' } },
                y: { title: { display: true, text: 'Temperature C' } }
            }
        }
    }

    return await chartJS.renderToBuffer(configuration)
}

app.get('/plot.png', async (req, res) => {
    if (!fs.existsSync(LOG_FILE)) return res.status(404).send('No weather log available')
    
    try {
        const { timestamps, temps } = await readCSV(LOG_FILE)
        const image = await generateChart(timestamps, temps)

        res.set('Content-Type', 'image/png')
        res.send(image)
    } catch (err) {
        console.error('Error generating chart:', err)
        res.status(500).send('Failed to generate chart!')
    }
})

app.listen(PORT, () => {
    console.log(`Server running on PORT: ${PORT}`)
})