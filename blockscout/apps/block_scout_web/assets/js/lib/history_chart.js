import $ from 'jquery'
import { Chart, LineController, LineElement, PointElement, LinearScale, TimeScale, Title, Tooltip, Filler } from 'chart.js'
import 'chartjs-adapter-luxon'
import humps from 'humps'
import numeral from 'numeral'
import { DateTime } from 'luxon'
import { formatUsdValue } from '../lib/currency'
import { isDarkMode } from '../lib/dark_mode'
// @ts-ignore
import sassVariables from '../../css/export-vars-to-js.module.scss'

Chart.defaults.font.family = 'Inter, Nunito, "Helvetica Neue", Arial, sans-serif,"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"'
// Registering Filler is critical for the gradient area under the line
Chart.register(LineController, LineElement, PointElement, LinearScale, TimeScale, Title, Tooltip, Filler)

// @ts-ignore
const coinName = document.getElementById('js-coin-name').value
// @ts-ignore
const chainId = document.getElementById('js-chain-id').value
const priceDataKey = `priceData${coinName}`
const txHistoryDataKey = `txHistoryData${coinName}${chainId}`
const marketCapDataKey = `marketCapData${coinName}${chainId}`
const isChartLoadedKey = `isChartLoaded${coinName}${chainId}`

// --- Robust Color Utility ---
function hexToRgba(color, alpha) {
  let r = 0, g = 0, b = 0
  if (color && color.startsWith('#')) {
    const cleanHex = color.replace('#', '')
    if (cleanHex.length === 6) {
      r = parseInt(cleanHex.substring(0, 2), 16)
      g = parseInt(cleanHex.substring(2, 4), 16)
      b = parseInt(cleanHex.substring(4, 6), 16)
    } else if (cleanHex.length === 3) {
      r = parseInt(cleanHex.substring(0, 1).repeat(2), 16)
      g = parseInt(cleanHex.substring(1, 2).repeat(2), 16)
      b = parseInt(cleanHex.substring(2, 3).repeat(2), 16)
    }
  } else if (color && (color.startsWith('rgb') || color.startsWith('rgba'))) {
    const match = color.match(/\d+/g)
    if (match && match.length >= 3) {
      r = parseInt(match[0])
      g = parseInt(match[1])
      b = parseInt(match[2])
    }
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// --- Theme Variables ---
function getTxChartColor() { return isDarkMode() ? sassVariables.dashboardLineColorTransactionsDarkTheme : sassVariables.dashboardLineColorTransactions }
function getPriceChartColor() { return isDarkMode() ? sassVariables.dashboardLineColorPriceDarkTheme : sassVariables.dashboardLineColorPrice }
function getMarketCapChartColor() { return isDarkMode() ? sassVariables.dashboardLineColorMarketDarkTheme : sassVariables.dashboardLineColorMarket }
function getAxisFontColor() { return '#6B7280' }
function getGridColor() { return isDarkMode() ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }

const baseGridStyle = {
  display: true,
  color: getGridColor(),
  drawBorder: false,
  borderDash: [5, 5]
}

function xAxe(fontColor) {
  return {
    grid: { display: false, drawBorder: false },
    type: 'time',
    time: { unit: 'day', tooltipFormat: 'DD', stepSize: 14 },
    ticks: { color: fontColor, font: { size: 10 }, maxTicksLimit: 7 }
  }
}

function formatValue(val) { return `${numeral(val).format('0,0')}` }

// --- Dynamic Gradient Generator (Scriptable Option) ---
function createGradient(context, colorHex) {
  const chart = context.chart
  const { ctx, chartArea } = chart

  if (!chartArea) {
    // Return a solid fallback before the chart has fully laid out its dimensions
    return hexToRgba(colorHex, isDarkMode() ? 0.2 : 0.1)
  }

  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
  const topAlpha = isDarkMode() ? 0.3 : 0.15
  gradient.addColorStop(0, hexToRgba(colorHex, topAlpha))
  gradient.addColorStop(1, hexToRgba(colorHex, 0.0))
  return gradient
}

function getBaseConfig() {
  const isDark = isDarkMode()
  return {
    type: 'line',
    responsive: true,
    maintainAspectRatio: false,
    data: { datasets: [] },
    options: {
      layout: { padding: { left: 0, right: 0, top: 10, bottom: 0 } },
      interaction: { intersect: false, mode: 'index', axis: 'x' },
      scales: {
        x: xAxe(getAxisFontColor()),
        price: {
          position: 'left',
          grid: baseGridStyle,
          border: { display: false },
          beginAtZero: true,
          min: 0,
          ticks: {
            callback: (value) => `$${numeral(value).format('0,0.00')}`,
            maxTicksLimit: 4,
            color: getAxisFontColor(),
            font: { size: 10 }
          }
        },
        marketCap: {
          position: 'right',
          grid: baseGridStyle,
          border: { display: false },
          beginAtZero: true,
          min: 0,
          ticks: {
            callback: () => '',
            maxTicksLimit: 6,
            drawOnChartArea: false,
            color: getAxisFontColor(),
            font: { size: 10 }
          }
        },
        numTransactions: {
          position: 'right',
          grid: baseGridStyle,
          border: { display: false },
          beginAtZero: true,
          min: 0,
          ticks: {
            callback: (value) => formatValue(value),
            maxTicksLimit: 4,
            color: getAxisFontColor(),
            font: { size: 10 }
          }
        }
      },
      plugins: {
        legend: { display: false },
        title: {
          display: false // HIDDEN: Removes the "Daily transactions" text so your HTML header shines
        },
        tooltip: {
          backgroundColor: isDark ? 'rgba(17,17,17,0.9)' : 'rgba(255,255,255,0.95)',
          titleColor: isDark ? '#fff' : '#111827',
          bodyColor: getAxisFontColor(),
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          borderWidth: 1,
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (context) => {
              const { label } = context.dataset
              const { formattedValue, parsed } = context
              if (context.dataset.yAxisID === 'price' || context.dataset.yAxisID === 'marketCap') {
                return `${label}: ${formatUsdValue(parsed.y)}`
              } else if (context.dataset.yAxisID === 'numTransactions') {
                return `${label}: ${formattedValue}`
              } else {
                return formattedValue
              }
            }
          }
        }
      }
    }
  }
}

function getDataFromLocalStorage(key) {
  const data = window.localStorage.getItem(key)
  return data ? JSON.parse(data) : []
}

function setDataToLocalStorage(key, data) {
  window.localStorage.setItem(key, JSON.stringify(data))
}

function getPriceData(marketHistoryData) {
  if (marketHistoryData.length === 0) return getDataFromLocalStorage(priceDataKey)
  const data = marketHistoryData.map(({ date, closingPrice }) => ({ x: date, y: closingPrice }))
  setDataToLocalStorage(priceDataKey, data)
  return data
}

function getTxHistoryData(transactionHistory) {
  if (transactionHistory.length === 0) return getDataFromLocalStorage(txHistoryDataKey)
  const data = transactionHistory.map(dataPoint => ({ x: dataPoint.date, y: dataPoint.number_of_transactions }))

  const prevDayStr = data[0].x
  const prevDay = DateTime.fromISO(prevDayStr)
  const curDay = prevDay.plus({ days: 1 }).toISODate()
  data.unshift({ x: curDay, y: null })

  setDataToLocalStorage(txHistoryDataKey, data)
  return data
}

function getMarketCapData(marketHistoryData) {
  if (marketHistoryData.length === 0) return getDataFromLocalStorage(marketCapDataKey)
  const data = marketHistoryData.map(({ date, marketCap }) => ({ x: date, y: marketCap }))
  setDataToLocalStorage(marketCapDataKey, data)
  return data
}

class MarketHistoryChart {
  constructor(el, _marketHistoryData, dataConfig) {
    const config = getBaseConfig()
    const axes = config.options.scales

    let priceActivated = true
    let marketCapActivated = true

    const priceLineColor = getPriceChartColor()
    const mcapLineColor = getMarketCapChartColor()
    const txLineColor = getTxChartColor()

    this.price = {
      // @ts-ignore
      label: window.localized?.Price || 'Price',
      yAxisID: 'price',
      data: [],
      fill: true,
      tension: 0.4, // Smooth bezier curve
      pointRadius: 0,
      pointHoverRadius: 4,
      pointBackgroundColor: priceLineColor,
      backgroundColor: (context) => createGradient(context, priceLineColor), // Scriptable gradient
      borderColor: priceLineColor,
      borderWidth: 2
    }

    if (dataConfig.market === undefined || dataConfig.market.indexOf('price') === -1) {
      this.price.hidden = true
      axes.price.display = false
      priceActivated = false
    }

    this.marketCap = {
      // @ts-ignore
      label: window.localized?.['Market Cap'] || 'Market Cap',
      yAxisID: 'marketCap',
      data: [],
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointBackgroundColor: mcapLineColor,
      backgroundColor: (context) => createGradient(context, mcapLineColor), // Scriptable gradient
      borderColor: mcapLineColor,
      borderWidth: 2
    }

    if (dataConfig.market === undefined || dataConfig.market.indexOf('market_cap') === -1) {
      this.marketCap.hidden = true
      axes.marketCap.display = false
      this.price.hidden = true
      axes.price.display = false
      marketCapActivated = false
    }

    this.numTransactions = {
      // @ts-ignore
      label: window.localized?.['Tx/day'] || 'Tx/day',
      yAxisID: 'numTransactions',
      data: [],
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointBackgroundColor: txLineColor,
      backgroundColor: (context) => createGradient(context, txLineColor), // Scriptable gradient
      borderColor: txLineColor,
      borderWidth: 2
    }

    if (dataConfig.transactions === undefined || dataConfig.transactions.indexOf('transactions_per_day') === -1) {
      this.numTransactions.hidden = true
      axes.numTransactions.display = false
    } else if (!priceActivated && !marketCapActivated) {
      axes.numTransactions.position = 'left'
    }

    // @ts-ignore
    config.data.datasets = [this.price, this.marketCap, this.numTransactions]

    const isChartLoaded = window.sessionStorage.getItem(isChartLoadedKey) === 'true'
    if (isChartLoaded) {
      config.options.animation = false
    } else {
      window.sessionStorage.setItem(isChartLoadedKey, 'true')
    }

    // @ts-ignore
    this.chart = new Chart(el, config)

    // Re-render chart gradients if the theme toggle is clicked outside this script
    window.addEventListener('theme-changed', () => {
      this.chart.destroy()
      createMarketHistoryChart(el)
    }, { once: true })
  }

  updateMarketHistory(marketHistoryData) {
    this.price.data = getPriceData(marketHistoryData)
    this.marketCap.data = getMarketCapData(marketHistoryData)
    this.chart.update()
  }

  updateTransactionHistory(transactionHistory) {
    this.numTransactions.data = getTxHistoryData(transactionHistory)
    this.chart.update()
  }
}

export function createMarketHistoryChart(el) {
  const dataPaths = $(el).data('history_chart_paths')
  const dataConfig = $(el).data('history_chart_config')
  const $chartError = $('[data-chart-error-message]')

  const chart = new MarketHistoryChart(el, [], dataConfig)

  Object.keys(dataPaths).forEach(function (historySource) {
    $.getJSON(dataPaths[historySource], { type: 'JSON' })
      .done(data => {
        switch (historySource) {
          case 'market': {
            const marketHistoryData = humps.camelizeKeys(data.history_data)
            $(el).show()
            chart.updateMarketHistory(marketHistoryData)
            break
          }
          case 'transaction': {
            const txsHistoryData = JSON.parse(data.history_data)
            $(el).show()
            chart.updateTransactionHistory(txsHistoryData)
            break
          }
        }
      })
      .fail(() => {
        $chartError.show()
      })
  })
  return chart
}

$('[data-chart-error-message]').on('click', _event => {
  $('[data-chart-error-message]').hide()
  createMarketHistoryChart($('[data-chart="historyChart"]')[0])
})