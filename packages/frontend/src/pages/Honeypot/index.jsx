import { useState, useEffect, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { io } from 'socket.io-client'

import { api } from '../../api/client.js'
import Card from '../../components/Card.jsx'
import AttackMap from './AttackMap.jsx'

const fmtDate = (d) => d ? new Date(d).toLocaleString('fr-FR', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
}) : '—'

const eventLabels = {
  'cowrie.login.failed': 'Login échoué',
  'cowrie.login.success': 'Login réussi',
  'cowrie.command.input': 'Commande',
  'cowrie.command.failed': 'Commande échouée',
  'cowrie.session.connect': 'Connexion',
  'cowrie.session.closed': 'Déconnexion',
  'cowrie.client.version': 'Version client',
  'cowrie.direct-tcpip.request': 'TCP/IP request'
}

const eventColors = {
  'cowrie.login.failed': 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  'cowrie.login.success': 'bg-emerald-100 text-emerald-700 dark:bg-green-500/20 dark:text-green-400',
  'cowrie.command.input': 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400',
  'cowrie.session.connect': 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  'cowrie.session.closed': 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400'
}

export default function HoneypotPage() {
  const [stats, setStats] = useState(null)
  const [events, setEvents] = useState([])
  const [mapPoints, setMapPoints] = useState([])
  const [hours, setHours] = useState(24)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('stats')
  const socketRef = useRef(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsData, mapData, eventsData] = await Promise.all([
        api.get(`/honeypot/stats?hours=${hours}`),
        api.get(`/honeypot/map?hours=${hours}`),
        api.get('/honeypot/events?limit=50')
      ])
      setStats(statsData)
      setMapPoints(mapData.points || [])
      setEvents(eventsData.events || [])
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [hours])

  // WebSocket for real-time events
  useEffect(() => {
    const socket = io(window.location.origin, { withCredentials: true })
    socketRef.current = socket

    socket.on('connect', () => socket.emit('join:honeypot'))
    socket.on('honeypot:event', (event) => {
      setEvents((prev) => [event, ...prev].slice(0, 100))
      if (event.latitude && event.longitude) {
        setMapPoints((prev) => [
          { src_ip: event.src_ip, country: event.country, city: event.city, latitude: event.latitude, longitude: event.longitude, count: 1 },
          ...prev
        ])
      }
    })

    return () => { socket.disconnect() }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Honeypot SSH</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Surveillance des attaques SSH en temps réel via Cowrie.
          </p>
        </div>
        <select
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="glass-input rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500/40 focus:outline-none"
        >
          <option value={1}>1 heure</option>
          <option value={6}>6 heures</option>
          <option value={24}>24 heures</option>
          <option value={168}>7 jours</option>
          <option value={720}>30 jours</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-white/10">
        {[
          { key: 'stats', label: 'Statistiques' },
          { key: 'map', label: 'Carte' },
          { key: 'timeline', label: 'Timeline' }
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
              tab === t.key
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-500 dark:text-slate-400">Chargement…</p>
      ) : (
        <>
          {tab === 'stats' && <StatsTab stats={stats} />}
          {tab === 'map' && <MapTab points={mapPoints} />}
          {tab === 'timeline' && <TimelineTab events={events} />}
        </>
      )}
    </div>
  )
}

// ─── Stats Tab ───────────────────────────────────────────────────
function StatsTab({ stats }) {
  if (!stats) return <p className="text-slate-500 dark:text-slate-400">Aucune donnée.</p>

  const { summary, topPasswords, topUsernames, topCommands, topCountries, topIps, perDay } = stats

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-brand-500">{summary?.total || 0}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Événements</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-red-500 dark:text-red-400">{summary?.login_failed || 0}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Logins échoués</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-500 dark:text-green-400">{summary?.login_success || 0}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Logins réussis</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-orange-500 dark:text-orange-400">{summary?.commands || 0}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Commandes</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-slate-700 dark:text-white">{summary?.unique_ips || 0}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">IPs uniques</p>
        </Card>
      </div>

      {perDay?.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Attaques par jour (30j)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perDay.map((d) => ({
                day: new Date(d.day).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
                count: Number(d.count)
              }))}>
                <XAxis dataKey="day" tick={{ fill: '#94A3B8', fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: 'rgba(30,41,59,0.9)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: 12, backdropFilter: 'blur(8px)' }}
                  labelStyle={{ color: '#E2E8F0' }}
                  itemStyle={{ color: '#0ea5e9' }}
                />
                <Bar dataKey="count" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TopList title="Top mots de passe" items={topPasswords} field="password" />
        <TopList title="Top usernames" items={topUsernames} field="username" />
        <TopList title="Top commandes" items={topCommands} field="command" />
        <TopList title="Top pays" items={topCountries} field="country" />
        <TopList title="Top IPs" items={topIps} field="src_ip" extra="country" />
      </div>
    </div>
  )
}

function TopList({ title, items, field, extra }) {
  if (!items?.length) return null

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">{title}</h3>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-slate-400 dark:text-slate-500 w-5 text-right">{i + 1}.</span>
              <span className="truncate font-mono text-xs text-slate-700 dark:text-slate-200">{item[field]}</span>
              {extra && item[extra] && (
                <span className="text-xs text-slate-400 dark:text-slate-500">({item[extra]})</span>
              )}
            </div>
            <span className="text-brand-500 font-semibold ml-2">{item.count}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── Map Tab ─────────────────────────────────────────────────────
function MapTab({ points }) {
  return (
    <div className="space-y-4">
      <Card className="p-0 overflow-hidden rounded-2xl" style={{ height: '500px' }}>
        <AttackMap points={points} />
      </Card>
      <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
        {points.length} source(s) d'attaque géolocalisée(s)
      </p>
    </div>
  )
}

// ─── Timeline Tab ────────────────────────────────────────────────
function TimelineTab({ events }) {
  if (!events?.length) {
    return <p className="text-slate-500 dark:text-slate-400 text-sm">Aucun événement enregistré.</p>
  }

  return (
    <div className="space-y-2">
      {events.map((e) => (
        <Card key={e.id} className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${eventColors[e.event_type] || 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400'}`}>
                  {eventLabels[e.event_type] || e.event_type}
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{e.src_ip}</span>
                {e.country && e.country !== 'Unknown' && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">({e.country})</span>
                )}
              </div>
              {e.username && (
                <p className="text-sm ml-1 text-slate-700 dark:text-slate-200">
                  <span className="text-slate-400 dark:text-slate-500">user:</span>{' '}
                  <span className="font-mono">{e.username}</span>
                  {e.password && (
                    <>
                      {' '}<span className="text-slate-400 dark:text-slate-500">pass:</span>{' '}
                      <span className="font-mono">{e.password}</span>
                    </>
                  )}
                </p>
              )}
              {e.command && (
                <p className="text-sm ml-1">
                  <span className="text-slate-400 dark:text-slate-500">$</span>{' '}
                  <span className="font-mono text-brand-500">{e.command}</span>
                </p>
              )}
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">{fmtDate(e.event_at)}</span>
          </div>
        </Card>
      ))}
    </div>
  )
}
